# 部署指南

本文档介绍如何将 My Homepage 部署到服务器。

## 服务器要求

- **操作系统**: Linux (推荐 Ubuntu 22.04+)
- **Docker**: 20.10+ 
- **Docker Compose**: 2.0+
- **内存**: 最低 512MB，推荐 1GB+
- **磁盘**: 根据图片数量，建议预留 1GB+

## 部署方式

### 方式一：Docker Compose（推荐）

#### 1. 准备环境

```bash
# 克隆或上传项目代码
git clone <your-repo-url> my-homepage
cd my-homepage

# 确保存储目录存在
node scripts/ensure-storage.mjs
```

#### 2. 配置环境变量

```bash
cp .env.example .env
nano .env  # 或 vim .env
```

必须修改的配置项：

```env
# Session Secrets - 必须修改为强随机字符串
VISITOR_SESSION_SECRET="your-very-long-random-string-at-least-32-chars"
ADMIN_SESSION_SECRET="another-very-long-random-string-at-least-32-chars"

# 初始密码 - 首次登录后请立即修改
VISITOR_PASSWORD="your-visitor-password"
ADMIN_PASSWORD="your-admin-password"
```

生成强随机字符串：
```bash
openssl rand -base64 48
```

#### 3. 构建并启动

```bash
# 构建镜像并启动
docker-compose up -d --build

# 查看启动日志
docker-compose logs -f

# 等待启动完成（约 30 秒）
```

#### 4. 验证部署

```bash
# 检查容器状态
docker-compose ps

# 健康检查
node scripts/healthcheck.mjs http://localhost:3456

# 验收测试
node scripts/acceptance-check.mjs http://localhost:3456
```

#### 5. 访问应用

- 首页: http://your-server-ip:3456
- 后台: http://your-server-ip:3456/admin

### 方式二：本地开发环境

适用于本地开发或测试。

```bash
# 1. 安装依赖
npm install

# 2. 确保存储目录
node scripts/ensure-storage.mjs

# 3. 配置环境
cp .env.example .env

# 4. 初始化数据库
npm run db:migrate
npm run db:seed

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3456

## 持久化说明

### 数据存储位置

Docker 部署时，以下目录通过 volume 挂载持久化：

| 容器内路径 | 宿主机路径 | 用途 |
|------------|------------|------|
| `/app/storage/data` | `./storage/data` | SQLite 数据库 |
| `/app/storage/uploads` | `./storage/uploads` | 上传的图片资源 |

### 自动备份（推荐）

```bash
# 执行完整备份
npm run backup

# 备份并保留最近 10 个（自动清理旧备份）
npm run backup -- --keep=10

# 指定备份目录
node scripts/backup.mjs --output=/mnt/backups
```

备份产物：`storage/backups/backup-YYYYMMDD-HHmmss/`

### 手动备份

```bash
# 传统方式备份（不推荐，仅应急）
cp storage/data/app.db storage/backups/app.db.$(date +%Y%m%d)
tar -czf storage/backups/uploads.$(date +%Y%m%d).tar.gz storage/uploads/
```

### 恢复数据

```bash
# 1. 停止容器
docker-compose down

# 2. 验证备份
npm run restore -- --verify=storage/backups/backup-20240101-120000

# 3. 执行恢复
npm run restore -- --from=storage/backups/backup-20240101-120000

# 4. 重新启动
docker-compose up -d

# 5. 验证状态
npm run health
```

### 日志自动清理

```bash
# 清理 30 天前的日志
npm run cleanup-logs -- --days=30

# 定时任务（每周日凌晨 3 点）
0 3 * * 0 cd /path/to/my-homepage && node scripts/cleanup-logs.mjs --days=30
```

## 升级步骤

### 小版本升级（配置或代码更新）

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 3. 验证
docker-compose ps
```

### 大版本升级（含数据库变更）

```bash
# 1. 备份数据
cp storage/data/app.db storage/backups/app.db.before-upgrade

# 2. 停止容器
docker-compose down

# 3. 拉取最新代码
git pull

# 4. 重新构建
docker-compose up -d --build

# 5. 容器内执行数据库迁移
docker-compose exec app npx prisma migrate deploy

# 6. 验证
docker-compose ps
node scripts/healthcheck.mjs
```

## 反向代理配置（可选）

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3456;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### frp（内网穿透）

如果你使用 frp 暴露服务：

```ini
# frpc.ini
[my-homepage]
type = http
local_port = 3456
custom_domains = your-domain.com
```

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs -f app

# 检查端口占用
netstat -tlnp | grep 3456

# 检查目录权限
ls -la storage/
```

### 数据库连接失败

```bash
# 检查数据库文件是否存在
ls -la storage/data/

# 检查权限
docker-compose exec app ls -la storage/data/

# 手动执行迁移
docker-compose exec app npx prisma migrate deploy
```

### 上传失败

```bash
# 检查上传目录权限
docker-compose exec app ls -la storage/uploads/

# 检查目录所有权（应为 nextjs:nodejs）
docker-compose exec app chown -R nextjs:nodejs storage/uploads/
```

## 环境变量参考

详见 [configuration.md](configuration.md)

## 安全建议

1. **修改默认密码** - 首次部署后立即修改
2. **使用强 Session Secret** - 至少 32 位随机字符串
3. **限制端口访问** - 使用防火墙限制 3456 端口访问
4. **定期备份** - 设置定时任务备份数据库和上传文件
5. **启用 HTTPS** - 生产环境建议使用 HTTPS
