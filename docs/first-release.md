# First Release Guide - 首发上线指南

本文档是 My Homepage **首次部署上线**的完整执行指南，涵盖从代码准备到正式上线的全部步骤。

---

## 适用场景

- 首次部署到个人 VPS / 服务器
- 首次从开发环境转向生产环境
- 首次准备对外提供服务

---

## 前置准备

### 1. 服务器要求

| 项目 | 最低要求 | 推荐配置 |
|------|----------|----------|
| 操作系统 | Linux (Ubuntu 20.04+) | Ubuntu 22.04 LTS |
| Docker | 20.10+ | 24.0+ |
| Docker Compose | 2.0+ | 2.20+ |
| 内存 | 512MB | 1GB+ |
| 磁盘 | 1GB 可用空间 | 5GB+（含备份空间）|
| 网络 | 可访问互联网 | 固定公网 IP |

### 2. 本地准备

确保本地已安装：
- Git
- Node.js 18+ 和 npm
- SSH 客户端（用于连接服务器）

---

## 首发执行步骤

### Phase 1: 代码准备（本地）

#### 1.1 获取代码

```bash
# 方式一：从 Git 仓库克隆
git clone <your-repo-url> my-homepage
cd my-homepage

# 方式二：直接上传代码到服务器（如无 Git）
# 压缩本地代码，上传到服务器后解压
```

#### 1.2 验证代码完整性

```bash
# 检查必需文件是否存在
ls -la README.md CHANGELOG.md package.json docker-compose.yml

# 检查必需目录是否存在
ls -la src/ prisma/ scripts/ docs/
```

#### 1.3 本地预检（强烈推荐）

```bash
# 安装依赖
npm install

# 运行预检（确保代码无问题）
npm run preflight

# 预期结果：所有检查项通过
```

---

### Phase 2: 服务器环境准备

#### 2.1 连接服务器

```bash
ssh user@your-server-ip
```

#### 2.2 安装 Docker（如未安装）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 验证安装
docker --version
docker-compose --version
```

#### 2.3 创建项目目录

```bash
# 创建并进入项目目录
mkdir -p ~/my-homepage
cd ~/my-homepage
```

---

### Phase 3: 部署执行

#### 3.1 上传代码

**方式一：Git 克隆（推荐）**

```bash
git clone <your-repo-url> .
```

**方式二：SCP 上传**

```bash
# 在本地执行
scp -r . user@your-server-ip:~/my-homepage/
```

**方式三：FTP/SFTP 上传**

使用 FileZilla 等工具上传代码。

#### 3.2 准备存储目录

```bash
# 初始化存储目录
node scripts/ensure-storage.mjs

# 验证目录结构
ls -la storage/
# 应看到 data/ 和 uploads/ 目录，且包含 .gitkeep 文件
```

#### 3.3 配置环境变量（⚠️ 关键步骤）

```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置文件（使用你喜欢的编辑器）
nano .env
# 或 vim .env
```

**必须修改的配置项：**

```env
# 1. Session Secrets - 必须改为强随机字符串（>= 32 字符）
# 生成命令：openssl rand -base64 48
VISITOR_SESSION_SECRET="your-own-secret-here-min-32-chars-long"
ADMIN_SESSION_SECRET="different-secret-here-min-32-chars-long"

# 2. 初始密码（首次登录后请立即修改）
VISITOR_PASSWORD="your-visitor-password"
ADMIN_PASSWORD="your-admin-password"

# 3. 生产环境设置
NODE_ENV="production"
```

**⚠️ 安全检查清单：**
- [ ] VISITOR_SESSION_SECRET 不是默认值
- [ ] ADMIN_SESSION_SECRET 不是默认值
- [ ] 两个 Secret 长度 >= 32 字符
- [ ] 两个 Secret 不相同
- [ ] NODE_ENV 设置为 "production"

#### 3.4 构建并启动

```bash
# 构建镜像并启动容器
docker-compose up -d --build

# 查看启动日志（等待启动完成，约 30-60 秒）
docker-compose logs -f

# 按 Ctrl+C 退出日志查看，容器会继续后台运行
```

---

### Phase 4: 部署验证

#### 4.1 容器状态检查

```bash
# 检查容器状态
docker-compose ps

# 预期输出：
# NAME           STATUS
# my-homepage    Up (healthy)
```

#### 4.2 健康检查

```bash
# 运行健康检查
npm run health

# 预期输出：
# ✓ Application is healthy
#   Status: ok
#   Database: connected
```

#### 4.3 功能验收

```bash
# 运行验收测试
npm run acceptance

# 预期输出：
# Results: 13 passed, 0 failed
# ✓ All acceptance checks passed!
```

#### 4.4 浏览器验证

在浏览器中访问：
- 首页：`http://your-server-ip:3456`
- 后台：`http://your-server-ip:3456/admin`

验证：
- [ ] 首页显示正常（应跳转到密码页）
- [ ] 访客登录正常
- [ ] 后台登录正常
- [ ] 后台管理界面可正常加载

---

### Phase 5: 首次配置

#### 5.1 登录后台

```
URL: http://your-server-ip:3456/admin
密码: <你设置的 ADMIN_PASSWORD>
```

#### 5.2 修改密码（强烈建议立即执行）

路径：后台 → 安全设置 → 修改密码

- [ ] 修改访客密码
- [ ] 修改管理员密码

#### 5.3 配置站点信息

路径：后台 → 站点

- [ ] 设置站点标题
- [ ] 设置副标题
- [ ] 设置简介
- [ ] 调整卡片样式（可选）

#### 5.4 上传资源

路径：后台 → 资源

- [ ] 上传背景图片（建议尺寸：1920x1080）
- [ ] 上传图标（用于按钮）

#### 5.5 配置背景

路径：后台 → 背景

- [ ] 添加 PC 背景（选择已上传的图片）
- [ ] 配置轮播间隔（默认 5 秒）
- [ ] 配置随机起始（可选）
- [ ] 如有需要，添加手机背景

#### 5.6 配置按钮

路径：后台 → 按钮

- [ ] 创建分组（如：常用链接、个人项目）
- [ ] 添加按钮
- [ ] 设置按钮图标
- [ ] 调整排序
- [ ] 设置显示/隐藏

#### 5.7 验证首页展示

访问 `http://your-server-ip:3456`，验证：
- [ ] 站点标题正确显示
- [ ] 背景图片正常轮播
- [ ] 按钮分组和按钮正常显示
- [ ] 按钮点击可跳转到正确链接

---

### Phase 6: 备份与运维设置

#### 6.1 首次备份

```bash
# 创建首次备份
npm run backup

# 验证备份创建成功
ls -la storage/backups/
# 应看到 backup-YYYYMMDD-HHmmss/ 目录
```

#### 6.2 设置自动备份（强烈推荐）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每天凌晨 3 点备份，保留最近 10 个）
0 3 * * * cd ~/my-homepage && node scripts/backup.mjs --keep=10

# 保存退出
```

#### 6.3 设置日志清理（推荐）

```bash
# 编辑 crontab
crontab -e

# 添加以下行（每周日凌晨 3 点清理 30 天前的日志）
0 3 * * 0 cd ~/my-homepage && node scripts/cleanup-logs.mjs --days=30
```

---

### Phase 7: 安全加固（生产环境必需）

#### 7.1 文件权限

```bash
# 确保 .env 文件权限正确（仅所有者可读写）
chmod 600 .env

# 确保数据目录权限正确
chmod 755 storage/data storage/uploads
```

#### 7.2 防火墙配置

```bash
# 使用 UFW（Ubuntu）
sudo ufw allow 3456/tcp

# 如果使用反向代理，只允许本地访问 3456
sudo ufw deny 3456/tcp
sudo ufw allow from 127.0.0.1 to any port 3456
```

#### 7.3 配置反向代理（可选但推荐）

使用 Nginx 或 frp 配置 HTTPS 和域名访问。

参考：[deployment.md](deployment.md#反向代理配置)

---

### Phase 8: 最终验证

#### 8.1 完整功能验证

- [ ] 访客登录 → 首页 → 按钮点击 → 正常跳转
- [ ] 管理员登录 → 后台 → 各功能正常
- [ ] 上传资源 → 正常使用
- [ ] 修改配置 → 前台实时生效
- [ ] 查看日志 → 访问日志和操作日志正常记录

#### 8.2 持久化验证

```bash
# 重启容器，验证数据不丢失
docker-compose restart

# 等待 10 秒
docker-compose ps

# 验证数据仍然存在
npm run health
```

#### 8.3 备份恢复验证（可选但推荐）

```bash
# 验证备份可恢复
npm run restore -- --verify=storage/backups/backup-<最新时间戳>

# 预期输出：
# ✓ 备份验证通过
```

---

## 首发检查清单

### 部署前检查

- [ ] 服务器满足最低要求
- [ ] 代码已上传到服务器
- [ ] .env 文件已创建并正确配置
- [ ] Session Secrets 已修改为强随机字符串
- [ ] 存储目录已初始化
- [ ] 本地 preflight 检查通过

### 部署中检查

- [ ] docker-compose up -d --build 成功
- [ ] 容器状态 healthy
- [ ] health check 通过
- [ ] acceptance test 通过

### 部署后检查

- [ ] 首页可正常访问
- [ ] 访客登录正常
- [ ] 后台登录正常
- [ ] 站点信息已配置
- [ ] 背景图片已配置
- [ ] 按钮已配置
- [ ] 密码已修改（首次登录后）
- [ ] 首次备份已完成
- [ ] 自动备份已配置
- [ ] 文件权限已设置

### 安全加固检查

- [ ] .env 文件权限 600
- [ ] 防火墙已配置
- [ ] 如暴露公网，已配置 HTTPS
- [ ] 默认密码已修改

---

## 常见问题

### Q1: 容器启动失败

```bash
# 查看详细日志
docker-compose logs -f

# 常见问题：
# 1. 端口被占用：修改 docker-compose.yml 中的端口映射
# 2. 权限问题：检查 storage/ 目录权限
# 3. 内存不足：增加服务器内存或添加 swap
```

### Q2: 无法访问页面

```bash
# 检查防火墙
sudo ufw status

# 检查端口监听
netstat -tlnp | grep 3456

# 检查容器状态
docker-compose ps
```

### Q3: 数据库连接失败

```bash
# 检查数据库文件
docker-compose exec app ls -la storage/data/

# 检查权限
docker-compose exec app chown -R nextjs:nodejs storage/data/

# 重新执行迁移
docker-compose exec app npx prisma migrate deploy
```

### Q4: 忘记密码

```bash
# 使用脚本重置
node scripts/set-password.mjs visitor newpassword
node scripts/set-password.mjs admin newpassword
```

---

## 下一步

首发上线完成后：

1. **监控运行状态** - 关注日志和性能
2. **定期备份** - 确保备份任务正常运行
3. **查看 RUNBOOK** - 了解日常运维操作
4. **查看 CHANGELOG** - 了解版本更新内容

---

## 文档索引

| 文档 | 用途 |
|------|------|
| [README.md](../README.md) | 项目简介、快速开始 |
| [CHANGELOG.md](../CHANGELOG.md) | 版本变更、功能清单 |
| [project-map.md](project-map.md) | 项目结构导览 |
| [deployment.md](deployment.md) | 详细部署指南 |
| [configuration.md](configuration.md) | 环境变量配置 |
| [go-live-checklist.md](go-live-checklist.md) | 上线检查清单 |
| [RUNBOOK.md](../RUNBOOK.md) | 运维手册、故障排查 |
| [acceptance.md](acceptance.md) | 验收指南 |

---

**版本**: v1.0.0  
**最后更新**: 2024-01  
**维护者**: My Homepage Contributors
