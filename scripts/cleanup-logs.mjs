#!/usr/bin/env node
/**
 * 日志自动清理脚本
 * 
 * 用途：
 * - 清理 N 天前的访问日志
 * - 清理 N 天前的操作日志
 * - 支持分别清理或一起清理
 * 
 * 使用方式：
 *   # 清理 30 天前的所有日志
 *   node scripts/cleanup-logs.mjs --days=30
 * 
 *   # 仅清理访问日志
 *   node scripts/cleanup-logs.mjs --days=30 --access-only
 * 
 *   # 仅清理操作日志
 *   node scripts/cleanup-logs.mjs --days=30 --operation-only
 * 
 *   # 清理全部日志（危险！需要确认）
 *   node scripts/cleanup-logs.mjs --all
 * 
 *   # 预览模式（不实际删除）
 *   node scripts/cleanup-logs.mjs --days=30 --dry-run
 * 
 * 定时任务建议（Linux crontab）：
 *   # 每周日凌晨 3 点清理 30 天前的日志
 *   0 3 * * 0 cd /path/to/my-homepage && node scripts/cleanup-logs.mjs --days=30
 * 
 * 安全策略：
 * - 默认至少保留 7 天日志（可通过 --min-days 调整）
 * - 清理全部日志需要显式 --all 参数
 * - 提供 --dry-run 预览模式
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ==================== 配置 ====================

// 最小保留天数（安全边界）
const MIN_KEEP_DAYS = 7;

// ==================== 工具函数 ====================

/**
 * 解析命令行参数
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    days: null,
    accessOnly: false,
    operationOnly: false,
    all: false,
    dryRun: false,
    minDays: MIN_KEEP_DAYS,
  };

  for (const arg of args) {
    if (arg.startsWith("--days=")) {
      options.days = parseInt(arg.replace("--days=", ""), 10);
    } else if (arg === "--access-only") {
      options.accessOnly = true;
    } else if (arg === "--operation-only") {
      options.operationOnly = true;
    } else if (arg === "--all") {
      options.all = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg.startsWith("--min-days=")) {
      options.minDays = parseInt(arg.replace("--min-days=", ""), 10);
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
用法: node scripts/cleanup-logs.mjs [选项]

选项:
  --days=<天数>      清理 N 天前的日志
  --access-only      仅清理访问日志
  --operation-only   仅清理操作日志
  --all              清理全部日志（危险！）
  --dry-run          预览模式，不实际删除
  --min-days=<天数>  最小保留天数（默认: ${MIN_KEEP_DAYS}）
  --help, -h         显示此帮助信息

示例:
  # 清理 30 天前的所有日志
  node scripts/cleanup-logs.mjs --days=30

  # 仅清理访问日志
  node scripts/cleanup-logs.mjs --days=30 --access-only

  # 预览模式（查看将要删除多少条）
  node scripts/cleanup-logs.mjs --days=30 --dry-run

  # 清理全部日志（需要显式指定）
  node scripts/cleanup-logs.mjs --all

注意:
  - 默认至少保留 ${MIN_KEEP_DAYS} 天的日志
  - 使用 --dry-run 预览后再实际清理
  - --all 会清理所有日志，请谨慎使用
`);
}

/**
 * 计算 N 天前的日期
 */
function getBeforeDate(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * 格式化日期
 */
function formatDate(date) {
  return date.toLocaleString("zh-CN");
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

// ==================== 主流程 ====================

async function main() {
  console.log("=== My Homepage 日志清理 ===\n");

  const options = parseArgs();

  // 检查参数
  if (!options.all && options.days === null) {
    console.error("错误: 请指定 --days=<天数> 或 --all\n");
    console.error("使用 --help 查看帮助\n");
    process.exit(1);
  }

  // 处理 --all 参数
  if (options.all) {
    if (!options.dryRun) {
      const confirmed = await confirmDangerous(
        "警告: 即将清理全部日志！此操作不可恢复。是否继续?"
      );
      if (!confirmed) {
        console.log("\n已取消操作\n");
        process.exit(0);
      }
    }
  } else {
    // 检查最小保留天数
    if (options.days < options.minDays) {
      console.error(
        `错误: 最小保留天数为 ${options.minDays} 天，不能清理 ${options.days} 天前的日志\n`
      );
      console.error(`如需调整，请使用 --min-days=${options.days}\n`);
      process.exit(1);
    }
  }

  const beforeDate = options.all ? new Date() : getBeforeDate(options.days);
  const mode = options.dryRun ? "[预览模式]" : "";

  console.log(`${mode}清理条件:`);
  if (options.all) {
    console.log("  范围: 全部日志");
  } else {
    console.log(`  时间: ${options.days} 天前 (${formatDate(beforeDate)})`);
  }
  console.log(`  访问日志: ${options.operationOnly ? "跳过" : "清理"}`);
  console.log(`  操作日志: ${options.accessOnly ? "跳过" : "清理"}\n`);

  let totalDeleted = 0;

  try {
    // ========== 清理访问日志 ==========
    if (!options.operationOnly) {
      console.log("[1/2] 访问日志...");

      // 先查询数量
      const accessCount = await prisma.accessLog.count({
        where: options.all ? {} : { timestamp: { lt: beforeDate } },
      });

      console.log(`  找到 ${accessCount} 条记录`);

      if (accessCount > 0) {
        if (options.dryRun) {
          console.log(`  [预览] 将删除 ${accessCount} 条访问日志`);
        } else {
          const result = await prisma.accessLog.deleteMany({
            where: options.all ? {} : { timestamp: { lt: beforeDate } },
          });
          console.log(`  ✓ 已删除 ${result.count} 条访问日志`);
          totalDeleted += result.count;
        }
      } else {
        console.log("  - 无需要清理的记录");
      }
    } else {
      console.log("[1/2] 跳过访问日志 (--operation-only)");
    }

    // ========== 清理操作日志 ==========
    if (!options.accessOnly) {
      console.log("\n[2/2] 操作日志...");

      // 先查询数量
      const operationCount = await prisma.operationLog.count({
        where: options.all ? {} : { timestamp: { lt: beforeDate } },
      });

      console.log(`  找到 ${operationCount} 条记录`);

      if (operationCount > 0) {
        if (options.dryRun) {
          console.log(`  [预览] 将删除 ${operationCount} 条操作日志`);
        } else {
          const result = await prisma.operationLog.deleteMany({
            where: options.all ? {} : { timestamp: { lt: beforeDate } },
          });
          console.log(`  ✓ 已删除 ${result.count} 条操作日志`);
          totalDeleted += result.count;
        }
      } else {
        console.log("  - 无需要清理的记录");
      }
    } else {
      console.log("\n[2/2] 跳过操作日志 (--access-only)");
    }

    // ========== 完成 ==========
    console.log("\n============================");
    if (options.dryRun) {
      console.log("✓ 预览完成（未实际删除）");
    } else {
      console.log(`✓ 清理完成! 共删除 ${totalDeleted} 条记录`);
    }
    console.log("============================\n");

    process.exit(0);
  } catch (error) {
    console.error("\n✗ 清理失败:");
    console.error(`  ${error.message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
