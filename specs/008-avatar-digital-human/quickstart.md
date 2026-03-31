# Quickstart: 008-avatar-digital-human

## 本地开发准备

### 1. 申请测试 API Key

**HeyGen**（推荐优先测试）：
- 注册 https://app.heygen.com → Settings → API → 生成 API Key
- 在 Avatars 页面选择一个 avatar，记录其 Avatar ID

**D-ID**：
- 注册 https://studio.d-id.com → Account → API Key
- 记录一张人脸图片的公开 URL 作为 `source_url`

### 2. 配置环境变量（本地 .env）

无需直接写 `.env`，通过后台管理界面配置即可（见步骤 4）。

### 3. 启动项目

```bash
docker compose up -d   # 启动 MySQL
npx prisma migrate deploy
npm run dev
```

### 4. 后台配置数字人

1. 访问 http://localhost:3000/admin/login，用管理员账号登录
2. 进入「系统配置」页面
3. 填写以下字段：
   - **Avatar 服务商**：`heygen` 或 `did`
   - **Avatar API Key**：服务商 API Key
   - **Avatar 形象 ID**：HeyGen 的 avatar_id 或 D-ID 的 source_url
   - **Avatar 文本上限**（可选）：默认 300
4. 点击「保存配置」

### 5. 验证功能

1. 访问 http://localhost:3000（或通过访客 token 链接）
2. 发送一条消息
3. 等待 AI 文字回复出现（立即）
4. 页面顶部出现视频加载状态，10-40 秒后数字人视频自动播放
5. 确认视频播放时无 TTS 语音叠加

### 6. 验证降级行为

1. 后台将 Avatar 服务商改为无效值（如 `invalid`），保存
2. 发送消息 → 页面显示「数字人暂时不可用」提示，文字/语音回复正常
3. 将服务商改回有效值 → 无需刷新，下一条消息恢复视频回复

---

## 文件变更清单

```
lib/avatar/
├── types.ts                    # 更新接口（submitVideo / getVideoStatus）
├── factory.ts                  # 取消注释，注册 heygen / did case
├── heygen-provider.ts          # 新建
└── did-provider.ts             # 新建

app/api/
├── avatar/
│   ├── route.ts                # 新建 POST /api/avatar
│   └── status/
│       └── route.ts            # 新建 GET /api/avatar/status
└── capabilities/
    └── route.ts                # 更新：新增 supportsAvatar，调整 supportsTTS 逻辑

lib/types/
└── chat.ts                     # 新增 supportsAvatar 字段

components/admin/
└── ConfigForm.tsx              # 补充 AVATAR_ACTOR_ID / AVATAR_MAX_CHARS 字段，去掉「预留」

components/chat/
└── avatar-player.tsx           # 新建：数字人视频播放组件

app/(chat)/
└── page.tsx                    # 接入 Avatar 能力：触发生成、轮询状态、渲染播放器
```

---

## 关键调试技巧

- **HeyGen API 测试**：直接 `curl -X POST https://api.heygen.com/v2/video/generate -H 'X-Api-Key: <key>' -d '{...}'` 验证 Key 是否有效
- **D-ID API 测试**：`curl -X POST https://api.d-id.com/talks -H 'Authorization: Basic <base64>' -d '{...}'`
- **视频生成超时**：轮询最多 30 次 × 2 秒 = 60 秒，超时后显示「数字人生成超时」
- **移动端静音自动播放**：`<video autoPlay muted playsInline>` 配合「点击取消静音」按钮
