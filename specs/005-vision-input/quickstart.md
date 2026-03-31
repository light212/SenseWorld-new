# Quickstart: 005-vision-input

## 前提条件

- feature 003 (ai-chat-core) 已完成，`/api/chat` 可用
- 运营后台已配置支持 Vision 的模型（如 `gpt-4o`、`claude-3-5-sonnet-20241022`）
- 本地 `.env` 含有效 `OPENAI_API_KEY` 或 `ANTHROPIC_API_KEY`

## 快速验证步骤

### 1. 启动开发服务器

```bash
pnpm dev
```

### 2. 访问测试页面

浏览器打开：`http://localhost:3000/test-vision?token=<accessToken>`

> accessToken 从管理后台「访客入口管理」生成，或直接查询数据库：
> ```sql
> SELECT token FROM AccessToken LIMIT 1;
> ```

### 3. 测试摄像头

1. 点击「开启摄像头」按钮
2. 浏览器请求摄像头权限 → 允许
3. 预览区域显示实时画面

### 4. 测试 Vision AI

1. 在文字框输入「你看到了什么？」
2. 点击发送
3. AI 回复中应描述摄像头画面内容

### 5. 验证请求格式（DevTools）

打开 Network 标签 → 找到 `/api/chat` 请求：
- Request body 应包含 `"images": ["<base64..."]`
- base64 字符串不含 `data:image/jpeg;base64,` 前缀

### 6. 测试降级

1. 关闭摄像头
2. 发送消息 → Request body 不含 `images` 字段（或为空数组）
3. AI 正常回复纯文字

### 7. 测试权限拒绝

1. 浏览器设置中拒绝该页面的摄像头权限
2. 点击「开启摄像头」
3. 页面显示友好错误提示，按钮重置
4. 文字对话仍可正常使用

## 关键文件

| 文件 | 说明 |
|------|------|
| `components/camera-capture.tsx` | 摄像头组件，暴露 `captureFrame()` |
| `app/test-vision/page.tsx` | 独立测试页面 |
| `lib/ai/types.ts` | `ChatMessage.imageBase64?` 字段 |
| `lib/ai/anthropic-provider.ts` | Vision content block 转换 |
| `lib/ai/openai-provider.ts` | Vision image_url 转换 |
| `app/api/chat/route.ts` | `images[]` 字段解析与转发 |
