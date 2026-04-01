# SenseWorld AI 平台 - 后续开发任务 (TODO)

> 本文件用于保存开发任务进度，便于在不同设备间无缝切换和 AI 上下文接力。
> 下次在另一台电脑唤醒 AI 时，可以直接输入：“请阅读 TODO.md 并继续我们未完成的任务”。

## ✅ 已完成核心重构 (Phase 1-4)
- **视觉层面**：高定光感玻璃拟态 UI、沉浸式文献流排版设计。
- **管理后台**：全中文适配 Bento Grid 大屏配置页，搭建了配置与 Token 凭证隔离页面。
- **对话引擎**：已挂载 `Vercel AI SDK`，打通 `api.longcat.chat`，实现丝滑的大模型流式文字打字机效果及滚动吸底。

---

## 🚀 待开发的核心模态与功能 (Next Phases)

### A. 全模态增强 (Multimodal Voice & Audio)
- [ ] **语音录入组件**：激活界面上的胶囊语音（Mic）按钮。
  - 预期功能：调用浏览器原生录音 API，将二进制语音通过 STT（或推给 OpenAI 协议多模态端点）转写发送。
- [ ] **视觉感知 (Vision / Camera)**：激活图像上传与拍照功能。
  - 预期功能：让大模型（如 `gpt-4o` 级别的功能体）支持发送 `image_url` 或 Base64 实现真正的图片对话分析。

### B. 数据库持久化与记忆保存 (Database & Persistence)
- [ ] **建立持久层 (ORM)**：本项目环境变量使用了 MySQL（`senseworld_new`），需引入 Prisma 等中间件配置。
- [ ] **数据表建模**：起草 `Chat(会话)` 与 `Message(消息)` Schema 设计。
- [ ] **前台历史列表侧边栏 (Sidebar UI)**：点击查看旧聊天的 URL 路由分离 (如 `/c/[chat_id]`)。

### C. 鉴权拦截器屏障 (NextAuth Security)
- [ ] **实现登录验证逻辑**：接入 `NextAuth.js`。
- [ ] **Admin 后台阻断逻辑**：阻止未登录者随意通过 URL（`/admin`）直接访问修改超级配置。
- [ ] **前台孤岛级访问限制**：将每段多模态对话与当前登录 Account 绑定，保障企业级数据隐私。
