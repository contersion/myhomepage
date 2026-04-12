# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01

### 首个稳定版本发布

这是一个个人展示站的完整实现，具备访客认证、后台管理、资源管理、日志审计、运维自动化等完整能力。

### Added

#### 核心功能
- **访客认证** - 全站访问密码保护，支持登录失败限制（5次错误后锁定15分钟）
- **管理员后台** - 独立 `/admin` 路径，完整的站点管理能力
- **站点信息管理** - 标题、副标题、简介、卡片样式配置
- **按钮系统** - 分组管理、按钮CRUD、排序、显示控制、打开方式设置
- **背景系统** - PC/手机分别配置、多图轮播、随机起始、淡入淡出、模糊遮罩

#### 资源管理
- **资源上传** - 本地存储，支持 PNG/JPG/WebP/GIF 格式
- **图片处理** - 自动压缩、尺寸限制、元数据提取（宽高）
- **缩略图派生** - 自动生成 320px 缩略图，优化后台预览性能
- **SVG 安全策略** - 明确禁用 SVG，防止 XSS 风险
- **资源清理** - 删除资源时同步清理文件和缩略图

#### 日志与安全
- **访问日志** - 自动记录页面访问、IP、User-Agent、状态码
- **操作日志** - 记录管理员登录、配置修改、资源操作等
- **登录失败限制** - 连续5次错误后锁定15分钟
- **会话隔离** - 访客会话与管理员会话完全隔离
- **密码管理** - bcrypt 哈希存储，支持后台自助修改

#### 运维自动化
- **自动备份** - `npm run backup` 备份数据库和上传文件
- **日志清理** - `npm run cleanup-logs` 定期清理历史日志
- **数据恢复** - `npm run restore` 辅助恢复流程
- **健康检查** - `/api/health` 端点 + `npm run health`
- **密码重置** - `npm run set-password` 紧急重置

#### 测试与验收
- **Smoke Test** - `npm run smoke` 快速回归测试（11项检查）
- **Acceptance Test** - `npm run acceptance` 完整验收测试（13项检查）
- **Preflight Check** - `npm run preflight` 发布前统一检查

#### 部署支持
- **Docker** - 完整的 Dockerfile + docker-compose.yml
- **数据持久化** - SQLite 和 uploads 自动挂载
- **环境变量** - `.env.example` 完整配置模板
- **文档** - 部署指南、配置说明、验收指南、上线检查清单

### Technical Details

- **Framework**: Next.js 15 + React 19 + TypeScript
- **Styling**: Tailwind CSS v3
- **Database**: SQLite + Prisma ORM
- **Deployment**: Docker + Docker Compose
- **Storage**: Local filesystem (storage/data/, storage/uploads/)

### Known Limitations

1. **测试覆盖** - 无重型 E2E 测试框架（Playwright/Cypress），仅轻量 Node 脚本测试
2. **资源派生** - 缩略图仅支持单一尺寸（320px），无多尺寸自适应
3. **文件格式** - SVG 仍禁用，需手动转换为其他格式
4. **图片审核** - 无内容安全审核，需人工确认上传内容
5. **云备份** - 仅支持本地备份，需配合 rsync/scp 实现异地备份
6. **CDN** - 未接入 CDN，资源访问直接走应用服务器
7. **访问日志** - 虽已统一，但无高级分析能力（如地理位置、流量统计）
8. **适用场景** - 更适合个人自托管场景，不适合高并发或多租户

### Future Directions (Optional)

- [ ] Playwright E2E 测试覆盖核心用户流程
- [ ] 响应式图片（srcset）多尺寸支持
- [ ] WebP 自适应格式（根据浏览器支持自动选择）
- [ ] 云存储备份（S3/阿里云 OSS）
- [ ] CDN 加速接入
- [ ] 图片内容安全审核
- [ ] 访问日志分析与可视化
- [ ] 多语言支持
- [ ] 深色模式
- [ ] 主题切换

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-01 | 首个稳定版本，完整功能交付 |

---

## Migration Guides

### Upgrading to 1.0.0

This is the initial stable release. No migration needed for new installations.

For existing development setups:
1. Ensure `storage/data/` and `storage/uploads/` directories exist
2. Run `npm install` to update dependencies
3. Run `npm run db:migrate` to ensure database schema is up to date
4. Run `npm run smoke` to verify installation

---

## Contributing

This is a personal project. For AI-assisted maintenance:
1. Read `AGENTS.md` before making changes
2. Follow `development-process.md` for development workflow
3. Refer to `ARCHITECTURE.md` for technical constraints
4. Run `npm run preflight` before submitting changes

---

## License

MIT License - See LICENSE file for details
