# Quickstart: 001-project-scaffold

**Feature**: 项目脚手架搭建
**Date**: 2025-01-30

## 本地开发环境启动

### 前置要求

- Node.js 20+
- Docker Desktop（含 Docker Compose）
- Git

### 步骤

```bash
# 1. 克隆仓库
git clone <repo-url>
cd SenseWorld-new

# 2. 安装依赖
npm install

# 3. 复制环境变量模板
cp .env.example .env
# 编辑 .env，填入本地数据库连接信息

# 4. 启动 MySQL（使用 Docker）
docker compose up mysql -d

# 5. 同步数据库 schema
npx prisma migrate dev

# 6. 初始化管理员账号（seed）
# .env 中设置 ADMIN_USERNAME 和 ADMIN_PASSWORD
npx prisma db seed

# 7. 启动开发服务
npm run dev
```

浏览器访问 http://localhost:3000 查看首页。
管理后台访问 http://localhost:3000/admin。
健康检查访问 http://localhost:3000/api/health。

---

## Docker Compose 一键部署

```bash
# 1. 克隆仓库
git clone <repo-url>
cd SenseWorld-new

# 2. 复制并编辑环境变量
cp .env.example .env
# 填入 ADMIN_USERNAME、ADMIN_PASSWORD 及数据库密码

# 3. 启动所有服务
docker compose up -d

# 4. 查看服务状态
docker compose ps

# 5. 查看日志
docker compose logs -f app
```

> 首次启动时，容器会自动执行 `prisma migrate deploy` 和 `prisma db seed`。

访问 http://localhost:3000 确认服务运行正常。

---

## 扩展新 Provider

### 新增 LLM 服务商示例

1. 在 `lib/ai/` 目录下新建文件，如 `gemini-provider.ts`
2. 实现 `LLMProvider` 接口：

```typescript
import { LLMProvider, ChatMessage } from './types'

export class GeminiProvider implements LLMProvider {
  readonly supportsVision = true
  readonly supportsNativeAudio = false

  async chat(messages: ChatMessage[]): Promise<string> {
    // 调用 Gemini SDK
  }

  async *chatStream(messages: ChatMessage[]): AsyncIterable<string> {
    // 流式输出
  }
}
```

3. 在 `lib/ai/factory.ts` 的 `LLMFactory.create()` 中注册新 Provider
4. 运营后台即可在配置面板中选择新服务商

### 新增语音服务商

参照 `lib/speech/openai-speech-provider.ts`，实现 `SpeechProvider` 接口，注册到 `lib/speech/factory.ts`。

---

## 健康检查

GET `/api/health` 返回：

```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-01-30T00:00:00.000Z"
}
```

数据库异常时：

```json
{
  "status": "degraded",
  "database": "disconnected",
  "timestamp": "2025-01-30T00:00:00.000Z"
}
```
