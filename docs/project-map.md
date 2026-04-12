# Project Map - 项目导览

本文档是 My Homepage 项目的快速导览，帮助新接手者快速理解项目结构、关键入口和常用操作。

---

## 项目定位

**My Homepage** 是一个面向个人自托管场景的展示站，适合：
- 个人主页/导航页
- 小范围熟人访问
- 低维护成本场景

**核心设计原则**：
- 简单稳定 > 功能丰富
- 单体架构 > 微服务
- SQLite + 本地存储 > 外部数据库
- 易于维护 > 技术炫技

---

## 快速入口

### 开发启动
```bash
npm install
npm run dev          # http://localhost:3456
```

### 生产部署
```bash
docker-compose up -d --build
```

### 发布前检查
```bash
npm run preflight    # 完整检查（包含构建）
npm run preflight:quick   # 快速检查（跳过构建）
```

### 运维常用
```bash
npm run backup              # 备份数据
npm run restore -- --from=storage/backups/backup-xxx   # 恢复
npm run cleanup-logs -- --days=30   # 清理日志
npm run set-password        # 重置密码
npm run health              # 健康检查
```

---

## 目录结构

```
my-homepage/
├── src/                    # 源代码
│   ├── app/               # Next.js App Router
│   │   ├── access/        # 访客登录页
│   │   ├── admin/         # 后台管理页
│   │   │   ├── page.tsx   # 后台主页
│   │   │   ├── login/     # 后台登录
│   │   │   ├── assets/    # 资源管理
│   │   │   └── logs/      # 日志查看
│   │   ├── api/           # API 路由
│   │   ├── page.tsx       # 首页
│   │   └── layout.tsx     # 根布局
│   ├── components/        # React 组件
│   └── lib/               # 业务逻辑层
│       ├── auth/          # 认证与会话
│       ├── security/      # 登录限制与密码
│       ├── logs/          # 日志操作
│       ├── assets/        # 资源管理
│       ├── backgrounds/   # 背景配置
│       ├── buttons/       # 按钮管理
│       └── site/          # 站点配置
│
├── prisma/                # 数据库
│   ├── schema.prisma      # 数据模型
│   └── seed.ts            # 初始化脚本
│
├── scripts/               # 运维脚本 ⭐ 常用
│   ├── ensure-storage.mjs     # 存储目录初始化
│   ├── set-password.mjs       # 密码重置
│   ├── healthcheck.mjs        # 健康检查
│   ├── smoke-test.mjs         # 快速回归测试
│   ├── acceptance-check.mjs   # 完整验收测试
│   ├── preflight-check.mjs    # 发布前检查 ⭐⭐⭐
│   ├── backup.mjs             # 数据备份 ⭐⭐⭐
│   ├── restore.mjs            # 数据恢复
│   ├── cleanup-logs.mjs       # 日志清理
│   └── docker-start.mjs       # Docker 启动
│
├── storage/               # 持久化数据 ⭐ 重要
│   ├── data/              # SQLite 数据库
│   ├── uploads/           # 上传资源
│   └── backups/           # 自动备份
│
├── docs/                  # 文档 ⭐ 必读
│   ├── deployment.md          # 部署指南
│   ├── configuration.md       # 配置说明
│   ├── acceptance.md          # 验收指南
│   ├── go-live-checklist.md   # 上线检查清单
│   └── project-map.md         # 本文档
│
├── Dockerfile             # Docker 构建
├── docker-compose.yml     # Docker Compose 配置
├── package.json           # 依赖与脚本
├── README.md              # 项目主页
├── RUNBOOK.md             # 运维手册
├── CHANGELOG.md           # 版本变更
├── AGENTS.md              # AI 开发约束
├── ARCHITECTURE.md        # 架构文档
└── development-process.md # 开发流程
```

---

## 关键文档索引

### 新手必读（按顺序）
1. **README.md** - 项目简介、快速开始
2. **docs/project-map.md** - 本文档，项目导览
3. **docs/deployment.md** - 部署步骤
4. **docs/configuration.md** - 环境变量说明

### 开发维护
1. **AGENTS.md** - AI 开发代理约束（开发前必读）
2. **ARCHITECTURE.md** - 技术架构与模块职责
3. **development-process.md** - 开发流程与阶段划分

### 运维排障
1. **RUNBOOK.md** - 日常运维、故障排查、紧急恢复
2. **docs/acceptance.md** - 功能验收步骤
3. **docs/go-live-checklist.md** - 上线前检查清单

### 版本与交付
1. **CHANGELOG.md** - 版本变更记录
2. **README.md#开发阶段** - 功能完成状态

---

## 常用脚本速查

### 开发与测试
| 命令 | 用途 | 执行时间 |
|------|------|----------|
| `npm run dev` | 启动开发服务器 | - |
| `npm run build` | 生产构建 | ~30s |
| `npm run smoke` | 快速回归测试 | ~1s |
| `npm run acceptance` | 完整验收测试 | ~5s |
| `npm run preflight` | 发布前检查 | ~60s |

### 数据库
| 命令 | 用途 |
|------|------|
| `npm run db:migrate` | 执行数据库迁移 |
| `npm run db:seed` | 初始化默认数据 |
| `npm run db:studio` | 打开 Prisma Studio |

### 运维
| 命令 | 用途 |
|------|------|
| `npm run health` | 健康检查 |
| `npm run backup` | 备份数据 |
| `npm run restore -- --from=xxx` | 恢复数据 |
| `npm run cleanup-logs -- --days=30` | 清理日志 |
| `npm run set-password` | 重置密码 |

---

## 关键配置

### 环境变量（.env）
```bash
# 必需
DATABASE_URL="file:./storage/data/app.db"
UPLOAD_DIR="./storage/uploads"

# Session Secrets（生产环境必须修改）
VISITOR_SESSION_SECRET="your-visitor-secret-min-32-chars"
ADMIN_SESSION_SECRET="your-admin-secret-min-32-chars-different"

# 初始密码（首次部署后请修改）
VISITOR_PASSWORD="visitor123"
ADMIN_PASSWORD="admin123"

# 可选
MAX_UPLOAD_SIZE="5242880"
```

### Docker Compose 关键配置
```yaml
volumes:
  - ./storage/data:/app/storage/data      # 数据库持久化 ⭐
  - ./storage/uploads:/app/storage/uploads # 上传文件持久化 ⭐
```

---

## 数据库模型速览

```prisma
SiteSettings      # 站点配置（标题、副标题、样式）
AuthSettings      # 认证配置（密码哈希、登录限制）
ButtonGroup       # 按钮分组
Button            # 按钮条目
BackgroundSet     # 背景组配置
BackgroundItem    # 背景图片
Resource          # 上传资源
AccessLog         # 访问日志
OperationLog      # 操作日志
LoginAttempt      # 登录失败记录
```

完整模型见 `prisma/schema.prisma`

---

## API 端点速览

### 公开端点
- `GET /api/health` - 健康检查
- `GET /api/site` - 站点信息
- `GET /api/backgrounds` - 背景列表
- `POST /api/auth/visitor/login` - 访客登录

### 管理端点（需管理员权限）
- `GET/PUT /api/admin/site` - 站点配置
- `GET/POST /api/admin/button-groups` - 分组管理
- `GET/POST /api/admin/buttons` - 按钮管理
- `GET/POST /api/admin/backgrounds` - 背景管理
- `GET/POST /api/admin/assets` - 资源管理
- `GET/DELETE /api/admin/logs/*` - 日志管理
- `PUT /api/admin/security/password` - 密码修改

完整 API 列表见 `README.md#API 接口`

---

## 已知限制

1. **无重型 E2E 测试** - 仅有轻量 Node 脚本测试
2. **缩略图单一尺寸** - 仅 320px，无多尺寸自适应
3. **SVG 禁用** - 需手动转换格式
4. **无图片审核** - 需人工确认上传内容
5. **仅本地备份** - 需配合 rsync 实现异地备份
6. **无 CDN** - 资源直接走应用服务器
7. **适合自托管** - 不适合高并发或多租户

完整限制说明见 `CHANGELOG.md#Known Limitations`

---

## 后续可选方向

- [ ] Playwright E2E 测试
- [ ] 响应式图片多尺寸支持
- [ ] WebP 自适应格式
- [ ] 云存储备份
- [ ] CDN 加速
- [ ] 图片内容审核
- [ ] 访问日志分析
- [ ] 多语言/深色模式

---

## 交付检查清单

项目交付时，以下应已完成：

- [x] 版本号明确（package.json）：v1.0.0
- [x] CHANGELOG 完整
- [x] README 结构清晰
- [x] 文档索引完整
- [x] LICENSE 已添加（MIT）
- [x] 脚本测试通过
- [x] Docker 可正常构建运行
- [x] 已知限制已列出
- [x] 后续方向已说明

**完整交付清单**: [delivery-checklist.md](delivery-checklist.md)

---

## 最后更新

- **版本**: 1.0.0
- **更新时间**: 2024-01
- **维护者**: AI-assisted development

---

**提示**: 本文档是项目的"地图"，遇到问题时先查阅本文档找到对应的方向，再深入具体文档。
