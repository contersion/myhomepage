# My Homepage

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](docker-compose.yml)

个人展示站，基于 Next.js + SQLite + Docker 构建。

> **当前版本**: v1.0.0 - 首个稳定版本 ([CHANGELOG](CHANGELOG.md))
>
> **快速导航**: [功能特性](#功能特性) · [快速开始](#快速开始) · [文档索引](#相关文档) · [运维入口](#运维命令)

## 功能特性

- **访客密码保护** - 全站访问需要密码
- **管理员独立后台** - `/admin` 路径管理所有内容
- **极简二次元风格首页** - 中间卡片展示，背景轮播
- **分组按钮管理** - 支持分组、排序、显示控制
- **背景图轮播** - PC/手机分别配置，支持随机起始、淡入淡出
- **访问页背景** - `/access` 登录页支持独立背景图（PC/手机可分开）
- **底部备案信息** - 支持 ICP/公安备案号显示、链接跳转与范围控制
- **资源上传管理** - 本地存储，支持图片上传与绑定
- **图片自动压缩** - PNG/JPG/WebP 自动压缩与尺寸限制
- **SVG 安全策略** - 明确禁用 SVG，防止 XSS 风险
- **资源元数据** - 自动提取宽高、MIME 类型等信息
- **缩略图派生** - 自动生成 320px 缩略图，优化后台预览性能
- **图片懒加载** - 后台资源页、图标选择器懒加载优化
- **访问日志与操作日志** - 完整审计记录
- **登录失败限制** - 5 次错误后锁定 15 分钟
- **密码修改** - 后台安全设置页自助修改

## 技术栈

- **框架**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS v3
- **数据库**: SQLite + Prisma ORM
- **部署**: Docker + Docker Compose
- **认证**: 双会话隔离（visitor_session / admin_session）

## 快速开始

### 开发环境

```bash
# 1. 安装依赖
npm install

# 2. 确保存储目录存在
node scripts/ensure-storage.mjs

# 3. 复制环境变量
cp .env.example .env

# 4. 初始化数据库
npm run db:migrate
npm run db:seed

# 5. 启动开发服务器
npm run dev
```

访问 http://localhost:3456

### Docker 部署（推荐）

```bash
# 1. 确保存储目录存在
node scripts/ensure-storage.mjs

# 2. 复制并编辑环境变量
cp .env.example .env
# 编辑 .env，修改默认密码和 session secrets

# 3. 构建并启动
docker-compose up -d --build

# 4. 查看日志
docker-compose logs -f

# 5. 检查健康状态
docker-compose ps
node scripts/healthcheck.mjs http://localhost:3456
```

### 运维命令

```bash
# 备份数据
npm run backup

# 恢复数据
npm run restore -- --from=storage/backups/backup-20240101-120000

# 清理日志（保留最近30天）
npm run cleanup-logs -- --days=30

# 查看所有脚本帮助
node scripts/backup.mjs --help
node scripts/restore.mjs --help
node scripts/cleanup-logs.mjs --help
```

### 测试与验收

```bash
# Smoke Test - 快速回归测试（约 5 秒）
npm run smoke

# Acceptance Test - 完整验收测试
npm run acceptance

# Acceptance Test - 完整模式（更多 API 测试）
npm run acceptance -- --full

# Preflight Check - 发布前检查
npm run preflight

# Preflight Check - 快速模式（跳过构建）
npm run preflight:quick
```

### 持久化数据

数据默认存储在以下目录：
- `storage/data/` - SQLite 数据库文件
- `storage/uploads/` - 上传的图片资源

Docker 部署时，这些目录通过 volume 挂载到宿主机，容器重建不会丢失数据。

## 默认账号

> ⚠️ **首次部署后请立即修改默认密码**

| 类型 | 访问路径 | 默认密码 | 修改方式 |
|------|----------|----------|----------|
| 访客 | 首页 | `visitor123` | 后台安全设置 |
| 管理员 | `/admin/login` | `admin123` | 后台安全设置 |

### 密码重置（紧急）

如果忘记密码，可使用脚本重置：

```bash
# 交互式重置
node scripts/set-password.mjs

# 命令行直接设置
node scripts/set-password.mjs visitor newpassword
node scripts/set-password.mjs admin newpassword
```

## 项目结构

```
my-homepage/
├── src/
│   ├── app/              # Next.js App Router
│   │   ├── access/       # 访客登录页
│   │   ├── admin/        # 后台管理页面
│   │   ├── api/          # API 路由
│   │   ├── page.tsx      # 首页
│   │   └── layout.tsx    # 根布局
│   ├── components/       # React 组件
│   └── lib/              # 业务逻辑层
│       ├── auth/         # 认证与会话
│       ├── security/     # 登录限制与密码
│       ├── logs/         # 日志操作
│       ├── assets/       # 资源管理
│       ├── backgrounds/  # 背景配置
│       ├── buttons/      # 按钮管理
│       └── site/         # 站点配置
├── prisma/
│   ├── schema.prisma     # 数据库模型
│   └── seed.ts           # 初始化脚本
├── scripts/              # 运维脚本
│   ├── ensure-storage.mjs    # 存储目录初始化
│   ├── set-password.mjs      # 密码重置
│   ├── healthcheck.mjs       # 健康检查
│   ├── smoke-test.mjs        # 最小回归测试
│   ├── acceptance-check.mjs  # 验收检查
│   ├── preflight-check.mjs   # 发布前检查
│   ├── backup.mjs            # 数据备份
│   ├── restore.mjs           # 数据恢复
│   ├── cleanup-logs.mjs      # 日志清理
│   └── docker-start.mjs      # Docker 启动脚本
├── storage/              # 持久化数据
│   ├── data/             # SQLite 数据库
│   └── uploads/          # 上传文件
├── docs/                 # 文档
│   ├── deployment.md     # 部署指南
│   ├── configuration.md  # 配置说明
│   ├── acceptance.md     # 验收指南
│   ├── go-live-checklist.md  # 上线检查清单
│   └── project-map.md    # 项目导览 ⭐ 新接手先看这个
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API 接口

### 认证接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/auth/visitor/login` | POST | 访客登录（密码验证） |
| `/api/auth/visitor/logout` | POST | 访客退出 |
| `/api/auth/admin/login` | POST | 管理员登录 |
| `/api/auth/admin/logout` | POST | 管理员退出 |

### 站点接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/site` | GET | 获取公开站点信息 |
| `/api/admin/site` | GET/PUT | 站点配置管理 |

### 背景接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/backgrounds` | GET | 获取背景列表（公开） |
| `/api/admin/backgrounds` | GET/POST | 背景管理 |
| `/api/admin/background-config` | GET/PUT | 背景配置 |

### 按钮接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/button-groups` | GET/POST | 按钮分组管理 |
| `/api/admin/buttons` | GET/POST | 按钮管理 |

### 资源接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/assets` | GET/POST | 资源上传与列表 |
| `/api/admin/assets/:id` | DELETE | 资源删除 |
| `/api/assets/:filename` | GET | 资源访问 |

### 日志接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/logs/operations` | GET/DELETE | 操作日志 |
| `/api/admin/logs/access` | GET/DELETE | 访问日志 |

### 安全接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/admin/security/password` | PUT | 修改密码 |

### 系统接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |

## 开发阶段

- [x] 阶段 0: 项目分析与方案确认
- [x] 阶段 1: 骨架与基础模型
- [x] 阶段 2-A: 认证与站点信息主链路
- [x] 阶段 2-B: 按钮分组与按钮管理
- [x] 阶段 2-C: 背景管理与首页轮播
- [x] 阶段 3-A: 资源上传与管理
- [x] 阶段 3-B: 日志、登录限制、安全设置
- [x] 阶段 4-A: Docker、文档、初始化脚本与验收链路
- [x] 阶段 4-B: 统一访问日志、移动端适配优化
- [x] 阶段 4-C: 图片处理与上传安全增强
- [x] 阶段 4-D: 运维自动化增强（自动备份、日志清理、恢复方案）
- [x] 阶段 4-E: 缩略图派生与前端性能优化
- [x] 阶段 4-F: 发布前质量加固与回归验收自动化
- [x] 阶段 5: 最终交付收口与版本发布准备（当前）

**状态**: ✅ v1.0.0 已发布 - 首个稳定版本

## 相关文档

### 🚀 首发上线（必读）
- [首发上线指南](docs/first-release.md) ⭐⭐⭐ - 从代码到上线的完整执行步骤
- [上线检查清单](docs/go-live-checklist.md) - 上线前逐项确认

### 📖 新手入门
- [项目导览](docs/project-map.md) ⭐ - 快速了解项目结构、关键入口
- [部署指南](docs/deployment.md) - 详细部署步骤
- [配置说明](docs/configuration.md) - 环境变量与配置项

### ✅ 验收与交付
- [验收指南](docs/acceptance.md) - 功能验收步骤
- [CHANGELOG](CHANGELOG.md) - 版本变更记录
- [LICENSE](LICENSE) - MIT 许可证

### 🔧 运维与开发
- [运维手册](RUNBOOK.md) - 日常运维、故障排查、紧急恢复
- [AGENTS.md](AGENTS.md) - AI 开发约束（开发前必读）
- [ARCHITECTURE.md](ARCHITECTURE.md) - 技术架构与模块职责
- [development-process.md](development-process.md) - 开发流程与阶段划分

## 已知限制

1. **无重型 E2E 测试** - 仅有轻量 Node 脚本测试（Smoke/Acceptance）
2. **缩略图单一尺寸** - 仅 320px，无多尺寸自适应
3. **SVG 禁用** - 需手动转换为 PNG/JPG/WebP
4. **无图片审核** - 需人工确认上传内容
5. **仅本地备份** - 需配合 rsync/scp 实现异地备份
6. **无 CDN** - 资源直接走应用服务器
7. **适用场景** - 更适合个人自托管，不适合高并发

完整限制说明与后续方向见 [CHANGELOG.md](CHANGELOG.md)

## 安全说明

1. **密码存储** - 所有密码使用 bcrypt 哈希存储，不保存明文
2. **会话隔离** - 访客与管理员的会话完全隔离
3. **登录限制** - 连续 5 次登录失败后锁定 15 分钟
4. **API 鉴权** - 所有后台 API 都需要管理员会话
5. **文件上传** - 限制文件类型（图片）和大小（5MB）

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件
