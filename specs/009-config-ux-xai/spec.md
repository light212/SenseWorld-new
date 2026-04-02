# Feature Specification: 后台配置 UI 重设计 + xAI 接入

**Feature Branch**: `009-config-ux-xai`
**Created**: 2026-04-01
**Status**: Draft
**Input**: User description: "009-admin-config-ux-xai"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 运营选择 AI 服务商（Priority: P1）

运营人员进入后台配置页，在「大模型与基盘」板块看到三个服务商选项（OpenAI、Anthropic、xAI）以横向按钮排列。点击任意服务商后，页面只显示该服务商需要的配置字段，不相关的字段自动隐藏。对于 OpenAI 和 Anthropic，「代理地址」默认折叠，需要时可展开填写。对于 xAI，代理地址字段不出现（地址已内置）。

**Why this priority**: 这是整个配置重设计的核心入口，直接影响运营能否正确配置 AI 服务，是所有后续功能的前提。

**Independent Test**: 只实现服务商卡片选择 + 动态字段显示，不做其他改动，即可独立测试并交付价值。

**Acceptance Scenarios**:

1. **Given** 运营进入配置页，**When** 查看「大模型与基盘」，**Then** 看到 OpenAI / Anthropic / xAI 三个横向选项按钮，当前已配置的服务商处于选中状态
2. **Given** 当前选中 OpenAI，**When** 点击 Anthropic，**Then** 表单字段切换为 Anthropic 对应项，代理地址折叠在「高级设置」内，不自动显示
3. **Given** 当前选中 OpenAI，**When** 点击 xAI，**Then** 表单中无代理地址字段，只显示 API Key、模型名称、System Prompt
4. **Given** 选中任一服务商，**When** 展开「高级设置」（仅 OpenAI/Anthropic 显示），**Then** 出现代理地址输入框，可填写中转网关地址

---

### User Story 2 - 运营通过快捷选项选择模型（Priority: P1）

运营在已选择 AI 服务商后，在模型名称输入框上方看到该服务商的常用模型快捷选项（如 gpt-4o、gpt-4o-mini 等小标签）。点击某个标签，输入框自动填入该模型名称并高亮对应标签；也可以直接在输入框手动输入任意模型名称，此时快捷标签不高亮。

**Why this priority**: 运营人员不一定记得完整的模型名称，快捷标签减少输入错误，直接影响配置效率。

**Independent Test**: 在服务商选择基础上，单独测试模型快捷标签的填入和高亮逻辑即可交付价值。

**Acceptance Scenarios**:

1. **Given** 选中 OpenAI，**When** 查看模型名称区域，**Then** 看到 `gpt-4o`、`gpt-4o-mini`、`o1` 三个可点击标签
2. **Given** 点击 `gpt-4o-mini` 标签，**When** 查看输入框，**Then** 输入框自动填入 `gpt-4o-mini`，该标签背景变为深色
3. **Given** 手动在输入框输入 `gpt-4o`，**When** 查看快捷标签，**Then** `gpt-4o` 标签自动高亮
4. **Given** 手动输入不在快捷列表的模型名（如 `gpt-4-turbo`），**When** 查看快捷标签，**Then** 所有标签均不高亮，输入框保留自定义值

---

### User Story 3 - 运营配置语音信道服务商（Priority: P1）

运营在「语音信道」板块看到四个横向选项（OpenAI、Azure、xAI、不启用）。选择后只显示对应的配置字段：选 OpenAI 时显示 API Key + TTS 音色 + 折叠的代理地址；选 Azure 时显示 API Key + 服务区域 + TTS 音色；选 xAI 时显示 API Key + 交互模式切换 + TTS 音色快捷选项；选「不启用」时语音配置字段全部隐藏。

**Why this priority**: 语音配置直接影响用户端的交互体验，且目前配置缺少关键字段（区域、音色），是高优先级问题。

**Independent Test**: 独立于 AI 核心配置，单独测试语音信道的服务商选择和字段显示逻辑。

**Acceptance Scenarios**:

1. **Given** 选中 Azure，**When** 查看表单，**Then** 出现「服务区域」输入框（如 eastasia），且无代理地址字段
2. **Given** 选中 xAI，**When** 查看表单，**Then** 出现「交互模式」切换（标准 / 实时），以及 TTS 音色快捷标签（Eve、Ara、Rex、Sal、Leo）
3. **Given** 选中「不启用」，**When** 查看表单，**Then** 语音相关配置字段全部消失
4. **Given** 选中 OpenAI，**When** 展开「高级设置」，**Then** 出现代理地址输入框

---

### User Story 4 - xAI 实时语音对话（Priority: P2）

运营在语音信道中选择 xAI 并设置为「实时模式」后，用户端对话页面的输入栏出现「实时通话」按钮（与现有录音按钮并存）。用户点击该按钮后进入实时通话状态，说话后 AI 立即以语音实时回复，无需等待三步流程。通话结束后，本次对话内容保存到历史记录。

**Why this priority**: 实时语音模式依赖配置完成（P1 用户故事），且涉及前后端新组件，工程量较大，因此为 P2。

**Independent Test**: 后台配置 xAI 实时模式完成后，前端独立测试「实时通话」按钮的出现和连接即可交付基本价值。

**Acceptance Scenarios**:

1. **Given** 后台配置为 xAI + 实时模式，**When** 用户进入对话页，**Then** 输入栏显示「实时通话」按钮，现有录音和发送按钮保持不变
2. **Given** 用户点击「实时通话」，**When** 建立连接后，**Then** 用户说话后 AI 立即以语音实时回复，界面同步显示文字内容
3. **Given** 用户结束通话（点击「结束」按钮），**When** 通话关闭，**Then** 本次对话的文字记录自动保存到对话历史
4. **Given** 后台配置为 xAI 标准模式，**When** 用户进入对话页，**Then** 不显示「实时通话」按钮；现有录音按钮置灰，悬停提示「xAI STT 暂不可用」

---

### User Story 5 - xAI 作为 AI 核心使用（Priority: P2）

运营在 AI 核心中选择 xAI，填入 xAI API Key，选择模型（如 grok-2-vision-1212），保存后用户端的文字对话和图像识别（Vision）均通过 xAI 完成，无需额外配置。

**Why this priority**: xAI 模型能力与现有接口高度兼容，接入工程量小，但属于扩展能力，P2。

**Independent Test**: 后台配置 xAI API Key + 模型名后，前端发送带图片的消息，验证 AI 回复由 xAI 处理即可。

**Acceptance Scenarios**:

1. **Given** 选择 xAI 作为 AI 核心，填入有效 API Key 并选择 grok-2-vision-1212，**When** 保存配置，**Then** 用户端文字对话正常工作
2. **Given** 用户发送带摄像头截帧的消息，**When** AI 处理，**Then** 返回的回复正确描述了图片内容（Vision 功能正常）

---

### Edge Cases

- 运营选择 xAI 语音时选了「实时」模式，但后来将 AI 核心切换回 OpenAI——实时语音仍应按 xAI 语音配置独立工作，不互相干扰
- 运营保存时未填写必须的字段（如选 Azure 但未填服务区域）——表单给出提示，阻止保存
- 快捷标签与手动输入同时存在时，输入框始终反映真实配置值
- xAI 实时语音会话中途网络断开——前端显示断线提示，本次已收到的文字内容自动保存

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 系统必须在「大模型与基盘」配置区展示 OpenAI、Anthropic、xAI 三个服务商选项，以可视化选择方式呈现（非文本输入）
- **FR-002**: 系统必须根据选中的 AI 服务商动态显示对应配置字段，隐藏无关字段
- **FR-003**: OpenAI 和 Anthropic 服务商必须提供可折叠的「代理地址」高级设置项，xAI 不提供该项
- **FR-004**: 「模型名称」字段必须提供服务商对应的快捷选项标签，点击后自动填入；手动输入与快捷标签实时联动高亮
- **FR-005**: 系统必须在「语音信道」配置区展示 OpenAI、Azure、xAI、不启用四个选项
- **FR-006**: 选择 Azure 时必须显示「服务区域」输入项；选择 OpenAI 时必须提供可折叠代理地址；选择 xAI 时必须显示「标准 / 实时」交互模式切换
- **FR-007**: 语音信道必须提供「TTS 音色」选项，各服务商对应不同的音色快捷标签
- **FR-008**: 当语音信道设为 xAI + 实时模式时，系统必须在用户对话页面显示「实时通话」按钮
- **FR-009**: 实时通话结束后，系统必须将本次对话的完整文字记录保存到对话历史
- **FR-010**: 当语音信道设为 xAI + 标准模式时，录音按钮必须显示为禁用状态，且提供说明提示
- **FR-011**: 所有配置保存逻辑与现有「发布更改」按钮保持一致，不引入新的保存入口

### Key Entities

- **服务商配置（Provider Config）**：运营选择的 AI/语音/数字人服务商，决定对话请求的路由目标
- **语音模式（Voice Mode）**：语音信道下的子模式，「标准」走三步流程，「实时」走全链路单通道
- **实时通话会话（Realtime Session）**：用户端发起的实时语音连接，有开始/结束状态，结束后归档到对话历史

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 运营配置 AI 服务商从「打字填写」改为「点选」，完成一次服务商切换的操作步骤从 5 步减少到 2 步以内
- **SC-002**: 运营配置界面中不再出现与当前选中服务商无关的字段，视觉干扰项归零
- **SC-003**: 运营完成 xAI 全链路配置（AI 核心 + 语音信道）所需时间不超过 3 分钟
- **SC-004**: 切换服务商时，页面字段刷新无明显延迟（用户感知即时响应）
- **SC-005**: xAI 实时语音从用户发起通话到首次听到 AI 语音回复的端到端延迟不超过 2 秒（正常网络条件下）
- **SC-006**: 实时通话结束后，对话记录 100% 保存至历史，不丢失任何已完成的对话轮次

## Assumptions

- 运营人员在填写 xAI API Key 前已在 xAI 控制台注册并获取有效密钥
- xAI 实时语音的临时令牌接口已发布并可用；如不可用，需要额外降级方案
- 现有「发布更改」按钮的保存机制支持新增的配置键，无需修改后端 API
- 运营人员使用桌面端浏览器访问后台，不考虑移动端后台配置场景
- xAI 实时语音支持中文输入/输出（基于官方文档描述）
- 现有对话历史数据结构无需变更即可存储实时通话记录
