#!/usr/bin/env node
/**
 * 存储目录初始化脚本
 * 
 * 用途：
 * - 确保 storage/data 目录存在（用于 SQLite）
 * - 确保 storage/uploads 目录存在（用于上传文件）
 * 
 * 使用方式：
 *   node scripts/ensure-storage.mjs
 * 
 * 或在 package.json 中添加：
 *   "predev": "node scripts/ensure-storage.mjs"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 需要确保存在的目录
const DIRECTORIES = [
  path.join(PROJECT_ROOT, 'storage', 'data'),
  path.join(PROJECT_ROOT, 'storage', 'uploads'),
];

// 日志函数
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function error(message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
}

// 确保目录存在
function ensureDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`✓ Created: ${path.relative(PROJECT_ROOT, dir)}`);
    } else {
      log(`✓ Exists: ${path.relative(PROJECT_ROOT, dir)}`);
    }
    return true;
  } catch (e) {
    error(`✗ Failed to create ${dir}: ${e.message}`);
    return false;
  }
}

// 主流程
function main() {
  log('=== Ensuring Storage Directories ===');
  
  let allSuccess = true;
  
  for (const dir of DIRECTORIES) {
    if (!ensureDirectory(dir)) {
      allSuccess = false;
    }
  }
  
  log('====================================');
  
  if (allSuccess) {
    log('All storage directories are ready');
    process.exit(0);
  } else {
    error('Some directories could not be created');
    process.exit(1);
  }
}

main();
