# Research: 005-vision-input

## 1. getUserMedia + Canvas 截帧

**Decision**: 使用 `navigator.mediaDevices.getUserMedia({ video: true })` 获取摄像头流，绑定到 `<video>` 元素，截帧时用 `CanvasRenderingContext2D.drawImage(video, 0, 0)` + `canvas.toDataURL('image/jpeg', quality)` 输出 base64。

**Rationale**: 原生浏览器 API，无需额外依赖；`toDataURL` 同步执行，无竞态；返回值直接剥离 `data:image/jpeg;base64,` 前缀即得纯 base64。

**Alternatives considered**:
- `ImageCapture` API：兼容性差（Firefox 不支持），放弃。
- `OffscreenCanvas`：Worker 线程截帧，本场景无性能压力，过度设计，放弃。

---

## 2. 图片压缩策略

**Decision**: 截帧时将 canvas 尺寸限制为长边 ≤ 512px（等比缩放），JPEG quality=0.8；若 base64 > 200KB 则以 quality=0.6 重试一次，仍超出返回 null。

**Rationale**: GPT-4o / Claude 3 Vision 对 512px 图片已能充分理解；更大尺寸消耗 token 显著增加（768px 约贵 2.25×）。200KB base64 ≈ 150KB 二进制，远低于各 provider 单图限制（OpenAI 20MB，Anthropic 5MB）。

**Alternatives considered**:
- 固定 quality=0.5：画质损失过大，信息丢失。
- 使用 WebP：Safari <16 支持不稳定，JPEG 更安全。

---

## 3. Anthropic Vision API 格式

**Decision**: 在 `messages` 中，当消息含图片时，`content` 改为数组形式：
```json
[
  { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "<纯base64>" } },
  { "type": "text", "text": "用户消息文字" }
]
```
历史消息（无图片）保持 `content: string` 格式。

**Rationale**: Anthropic SDK 要求图片在同一 message 的 content 数组中，且图片 block 置于文字 block 之前。`data` 字段不含 data URI 前缀。

**Alternatives considered**: 将图片放在 system prompt — 不符合 Anthropic 最佳实践，system 不支持 image block。

---

## 4. OpenAI Vision API 格式

**Decision**: 将含图片的消息 `content` 改为数组：
```json
[
  { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,<纯base64>", "detail": "low" } },
  { "type": "text", "text": "用户消息文字" }
]
```
使用 `detail: "low"` 固定消耗 85 token/图，可预测 token 费用。

**Rationale**: OpenAI vision `image_url` 需要完整 data URI；`detail: "low"` 对 512px 图片已足够，避免 `auto` 模式升级到 high 消耗更多 token。

**Alternatives considered**: `detail: "auto"` — token 消耗不可预测，放弃。

---

## 5. 历史消息中图片的处理

**Decision**: 构建多轮上下文时，历史消息中的 `imageBase64` 字段不传给 AI（LLMProvider 实现层过滤），仅保留文字内容。

**Rationale**: 历史帧信息时效性差，重传浪费大量 token；对话连贯性靠文字历史已足够。图片也不持久化到数据库。

**Alternatives considered**: 保留最近 N 帧历史 — 过度复杂，本期不做。

---

## 6. 前端组件集成策略

**Decision**: 创建独立的 `CameraCapture` React 组件（`components/camera-capture.tsx`），通过 `ref` 暴露 `captureFrame()` 命令式方法；同时创建临时测试页面 `app/test-vision/page.tsx` 用于独立验证，无需等待 feature 006。

**Rationale**: 命令式 ref（`useImperativeHandle`）比回调 props 更适合「发消息时截帧」的触发模式；测试页面让本 feature 可独立验证。

**Alternatives considered**: 将截帧逻辑内联到 chat 页面 — 耦合度高，006 集成时难以复用。

---

## 7. supportsVision 标志启用时机

**Decision**: 本 feature 将 `AnthropicProvider.supportsVision` 和 `OpenAIProvider.supportsVision` 改为 `true`（前提：模型名称包含已知 vision 模型）。为简化，统一设为 `true`，由运营配置选择支持 Vision 的模型名称来保证一致性。

**Rationale**: 现有两个 provider 均已支持 Vision API，`false` 是占位值，本 feature 正式开启。

**Alternatives considered**: 按模型名称动态判断（如 `gpt-4o`, `claude-3-*`）— 维护模型列表成本高，不如让运营配置正确模型，provider 层统一开启。
