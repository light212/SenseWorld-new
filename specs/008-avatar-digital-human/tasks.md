# Tasks: 008-avatar-digital-human

**Input**: Design documents from `/specs/008-avatar-digital-human/`  
**Branch**: `008-avatar-digital-human`  
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行执行（不同文件，无未完成依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 无 Story 标签 = Setup / Foundational / Polish 阶段

---

## Phase 1: Setup（共享基础设施）

**目标**：无需新建项目结构，复用现有骨架；本阶段只做接口重构和工厂注册准备。

- [x] T001 更新 `lib/avatar/types.ts`：将 `generateVideo` / `getStatus` 替换为 `submitVideo(text): Promise<string>` 和 `getVideoStatus(jobId): Promise<{status, videoUrl?}>` 接口方法
- [x] T002 更新 `lib/types/chat.ts`：在 `CapabilityFlags` 接口中新增 `supportsAvatar: boolean` 字段

---

## Phase 2: Foundational（阻塞性前置任务）

**目标**：实现 Provider 层和后端路由，所有用户故事依赖此阶段完成。

**⚠️ 必须全部完成后才能进入 Phase 3+**

- [x] T003 新建 `lib/avatar/heygen-provider.ts`：实现 `AvatarProvider` 接口，`submitVideo` 调用 `POST https://api.heygen.com/v2/video/generate`（body: `{video_inputs: [{character: {type:'avatar', avatar_id}, voice: {type:'text', input_text: text}}], dimension:{width:1280,height:720}}`），返回 `video_id` 作为 jobId；`getVideoStatus` 调用 `GET https://api.heygen.com/v1/video_status.get?video_id=<jobId>`，映射 `status` 字段和 `video_url` 到统一格式
- [x] T004 新建 `lib/avatar/did-provider.ts`：实现 `AvatarProvider` 接口，`submitVideo` 调用 `POST https://api.d-id.com/talks`（body: `{source_url: actorId, script: {type:'text', input: text}}`，Authorization: `Basic <base64(apiKey)>`），返回 `id` 作为 jobId；`getVideoStatus` 调用 `GET https://api.d-id.com/talks/<jobId>`，映射 `status`（`created/started` → `processing`，`done` → `done`）和 `result_url` → `videoUrl`
- [x] T005 更新 `lib/avatar/factory.ts`：取消 `heygen` 和 `did` case 注释，导入并实例化 `HeyGenProvider` 和 `DIDProvider`；`create` 方法接收第三个参数 `actorId: string`，透传给 Provider 构造函数
- [x] T006 新建 `app/api/avatar/route.ts`：`POST /api/avatar?token=<token>`，验证 token，读取 `AVATAR_PROVIDER`/`AVATAR_API_KEY`/`AVATAR_ACTOR_ID`/`AVATAR_MAX_CHARS` 配置，文本超过上限时截断，调用 `AvatarFactory.create()` 的 `submitVideo`，返回 `{jobId}`；Provider 未配置返回 503，服务商调用失败返回 503
- [x] T007 新建 `app/api/avatar/status/route.ts`：`GET /api/avatar/status?jobId=<id>&token=<token>`，验证 token，读取相同配置，调用 `getVideoStatus(jobId)`，原样返回 `{status, videoUrl?}`
- [x] T008 [P] 更新 `app/api/capabilities/route.ts`：读取 `AVATAR_PROVIDER` 配置，新增 `supportsAvatar: !!avatarProvider`；当 `supportsAvatar` 为 true 时 `supportsTTS` 返回 `false`（数字人内置音频优先）

---

## Phase 3: User Story 1 — 用户观看数字人视频回复（P1）

**故事目标**：用户发送消息 → AI 文字回复先显示 → 数字人视频自动播放，两者不互相阻塞。

**独立验收**：配置有效的 HeyGen 或 D-ID 凭证，发送消息，页面出现视频播放区域并在生成后自动播放。

- [x] T009 [US1] 新建 `components/chat/avatar-player.tsx`：接收 props `{loading: boolean, videoUrl: string|null, error: string|null}`；`loading` 时显示骨架动画占位区域（固定高度 `h-48`）；`videoUrl` 存在时渲染 `<video src={videoUrl} autoPlay muted playsInline controls className="w-full rounded-lg" />`，附带「🔊 取消静音」按钮（点击后 `video.muted = false`）；`error` 时显示灰色提示文字「数字人暂时不可用」；三者都为空时不渲染任何内容
- [x] T010 [US1] 更新 `app/(chat)/page.tsx`：
  1. 新增 state：`avatarVideoUrl`、`avatarLoading`、`avatarError`
  2. 新增 ref：`avatarPollCancelRef`（取消轮询标志）
  3. 实现 `pollAvatarStatus(jobId)` 函数：每 2 秒轮询 `/api/avatar/status`，最多 30 次（60 秒），`done` 时设置 `avatarVideoUrl`，`failed`/超时时设置 `avatarError`，`avatarPollCancelRef.current` 为 true 时立即退出
  4. AI 流式回复结束后（现有 SSE 完成回调处），当 `capabilities.supportsAvatar` 为 true 时：设置 `avatarLoading=true`，调用 `POST /api/avatar` 获取 jobId，启动轮询
  5. 发送新消息前：设置 `avatarPollCancelRef.current=true`，重置 `avatarLoading/avatarVideoUrl/avatarError`
  6. 在消息列表上方渲染 `<AvatarPlayer loading={avatarLoading} videoUrl={avatarVideoUrl} error={avatarError} />`

---

## Phase 4: User Story 2 — 运营人员配置数字人服务（P2）

**故事目标**：运营在后台填写服务商凭证，保存后立即生效，无需重启。

**独立验收**：进入后台配置页，切换服务商填写有效凭证保存，对话页面数字人生效。

- [x] T011 [US2] 更新 `components/admin/ConfigForm.tsx`：将现有 `AVATAR_PROVIDER` 的 placeholder 从空字符串改为 `'heygen / did'`，去掉「预留」标注；将 `AVATAR_API_KEY` 的「预留」标注去掉；在 `AVATAR_API_KEY` 之后新增两个配置项：`{key: 'AVATAR_ACTOR_ID', label: 'Avatar 形象 ID', placeholder: 'HeyGen: avatar_id | D-ID: source_url'}` 和 `{key: 'AVATAR_MAX_CHARS', label: 'Avatar 文本上限（字符数）', placeholder: '300'}`

---

## Phase 5: User Story 3 — 数字人功能异常降级处理（P3）

**故事目标**：服务不可用时自动降级为文字/语音，对话不中断，用户看到友好提示。

**独立验收**：配置无效 API Key，发送消息，页面显示「数字人暂时不可用」，文字/语音回复正常。

> **注意**：降级逻辑已内嵌于 T006（503 响应）、T007（failed 状态）和 T009/T010（error prop 展示）中。本阶段验证端到端降级路径完整。

- [x] T012 [US3] 验证 `app/api/avatar/route.ts` 在以下场景返回正确错误：(a) `AVATAR_PROVIDER` 未配置 → 503 `avatar service unavailable`；(b) 服务商 API 返回非 2xx → 503；确保路由中的 try/catch 覆盖网络超时（`AbortController` 设置 10s 超时）
- [x] T013 [US3] 验证 `components/chat/avatar-player.tsx` 的 `error` prop 展示路径：在 `app/(chat)/page.tsx` 中确认 `pollAvatarStatus` 在 `failed` 状态和超时场景均调用 `setAvatarError`，且消息历史仍可正常滚动和交互

---

## Phase 6: Polish & 横切关注点

- [x] T014 [P] 检查 `lib/avatar/heygen-provider.ts` 和 `lib/avatar/did-provider.ts`：确保所有外部 fetch 调用设置了 `AbortController`（超时 10s），catch 块将外部错误统一转为 `throw new Error('avatar provider error: ...')`，不向外暴露原始错误信息
- [x] T015 [P] 更新 `specs/008-avatar-digital-human/quickstart.md` 中的「文件变更清单」以反映最终实际变更的文件（按 T001-T013 执行结果更新）
- [x] T016 在 `app/(chat)/page.tsx` 中确认 `capabilities.supportsAvatar` 为 false 时 `AvatarPlayer` 完全不渲染（不占空间），与 006 chat-ui 的现有布局兼容

---

## 依赖关系图

```
T001 (types) ──→ T003 (heygen), T004 (did)
T002 (chat types) ──→ T008 (capabilities)
T003, T004 ──→ T005 (factory)
T005 ──→ T006 (avatar route), T007 (status route)
T006, T007, T008 ──→ T010 (chat page)
T009 (avatar-player) ──→ T010 (chat page)
T011 独立（仅 UI 配置）
T012, T013 依赖 T006, T007, T009, T010 完成后验证
T014, T015, T016 最后执行
```

## 实施策略

### MVP 路径（仅 User Story