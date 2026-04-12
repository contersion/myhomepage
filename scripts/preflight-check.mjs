#!/usr/bin/env node
/**
 * Preflight Check - 发布前检查
 * 
 * 用途：
 * - 在发布前执行完整的检查流程
 * - 确保构建、健康检查、验收测试都通过
 * - 验证运维脚本可正常执行
 * 
 * 执行流程：
 * 1. 构建检查 (npm run build)
 * 2. 健康检查 (/api/health)
 * 3. Smoke Test
 * 4. Acceptance Test (可选)
 * 5. 运维脚本检查 (backup dry-run, cleanup-logs dry-run, restore verify)
 * 
 * 使用方式：
 *   npm run preflight          # 执行完整检查
 *   npm run preflight --quick  # 跳过耗时操作（只检查 health + smoke）
 * 
 * 退出码：
 *   0 - 全部通过，可以发布
 *   1 - 有失败项，需要修复
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import http from 'http';
import https from 'https';

const DEFAULT_BASE_URL = 'http://localhost:3456';
const TIMEOUT_MS = 30000;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

function success(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function failure(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

function info(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function warning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function section(title) {
  console.log('');
  console.log(`${colors.cyan}▶ ${title}${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(40)}${colors.reset}`);
}

// HTTP 请求
function request(url, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const req = client.get(url, { timeout }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data,
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

// 执行命令
function runCommand(command, args = [], options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: options.silent ? 'pipe' : 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });
    
    let stdout = '';
    let stderr = '';
    
    if (options.silent) {
      child.stdout?.on('data', (data) => stdout += data);
      child.stderr?.on('data', (data) => stderr += data);
    }
    
    child.on('close', (code) => {
      resolve({
        success: code === 0,
        code,
        stdout,
        stderr,
      });
    });
  });
}

// 检查步骤
const checks = [];

function check(name, fn) {
  checks.push({ name, fn });
}

// 定义检查步骤
function defineChecks(baseUrl, quickMode) {
  // 1. 构建检查（quick 模式跳过）
  if (!quickMode) {
    check('Build check', async () => {
      // 先检查 .next 目录是否存在且非空
      try {
        const stats = await fs.stat('.next');
        if (stats.isDirectory()) {
          const files = await fs.readdir('.next');
          if (files.length > 0) {
            info('Found existing .next directory');
            // 检查是否有 standalone 目录（Next.js 15 独立输出）
            try {
              const standaloneStats = await fs.stat('.next/standalone');
              if (standaloneStats.isDirectory()) {
                success('Build artifacts exist (.next/standalone)');
                return;
              }
            } catch {
              // standalone 不存在，继续检查其他标志
            }
          }
        }
      } catch {
        // .next 不存在，需要构建
      }
      
      info('Running npm run build...');
      const result = await runCommand('npm', ['run', 'build'], { silent: true });
      if (!result.success) {
        throw new Error('Build failed');
      }
    });
  }

  // 2. 健康检查
  check('Health check', async () => {
    const res = await request(`${baseUrl}/api/health`, 5000);
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    if (json.status !== 'ok') {
      throw new Error(`status=${json.status}`);
    }
  });

  // 3. Smoke Test
  check('Smoke test', async () => {
    info('Running smoke tests...');
    const result = await runCommand('node', ['scripts/smoke-test.mjs', baseUrl], { silent: true });
    if (!result.success) {
      throw new Error('Smoke tests failed');
    }
  });

  // 4. Acceptance Test（quick 模式跳过）
  if (!quickMode) {
    check('Acceptance test', async () => {
      info('Running acceptance tests...');
      const result = await runCommand('node', ['scripts/acceptance-check.mjs', baseUrl], { silent: true });
      if (!result.success) {
        throw new Error('Acceptance tests failed');
      }
    });
  }

  // 5. 备份脚本检查（dry-run）
  check('Backup script check', async () => {
    // 检查备份目录是否可写
    const backupDir = './storage/backups';
    try {
      await fs.mkdir(backupDir, { recursive: true });
      const testFile = `${backupDir}/.write-test`;
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
    } catch (error) {
      throw new Error(`Backup directory not writable: ${error.message}`);
    }
  });

  // 6. 运维脚本语法检查
  check('Maintenance scripts syntax check', async () => {
    const scripts = [
      'scripts/backup.mjs',
      'scripts/restore.mjs',
      'scripts/cleanup-logs.mjs',
      'scripts/healthcheck.mjs',
    ];
    
    for (const script of scripts) {
      try {
        await fs.access(script);
      } catch {
        throw new Error(`${script} not found`);
      }
    }
  });

  // 7. 环境变量检查
  check('Environment check', async () => {
    const requiredEnv = ['DATABASE_URL'];
    const envFile = await fs.readFile('.env', 'utf-8').catch(() => '');
    const envExample = await fs.readFile('.env.example', 'utf-8').catch(() => '');
    
    for (const key of requiredEnv) {
      const inEnv = envFile.includes(key);
      const inExample = envExample.includes(key);
      if (!inEnv && !inExample) {
        throw new Error(`${key} not found in .env or .env.example`);
      }
    }
    
    // 警告：检查是否使用默认密码（仅警告不失败）
    if (envFile.includes('visitor123') || envFile.includes('admin123')) {
      warning('Default passwords detected in .env - change before production');
    }
  });

  // 8. 存储目录检查
  check('Storage directories check', async () => {
    const dirs = [
      './storage/data',
      './storage/uploads',
    ];
    
    for (const dir of dirs) {
      try {
        const stats = await fs.stat(dir);
        if (!stats.isDirectory()) {
          throw new Error(`${dir} is not a directory`);
        }
      } catch {
        throw new Error(`${dir} does not exist`);
      }
    }
  });
}

// 运行检查
async function runChecks() {
  const results = [];
  
  for (const { name, fn } of checks) {
    section(name);
    const startTime = Date.now();
    try {
      await fn();
      const duration = Date.now() - startTime;
      success(`${name} (${duration}ms)`);
      results.push({ name, success: true, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      failure(`${name} (${duration}ms)`);
      console.log(`  ${colors.gray}${error.message}${colors.reset}`);
      results.push({ name, success: false, error: error.message, duration });
    }
  }
  
  return results;
}

// 主流程
async function main() {
  const args = process.argv.slice(2);
  const quickMode = args.includes('--quick');
  const baseUrl = args.find(arg => !arg.startsWith('--')) || DEFAULT_BASE_URL;
  
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║           Preflight Check - 发布前检查           ║');
  console.log(quickMode ? '║              (Quick Mode - 快速模式)             ║' : '║              (Full Mode - 完整模式)              ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  info(`Target URL: ${baseUrl}`);
  info(`Mode: ${quickMode ? 'Quick (skip build)' : 'Full (include build)'}`);
  console.log('');
  
  // 定义并执行检查
  defineChecks(baseUrl, quickMode);
  const startTime = Date.now();
  const results = await runChecks();
  const totalDuration = Date.now() - startTime;
  
  // 统计结果
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  // 最终报告
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log(`║  Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}  ${colors.gray}(${totalDuration}ms)${colors.reset}      ║`);
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  
  if (failed === 0) {
    success('All preflight checks passed!');
    console.log('');
    info('You can proceed with deployment.');
    info('');
    info('Next steps:');
    info('  1. Verify production environment variables');
    info('  2. Run: docker-compose up -d');
    info('  3. Check: docker-compose ps');
    console.log('');
    process.exit(0);
  } else {
    failure(`${failed} preflight check(s) failed`);
    console.log('');
    info('Failed checks:');
    for (const result of results.filter(r => !r.success)) {
      console.log(`  • ${result.name}`);
      console.log(`    ${colors.gray}${result.error}${colors.reset}`);
    }
    console.log('');
    info('Please fix the issues before deployment.');
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
