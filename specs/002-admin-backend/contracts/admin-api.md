# API Contracts: Admin Backend (002-admin-backend)

所有接口均位于 `/api/admin/` 路径下，受中间件保护（登录接口除外）。

---

## 认证

### POST /api/admin/auth/login

管理员登录，验证账号密码，成功后设置 HttpOnly Cookie。

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response 200**:
```json
{
  "ok": true
}
```
Side effect: 设置 `admin_token` Cookie（HttpOnly, Secure, SameSite=Lax, Path=/admin）

**Response 401**:
```json
{
  "ok": false,
  "error": "Invalid credentials"
}
```

**Response 400**:
```json
{
  "ok": false,
  "error": "Missing username or password"
}
```

---

### POST /api/admin/auth/logout

退出登录，清除 Cookie。

**Request**: 无 body，需携带有效 `admin_token` Cookie

**Response 200**:
```json
{
  "ok": true
}
```
Side effect: 清除 `admin_token` Cookie

---

## 运营配置

### GET /api/admin/config

获取所有配置项（API Key 字段脱敏）。

**Response 200**:
```json
{
  "ok": true,
  "data": [
    {
      "key": "AI_PROVIDER",
      "value": "openai",
      "description": "AI 服务商",
      "updatedAt": "2025-01-30T10:00:00.000Z"
    },
    {
      "key": "AI_API_KEY",
      "value": "sk-p****abcd",
      "description": "AI API Key",
      "updatedAt": "2025-01-30T10:00:00.000Z"
    }
  ]
}
```

**脱敏规则**: `key` 名称包含 `_KEY` 后缀的字段，`value` 按以下规则脱敏：
- 空值：返回 `""`
- 长度 <= 8：返回 `"********"`
- 长度 > 8：返回 `"{first4}****{last4}"`

---

### PUT /api/admin/config

批量更新配置项（upsert）。

**Request Body**:
```json
{
  "configs": [
    { "key": "AI_PROVIDER", "value": "openai" },
    { "key": "AI_API_KEY", "value": "sk-newkey..." },
    { "key": "SYSTEM_PROMPT", "value": "You are a helpful assistant." }
  ]
}
```

**Response 200**:
```json
{
  "ok": true,
  "updated": 3
}
```

**Response 400**:
```json
{
  "ok": false,
  "error": "Invalid config key: UNKNOWN_KEY"
}
```

**注意**: 只允许更新白名单内的 key（见 data-model.md 配置键名约定），未知 key 返回 400。

---

## 访客入口管理

### GET /api/admin/access-tokens

获取所有访客链接列表。

**Response 200**:
```json
{
  "ok": true,
  "data": [
    {
      "id": 1,
      "token": "550e8400-e29b-41d4-a716-446655440000",
      "label": "展会入口",
      "expiresAt": "2025-06-30T00:00:00.000Z",
      "enabled": true,
      "createdAt": "2025-01-30T10:00:00.000Z",
      "url": "/visit?token=550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

---

### POST /api/admin/access-tokens

生成新的访客链接。

**Request Body**:
```json
{
  "label": "string (optional)",
  "expiresAt": "ISO8601 string or null"
}
```
- `expiresAt: null` 表示永久有效
- `expiresAt` 若提供必须是未来时间

**Response 201**:
```json
{
  "ok": true,
  "data": {
    "id": 2,
    "token": "660f9511-f30c-52e5-b827-557766551111",
    "label": "测试链接",
    "expiresAt": null,
    "enabled": true,
    "createdAt": "2025-01-30T11:00:00.000Z",
    "url": "/visit?token=660f9511-f30c-52e5-b827-557766551111"
  }
}
```

**Response 400**:
```json
{
  "ok": false,
  "error": "expiresAt must be a future date"
}
```

---

### PATCH /api/admin/access-tokens/[id]

更新访客链接状态（启用/禁用）或标签。

**Request Body**（字段均可选）:
```json
{
  "enabled": false,
  "label": "新标签"
}
```

**Response 200**:
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "enabled": false,
    "label": "新标签"
  }
}
```

**Response 404**:
```json
{
  "ok": false,
  "error": "Access token not found"
}
```

---

### DELETE /api/admin/access-tokens/[id]

删除访客链接。

**Response 200**:
```json
{
  "ok": true
}
```

**Response 404**:
```json
{
  "ok": false,
  "error": "Access token not found"
}
```

---

## 通用错误响应

| HTTP 状态码 | 场景 |
|------------|------|
| 400 | 请求参数无效 |
| 401 | 未登录或令牌已过期 |
| 404 | 资源不存在 |
| 405 | 请求方法不支持 |
| 500 | 服务器内部错误 |

所有错误响应格式:
```json
{
  "ok": false,
  "error": "错误描述"
}
```
