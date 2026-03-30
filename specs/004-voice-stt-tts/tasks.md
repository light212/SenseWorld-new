# Tasks: Voice STT/TTS 可配置语音能力

**Branch**: `004-voice-stt-tts`
**Input**: Design documents from `/specs/004-voice-stt-tts/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- No automated tests required per spec

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 提取共享 token 校验工具，供所有语音端点复用

- [ ] T001 读取 `app/api/chat/route.ts` 中的 `validateToken()` 内联实现，将其提取到 `lib/auth/token.ts` 并 export
- [ ] T002 更新 `app/api/chat/route.ts`，将内联 `validateToken()` 替换为 `import { validateToken } from '@/lib/auth/token'`
- [ ] T003 确认 `app/api/speech/` 目录结构：将现有占位 `app/api/speech/route.ts`（若存在）删除或保留为空，确保 `stt/` 和 `tts/` 子目录路径正确

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 实现 Provider 基础设施，所有端点依赖此层

⚠️ **CRITICAL**: Phase 3、4 均依赖此阶段完成

- [ ] T004 [P] 实现 `lib/speech/openai-speech-provider.ts`：
  - 实现 `SpeechProvider` 接口
  - `transcribe()`: 使用 `openai.audio.transcriptions.create()` + `toFile()` 将 Buffer 转为 File-like 对象，model: `whisper-1`
  - `synthesize()`: 使用 `openai.audio.speech.create()`，model: `tts-1`，默认 voice: `alloy`（可由 `tts_voice` Config 覆盖），返回 `{ audio: Buffer, mimeType: 'audio/mpeg' }`
  - 构造函数接受 `apiKey: string, voice?: string`
- [ ] T005 [P] 实现 `lib/speech/azure-speech-provider.ts`：
  - 实现 `SpeechProvider` 接口
  - `transcribe()`: POST `https://{region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=zh-CN`，header: `Ocp-Apim-Subscription-Key`，返回 JSON `{ DisplayText }`
  - `synthesize()`: POST `https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`，SSML body，header: `X-Microsoft-OutputFormat: riff-16khz-16bit-mono-pcm`，返回 `{ audio: Buffer, mimeType: 'audio/wav' }`
  - 构造函数接受 `apiKey: string, region: string, voice?: string`
- [ ] T006 更新 `lib/speech/factory.ts`：取消注释 `case 'openai'` 和 `case 'azure'`，import 两个 Provider，从 `SpeechFactory.create()` 参数中传入 voice

**Checkpoint**: 此阶段完成后，`SpeechFactory.create('openai', apiKey)` 和 `SpeechFactory.create('azure', apiKey, region)` 可正常实例化

---

## Phase 3: User Story 1 - 语音输入转文字 STT (Priority: P1)

**Goal**: 交付 `/api/speech/stt` 端点，接收音频文件返回转写文本

**Independent Test**:
```bash
curl -X POST "http://localhost:3000/api/speech/stt?token=<valid_token>" \
  -F "audio=@test.wav;type=audio/wav"
# 预期: { "text": "<转写内容>" }
```
参考 `specs/004-voice-stt-tts/quickstart.md` 获取完整测试步骤

### Implementation for User Story 1

- [ ] T007 [US1] 创建 `app/api/speech/stt/route.ts`：
  - `export const dynamic = 'force-dynamic'`
  - `export const runtime = 'nodejs'`
  - token 校验：`import { validateToken } from '@/lib/auth/token'`，query param `token`，失败返回 401
  - 解析 `req.formData()`，取 `audio` 字段（`File` 类型），若无则返回 400 `{ error: 'audio is required' }`
  - 文件大小检查：`file.size > 25 * 1024 * 1024` 返回 413 `{ error: 'file too large, max 25MB' }`
  - 读取 Config：`getConfig('speech_provider')`, `getConfig('speech_api_key')`, `getConfig('speech_region')`, `getConfig('tts_voice')`
  - 若 `speech_provider` 为 null 返回 503 `{ error: 'speech service not configured' }`
  - 调用 `SpeechFactory.create()` -> `provider.transcribe(Buffer.from(await file.arrayBuffer()), file.type || 'audio/webm')`
  - 捕获外部 API 错误返回 502 `{ error: 'speech service error' }`
  - 成功返回 200 `{ text: string }`

**Checkpoint**: User Story 1 完整可测试 — curl 上传音频文件可得转写文本

---

## Phase 4: User Story 2 - 文字转语音 TTS (Priority: P2)

**Goal**: 交付 `/api/speech/tts` 端点，接收文本返回音频流

**Independent Test**:
```bash
curl -X POST "http://localhost:3000/api/speech/tts?token=<valid_token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "你好世界"}' \
  --output output.mp3 && afplay output.mp3
# 预期: 返回可播放音频文件
```
参考 `specs/004-voice-stt-tts/quickstart.md` 获取完整测试步骤

### Implementation for User Story 2

- [ ] T008 [US2] 创建 `app/api/speech/tts/route.ts`：
  - `export const dynamic = 'force-dynamic'`
  - `export const runtime = 'nodejs'`
  - token 校验：同 T007，失败返回 401
  - 解析 JSON body：`{ text: string }`，若 `text` 为空字符串或缺失返回 400 `{ error: 'text is required' }`
  - 读取 Config：`speech_provider`, `speech_api_key`, `speech_region`, `tts_voice`
  - 若 `speech_provider` 为 null 返回 503 `{ error: 'speech service not configured' }`
  - 调用 `SpeechFactory.create()` -> `provider.synthesize(text)`
  - 返回音频流：`new Response(audioBuffer, { headers: { 'Content-Type': mimeType, 'Content-Disposition': 'inline' } })`
  - 捕获外部 API 错误返回 502 `{ error: 'speech service error' }`

**Checkpoint**: User Stories 1 AND 2 均可独立测试

---

## Phase 5: User Story 3 - 运营配置语音服务商 (Priority: P3)

**Goal**: 运营可通过管理后台配置 speech 相关 Config key，切换服务商无需重启

**Independent Test**:
1. DB 中更新 `speech_provider` 从 `openai` 到 `azure`
2. 立即调用 STT/TTS 端点，验证新服务商生效（无需重启）

### Implementation for User Story 3

- [ ] T009 [US3] 验证 `lib/config.ts` 的 `getConfig()` 函数每次请求从 DB 读取（无内存缓存），确保切换服务商后立即生效；若有缓存则记录此 open question
- [ ] T010 [P] [US3] 在运营后台配置面板（`app/admin/` 相关页面）确认 `speech_provider`、`speech_api_key`、`speech_region`、`tts_voice` 这 4 个 Config key 已可通过现有配置 UI 写入（feature 002 实现的通用 Config 面板应已支持，仅验证无需新增 UI）

**Checkpoint**: 运营配置切换后，下一次 STT/TTS 请求使用新服务商

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T011 检查并处理 `app/api/speech/route.ts` 占位文件：若存在且为空/无用，删除之；确保 Next.js 路由不冲突（`/api/speech` vs `/api/speech/stt`、`/api/speech/tts`）
- [ ] T012 [P] 验证 `lib/auth/token.ts` 提取后 `/api/chat` 端点功能正常（手动测试 chat 仍可用）
- [ ] T013 运行 `pnpm build` 确认无 TypeScript 类型错误和构建失败
- [ ] T014 验证 `/api/health` 端点仍正常（constitution 要求）

---

## Dependencies

```
Phase 1 (T001-T003) ──→ Phase 2 (T004-T006) ──→ Phase 3 (T007)
                                               ──→ Phase 4 (T008)
                                               ──→ Phase 5 (T009-T010)
Phase 3 + Phase 4 + Phase 5 ──→ Phase 6 (T011-T014)
```

**Parallel opportunities within phases**:
- Phase 2: T004 (OpenAI provider) ‖ T005 (Azure provider) — 完全独立，可同时实现
- Phase 5: T009 (cache check) ‖ T010 (admin UI verify) — 互不依赖
- Phase 6: T012 (chat verify) ‖ T013 (build check) ‖ T014 (health check) — 互不依赖

## Implementation Strategy

**MVP (User Story 1 only)**:
完成 T001 → T002 → T003 → T004 → T006 → T007，即可演示 OpenAI STT 能力。Azure STT、TTS 均可后续增量交付。

**Full delivery order**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

## Summary

| Metric | Value |
|--------|-------|
| Total tasks | 14 |
| Phase 1 (Setup) | 3 tasks |
| Phase 2 (Foundational) | 3 tasks (2 parallelizable) |
| Phase 3 (US1 - STT) | 1 task |
| Phase 4 (US2 - TTS) | 1 task |
| Phase 5 (US3 - Config) | 2 tasks (1 parallelizable) |
| Phase 6 (Polish) | 4 tasks (3 parallelizable) |
| New files | 5 (`lib/auth/token.ts`, `lib/speech/openai-speech-provider.ts`, `lib/speech/azure-speech-provider.ts`, `app/api/speech/stt/route.ts`, `app/api/speech/tts/route.ts`) |
| Modified files | 2 (`lib/speech/factory.ts`, `app/api/chat/route.ts`) |
