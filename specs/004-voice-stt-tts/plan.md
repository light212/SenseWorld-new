# Implementation Plan: Voice STT/TTS 可配置语音能力

**Branch**: `004-voice-stt-tts` | **Date**: 2025-07-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-voice-stt-tts/spec.md`

## Summary

为 SenseWorld 提供可配置的语音输入（STT）和语音输出（TTS）后端 API 能力。实现 `OpenAISpeechProvider`（基于 OpenAI SDK v6）和 `AzureSpeechProvider`（基于 Azure Speech REST API，不使用 SDK），注册到 `SpeechFactory`，并交付 `/api/speech/stt` 和 `/api/speech/tts` 两个端点。运营可通过 `Config` 表切换服务商，无需重启。

**关键设计修正**：spec.md 假设使用 `microsoft-cognitiveservices-speech-sdk`，但该 SDK 与 Next.js 14 App Router Webpack 打包不兼容（原生 node-gyp 模块）。本计划改用 Azure Speech REST API（Node.js 20 内置 `fetch`），无需额外依赖。

## Technical Context

**Language/Version**: TypeScript 5, Node.js 20 LTS
**Primary Dependencies**: Next.js 14.2 App Router, `openai` ^6.33.0 (已有), native `fetch` (Azure REST)
**Storage**: MySQL via Prisma 5 — `Config` 表（现有）存储语音配置
**Testing**: 手动 curl/Postman 测试各端点；无自动化测试框架要求
**Target Platform**: Node.js 20 服务端（Next.js App Router route handlers）
**Performance Goals**: STT ≤ 5s（10 秒音频）；TTS ≤ 3s（100 字以内）
**Constraints**: 音频上传 ≤ 25MB（OpenAI Whisper 限制）；无前端 UI（UI 在 feature 006）
**Scale/Scope**: 单一 Next.js 应用，后端 API 层，2 个新端点，3 个新文件

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Provider-Plugin Architecture | PASS | `OpenAISpeechProvider` + `AzureSpeechProvider` 实现现有 `SpeechProvider` 接口，通过 `SpeechFactory` 分发，业务层零改动 |
| II. Operator-Configurable Runtime | PASS | 语音服务商和密钥从 `Config` 表读取，运营后台可改，无硬编码默认值 |
| III. No Emoji Policy | PASS | 所有文件无 emoji |
| IV. Spec-Driven Development | PASS | spec.md 先于 plan.md，遵循流程 |
| V. Security-First Secrets | PASS | API Key 存 `Config` 表（DB），不提交到 repo，不写入代码 |
| VI. Minimal Surface Area | PASS | 仅新增 2 个 Provider 文件 + 更新 factory.ts + 更新 speech route；无新 Prisma model |
| VII. Package Manager Uniformity | PASS | 无需新增 npm 包（`openai` 已有，Azure 用 `fetch`） |

**Gate Result**: ALL PASS — 可进入 Phase 1 设计。

## Project Structure

### Documentation (this feature)

```text
specs/004-voice-stt-tts/
├── plan.md          # This file
├── research.md      # Azure REST vs SDK decision, API patterns
├── spec.md          # Feature specification
├── data-model.md    # Phase 1 — Config keys reference
├── quickstart.md    # Phase 1 — curl test guide
├── contracts/       # Phase 1 — API contracts
│   ├── stt.md
│   └── tts.md
└── tasks.md         # Phase 2 output
```

### Implementation Files

```text
lib/speech/
├── types.ts                        # (existing) SpeechProvider interface
├── factory.ts                      # (modify) register openai + azure cases
├── openai-speech-provider.ts       # (new) OpenAI Whisper STT + TTS
└── azure-speech-provider.ts        # (new) Azure REST API STT + TTS

app/api/speech/
├── stt/
│   └── route.ts                    # (new) POST /api/speech/stt
└── tts/
    └── route.ts                    # (new) POST /api/speech/tts
```

**Structure Decision**: 扩展现有 `lib/speech/` 目录，与 `lib/ai/` 的 Provider 模式保持一致。STT 和 TTS 拆分为独立路由（`/stt` 和 `/tts` 子目录），与 spec FR-001/FR-002 对应。现有 `app/api/speech/route.ts` 作用待确认（可能是占位文件）。

## Phase 0: Research

**Status**: COMPLETE — 见 [research.md](./research.md)

**Resolved questions**:
1. Azure SDK 兼容性问题 -> 改用 REST API，零新依赖
2. OpenAI Node.js 服务端 Buffer -> 用 `toFile()` 辅助函数
3. Next.js 14 multipart 解析 -> 原生 `req.formData()`
4. 无需修改 Prisma schema

## Phase 1: Design

### Data Model

见 [data-model.md](./data-model.md)（Phase 1 输出）

### API Contracts

见 [contracts/stt.md](./contracts/stt.md) 和 [contracts/tts.md](./contracts/tts.md)

### Quickstart

见 [quickstart.md](./quickstart.md)

## Implementation Approach

### 1. `lib/speech/openai-speech-provider.ts`

- 构造函数接收 `apiKey: string`, `voice?: string`
- `transcribe()`: 调用 `openai.audio.transcriptions.create()`, 用 `toFile()` 包装 Buffer
- `synthesize()`: 调用 `openai.audio.speech.create()`, 返回 `audio/mpeg`
- 捕获 OpenAI SDK 的文件大小错误，重新抛出为可识别错误

### 2. `lib/speech/azure-speech-provider.ts`

- 构造函数接收 `apiKey: string`, `region: string`, `voice?: string`
- `transcribe()`: `fetch` 到 Azure STT REST 端点，解析 `DisplayText`
- `synthesize()`: `fetch` 到 Azure TTS REST 端点（SSML），返回 `audio/wav`
- 非 2xx 响应抛出错误，上层路由处理为 502

### 3. `lib/speech/factory.ts`

- 取消现有注释的两个 case
- 从 `Config` 表读取 `speech_provider`, `speech_api_key`, `speech_region`, `tts_voice`
- 使用 `getConfig()` 工具函数（与 `lib/config.ts` 保持一致）

### 4. `app/api/speech/stt/route.ts`

- `export const runtime = 'nodejs'`
- 复用 `validateToken()` 逻辑（与 `/api/chat/route.ts` 一致，提取到共享 lib 或内联）
- `req.formData()` 解析音频文件 -> Buffer
- 调用 `SpeechFactory.create()` -> `provider.transcribe()`
- 返回 `{ text: string }`
- 错误映射：未配置 -> 503，无文件 -> 400，文件过大 -> 413，外部 API 失败 -> 502

### 5. `app/api/speech/tts/route.ts`

- `export const runtime = 'nodejs'`
- 复用 token 校验
- 解析 `{ text: string }` from request body
- 调用 `SpeechFactory.create()` -> `provider.synthesize()`
- 返回音频二进制流（`Response` with appropriate `Content-Type`）
- 错误映射：未配置 -> 503，空文本 -> 400，外部 API 失败 -> 502

## Complexity Tracking

> No constitution violations — section N/A

## Open Questions

1. `app/api/speech/route.ts`（现有占位文件）是否需要保留或删除？实现时确认其内容后决定。

## Decisions Made

- `validateToken()` 函数提取到 `lib/auth/token.ts`，供 `/api/chat`、`/api/speech/stt`、`/api/speech/tts` 共同复用。`/api/chat/route.ts` 中的内联实现同步替换为 import。
