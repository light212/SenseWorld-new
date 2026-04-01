# SenseWorld AI 平台 - 开发进度 (TODO)

## ✅ 已完成核心重构
- [x] **视觉层面**：高定光感玻璃拟态 UI、文献流排版设计。
- [x] **管理后台**：Admin 登录功能（JWT + Cookie）、配置与 Token 运维页。
- [x] **数据库持久化**：Prisma + MySQL 存储回话记录与消息。
- [x] **侧边栏历史**：支持查看历史记录、会话切换、退出登录。
- [x] **对话引擎**：兼容 Vercel AI SDK，支持流式 SSE 对话。
- [x] **多模态 UI**：摄像头 Overlay、胶囊录音按钮及其基础调用逻辑。

---

## 🚀 待开发 (Next Phases)

### Phase 007: 知识库接入 (MCP / RAG)
- [ ] **MCP 连接器**：开发能对接公司文档、数据库的协议组件。
- [ ] **语义检索**：集成向量搜索，让 AI 回复基于私有知识库。

### Phase 008: 数字人流式优化 (Streaming Avatar)
- [ ] **流式驱动**：集成 HeyGen/D-ID Streaming API。
- [ ] **画音同步**：实现音视频流与文本流的低延迟匹配。

### Phase 009: 企业级账户系统 (Standard Auth)
- [ ] **NextAuth 集成**：支持 OAuth 或标准账号登录。
- [ ] **数据沙盒**：将会话彻底隔离至登录 Account。
