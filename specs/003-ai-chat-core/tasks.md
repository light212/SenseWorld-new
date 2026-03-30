# Tasks: AI Chat Core

**Input**: Design documents from `/specs/003-ai-chat-core/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/chat-api.md ✓

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and establish the `lib/ai/` directory structure.

- [x] T001 Install AI SDK dependencies: run `pnpm add @anthropic-ai/sdk openai` and verify package.json updated
- [x] T002 Verify `lib/ai/types.ts` exists (created in 001-project-scaffold) — `LLMProvider` interface and `ChatMessage` type already defined there; all providers in this feature import from `@/lib/ai/types`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core LLM abstraction layer that ALL user stories depend on. Must be complete before any story work.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T003 Confirm `lib/ai/types.ts` interface matches needs: `LLMProvider` has `chatStream(messages: ChatMessage[]): AsyncIterable<string>`, `supportsVision: boolean`, `supportsNativeAudio: boolean`; `ChatMessage` has `role`, `content`, `imageBase64?` — no changes needed, proceed to T004
- [x] T004 [P] Create `lib/ai/openai-provider.ts` — implement `LLMProvider` using `openai` SDK: constructor takes `(apiKey: string, model: string)`, `stream()` calls `client.chat.completions.create({ stream: true })` and yields `chunk.choices[0]?.delta?.content` strings
- [x] T005 [P] Create `lib/ai/anthropic-provider.ts` — implement `LLMProvider` using `@anthropic-ai/sdk`: constructor takes `(apiKey: string, model: string)`, `stream()` calls `client.messages.stream()` and yields `event.delta.text` for `content_block_delta` events
- [x] T006 Create `lib/ai/factory.ts` — implement `LLMFactory.create(provider: string, apiKey: string, model: string): LLMProvider` that returns `OpenAIProvider` when `provider === 'openai'`, `AnthropicProvider` when `provider === 'anthropic'`, throws `Error('AI provider not configured')` otherwise

---

## Phase 3: User Story 1 — 访客发起流式 AI 对话 (P1)

**Goal**: Visitor sends a message → SSE stream returns AI reply → conversation persisted.

**Independent Test**: POST `/api/chat?token=<valid>` with `{ message: "你好" }`, verify `Content-Type: text/event-stream`, receive `data: {"text":"..."}` chunks, then `data: [DONE]`; confirm `Message` rows written to DB.

- [x] T007 [US1] Verify `ChatSession` and `Message` models exist in `prisma/schema.prisma` (no migration needed — reusing 001 schema); confirm `MessageRole` enum and relations match data-model.md
- [x] T008 [US1] Create `app/api/chat/route.ts` with `export const dynamic = 'force-dynamic'` and stub `export async function POST(req: Request)` returning `Response` — skeleton only, no logic yet
- [x] T009 [US1] Add token validation to `app/api/chat/route.ts`: read `?token` query param, query `AccessToken` table via Prisma (`enabled === true && (expiresAt === null || expiresAt > new Date())`), return `401 { error: 'unauthorized' }` if invalid
- [x] T010 [US1] Add request body parsing to `app/api/chat/route.ts`: destructure `{ sessionId, message }` from JSON body, return `400 { error: 'message is required' }` if `message` is missing or empty string
- [x] T011 [US1] Add session management to `app/api/chat/route.ts`: if `sessionId` absent create new `ChatSession` (with `accessToken` field), if present query DB and return `404 { error: 'session not found' }` if missing
- [x] T012 [US1] Add history loading and user message persistence to `app/api/chat/route.ts`: query `Message` table for session ordered by `createdAt ASC`, map to `LLMMessage[]`, then `prisma.message.create({ data: { sessionId, role: 'user', content: message } })`
- [x] T013 [US1] Add config loading and LLM invocation to `app/api/chat/route.ts`: call `getConfig()` to read `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `SYSTEM_PROMPT`; return `503 { error: 'AI provider not configured' }` if provider missing; call `LLMFactory.create()` then `provider.stream(messages, systemPrompt)`
- [x] T014 [US1] Implement SSE `ReadableStream` response in `app/api/chat/route.ts`: `new ReadableStream({ async start(controller) { ... } })` that iterates the provider AsyncGenerator, encodes each chunk as `data: {"text":"..."}

`, sends `data: [DONE]

` on completion, closes controller in `finally`, and asynchronously saves assistant message via `prisma.message.create({ data: { sessionId, role: 'assistant', content: accumulated } })`. Return `new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no', 'X-Session-Id': sessionId } })`
- [x] T015 [US1] Add LLM error handling to `app/api/chat/route.ts` SSE stream: catch errors inside the ReadableStream start function, encode `data: {"error":"LLM provider error: <message>"}

` then `data: [DONE]

` before closing controller

---

## Phase 4: User Story 2 — 多轮对话上下文保持 (P2)

**Goal**: Subsequent messages in same session include full history; AI replies reflect earlier context.

**Independent Test**: POST with `{ message: "我叫张三" }` → get sessionId → POST with `{ sessionId, message: "我叫什么名字" }` → verify AI reply contains "张三".

**Dependency**: Requires Phase 3 (US1) complete.

- [x] T016 [US2] Verify history loading in `app/api/chat/route.ts` (T012) passes complete ordered `Message` list as context to `provider.stream()` — trace that `messages` array sent to LLM includes both `user` and `assistant` roles in `createdAt ASC` order
- [x] T017 [US2] Verify that each request appends (not overwrites) messages: after two full exchanges the `Message` table should contain exactly 4 rows for the session (2× user + 2× assistant) with no duplicates — add a DB-level assertion comment or integration test note in `app/api/chat/route.ts`

---

## Phase 5: User Story 3 — AI Provider 可切换（Provider-Plugin 架构）(P3)

**Goal**: Changing `AI_PROVIDER` config takes effect on the next request with no restart.

**Independent Test**: Set `AI_PROVIDER=anthropic` in Config table → send chat request → verify Anthropic SDK used; change to `openai` → verify OpenAI SDK used.

**Dependency**: Requires Phase 2 (Foundational) complete; independent of US1/US2 at code level.

- [x] T018 [US3] Confirm `getConfig()` in `lib/config.ts` (from 002) has NO in-memory cache — each call reads DB fresh; if caching exists, document the known limitation in a code comment in `app/api/chat/route.ts`
- [x] T019 [US3] Verify `lib/ai/factory.ts` (T006) correctly branches on `AI_PROVIDER` value and that both `OpenAIProvider` and `AnthropicProvider` implement the same `LLMProvider` interface — no changes expected, this is a validation task

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T020 Review `app/api/chat/route.ts` for missing `await` on DB writes in `finally` block — confirm `saveAssistantMessage` is fire-and-forget with `.catch(console.error)` and document trade-off in a comment
- [x] T021 Verify `export const dynamic = 'force-dynamic'` is present at the top of `app/api/chat/route.ts` to prevent Next.js static caching of the SSE route

---

## Dependencies Graph

```
Phase 1 (Setup)
  └── Phase 2 (Foundational: LLM abstraction)
        ├── Phase 3 (US1: P1 — streaming chat) ← MVP
        │     └── Phase 4 (US2: P2 — multi-turn context)
        └── Phase 5 (US3: P3 — provider switching)  [independent of US1/US2]
```

---

## Parallel Execution Opportunities

**Within Phase 2** (after T003 types are defined):
- T004 `openai-provider.ts` ‖ T005 `anthropic-provider.ts` — different files, no dependency

**Within Phase 3** (after T011 session is resolved):
- T012 (history + user msg save) must precede T013 (LLM invocation)
- T014 (SSE stream) must precede T015 (error handling — same file, sequential)

**Cross-phase**:
- Phase 5 (US3) tasks T018–T019 are purely validation; can be done in parallel with Phase 4 (US2)

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006) — **blocks everything**
3. Complete Phase 3: User Story 1 (T007–T015)
4. **STOP and VALIDATE**: Run quickstart.md curl tests — SSE stream works, DB rows created
5. Ship MVP

### Incremental Delivery

1. Setup + Foundational → LLM abstraction ready
2. User Story 1 → **single-turn streaming chat works** → Deploy (MVP)
3. User Story 2 → multi-turn context works → Deploy
4. User Story 3 → provider switching validated → Deploy

### Parallel Team Strategy

- After T003 (types): Dev A does T004 (OpenAI), Dev B does T005 (Anthropic) simultaneously
- After Phase 2: Dev A builds route.ts (US1), Dev B validates provider switching (US3)
