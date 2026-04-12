#!/usr/bin/env node
/**
 * 自动备份脚本
 * 
 * 用途：
 * - 备份 SQLite 数据库文件
 * - 备份上传资源目录
 * - 生成带时间戳的备份目录
 * 
 * 备份产物：
 * - backups/backup-YYYYMMDD-HHmmss/
 *   - app.db (数据库文件)
 *   - uploads/ (上传资源目录)
 *   - info.json (备份元数据)
 * 
 * 使用方式：
 *   # 执行备份
 *   node scripts/backup.mjs
 * 
 *   # 指定备份目录
 *   node scripts/backup.mjs --output=/path/to/backup
 * 
 *   # 仅备份数据库
 *   node scripts/backup.mjs --db-only
 * 
 *   # 保留最近 N 个备份，删除旧的
 *   node scripts/backup.mjs --keep=10
 * 
 * 定时任务建议（Linux crontab）：
 *   # 每天凌晨 3 点备份，保留最近 10 个
 *   0 3 * * * cd /path/to/my-homepage && node scripts/backup.mjs --keep=10
 * 
 * 注意：
 * - 备份前建议停止应用或确保无写入操作
 * - 备份目录自动创建
 * - 失败时返回非零退出码
 */

import { promises as fs } from "fs";
import { join, resolve } from "path";

// ==================== 配置 ====================

// 默认备份目录
const DEFAULT_BACKUP_DIR = "./storage/backups";

// 数据来源
const DB_SOURCE = "./storage/data/app.db";
const UPLOADS_SOURCE = "./storage/uploads";

// ==================== 工具函数 ====================

/**
 * 格式化日期时间为文件名格式
 */
function formatTimestamp(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * 格式化日期时间为可读格式
 */
function formatReadableDate(date = new Date()) {
  return date.toLocaleString("zh-CN");
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    output: DEFAULT_BACKUP_DIR,
    dbOnly: false,
    keep: null, // 保留最近 N 个备份
  };

  for (const arg of args) {
    if (arg.startsWith("--output=")) {
      options.output = arg.replace("--output=", "");
    } else if (arg === "--db-only") {
      options.dbOnly = true;
    } else if (arg.startsWith("--keep=")) {
      options.keep = parseInt(arg.replace("--keep=", ""), 10);
    } else if (arg === "--help" || arg === "-h") {
      showHelp();
      process.exit(0);
    }
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
用法: node scripts/backup.mjs [选项]

选项:
  --output=<路径>    指定备份输出目录 (默认: ${DEFAULT_BACKUP_DIR})
  --db-only          仅备份数据库，不备份上传文件
  --keep=<数量>      保留最近 N 个备份，删除旧的
  --help, -h         显示此帮助信息

示例:
  node scripts/backup.mjs
  node scripts/backup.mjs --output=/mnt/backups
  node scripts/backup.mjs --db-only
  node scripts/backup.mjs --keep=10
`);
}

/**
 * 检查文件是否存在
 */
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * 复制文件
 */
async function copyFile(src, dest) {
  await fs.mkdir(join(dest, ".."), { recursive: true });
  await fs.copyFile(src, dest);
}

/**
 * 递归复制目录
 */
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * 获取目录大小
 */
async function getDirSize(dirPath) {
  let size = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      size += await getDirSize(fullPath);
    } else {
      const stats = await fs.stat(fullPath);
      size += stats.size;
    }
  }

  return size;
}

/**
 * 清理旧备份
 */
async function cleanupOldBackups(backupDir, keepCount) {
  try {
    const entries = await fs.readdir(backupDir, { withFileTypes: true });
    const backups = entries
      .filter((e) => e.isDirectory() && e.name.startsWith("backup-"))
      .map((e) => ({
        name: e.name,
        path: join(backupDir, e.name),
        mtime: fs.stat(join(backupDir, e.name)).then((s) => s.mtime),
      }));

    if (backups.length <= keepCount) return;

    // 按修改时间排序
    const sorted = await Promise.all(
      backups.map(async (b) => ({ ...b, mtime: await b.mtime }))
    );
    sorted.sort((a, b) => b.mtime - a.mtime);

    // 删除旧的
    const toDelete = sorted.slice(keepCount);
    for (const backup of toDelete) {
      await fs.rm(backup.path, { recursive: true, force: true });
      console.log(`  已删除旧备份: ${backup.name}`);
    }
  } catch (error) {
    console.warn("  清理旧备份时出错:", error.message);
  }
}

// ==================== 主流程 ====================

async function main() {
  console.log("=== My Homepage 自动备份 ===\n");

  const options = parseArgs();
  const timestamp = formatTimestamp();
  const backupName = `backup-${timestamp}`;
  const backupPath = resolve(join(options.output, backupName));

  console.log(`备份时间: ${formatReadableDate()}`);
  console.log(`备份目录: ${backupPath}\n`);

  const backupInfo = {
    version: "1.0",
    createdAt: new Date().toISOString(),
    timestamp,
    dbOnly: options.dbOnly,
    files: {},
  };

  try {
    // 确保备份目录存在
    await fs.mkdir(backupPath, { recursive: true });

    // ========== 备份数据库 ==========
    console.log("[1/3] 备份数据库...");
    
    if (!(await fileExists(DB_SOURCE))) {
      throw new Error(`数据库文件不存在: ${DB_SOURCE}`);
    }

    const dbDest = join(backupPath, "app.db");
    await copyFile(DB_SOURCE, dbDest);
    
    const dbStats = await fs.stat(DB_SOURCE);
    backupInfo.files.db = {
      source: DB_SOURCE,
      size: dbStats.size,
      sizeReadable: formatFileSize(dbStats.size),
    };
    
    console.log(`  ✓ 数据库: ${formatFileSize(dbStats.size)}`);

    // ========== 备份上传文件 ==========
    if (!options.dbOnly) {
      console.log("\n[2/3] 备份上传文件...");
      
      if (await fileExists(UPLOADS_SOURCE)) {
        const uploadsDest = join(backupPath, "uploads");
        await copyDir(UPLOADS_SOURCE, uploadsDest);
        
        const uploadsSize = await getDirSize(UPLOADS_SOURCE);
        const uploadCount = (await fs.readdir(UPLOADS_SOURCE)).length;
        
        backupInfo.files.uploads = {
          source: UPLOADS_SOURCE,
          count: uploadCount,
          size: uploadsSize,
          sizeReadable: formatFileSize(uploadsSize),
        };
        
        console.log(`  ✓ 上传文件: ${uploadCount} 个文件, ${formatFileSize(uploadsSize)}`);
      } else {
        console.log("  ! 上传目录不存在，跳过");
        backupInfo.files.uploads = { skipped: true, reason: "目录不存在" };
      }
    } else {
      console.log("\n[2/3] 跳过上传文件 (--db-only)");
      backupInfo.files.uploads = { skipped: true, reason: "--db-only 模式" };
    }

    // ========== 写入备份信息 ==========
    console.log("\n[3/3] 写入备份元数据...");
    
    const infoPath = join(backupPath, "info.json");
    await fs.writeFile(infoPath, JSON.stringify(backupInfo, null, 2));
    console.log("  ✓ info.json");

    // ========== 清理旧备份 ==========
    if (options.keep && options.keep > 0) {
      console.log(`\n[清理] 保留最近 ${options.keep} 个备份...`);
      await cleanupOldBackups(resolve(options.output), options.keep);
    }

    // ========== 完成 ==========
    const totalSize = await getDirSize(backupPath);
    
    console.log("\n============================");
    console.log("✓ 备份完成!");
    console.log(`备份位置: ${backupPath}`);
    console.log(`备份大小: ${formatFileSize(totalSize)}`);
    console.log("============================\n");

    console.log("恢复命令:");
    console.log(`  node scripts/restore.mjs --from=${backupPath}\n`);

    process.exit(0);
  } catch (error) {
    console.error("\n✗ 备份失败:");
    console.error(`  ${error.message}\n`);
    
    // 清理失败的备份目录
    try {
      await fs.rm(backupPath, { recursive: true, force: true });
    } catch {
      // 忽略清理错误
    }
    
    process.exit(1);
  }
}

main();
