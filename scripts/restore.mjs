#!/usr/bin/env node
/**
 * 备份恢复帮助脚本
 * 
 * 用途：
 * - 显示恢复操作指南
 * - 验证备份完整性
 * - 辅助执行恢复操作（不自动覆盖，需用户确认）
 * 
 * 使用方式：
 *   # 显示恢复帮助
 *   node scripts/restore.mjs --help
 * 
 *   # 验证备份完整性
 *   node scripts/restore.mjs --verify=/path/to/backup-20240101-120000
 * 
 *   # 执行恢复（需确认）
 *   node scripts/restore.mjs --from=/path/to/backup-20240101-120000
 * 
 *   # 仅恢复数据库
 *   node scripts/restore.mjs --from=/path/to/backup --db-only
 * 
 * 注意：
 * - 恢复前强烈建议先备份当前数据
 * - 恢复过程需要停止应用
 * - 恢复后需要重启应用
 */

import { promises as fs } from "fs";
import { join, resolve } from "path";

// ==================== 配置 ====================

const DB_TARGET = "./storage/data/app.db";
const UPLOADS_TARGET = "./storage/uploads";

// ==================== 工具函数 ====================

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    from: null,
    verify: null,
    dbOnly: false,
    help: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--from=")) {
      options.from = arg.replace("--from=", "");
    } else if (arg.startsWith("--verify=")) {
      options.verify = arg.replace("--verify=", "");
    } else if (arg === "--db-only") {
      options.dbOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      options.help = true;
    }
  }

  return options;
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
=== My Homepage 备份恢复指南 ===

本脚本提供备份验证和恢复辅助功能。

用法: node scripts/restore.mjs [选项]

选项:
  --from=<路径>      从指定备份恢复（需确认）
  --verify=<路径>    验证备份完整性
  --db-only          仅恢复数据库
  --help, -h         显示此帮助信息

恢复步骤:

1. 停止应用（重要！）
   docker-compose down

2. 备份当前数据（强烈建议）
   node scripts/backup.mjs

3. 查看可用备份
   ls -la storage/backups/

4. 验证备份完整性
   node scripts/restore.mjs --verify=storage/backups/backup-20240101-120000

5. 执行恢复
   node scripts/restore.mjs --from=storage/backups/backup-20240101-120000

6. 启动应用
   docker-compose up -d

7. 验证恢复结果
   node scripts/healthcheck.mjs

风险提示:
  - 恢复操作会覆盖现有数据
  - 恢复前务必先备份当前数据
  - 恢复过程需要停止应用
  - 恢复后需要重启应用
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
 * 验证备份完整性
 */
async function verifyBackup(backupPath) {
  console.log(`\n验证备份: ${backupPath}\n`);

  const resolvedPath = resolve(backupPath);

  // 检查备份目录是否存在
  if (!(await fileExists(resolvedPath))) {
    console.error(`✗ 备份目录不存在: ${resolvedPath}\n`);
    return false;
  }

  let isValid = true;

  // 检查 info.json
  const infoPath = join(resolvedPath, "info.json");
  console.log("[1/3] 检查备份元数据...");
  if (await fileExists(infoPath)) {
    try {
      const info = JSON.parse(await fs.readFile(infoPath, "utf-8"));
      console.log(`  ✓ info.json`);
      console.log(`    备份时间: ${new Date(info.createdAt).toLocaleString("zh-CN")}`);
      console.log(`    备份模式: ${info.dbOnly ? "仅数据库" : "完整备份"}`);
    } catch (error) {
      console.log(`  ✗ info.json 解析失败: ${error.message}`);
      isValid = false;
    }
  } else {
    console.log(`  ! info.json 不存在`);
  }

  // 检查数据库文件
  const dbPath = join(resolvedPath, "app.db");
  console.log("\n[2/3] 检查数据库文件...");
  if (await fileExists(dbPath)) {
    const stats = await fs.stat(dbPath);
    console.log(`  ✓ app.db (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`  ✗ app.db 不存在`);
    isValid = false;
  }

  // 检查上传文件
  const uploadsPath = join(resolvedPath, "uploads");
  console.log("\n[3/3] 检查上传文件...");
  if (await fileExists(uploadsPath)) {
    const entries = await fs.readdir(uploadsPath);
    console.log(`  ✓ uploads/ (${entries.length} 个文件/目录)`);
  } else {
    console.log(`  ! uploads/ 不存在（可能是 --db-only 备份）`);
  }

  console.log("\n============================");
  if (isValid) {
    console.log("✓ 备份验证通过");
  } else {
    console.log("✗ 备份验证失败");
  }
  console.log("============================\n");

  return isValid;
}

/**
 * 确认危险操作
 */
async function confirmDangerous(message) {
  const readline = await import("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "yes");
    });
  });
}

/**
 * 执行恢复
 */
async function performRestore(backupPath, dbOnly) {
  console.log(`\n准备从备份恢复: ${backupPath}\n`);

  const resolvedBackupPath = resolve(backupPath);

  // 验证备份
  const isValid = await verifyBackup(backupPath);
  if (!isValid) {
    console.error("备份验证失败，无法继续恢复\n");
    process.exit(1);
  }

  // 检查当前数据
  console.log("检查当前数据...");
  const currentDbExists = await fileExists(DB_TARGET);
  const currentUploadsExists = await fileExists(UPLOADS_TARGET);

  console.log(`  当前数据库: ${currentDbExists ? "存在" : "不存在"}`);
  console.log(`  当前上传目录: ${currentUploadsExists ? "存在" : "不存在"}\n`);

  // 风险提示
  console.log("⚠️  警告: 恢复操作将覆盖现有数据！\n");

  // 确认恢复
  const confirmed = await confirmDangerous("是否继续恢复?");
  if (!confirmed) {
    console.log("\n已取消恢复操作\n");
    process.exit(0);
  }

  console.log("\n执行恢复...\n");

  try {
    // 恢复数据库
    console.log("[1/2] 恢复数据库...");
    const dbSource = join(resolvedBackupPath, "app.db");
    await fs.copyFile(dbSource, DB_TARGET);
    console.log("  ✓ 数据库已恢复\n");

    // 恢复上传文件
    if (!dbOnly) {
      console.log("[2/2] 恢复上传文件...");
      const uploadsSource = join(resolvedBackupPath, "uploads");

      if (await fileExists(uploadsSource)) {
        // 确保目标目录存在
        await fs.mkdir(UPLOADS_TARGET, { recursive: true });

        // 读取备份中的文件
        const entries = await fs.readdir(uploadsSource);

        for (const entry of entries) {
          const srcPath = join(uploadsSource, entry);
          const destPath = join(UPLOADS_TARGET, entry);
          await fs.cp(srcPath, destPath, { recursive: true, force: true });
        }

        console.log(`  ✓ 上传文件已恢复 (${entries.length} 个)\n`);
      } else {
        console.log("  ! 备份中无上传文件，跳过\n");
      }
    } else {
      console.log("[2/2] 跳过上传文件 (--db-only)\n");
    }

    console.log("============================");
    console.log("✓ 恢复完成!");
    console.log("============================\n");

    console.log("后续步骤:");
    console.log("1. 启动应用: docker-compose up -d");
    console.log("2. 验证状态: node scripts/healthcheck.mjs\n");
  } catch (error) {
    console.error("\n✗ 恢复失败:");
    console.error(`  ${error.message}\n`);
    process.exit(1);
  }
}

// ==================== 主流程 ====================

async function main() {
  const options = parseArgs();

  if (options.help || (!options.from && !options.verify)) {
    showHelp();
    process.exit(0);
  }

  if (options.verify) {
    const isValid = await verifyBackup(options.verify);
    process.exit(isValid ? 0 : 1);
  }

  if (options.from) {
    await performRestore(options.from, options.dbOnly);
    process.exit(0);
  }
}

main().catch((error) => {
  console.error("\n✗ 执行错误:");
  console.error(`  ${error.message}\n`);
  process.exit(1);
});
