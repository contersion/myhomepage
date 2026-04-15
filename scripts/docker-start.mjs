#!/usr/bin/env node
/**
 * Docker 容器启动脚本
 */

import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORAGE_DIR = '/app/storage';
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function error(message) {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`);
}

function ensureDirectory(dir) {
  if (!fs.existsSync(dir)) {
    log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  } else {
    log(`Directory exists: ${dir}`);
  }
}

function isPrismaAvailable() {
  try {
    execSync('./node_modules/.bin/prisma --version', { cwd: '/app', stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// 主流程
async function main() {
  log('=== My Homepage Docker Startup ===');
  
  try {
    // 1. 确保存储目录存在
    log('Step 1: Ensuring storage directories...');
    ensureDirectory(STORAGE_DIR);
    ensureDirectory(DATA_DIR);
    ensureDirectory(UPLOADS_DIR);
    log('Storage directories ready');
    
    // 2. 执行数据库迁移（如果 Prisma 可用）
    const prismaAvailable = isPrismaAvailable();
    
    if (prismaAvailable) {
      log('Step 2: Running database migrations...');
      try {
        execSync('./node_modules/.bin/prisma migrate deploy', {
          cwd: '/app',
          stdio: 'inherit',
          env: process.env
        });
        log('Database migrations completed');

        // 运行数据库 seed（幂等，可重复执行）
        try {
          log('Step 2b: Seeding database...');
          execSync('./node_modules/.bin/tsx prisma/seed.ts', {
            cwd: '/app',
            stdio: 'inherit',
            env: process.env
          });
          log('Database seeding completed');
        } catch (e) {
          error(`Seeding failed: ${e.message}`);
        }
      } catch (e) {
        error(`Migration failed: ${e.message}`);
      }
    } else {
      log('Step 2: Prisma CLI not available, skipping migrations');
    }
    
    // 3. 启动应用（使用 spawn 避免阻塞）
    log('Step 3: Starting Next.js application...');
    log('=====================================');
    
    const server = spawn('node', ['server.js'], {
      cwd: '/app',
      stdio: 'inherit',
      env: process.env
    });
    
    server.on('error', (err) => {
      error(`Failed to start server: ${err.message}`);
      process.exit(1);
    });
    
    server.on('exit', (code) => {
      if (code !== 0) {
        error(`Server exited with code ${code}`);
        process.exit(code);
      }
    });
    
    // 保持脚本运行
    await new Promise(() => {});
    
  } catch (e) {
    error(`Startup failed: ${e.message}`);
    process.exit(1);
  }
}

main();
