# Feature Specification: Vision Input (摄像头截帧 + Vision AI)

**Feature Branch**: `005-vision-input`  
**Created**: 2025-07-21  
**Status**: Draft  
**Input**: 摄像头截帧组件 + Vision 输入附加到 AI 请求

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 开启摄像头并让 AI 看见画面 (Priority: P1)

用户在对话界面开启摄像头后，AI 在回复时能「看见」当前摄像头画面，并在回复中体现视觉理解。

**Why this priority**: 这是本 feature 的核心价值：赋予 AI 视觉感知能力。没有这一功能，后续所有视觉交互都无法进行。

**Independent Test**: 打开前端页面 → 点击「开启摄像头」→ 发送消息「你看到了什么？」→ AI 回复中包含对当前画面的描述。

**Acceptance Scenarios**:

1. **Given** 用户已进入对话页面，**When** 点击摄像头开关按钮，**Then** 浏览器请求摄像头权限，授权后显示实时预览画面。
2. **Given** 摄像头已开启，**When** 用户发送任意消息，**Then** 当前帧以 base64 图片形式附加到 AI 请求中。
3. **Given** 摄像头已开启且 AI 模型支持 Vision，**When** AI 收到带图片的请求，**Then** 回复内容体现对画面的理解（如描述物体、颜色、场景）。
4. **Given** 摄像头已开启，**When** 用户点击关闭摄像头，**Then** 摄像头停止，后续消息不再附加图片。

---

### User Story 2 - 截帧与图片压缩 (Priority: P2)

系统在用户发送消息时截取当前摄像头帧，并压缩到合理尺寸以控制 token 消耗。

**Why this priority**: 无限制的图片大小会导致 token 超出限额或响应缓慢；截帧策略影响视觉信息的时效性。

**Independent Test**: 开启摄像头，通过浏览器 DevTools 抓包，验证发送请求中图片尺寸 ≤ 512px 且为 JPEG base64 格式。

**Acceptance Scenarios**:

1. **Given** 摄像头开启，**When** 用户发送消息，**Then** 截取当前帧（实时截帧，非缓存），确保图片时效性。
2. **Given** 摄像头画面分辨率较高，**When** 截帧处理，**Then** 输出图片长边 ≤ 512px，格式为 JPEG，质量 0.8。
3. **Given** 截帧图片，**When** 附加到消息，**Then** base64 字符串大小 ≤ 200KB；若超出（色彩极丰富场景），`captureFrame()` MUST 降低 JPEG quality 至 0.6 重试一次，仍超出则返回 null 并展示提示。

---

### User Story 3 - 摄像头不可用时的降级处理 (Priority: P3)

当用户拒绝摄像头权限或设备无摄像头时，系统优雅降级，不影响纯文字对话。

**Why this priority**: 保证无摄像头/拒绝权限用户仍能正常使用 AI 对话，不因 Vision 功能报错而中断体验。

**Independent Test**: 浏览器拒绝摄像头权限 → 页面显示友好提示 → 仍可正常发送文字消息并获得 AI 回复。

**Acceptance Scenarios**:

1. **Given** 用户点击开启摄像头，**When** 浏览器权限被拒绝，**Then** 显示「摄像头不可用，请检查权限」提示，开关重置为关闭状态。
2. **Given** 摄像头处于关闭状态，**When** 用户发送消息，**Then** 消息不附加图片，走纯文字 AI 对话流程。
3. **Given** AI 模型不支持 Vision（`supportsVision: false`），**When** 用户开启摄像头并发送消息，**Then** 后端忽略 `images` 字段，仅用文字请求 AI。

---

### Edge Cases

- 摄像头开启后用户切换到后台（页面不可见）：截帧在发送消息时实时进行，不受页面可见性影响。
- Canvas `toDataURL` 跨域问题：使用 `getUserMedia` 本地流，不涉及跨域，无此问题。
- 图片是否持久化到对话历史：本期不持久化图片，历史消息中图片不重发给 AI。构建多轮上下文时，`LLMProvider` 实现 MUST 过滤历史消息中的 image content block，仅保留文字内容。
- 用户快速连续发送消息：截帧为同步操作（Canvas drawImage + toDataURL），无竞态问题。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统 MUST 提供 `CameraCapture` 前端组件，使用 `getUserMedia` 获取摄像头流并渲染预览。
- **FR-002**: 用户 MUST 能通过开关按钮启停摄像头；关闭时停止所有媒体轨道以释放资源。
- **FR-003**: 摄像头开启时，用户发送消息前 MUST 截取当前帧并压缩（长边 ≤ 512px，JPEG quality 0.8）。
- **FR-004**: 截帧后前端 MUST 去除 `toDataURL` 返回值的 `data:image/jpeg;base64,` 前缀，仅将纯 base64 字符串附加到 `/api/chat` 请求的 `images` 字段（`string[]`）。
- **FR-005**: `LLMProvider.chat()` 接口 MUST 接受可选 `images?: string[]` 参数（纯 base64 字符串，不含 data URL 前缀）。
- **FR-006**: Claude Provider MUST 将图片转为 Anthropic `image` content block（`type: "image", source: { type: "base64", media_type: "image/jpeg", data: "<纯base64>" }`）。
- **FR-007**: OpenAI Provider MUST 在使用前拼接前缀，将图片转为 OpenAI vision `image_url` content（`url: "data:image/jpeg;base64,<纯base64>"`）。
- **FR-008**: 后端 MUST 检查 `supportsVision` 标志；若为 `false`，忽略 `images` 字段不传给 AI。
- **FR-009**: 摄像头权限被拒绝时 MUST 展示用户友好的错误提示，不抛出未处理异常。
- **FR-010**: 摄像头关闭或不可用时 MUST 不影响纯文字对话正常工作。

### Key Entities

- **CameraCapture**: 前端组件，管理摄像头流生命周期，暴露 `captureFrame(): string | null` 方法（返回**纯 base64 JPEG 字符串**（不含 `data:image/jpeg;base64,` 前缀）或 null）。
- **ChatRequest**: 现有 `/api/chat` 请求体，新增可选 `images?: string[]` 字段。
- **LLMProvider.chat()**: 现有接口方法，新增可选 `images?: string[]` 参数。

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 开启摄像头后发送「你看到了什么」，支持 Vision 的模型回复中包含对画面内容的描述。
- **SC-002**: 截帧图片 base64 大小 ≤ 200KB（512px JPEG quality 0.8 典型值）。
- **SC-003**: 关闭摄像头后，发送消息的网络请求中不包含 `images` 字段或为空数组。
- **SC-004**: 权限拒绝场景下，纯文字对话功能 100% 不受影响。
- **SC-005**: 组件在 Chrome、Safari、Firefox 最新版本正常工作。

## Assumptions

- 目标用户使用现代浏览器（支持 `getUserMedia` 和 Canvas API）。
- 对话界面（feature 006 chat-ui）尚未完成；本 feature 通过独立临时测试页面（`/app/test-vision/page.tsx`）验证，006 完成后迁移集成。
- 图片不持久化存储到数据库，仅随请求传递给 AI。
- 截帧策略为「发送消息时截取当前帧」，不使用定时截帧缓存。
- 现有 `LLMProvider` 接口（feature 003）已有 `supportsVision` 标志，本 feature 在此基础上扩展。
- Azure OpenAI 等其他提供商的 Vision 支持暂不实现，预留接口扩展点。
