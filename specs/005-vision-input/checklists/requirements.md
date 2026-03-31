# Requirements Quality Checklist: Vision Input (005)

**Purpose**: Unit tests for the requirements writing quality of feature 005 — validates completeness, clarity, consistency, measurability, and coverage of the spec, not the implementation.
**Created**: 2025-07-21
**Feature**: [spec.md](../spec.md)

---

## Requirement Completeness

- [ ] CHK001 — Are error message requirements specified for all three distinct permission-failure types (NotAllowedError, NotFoundError, other) or only a generic fallback? [Completeness, Spec §US3-AC1]
- [ ] CHK002 — Are requirements defined for what happens when `captureFrame()` is called while the video element exists but `readyState` is 0 (metadata not yet loaded)? [Completeness, Gap]
- [ ] CHK003 — Are requirements specified for the visual state of the camera toggle button during the `getUserMedia` pending/loading phase (between click and permission response)? [Completeness, Gap]
- [ ] CHK004 — Are requirements documented for multi-turn conversation context: specifically, is it stated that *all* historical messages must be stripped of image content, or only the immediately preceding message? [Completeness, Spec §Edge Cases]
- [ ] CHK005 — Are requirements defined for session persistence across page reloads when the camera was active? [Completeness, Gap]
- [ ] CHK006 — Are requirements specified for how the frontend handles a streaming SSE error response when `images` is present but the provider returns a Vision-related error (e.g., unsupported image format)? [Completeness, Gap]

---

## Requirement Clarity

- [ ] CHK007 — Is the phrase "体现对画面的理解" (SC-001) quantified with measurable acceptance criteria, or is it subjectively assessable only? [Clarity, Ambiguity, Spec §SC-001]
- [ ] CHK008 — Is "200KB" in FR-005 / SC-002 defined as the byte size of the decoded binary, the raw base64 string length, or the base64 character count? [Clarity, Ambiguity, Spec §FR-005]
- [ ] CHK009 — Is "最新版本" (SC-005) defined as a specific version number range or release channel (stable/beta)? [Clarity, Ambiguity, Spec §SC-005]
- [ ] CHK010 — Does the spec clarify whether "纯 base64" means URL-safe base64 or standard base64 (the two encodings differ for `+` and `/`)? [Clarity, Spec §FR-007]
- [ ] CHK011 — Is the term "实时截帧" (US2-AC1) defined to exclude cached frames from a specific timeframe, or does it mean "captured at send time" with no further constraints? [Clarity, Spec §US2-AC1]
- [ ] CHK012 — Is "开关重置为关闭状态" (US3-AC1) specified to mean UI-only state reset, or does it also require releasing any partial MediaStream that may have been created before the error? [Clarity, Spec §US3-AC1]

---

## Requirement Consistency

- [ ] CHK013 — Is the 200KB limit in FR-005 consistent with the base64 length threshold of 272000 characters referenced in tasks.md (272000 × 0.75 ≈ 204KB, a slight discrepancy)? [Consistency, Spec §FR-005]
- [ ] CHK014 — Does the spec's error message for permission denial (US3-AC1: "摄像头不可用，请检查权限") align with the per-error-type messages required by FR-009 and tasks T016? [Consistency, Conflict, Spec §US3-AC1 vs §FR-009]
- [ ] CHK015 — Are the `LLMProvider.chat()` and `chatStream()` signatures described consistently across spec.md Key Entities and contracts/chat-api.md? [Consistency, Spec §Key Entities]
- [ ] CHK016 — Is the `images?: string[]` field described as "可选" consistently across all three documents (spec, API contract, and data-model)? [Consistency]

---

## Acceptance Criteria Quality

- [ ] CHK017 — Can SC-001 ("AI 回复中包含对画面内容的描述") be objectively and automatically verified, or does it require manual human judgment? [Measurability, Spec §SC-001]
- [ ] CHK018 — Is SC-003 ("不包含 `images` 字段或为空数组") unambiguous about which is the required behavior — absent field vs. empty array are semantically different for some consumers? [Clarity, Measurability, Spec §SC-003]
- [ ] CHK019 — Does SC-002 specify the measurement method (e.g., `atob(base64).length <= 204800`) to ensure deterministic pass/fail evaluation? [Measurability, Spec §SC-002]
- [ ] CHK020 — Are the acceptance scenarios in US1–US3 written with specific, observable outcomes, or do any use vague qualifiers like "正常" or "友好" without measurable criteria? [Measurability, Spec §US1–US3]

---

## Scenario Coverage

- [ ] CHK021 — Are requirements defined for the scenario where the user grants camera permission, the stream starts, but the video element fails to display (e.g., `srcObject` assignment fails)? [Coverage, Exception Flow, Gap]
- [ ] CHK022 — Are requirements specified for what happens when the user revokes camera permission *after* the stream is active (permission change mid-session via browser settings)? [Coverage, Exception Flow, Gap]
- [ ] CHK023 — Are requirements defined for the alternate flow where `supportsVision: false` but the frontend still sends `images`? Is the spec clear that the *backend* silently drops it rather than returning an error? [Coverage, Alternate Flow, Spec §FR-008]
- [ ] CHK024 — Are requirements specified for the scenario where `images[0]` is an empty string or malformed base64? Is input validation at the route layer defined? [Coverage, Exception Flow, Gap]
- [ ] CHK025 — Are requirements defined for the case where the AI provider returns a vision-specific error (e.g., Anthropic "image too large" despite compression)? [Coverage, Exception Flow, Gap]

---

## Edge Case Coverage

- [ ] CHK026 — Does the spec address the edge case where `video.videoWidth === 0` at the moment `captureFrame()` is called (video stream connected but first frame not yet rendered)? [Edge Case, Spec §Edge Cases]
- [ ] CHK027 — Are edge cases for concurrent send operations (user double-clicks send) addressed in requirements, given that `captureFrame()` is synchronous but the send flow is async? [Edge Case, Spec §Edge Cases]
- [ ] CHK028 — Is the edge case of tab/window backgrounding during active camera stream addressed beyond "截帧在发送消息时实时进行"? Are any browser-imposed camera suspension behaviors documented? [Edge Case, Spec §Edge Cases]
- [ ] CHK029 — Does the spec define requirements for mobile browsers where `getUserMedia` constraints may behave differently (e.g., `facingMode`) given SC-005 claims cross-browser support? [Edge Case, Gap]

---

## Non-Functional Requirements

- [ ] CHK030 — Are latency requirements defined for the `captureFrame()` → base64 → send pipeline, especially for low-end devices where Canvas operations may be slow? [NFR, Gap]
- [ ] CHK031 — Are memory management requirements specified for the MediaStream (e.g., maximum stream duration, GC behavior for Canvas elements created per-send)? [NFR, Gap]
- [ ] CHK032 — Are accessibility requirements defined for the camera toggle button (ARIA labels, keyboard operability, screen reader announcements for state changes)? [NFR, Coverage, Gap]
- [ ] CHK033 — Are privacy requirements documented for the camera stream — e.g., is it specified that no frames are stored server-side or logged? [NFR, Spec §Assumptions]
- [ ] CHK034 — Are requirements defined for what happens to the MediaStream when the browser tab is closed abruptly (not just component unmount via React cleanup)? [NFR, Edge Case, Gap]

---

## Dependencies & Assumptions

- [ ] CHK035 — Is the assumption "现代浏览器支持 getUserMedia" validated against the actual target user base, or is it stated without evidence? [Assumption, Spec §Assumptions]
- [ ] CHK036 — Is the dependency on feature 003 (`LLMProvider.supportsVision`) documented with a fallback strategy if feature 003's interface changes? [Dependency, Spec §Assumptions]
- [ ] CHK037 — Is the assumption that "Azure OpenAI 暂不实现" formally scoped as out-of-scope in the spec, or could it be misread as a known gap requiring follow-up? [Assumption, Spec §Assumptions]
- [ ] CHK038 — Is the migration path from the temporary `/test-vision` page to feature 006's chat UI documented as a formal dependency or only mentioned as an assumption? [Dependency, Spec §Assumptions]

---

## Ambiguities & Conflicts

- [ ] CHK039 — Is a requirement ID scheme established for traceability (FR-001 through FR-010 exist but US and SC items use different schemes without cross-references)? [Traceability, Ambiguity]
- [ ] CHK040 — Does the spec resolve the ambiguity of whether `images?: string[]` is future-proofed for multi-image or intentionally limited to one image, given the array type but "当前仅取第一个元素" constraint? [Ambiguity, Spec §FR-006]
- [ ] CHK041 — Is the conflict between US3-AC1 (generic error message) and the specific per-error-type messages implied by good UX practice explicitly resolved in the spec? [Conflict, Spec §US3-AC1]
