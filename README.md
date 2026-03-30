# SenseWorld AI 多模态对话平台

Next.js 14 + Prisma 5 + MySQL 8 全栈应用。

## 本地开发启动

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，至少填写 DATABASE_URL 和 JWT_SECRET

# 3. 启动 MySQL（Docker）
docker compose up -d mysql

# 4. 同步数据库 schema
npm run db:push

# 5. 初始化管理员账号（读取 .env 中的 ADMIN_USERNAME / ADMIN_PASSWORD）
npm run db:seed

# 6. 启动开发服务
npm run dev
```

访问 [http://localhost:3000/admin/login](http://localhost:3000/admin/login) 进入管理后台。

## Docker Compose 完整启动

```bash
cp .env.example .env
# 编辑 .env 填写所需配置
docker compose up
```

## 管理后台

后台地址：`/admin/login`

初始账号通过环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 在 seed 阶段创建。
生产环境请设置强密码，并使用 `openssl rand -base64 32` 生成 `JWT_SECRET`。

功能：
- 运营配置面板（AI 模型、语音服务、System Prompt 等）
- 访客入口管理（生成/禁用访客链接、二维码）

## 扩展新 Provider

实现 `lib/ai/types.ts` 中的 `LLMProvider` 接口，在对应 Factory 中注册即可，无需修改业务逻辑。
