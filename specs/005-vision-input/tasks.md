# Tasks: 005-vision-input (摄像头截帧 + Vision AI)

**Input**: Design documents from `/specs/005-vision-input/`  
**Branch**: `005-vision-input`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无未完成依赖）
- **[Story]**: 对应 spec.md 中的用户故事（US1/US2/US3）
- 所有路径相对于项目根目录

---

## Phase 1: Setup（共享基础设施）

**Purpose**: 无需新建目录或初始化项目（Next.js 已就绪），此阶段仅确认现有接口以便后续修改。

- [X] T001 阅读并确认 `lib/ai/types.ts` 中 `ChatMessage` 和 `LLMProvider` 接口现状
- [X] T002 [P] 阅读并确认 `lib/ai/anthropic-provider.ts` 现状（`supportsVision`、`chat()`、`chatStream()` 签名）
- [X] T002b [P] 阅读并确认 `lib/ai/openai-provider.ts` 现状
- [X] T003 [P] 阅读并确认 `app/api/chat/route.ts` 现状（请求体解析逻辑）

---

## Phase 2: Foundational（阻塞性前置任务）

**Purpose**: 扩展 `LLMProvider` 接口与 `ChatMessage` 类型，所有用户故事均依赖此阶段完成。

**⚠️ CRITICAL**: US1/US2/US3 的实现均依赖此阶段完成。

- [X] T004 确认 `lib/ai/types.ts` 中 `ChatMessage.imageBase64?: string` 已存在（无需修改接口签名）；`LLMProvider.chat()`/`chatStream()` 签名保持 `ChatMessage[]` 不变，图片通过 `ChatMessage.imageBase64` 传递
- [X] T005 [P] 将 `lib/ai/anthropic-provider.ts` 中 `supportsVision` 改为 `true`（方法签名不变，实现体留给 US1 完成）
- [X] T005b [P] 将 `lib/ai/openai-provider.ts` 中 `supportsVision` 改为 `true`（方法签名不变，实现体留给 US1 完成）

---

## Phase 3: User Story 1 — 开启摄像头并让 AI 看见画面 (P1)

**Goal**: 用户开启摄像头，发送消息时 AI 能「看见」当前画面并在回复中体现视觉理解。

**Independent Test**: 打开 `/test-vision?token=<token>` → 开启摄像头 → 发送「你看到了什么？」→ AI 回复包含对画面的描述。

### 后端：Provider Vision 实现

- [X] T006 [US1] 在 `lib/ai/anthropic-provider.ts` 的 `chat()` 中实现 Vision：当 `images` 非空时，将最新用户消息的 `content` 替换为 `[{type:"image", source:{type:"base64",media_type:"image/jpeg",data:"<base64>"}}, {type:"text",text:"<message>"}]`；历史消息保持纯文字
- [X] T007 [US1] 在 `lib/ai/anthropic-provider.ts` 的 `chatStream()` 中同样实现 Vision 内容构建（与 T006 逻辑相同，应用于 stream 调用）
- [X] T008 [P] [US1] 在 `lib/ai/openai-provider.ts` 的 `chat()` 中实现 Vision：当 `images` 非空时，最新用户消息 content 替换为数组 `[{type:"image_url",image_url:{url:"data:image/jpeg;base64,<base64>",detail:"low"}},{type:"text",text:"<message>"}]`
- [X] T009 [P] [US1] 在 `lib/ai/openai-provider.ts` 的 `chatStream()` 中同样实现 Vision 内容构建

### 后端：路由扩展

- [X] T010 [US1] 在 `app/api/chat/route.ts` 中解析请求体新增的 `images?: string[]` 字段；检查 `provider.supportsVision`：若为 `true` 则将 `images[0]` 赋值到最新用户消息的 `imageBase64` 字段后再传入 `chatStream()`，若为 `false` 则忽略 `images`

### 前端：CameraCapture 组件

- [X] T011 [US1] 创建 `components/camera-capture.tsx`：使用 `forwardRef` + `useImperativeHandle` 暴露 `CameraCaptureRef.captureFrame()` 接口；内部维护 `MediaStream`；渲染 `<video>` 预览和开关按钮；关闭时停止所有 track
- [X] T012 [US1] 在 `components/camera-capture.tsx` 中实现 `captureFrame()`：创建 Canvas，长边缩放至 ≤512px，`drawImage` + `toDataURL('image/jpeg', 0.8)`，去除 `data:image/jpeg;base64,` 前缀后返回纯 base64

### 前端：测试页面

- [X] T013 [US1] 创建 `app/test-vision/page.tsx`：含 `CameraCapture` 组件 + 文字输入框 + 发送按钮；发送时调用 `captureFrame()`，将 `images` 附加到 `/api/chat` POST 请求体；以流式方式渲染 AI 回复

---

## Phase 4: User Story 2 — 截帧与图片压缩 (P2)

**Goal**: 系统在用户发送消息时截取当前帧，压缩到合理尺寸以控制 token 消耗；超出 200KB 时自动降质重试。

**Independent Test**: 开启摄像头，DevTools Network 验证 `/api/chat` 请求中 `images[0]` 为纯 base64 JPEG，base64 长度对应 ≤200KB（约 ≤272000 字符）。

- [X] T014 [US2] 在 `components/camera-capture.tsx` 的 `captureFrame()` 中添加大小检查：若 base64 长度 > 272000（≈200KB），以 quality=0.6 重试 `toDataURL`；若仍超出则调用 `onError('图片过大，摄像头截帧失败')` 并返回 `null`
- [X] T015 [P] [US2] 在 `app/test-vision/page.tsx` 中处理 `captureFrame()` 返回 `null` 的情况：展示错误提示，不发送 `images` 字段（退化为纯文字请求）

---

## Phase 5: User Story 3 — 摄像头不可用时的降级处理 (P3)

**Goal**: 权限被拒或设备无摄像头时优雅降级，不影响纯文字对话。

**Independent Test**: 浏览器拒绝摄像头权限 → 页面显示友好提示 → 文字消息正常发送并获得 AI 回复。

- [X] T016 [US3] 在 `components/camera-capture.tsx` 的 `getUserMedia` 调用中捕获异常：`NotAllowedError` 提示「摄像头权限被拒绝，请在浏览器设置中允许访问」；`NotFoundError` 提示「未检测到摄像头设备」；其他错误提示「摄像头初始化失败」；均调用 `onError(message)` 并将开关重置为关闭状态
- [X] T017 [P] [US3] 在 `app/test-vision/page.tsx` 中：将 `onError` 回调接入页面错误状态并展示提示；确认摄像头关闭时发送请求不含 `images` 字段；确认后端无 `images` 时正常走纯文字流程（此时无需代码修改，仅验证）

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T018 [P] 在 `lib/ai/anthropic-provider.ts` 和 `lib/ai/openai-provider.ts` 中确认：构建多轮上下文时，历史消息中的 `imageBase64` 字段不传入 AI 请求（仅当前消息附带图片）
- [X] T019 [P] 验证 `app/api/health` 路由未受影响（访问 `/api/health` 返回 200）
- [X] T020 在 `app/test-vision/page.tsx` 中确认组件卸载时摄像头 track 被正确 stop（React `useEffect` cleanup）
- [X] T021 [P] 代码审查：确认无 data URI 前缀混入（前端只传纯 base64；Anthropic provider 的 `data` 字段不含前缀；OpenAI provider 的 `url` 字段含 `data:image/jpeg;base64,` 前缀）

---

## Dependency Graph

```
T001-T003 (Phase 1: 确认现状)
    └── T004-T005b (Phase 2: 类型+接口扩展) ← 阻塞所有 US
            ├── T006-T013 (Phase 3: US1) ← MVP 完整可测
            ├── T014-T015 (Phase 4: US2) ← 依赖 T011-T012
            └── T016-T017 (Phase 5: US3) ← 依赖 T011
                        └── T018-T021 (Phase 6: Polish)
```

## Parallel Execution Examples

### Phase 3 内可并行（US1）

```
同时执行:
  T006 anthropic chat() vision 实现
  T007 anthropic chatStream() vision 实现
  T008 openai chat() vision 实现
  T009 openai chatStream() vision 实现
  T011 CameraCapture 组件骨架（getUserMedia + 预览 + 开关）
完成后:
  T012 captureFrame() 实现（依赖 T011 骨架）
  T010 route.ts 扩展（依赖 T004）
完成后:
  T013 test-vision 测试页面（依赖 T011/T012/T010）
```

## Implementation Strategy

### MVP（仅 User Story 1）

1. Phase 1: 阅读确认现状（T001-T003）
2. Phase 2: 扩展类型接口（T004-T005b）**STOP 确认编译通过**
3. Phase 3: 实现 US1 全部任务（T006-T013）
4. **验证**: `/test-vision` 页面 → 开摄像头 → 问「你看到了什么？」→ AI 描述画面
5. 若验证通过，继续 Phase 4/5/6

### 增量交付

1. Phase 1+2 → 基础就绪
2. Phase 3 (US1) → Vision 核心可用 → **Demo!**
3. Phase 4 (US2) → 图片大小可靠
4. Phase 5 (US3) → 权限降级健壮
5. Phase 6 → 代码质量收尾

---

## 任务统计

| 阶段 | 任务数 | 可并行数 |
|------|--------|----------|
| Phase 1: Setup | 4 | 3 |
| Phase 2: Foundational | 3 | 2 |
| Phase 3: US1 | 8 | 4 |
| Phase 4: US2 | 2 | 1 |
| Phase 5: US3 | 2 | 1 |
| Phase 6: Polish | 4 | 3 |
| **合计** | **23** | **14** |

**MVP