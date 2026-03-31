# Data Model: 005-vision-input

## 变更概述

本 feature **不新增数据库表**。图片数据不持久化，仅在请求生命周期内传递。变更集中在：
1. TypeScript 接口扩展（`ChatMessage`、`LLMProvider`）
2. API 请求体扩展（`/api/chat` POST body）

---

## 1. ChatMessage 接口（lib/ai/types.ts）

```typescript
// 现有字段（不变）
interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  // 新增字段（已存在于 types.ts，本 feature 正式使用）
  imageBase64?: string  // 纯 base64 字符串，不含 data URI 前缀，仅限当前轮
}
```

**约束**：
- `imageBase64` 仅附加在 `role: 'user'` 的当前轮消息上
- 历史消息构建时，LLMProvider 实现层必须忽略 `imageBase64`
- 不存储到数据库（`prisma.message.create` 不含图片字段）

---

## 2. LLMProvider 接口（lib/ai/types.ts）

```typescript
interface LLMProvider {
  readonly supportsVision: boolean      // 已存在
  readonly supportsNativeAudio: boolean // 已存在
  chat(messages: ChatMessage[]): Promise<string>           // 签名不变
  chatStream(messages: ChatMessage[]): AsyncIterable<string> // 签名不变
}
```

**变更**：接口签名无需修改。`ChatMessage` 本身已含 `imageBase64?`，Provider 实现层读取该字段并转换为各 SDK 格式。

---

## 3. /api/chat 请求体扩展

```typescript
// POST /api/chat
interface ChatRequestBody {
  sessionId?: string   // 已存在
  message: string      // 已存在
  images?: string[]    // 新增：纯 base64 字符串数组，当前版本取 [0]（单图）
}
```

**约束**：
- `images` 为可选字段；为空数组或缺失时行为与现有相同
- 后端从 `images[0]` 取第一张图片附加到当前用户消息（多图预留，本期只用第一张）
- 若 `provider.supportsVision === false`，后端忽略 `images` 字段

---

## 4. CameraCapture 组件接口

```typescript
// components/camera-capture.tsx
interface CameraCaptureRef {
  captureFrame(): string | null
  // 返回纯 base64 JPEG 字符串（不含 data:image/jpeg;base64, 前缀）
  // 摄像头未开启或截帧失败时返回 null
}

interface CameraCaptureProps {
  onError?: (error: string) => void
}
```

**生命周期**：
- 挂载时不自动启动摄像头
- 组件内部维护开关状态（`isActive`）
- 卸载时自动停止所有媒体轨道
