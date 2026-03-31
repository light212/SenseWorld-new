# Component Contract: ChatPage

## 位置

`app/(chat)/page.tsx`

## 路由

`/chat?token=<accessToken>`

## 行为规范

| 场景 | 行为 |
|------|------|
| token 缺失或无效 | 显示「链接已失效」错误页，无对话 UI |
| 正常加载 | 调用 GET /api/capabilities + GET /api/chat，渲染历史消息 |
| 无历史 | 显示空消息列表，等待用户输入 |
| 发送文字消息 | 立即显示用户气泡，调用 POST /api/chat，流式渲染 AI 回复 |
| AI 流式回复中 | 发送按钮禁用；流结束后恢复 |
| 新消息到达 | 自动滚动到列表底部（用户未手动上滚时）|
| 摄像头开启时发送 | 附带 captureFrame() 返回的 base64 图片 |
| captureFrame() 返回 null | 不附 images，走纯文字请求，不阻止发送 |

## 子组件树

```
ChatPage
├── MessageList          # 消息气泡列表，支持流式追加
├── CameraCapture        # 来自 005-vision-input，可选显示
└── ChatInputBar
    ├── TextInput        # 文字输入框
    ├── VoiceRecorder    # 录音按钮，supportsSTT=true 时显示
    └── SendButton       # 发送按钮
```

## Props / State 边界

- `CameraCapture` 通过 `ref` 暴露 `captureFrame()`，`ChatPage` 在发送时调用
- `VoiceRecorder` 录音完成后回调转录文字，`ChatPage` 接收后自动发送
- `MessageList` 接收 `messages: DisplayMessage[]` 和 `streamingContent?: string`

# Component Contract: VoiceRecorder

## 位置

`components/voice-recorder.tsx`

## 接口

```typescript
interface VoiceRecorderProps {
  token: string
  onTranscript: (text: string) => void
  onError?: (message: string) => void
  disabled?: boolean
}
```

## 行为规范

| 场景 | 行为 |
|------|------|
| 按下按钮（mousedown/touchstart）| 开始录音（MediaRecorder.start()）|
| 松开按钮（mouseup/touchend）| 停止录音，上传至 /api/speech/stt |
| 转录成功 | 调用 onTranscript(text)，由 ChatPage 触发发送 |
| 转录失败 | 调用 onError(message)，不触发发送 |
| disabled=true | 按钮不可交互 |
| 录音中 | 按钮显示录音动画，其他按钮禁用 |

## 录音格式

- 优先 `audio/webm`（Chrome/Firefox），其次 `audio/mp4`（Safari）
- 通过 `MediaRecorder.isTypeSupported()` 检测
- 发送 `FormData`，字段名 `audio`，与 `/api/speech/stt` 接口一致
