# 快速开始指南: MCP 健壮性增强

**创建**: 2025-04-02

## 概述

本指南帮助开发者快速了解和验证 MCP 健壮性增强功能。

---

## 前览前状态

```bash
# 查看当前 MCP 配置
pnpm run dev
# 启动开发服务器（如果使用热重载）
pnpm dev

# 迋试 MCP 连接
curl http://localhost:3000/api/admin/mcp/test \
  -H "Cookie: admin_token=$(cat ~/.admin_token 2>/dev/null)" \
  -H "Content-Type: application/json" \
  -d '{"url": "http://your-mcp-server-url"}'
```

## 验证连接池

```bash
# 并发发送 10 个请求
for i in {1..10}; do
  curl -s "http://localhost:3000/api/chat?token=YOUR_token" \
    -H "Content-type: application/json" \
    -d '{"message": "test", "sessionId": "test-'$i"}' &
  done

 wait

# 查看监控指标
curl http://localhost:3000/api/admin/mcp/metrics \
  -H "Cookie: admin_token=$(cat ~/.admin_token 2>/dev/null)"
```

## 查看日志

```bash
# 查看 docker 日志（docker 环境）
docker logs senseworld-app 2>&1 | grep mcp
```

## 常见问题

### q: 连接池满了怎么办？

当连接池达到最大值（5 个）且所有连接都在使用时：
1. 等待最旧的连接变为空闲
2. 清理最旧的空闲连接
3. 创建新连接

### q: 连接超时怎么处理？

连接超时（5 秒）时：
1. 返回 `network_error` 错误
2. 标记为可恢复
3. 用户可重试请求

### q: 工具调用失败怎么处理？

工具调用失败时：
1. 讣录错误类型（网络、超时、服务端错误等）
2. 讌工具调用指标
3. 返回友好错误消息给 ai
4. 如果可恢复，ai 可自动重试
