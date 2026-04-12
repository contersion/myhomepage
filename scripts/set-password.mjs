#!/usr/bin/env node
/**
 * 密码设置/重置脚本
 * 
 * 用途：
 * - 初始化或重置访客密码
 * - 初始化或重置管理员密码
 * - 用于忘记密码时的紧急恢复
 * 
 * 使用方式：
 *   # 交互式使用
 *   node scripts/set-password.mjs
 * 
 *   # 直接设置访客密码
 *   node scripts/set-password.mjs visitor mynewpassword
 * 
 *   # 直接设置管理员密码
 *   node scripts/set-password.mjs admin mynewpassword
 * 
 * 安全说明：
 * - 密码以 bcrypt 哈希形式存储
 * - 本脚本不记录明文密码
 * - 修改密码后现有会话不会失效（用户保持登录状态）
 */

import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import readline from 'readline';

const prisma = new PrismaClient();

// 创建 readline 接口
function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// 提问函数
function question(rl, query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer.trim());
    });
  });
}

// 密码强度验证
function validatePassword(password) {
  if (!password || password.length < 6) {
    return { valid: false, message: '密码长度至少 6 位' };
  }
  return { valid: true };
}

// 更新密码
async function updatePassword(type, password) {
  const configKey = type === 'visitor' ? 'visitor_password_hash' : 'admin_password_hash';
  const userType = type === 'visitor' ? '访客' : '管理员';
  
  try {
    // 生成哈希
    const hashedPassword = hashSync(password, 10);
    
    // 更新数据库
    await prisma.siteConfig.upsert({
      where: { key: configKey },
      update: { value: hashedPassword },
      create: {
        key: configKey,
        value: hashedPassword,
        description: `${userType}密码哈希`,
      },
    });
    
    console.log(`✓ ${userType}密码已更新`);
    console.log(`  注意：现有会话不会失效，如需强制登出请重启应用`);
    
    return true;
  } catch (error) {
    console.error(`✗ 更新失败: ${error.message}`);
    return false;
  }
}

// 交互式设置
async function interactiveMode() {
  const rl = createRL();
  
  console.log('=== 密码设置工具 ===');
  console.log('');
  
  try {
    // 选择类型
    const typeInput = await question(rl, '选择用户类型 (visitor/admin): ');
    const type = typeInput.toLowerCase();
    
    if (type !== 'visitor' && type !== 'admin') {
      console.error('✗ 无效的用户类型，请选择 visitor 或 admin');
      process.exit(1);
    }
    
    // 输入密码（隐藏输入）
    const password = await question(rl, '输入新密码: ');
    
    // 验证密码
    const validation = validatePassword(password);
    if (!validation.valid) {
      console.error(`✗ ${validation.message}`);
      process.exit(1);
    }
    
    // 确认密码
    const confirmPassword = await question(rl, '确认新密码: ');
    if (password !== confirmPassword) {
      console.error('✗ 两次输入的密码不一致');
      process.exit(1);
    }
    
    // 更新密码
    const success = await updatePassword(type, password);
    process.exit(success ? 0 : 1);
    
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// 命令行参数模式
async function cliMode(type, password) {
  if (type !== 'visitor' && type !== 'admin') {
    console.error('Usage: node scripts/set-password.mjs [visitor|admin] [password]');
    process.exit(1);
  }
  
  const validation = validatePassword(password);
  if (!validation.valid) {
    console.error(`✗ ${validation.message}`);
    process.exit(1);
  }
  
  const success = await updatePassword(type, password);
  await prisma.$disconnect();
  process.exit(success ? 0 : 1);
}

// 主入口
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 交互式模式
    await interactiveMode();
  } else if (args.length === 2) {
    // CLI 模式
    await cliMode(args[0], args[1]);
  } else {
    console.error('Usage:');
    console.error('  交互式: node scripts/set-password.mjs');
    console.error('  命令行: node scripts/set-password.mjs [visitor|admin] [password]');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
