# Quickstart: Admin Backend (002-admin-backend)

## 前置条件

- 001-project-scaffold 已完成（数据库表结构已创建，seed 脚本已运行）
- 开发服务已启动：`npm run dev`
- 环境变量已配置（见下方）

## 必需环境变量

在 `.env` 中添加以下变量（参考 `.env.example`）：

```bash
# JWT 签名密钥（至少 32 位随机字符串）
JWT_SECRET=your-secret-key-at-least-32-chars

# JWT 有效期（可选，默认 8h）
JWT_EXPIRES_IN=8h

# 初始管理员账号（seed 时使用）
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

## 首次启动步骤

### 1. 运行数据库 seed（如果还未运行）

```bash
npm run db:seed
```

这将创建初始管理员账号（从 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 环境变量读取）。

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 访问后台管理

打开浏览器访问：`http://localhost:3000/admin`

系统将自动跳转到登录页：`http://localhost:3000/admin/login`

### 4. 登录

使用 seed 时设置的账号密码登录。

## 功能路径

| 功能 | 路径 |
|------|------|
| 登录页 | `/admin/login` |
| 后台首页 | `/admin` |
| 运营配置面板 | `/admin/config` |
| 访客入口管理 | `/admin/access-tokens` |

## 验证功能正常

### 验证路由保护
```bash
# 未登录访问后台，应被重定向到登录页
curl -v http://localhost:3000/admin/config
# 预期：302 重定向到 /admin/login
```

### 验证登录 API
```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"your-password"}' \
  -c cookies.txt
# 预期：{"ok": true}，并设置 admin_token Cookie
```

### 验证配置读取
```bash
curl http://localhost:3000/api/admin/config \
  -b cookies.txt
# 预期：返回配置列表，API Key 字段已脱敏
```

### 验证生成访客链接
```bash
curl -X POST http://localhost:3000/api/admin/access-tokens \
  -H 'Content-Type: application/json' \
  -d '{"label":"测试链接","expiresAt":null}' \
  -b cookies.txt
# 预期：返回新创建的链接信息，包含 token 和 url
```

## Docker 环境

```bash
docker compose up -d
# 等待容器启动后运行 seed
docker compose exec app npm run db:seed
```

## 常见问题

**Q: 登录后刷新页面提示未登录？**
A: 检查 `JWT_SECRET` 环境变量是否设置，重启开发服务器。

**Q: seed 脚本报错「AdminUser already exists」？**
A: AdminUser 表已有数据，seed 跳过，这是正常行为。可通过数据库直接查看已有账号。

**Q: 配置保存后没有生效？**
A: 本功能设计为每次请求实时查询数据库，无缓存。检查数据库连接是否正常：`npm run db:studio`。
