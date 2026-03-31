# Quickstart: 006-chat-ui

## 最小可验证场景（US1: 文字对话）

### 前置条件

- 运营后台已配置 AI Provider（`AI_PROVIDER` + `AI_API_KEY` + `AI_MODEL`）
- 已生成一个有效 Access Token

### 验证步骤

1. 启动开发服务器：`pnpm dev`
2. 访问 `http://localhost:3000/chat?token=<your_token>`
3. 页面加载后应显示空消息列表（无历史）或已有历史消息
4. 在输入框输入「你好」，按 Enter 或点击发送
5. 用户消息气泡出现，AI 回复开始流式渲染
6. AI 回复完成，发送按钮恢复可用

**期望结果**：完整的一轮文字对话可正常进行。

---

## US2 验证：语音输入（需 STT 配置）

1. 运营后台配置 `SPEECH_PROVIDER` + `SPEECH_API_KEY`
2. 访问 `/chat?token=<token>`，录音按钮应可见
3. 按住录音按钮，说话，松开
4. 约 1-3 秒后转录文字出现，AI 自动回复

---

## US3 验证：摄像头视觉

1. 访问 `/chat?token=<token>`，点击摄像头开关
2. 授权后预览画面出现
3. 发送消息「你看到了什么？」
4. AI 回复包含对画面的描述（需 AI_PROVIDER 支持 Vision）

---

## US4 验证：TTS 语音回复

1. 确保 SPEECH_PROVIDER 已配置
2. 发送任意消息
3. AI 回复流结束后自动播放语音
4. 发送下一条消息时，正在播放的语音停止

---

## 降级场景验证

- **无 STT 配置**：访问 `/chat?token=<token>`，录音按钮不显示
- **无 Vision 配置**：摄像头开关不显示（或显示但发送时不附图）
- **token 无效**：页面显示「链接已失效」，无对话界面
- **移动端**：在 375px 宽度设备访问，界面无水平滚动，录音按钮支持触摸
