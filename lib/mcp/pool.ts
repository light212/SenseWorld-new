/**
 * MCPConnectionPool -- MCP 连接池
 *
 * 单例模式管理 MCP 连接生命周期：
 * - acquire(): 获取连接（复用空闲连接或创建新连接）
 * - release(): 释放连接回池中
 * - 自动清理空闲超过 60 秒的连接
 * - 最大连接数限制（默认 5）
 *
 * 所有参数可通过 Config 表运行时配置。
 */

import type { MCPClient } from './types'
import { HttpMCPClient } from './http-client'
import { MCPError, MCPErrorCode } from './error'
import { mcpLogger } from './logger'
import { mcpMetrics } from './metrics'
import { getConfig } from '@/lib/config'

/** 连接池条目 */
interface PoolEntry {
  client: MCPClient
  serverUrl: string
  apiKey?: string | null
  lastUsed: number
  inUse: boolean
  createdAt: number
}

/** 连接池统计 */
export interface PoolStats {
  total: number
  inUse: number
  idle: number
  evictions: number
}

/** 池配置（从 Config 表读取，有默认值） */
interface PoolConfig {
  maxPoolSize: number
  maxIdleTimeMs: number
  cleanupIntervalMs: number
}

const DEFAULT_CONFIG: PoolConfig = {
  maxPoolSize: 5,
  maxIdleTimeMs: 60000,
  cleanupIntervalMs: 30000,
}

async function loadPoolConfig(): Promise<PoolConfig> {
  const [maxSize, maxIdle, cleanup] = await Promise.all([
    getConfig('MCP_POOL_MAX_SIZE'),
    getConfig('MCP_POOL_MAX_IDLE_MS'),
    getConfig('MCP_POOL_CLEANUP_INTERVAL_MS'),
  ])
  return {
    maxPoolSize: maxSize ? parseInt(maxSize, 10) : DEFAULT_CONFIG.maxPoolSize,
    maxIdleTimeMs: maxIdle ? parseInt(maxIdle, 10) : DEFAULT_CONFIG.maxIdleTimeMs,
    cleanupIntervalMs: cleanup ? parseInt(cleanup, 10) : DEFAULT_CONFIG.cleanupIntervalMs,
  }
}

class MCPConnectionPool {
  private pool: PoolEntry[] = []
  private cleanupTimer: ReturnType<typeof setInterval> | null = null
  private evictionCount = 0
  private config: PoolConfig = { ...DEFAULT_CONFIG }
  private configLoaded = false

  constructor() {
    this.startCleanup()
  }

  /** 获取连接：复用空闲连接或创建新连接 */
  async acquire(serverUrl: string, apiKey?: string | null): Promise<MCPClient> {
    if (!this.configLoaded) {
      this.config = await loadPoolConfig()
      this.configLoaded = true
    }

    // 1. 查找匹配的空闲连接
    const idleEntry = this.pool.find(
      (e) => e.serverUrl === serverUrl && !e.inUse && e.client.isConnected()
    )
    if (idleEntry) {
      idleEntry.inUse = true
      idleEntry.lastUsed = Date.now()
      mcpLogger.debug({ event: 'pool_acquire', serverUrl, poolStats: this.getStatsSnapshot() })
      return idleEntry.client
    }

    // 2. 池未满，创建新连接
    if (this.pool.length < this.config.maxPoolSize) {
      return this.createNewConnection(serverUrl, apiKey)
    }

    // 3. 池已满，尝试清理最旧的空闲连接
    const oldestIdle = this.pool
      .filter((e) => !e.inUse)
      .sort((a, b) => a.lastUsed - b.lastUsed)[0]

    if (oldestIdle) {
      await this.evictEntry(oldestIdle)
      return this.createNewConnection(serverUrl, apiKey)
    }

    // 4. 所有连接都在使用中且池已满
    mcpLogger.error({ event: 'pool_exhausted', serverUrl, poolStats: this.getStatsSnapshot() })
    mcpMetrics.recordConnect(false)
    mcpMetrics.updatePoolStats(this.getStatsSnapshot())
    throw new MCPError(
      MCPErrorCode.CONNECTION_POOL_EXHAUSTED,
      `MCP 连接池已满（${this.config.maxPoolSize}），所有连接都在使用中`
    )
  }

  /** 释放连接回池中 */
  release(client: MCPClient): void {
    const entry = this.pool.find((e) => e.client === client)
    if (entry) {
      entry.inUse = false
      entry.lastUsed = Date.now()
      mcpLogger.debug({ event: 'pool_release', serverUrl: entry.serverUrl, poolStats: this.getStatsSnapshot() })
      mcpMetrics.updatePoolStats(this.getStatsSnapshot())
    }
  }

  /** 获取连接池统计 */
  stats(): PoolStats {
    const inUse = this.pool.filter((e) => e.inUse).length
    return {
      total: this.pool.length,
      inUse,
      idle: this.pool.length - inUse,
      evictions: this.evictionCount,
    }
  }

  /** 销毁所有连接，停止清理定时器 */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }
    for (const entry of this.pool) {
      entry.client.disconnect().catch(() => {})
    }
    this.pool = []
    mcpLogger.info({ event: 'pool_destroyed' })
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private
  // ──────────────────────────────────────────────────────────────────────────

  private async createNewConnection(serverUrl: string, apiKey?: string | null): Promise<MCPClient> {
    const client = new HttpMCPClient()
    await client.connect(serverUrl, apiKey)
    const entry: PoolEntry = {
      client,
      serverUrl,
      apiKey,
      lastUsed: Date.now(),
      inUse: true,
      createdAt: Date.now(),
    }
    this.pool.push(entry)
    mcpLogger.info({ event: 'pool_acquire_new', serverUrl, poolStats: this.getStatsSnapshot() })
    mcpMetrics.recordConnect(true)
    mcpMetrics.updatePoolStats(this.getStatsSnapshot())
    return client
  }

  private async evictEntry(entry: PoolEntry): Promise<void> {
    await entry.client.disconnect().catch(() => {})
    this.pool = this.pool.filter((e) => e !== entry)
    this.evictionCount++
    mcpLogger.info({ event: 'pool_evict', serverUrl: entry.serverUrl, poolStats: this.getStatsSnapshot() })
    mcpMetrics.updatePoolStats(this.getStatsSnapshot())
  }

  private startCleanup(): void {
    // Use default interval initially; config will be loaded on first acquire
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdle()
    }, DEFAULT_CONFIG.cleanupIntervalMs)

    // Prevent timer from keeping process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref()
    }
  }

  private cleanupIdle(): void {
    const now = Date.now()
    const toEvict = this.pool.filter(
      (e) => !e.inUse && now - e.lastUsed > this.config.maxIdleTimeMs
    )
    for (const entry of toEvict) {
      this.evictEntry(entry)
    }
    if (toEvict.length > 0) {
      mcpLogger.info({ event: 'pool_cleanup', error: `清理了 ${toEvict.length} 个空闲连接`, poolStats: this.getStatsSnapshot() })
    }
  }

  private getStatsSnapshot(): { total: number; inUse: number; idle: number; evictions: number } {
    const inUse = this.pool.filter((e) => e.inUse).length
    return { total: this.pool.length, inUse, idle: this.pool.length - inUse, evictions: this.evictionCount }
  }
}

/** 全局单例 */
export const mcpPool = new MCPConnectionPool()
