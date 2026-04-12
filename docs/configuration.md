# 配置说明

本文档介绍 My Homepage 的所有配置项。

## 环境变量

所有配置通过 `.env` 文件管理。

### 必需配置

#### DATABASE_URL
- **说明**: SQLite 数据库文件路径
- **默认值**: `file:./storage/data/app.db`
- **示例**: `file:/app/storage/data/app.db` (Docker 内)
- **注意**: Docker 部署时保持默认值即可

#### VISITOR_SESSION_SECRET
- **说明**: 访客会话加密密钥
- **默认值**: `your-visitor-session-secret-min-32-chars`
- **要求**: 至少 32 位字符，建议使用随机字符串
- **生成**: `openssl rand -base64 48`
- **警告**: 生产环境必须修改，泄露可能导致会话伪造

#### ADMIN_SESSION_SECRET
- **说明**: 管理员会话加密密钥
- **默认值**: `your-admin-session-secret-min-32-chars`
- **要求**: 至少 32 位字符，建议使用随机字符串
- **生成**: `openssl rand -base64 48`
- **警告**: 生产环境必须修改，应与访客密钥不同

### 初始密码配置

#### VISITOR_PASSWORD
- **说明**: 访客初始密码
- **默认值**: `visitor123`
- **注意**: 仅首次启动时生效，后续可通过后台修改

#### ADMIN_PASSWORD
- **说明**: 管理员初始密码
- **默认值**: `admin123`
- **注意**: 仅首次启动时生效，后续可通过后台修改

### 上传配置

#### UPLOAD_DIR
- **说明**: 上传文件存储目录
- **默认值**: `./storage/uploads`
- **Docker**: `/app/storage/uploads`

#### MAX_UPLOAD_SIZE
- **说明**: 最大上传文件大小（字节）
- **默认值**: `5242880` (5MB)
- **单位**: 字节
- **示例**: 10MB = `10485760`

### 图片处理配置（阶段 4-C 新增）

#### 支持的图片格式
- **PNG** - 保留原格式，自动压缩
- **JPEG/JPG** - 转换为 JPEG，质量 85-90%
- **WebP** - 保留或转换为 WebP，质量 85-90%
- **GIF** - 仅做大小限制，不做压缩（保留动画）
- **SVG** - **明确禁用**，存在 XSS 安全风险

#### 尺寸限制
- **背景图**: 最大 1920×1080 像素，超限自动缩放
- **图标**: 最大 256×256 像素，超限自动缩放

#### 处理策略
1. 上传时自动进行图片压缩和尺寸限制
2. 处理后的图片格式优先 WebP，其次 JPEG
3. 所有处理都在服务端完成，无需前端配置
4. 处理失败时返回清晰错误，不会保存脏数据

### 缩略图配置（阶段 4-E 新增）

#### 缩略图规格
- **尺寸**: 最大边长 320px，保持比例
- **格式**: JPEG，质量 80%
- **生成时机**: 上传时同步生成
- **命名约定**: `原文件名.thumb.jpg`

#### 访问方式
- 缩略图与原图存储在同一目录
- 后台资源列表自动使用缩略图
- 前台背景图仍使用原图（保证质量）
- 前台图标使用懒加载优化

#### 性能优化
- 后台资源页：缩略图 + 懒加载
- 背景/图标选择器：缩略图预览
- 前台按钮图标：懒加载 + 显式尺寸

### 应用配置

#### NODE_ENV
- **说明**: 运行环境
- **默认值**: `development`
- **选项**: `development`, `production`
- **Docker**: 自动设置为 `production`

#### PORT
- **说明**: 应用监听端口（开发环境）
- **默认值**: `3456`
- **Docker**: 内部使用 3000，外部通过 `PORT` 环境变量映射

## 数据库配置

### 表结构

应用使用以下数据表：

| 表名 | 用途 |
|------|------|
| `SiteConfig` | 站点配置、密码哈希 |
| `ButtonGroup` | 按钮分组 |
| `Button` | 按钮条目 |
| `Background` | 背景图片配置 |
| `Resource` | 上传资源记录 |
| `AccessLog` | 访问日志 |
| `OperationLog` | 操作日志 |
| `LoginAttempt` | 登录失败记录（限流用） |

### 配置项存储

站点配置存储在 `SiteConfig` 表中，Key-Value 形式：

| Key | 说明 | 默认值 |
|-----|------|--------|
| `site_title` | 站点标题 | 我的个人主页 |
| `site_subtitle` | 站点副标题 | 欢迎来到我的个人空间 |
| `site_description` | 站点简介 | 这里记录着我的生活点滴与作品 |
| `visitor_password_hash` | 访客密码哈希 | bcrypt hash |
| `admin_password_hash` | 管理员密码哈希 | bcrypt hash |
| `card_style` | 卡片样式 | glass |
| `background_blur` | 背景模糊度(px) | 10 |
| `background_overlay` | 背景遮罩透明度 | 0.3 |
| `background_interval` | 背景轮播间隔(秒) | 5 |
| `background_random` | 背景随机起始 | true |
| `background_mobile_inherit` | 手机继承PC背景 | true |

## 登录限制配置

当前登录限制参数已硬编码：

- **最大尝试次数**: 5 次
- **锁定时间**: 15 分钟
- **计数重置**: 成功登录后清零

如需修改，需编辑 `src/lib/security/login-attempts.ts`：

```typescript
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;
```

## 会话配置

### Cookie 设置

- **访客会话名**: `visitor_session`
- **管理员会话名**: `admin_session`
- **HttpOnly**: 是
- **Secure**: 生产环境自动启用
- **SameSite**: Lax
- **有效期**: 7 天

### 会话隔离

访客会话与管理员会话完全隔离：
- 访客登录不影响管理员会话
- 管理员登录不影响访客会话
- 各自登出互不影响

## 文件上传限制

### 允许的文件类型

- `image/png`
- `image/jpeg`
- `image/jpg`
- `image/webp`
- `image/gif`
- `image/svg+xml` (SVG 基础支持)

### 文件大小限制

- 默认: 5MB
- 可通过 `MAX_UPLOAD_SIZE` 调整

### 存储方式

- 文件存储在 `storage/uploads/`
- 文件名格式: `{timestamp}-{random}.{ext}`
- 数据库记录原始文件名和 MIME 类型

## 日志配置

### 访问日志

自动记录以下信息：
- IP 地址
- User-Agent
- 请求路径
- 请求方法
- 响应状态码
- 时间戳

### 操作日志

记录以下操作：
- 登录/登出
- 站点配置修改
- 按钮/分组增删改
- 背景配置修改
- 资源上传/删除
- 日志清理
- 密码修改

### 日志保留

#### 手动清理

通过后台管理页面清理，或使用 Prisma Studio：

```bash
npx prisma studio
```

#### 自动清理（阶段 4-D 新增）

```bash
# 清理 30 天前的日志
npm run cleanup-logs -- --days=30

# 仅清理访问日志
npm run cleanup-logs -- --days=30 --access-only

# 预览模式（查看将删除多少条，不实际删除）
npm run cleanup-logs -- --days=30 --dry-run
```

#### 定时自动清理（Linux crontab）

```bash
# 每周日凌晨 3 点清理 30 天前的日志
0 3 * * 0 cd /path/to/my-homepage && node scripts/cleanup-logs.mjs --days=30
```

**安全策略**：
- 默认至少保留 7 天日志
- 使用 `--dry-run` 预览后再清理
- `--all` 参数会清理全部日志，需要显式确认

## Docker Compose 配置

### 服务配置

```yaml
services:
  app:
    build: .
    container_name: my-homepage
    restart: unless-stopped
    ports:
      - "${PORT:-3456}:3000"
    environment:
      - NODE_ENV=production
      # ... 其他环境变量
    volumes:
      - ./storage/data:/app/storage/data
      - ./storage/uploads:/app/storage/uploads
    healthcheck:
      test: ["CMD", "node", "-e", "..."]
      interval: 30s
      timeout: 5s
      retries: 3
```

### Volume 说明

| 宿主机路径 | 容器路径 | 用途 |
|------------|----------|------|
| `./storage/data` | `/app/storage/data` | SQLite 数据库 |
| `./storage/uploads` | `/app/storage/uploads` | 上传文件 |

### 重启策略

- `unless-stopped`: 除非手动停止，否则自动重启
- 服务器重启后自动启动

## 运维配置（阶段 4-D 新增）

### 自动备份

#### 备份命令

```bash
# 执行完整备份（数据库 + 上传文件）
npm run backup

# 仅备份数据库
node scripts/backup.mjs --db-only

# 指定备份目录
node scripts/backup.mjs --output=/mnt/backups

# 备份并保留最近 10 个（自动删除旧备份）
npm run backup -- --keep=10
```

#### 备份产物

备份存储在 `storage/backups/backup-YYYYMMDD-HHmmss/`，包含：
- `app.db` - SQLite 数据库文件
- `uploads/` - 上传资源目录
- `info.json` - 备份元数据（时间、大小、版本等）

#### 定时自动备份（Linux crontab）

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点自动备份，保留最近 10 个
0 3 * * * cd /path/to/my-homepage && node scripts/backup.mjs --keep=10

# 每周日凌晨 3 点备份到外部挂载点（NAS）
0 3 * * 0 cd /path/to/my-homepage && node scripts/backup.mjs --output=/mnt/nas/backups
```

### 数据恢复

#### 恢复步骤

```bash
# 1. 停止应用
docker-compose down

# 2. （可选）备份当前数据
npm run backup

# 3. 查看可用备份
ls -la storage/backups/

# 4. 验证备份完整性
npm run restore -- --verify=storage/backups/backup-20240101-120000

# 5. 执行恢复
npm run restore -- --from=storage/backups/backup-20240101-120000

# 6. 启动应用
docker-compose up -d

# 7. 验证状态
npm run health
```

#### 恢复选项

```bash
# 仅恢复数据库
npm run restore -- --from=storage/backups/backup-20240101-120000 --db-only

# 查看恢复帮助
npm run restore -- --help
```

**风险提示**：
- 恢复操作会覆盖现有数据
- 恢复前强烈建议先备份当前数据
- 恢复过程需要停止应用

## 安全配置建议

### 生产环境检查清单

- [ ] 修改 `VISITOR_SESSION_SECRET`（至少 32 位随机字符串）
- [ ] 修改 `ADMIN_SESSION_SECRET`（与访客密钥不同）
- [ ] 修改 `VISITOR_PASSWORD`（不使用默认值）
- [ ] 修改 `ADMIN_PASSWORD`（不使用默认值）
- [ ] 限制端口访问（防火墙）
- [ ] 启用 HTTPS（反向代理）
- [ ] 定期备份数据
- [ ] 设置日志监控

### 生成强密码

```bash
# 随机密码
openssl rand -base64 12

# 更长的会话密钥
openssl rand -base64 48
```
