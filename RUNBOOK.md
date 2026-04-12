# 运维手册 (Runbook)

本文档用于指导 My Homepage 的日常运维操作和故障排查。

## 目录

- [日常操作](#日常操作)
- [故障排查](#故障排查)
- [紧急恢复](#紧急恢复)
- [性能优化](#性能优化)

---

## 日常操作

### 查看应用状态

```bash
# 查看容器状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看最近 100 行日志
docker-compose logs --tail=100

# 健康检查
node scripts/healthcheck.mjs
```

### 重启应用

```bash
# 优雅重启
docker-compose restart

# 完全重建（代码更新后）
docker-compose down
docker-compose up -d --build
```

### 查看资源使用

```bash
# 容器资源使用
docker stats my-homepage

# 磁盘使用
df -h

# 查看 uploads 目录大小
du -sh storage/uploads/
```

### 密码重置

#### 方式一：使用脚本（推荐）

```bash
# 交互式重置
node scripts/set-password.mjs

# 直接设置
node scripts/set-password.mjs visitor newpassword
node scripts/set-password.mjs admin newpassword
```

#### 方式二：进入容器重置

```bash
# 进入容器
docker-compose exec app sh

# 使用脚本
node scripts/set-password.mjs

# 或手动使用 Prisma
npx prisma studio
```

### 数据库操作

```bash
# 进入容器执行 Prisma 命令
docker-compose exec app npx prisma studio

# 查看数据库状态
docker-compose exec app npx prisma migrate status

# 手动执行迁移
docker-compose exec app npx prisma migrate deploy
```

### 自动备份

```bash
# 执行完整备份（数据库 + 上传文件）
npm run backup

# 仅备份数据库
node scripts/backup.mjs --db-only

# 指定备份目录
node scripts/backup.mjs --output=/mnt/backups

# 备份并保留最近 10 个（自动删除旧的）
npm run backup -- --keep=10
```

备份产物位于 `storage/backups/backup-YYYYMMDD-HHmmss/`，包含：
- `app.db` - 数据库文件
- `uploads/` - 上传资源目录
- `info.json` - 备份元数据

#### 定时自动备份（Linux）

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 3 点自动备份，保留最近 10 个
0 3 * * * cd /path/to/my-homepage && node scripts/backup.mjs --keep=10

# 每周日凌晨 3 点备份到外部挂载点
0 3 * * 0 cd /path/to/my-homepage && node scripts/backup.mjs --output=/mnt/nas/backups
```

### 数据恢复

```bash
# 查看可用备份
ls -la storage/backups/

# 验证备份完整性
npm run restore -- --verify=storage/backups/backup-20240101-120000

# 执行恢复（会覆盖现有数据，请谨慎）
npm run restore -- --from=storage/backups/backup-20240101-120000
```

**恢复前必读**：
1. 停止应用：`docker-compose down`
2. 先备份当前数据：`npm run backup`
3. 验证备份完整性：`npm run restore -- --verify=...`
4. 执行恢复：`npm run restore -- --from=...`
5. 启动应用：`docker-compose up -d`
6. 验证状态：`npm run health`

### 日志自动清理

```bash
# 清理 30 天前的日志
npm run cleanup-logs -- --days=30

# 仅清理访问日志
npm run cleanup-logs -- --days=30 --access-only

# 仅清理操作日志
npm run cleanup-logs -- --days=30 --operation-only

# 预览模式（不实际删除）
npm run cleanup-logs -- --days=30 --dry-run

# 清理全部日志（危险！需要确认）
npm run cleanup-logs -- --all
```

**安全策略**：
- 默认至少保留 7 天日志
- 使用 `--dry-run` 预览后再清理
- `--all` 清理全部日志需要显式确认

#### 定时自动清理（Linux）

```bash
# 每周日凌晨 3 点清理 30 天前的日志
0 3 * * 0 cd /path/to/my-homepage && node scripts/cleanup-logs.mjs --days=30
```

---

## 故障排查

### 应用无法启动

#### 症状
- 容器状态为 `Restarting` 或 `Unhealthy`
- `docker-compose ps` 显示异常

#### 排查步骤

1. **查看日志**
   ```bash
   docker-compose logs -f
   ```
   关注最后的错误信息。

2. **检查端口占用**
   ```bash
   netstat -tlnp | grep 3456
   # 或
   lsof -i :3456
   ```

3. **检查目录权限**
   ```bash
   ls -la storage/
   # 确保目录可写
   chmod 755 storage/data storage/uploads
   ```

4. **检查环境变量**
   ```bash
   cat .env
   # 确保必要变量已设置
   ```

### 数据库连接失败

#### 症状
- 健康检查返回 `database: disconnected`
- 页面显示 500 错误

#### 排查步骤

1. **检查数据库文件**
   ```bash
   ls -la storage/data/
   # 应存在 app.db 文件
   ```

2. **检查文件权限**
   ```bash
   # 容器内执行
   docker-compose exec app ls -la storage/data/
   
   # 确保 nextjs 用户可读写
   docker-compose exec app chown -R nextjs:nodejs storage/data/
   ```

3. **检查磁盘空间**
   ```bash
   df -h
   ```

4. **手动修复**
   ```bash
   # 进入容器
   docker-compose exec app sh
   
   # 执行迁移
   npx prisma migrate deploy
   
   # 检查数据库
   npx prisma db pull
   ```

### 文件上传失败

#### 症状
- 上传图片时提示错误
- 上传后图片无法访问

#### 排查步骤

1. **检查目录权限**
   ```bash
   docker-compose exec app ls -la storage/uploads/
   docker-compose exec app chown -R nextjs:nodejs storage/uploads/
   ```

2. **检查磁盘空间**
   ```bash
   df -h
   ```

3. **检查文件大小限制**
   ```bash
   cat .env | grep MAX_UPLOAD_SIZE
   # 默认 5242880 (5MB)
   ```

4. **检查文件类型**
   - 仅支持: jpg, jpeg, png, webp, gif, svg

### 登录失败

#### 症状
- 提示"密码错误次数过多"
- 无法登录，即使密码正确

#### 解决方案

```bash
# 进入容器清除登录限制记录
docker-compose exec app npx prisma studio

# 或在 Prisma Studio 中删除 LoginAttempt 表的相关记录
```

或者等待 15 分钟自动解锁。

### 会话问题

#### 症状
- 登录后仍被重定向到登录页
- 频繁需要重新登录

#### 排查步骤

1. **检查浏览器 Cookie**
   - 打开浏览器开发者工具
   - 检查 Application/Cookies
   - 确认 `visitor_session` 或 `admin_session` 存在

2. **检查 Session Secret**
   ```bash
   cat .env | grep SESSION_SECRET
   # 确保生产环境不是默认值
   ```

3. **清除浏览器 Cookie**
   - 清除站点 Cookie 后重新登录

### 性能问题

#### 症状
- 页面加载缓慢
- API 响应时间长

#### 排查步骤

1. **检查资源使用**
   ```bash
   docker stats my-homepage
   ```

2. **检查日志文件大小**
   ```bash
   du -sh storage/data/
   du -sh storage/uploads/
   ```

3. **检查图片大小**
   - 过大的背景图会影响加载
   - 建议背景图大小 < 2MB

4. **优化建议**
   - 压缩上传的图片
   - 减少背景图数量
   - 定期清理日志

---

## 紧急恢复

### 完全无法访问

1. **检查容器状态**
   ```bash
   docker-compose ps
   ```

2. **尝试重启**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **检查日志定位问题**
   ```bash
   docker-compose logs --tail=200
   ```

### 数据损坏

1. **停止容器**
   ```bash
   docker-compose down
   ```

2. **恢复备份**
   ```bash
   # 找到最近的备份
   ls -la storage/backups/
   
   # 恢复数据库
   cp storage/backups/app.db.20240101_120000 storage/data/app.db
   
   # 恢复上传文件
   tar -xzf storage/backups/uploads.20240101_120000.tar.gz
   ```

3. **重新启动**
   ```bash
   docker-compose up -d
   ```

### 忘记所有密码

1. **进入容器**
   ```bash
   docker-compose exec app sh
   ```

2. **重置密码**
   ```bash
   node scripts/set-password.mjs visitor newpassword
   node scripts/set-password.mjs admin newpassword
   ```

### 回滚到上一版本

1. **停止当前容器**
   ```bash
   docker-compose down
   ```

2. **切换代码版本**
   ```bash
   git log --oneline
   git checkout <previous-commit-hash>
   ```

3. **重新构建启动**
   ```bash
   docker-compose up -d --build
   ```

---

## 性能优化

### 数据库优化

```bash
# 定期清理日志（保留最近 30 天）
docker-compose exec app npx prisma db execute --stdin <<EOF
DELETE FROM AccessLog WHERE timestamp < datetime('now', '-30 days');
DELETE FROM OperationLog WHERE timestamp < datetime('now', '-30 days');
EOF
```

### 图片优化

- 上传前压缩图片
- 使用 WebP 格式
- 控制背景图数量（建议 < 10 张）
- 单张背景图大小 < 2MB

### 日志管理

```bash
# 配置 Docker 日志 rotate
# 在 docker-compose.yml 中：
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

---

## 联系与支持

- **文档**: 查看 `docs/` 目录
- **Issue**: 在 GitHub 提交问题
- **更新**: 关注项目 Release 页面

---

**最后更新**: 2024-01 (v1.0.0)
