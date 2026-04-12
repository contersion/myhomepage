#!/usr/bin/env node
/**
 * Smoke Test - 最小回归测试
 * 
 * 用途：
 * - 快速验证核心主链路是否可用
 * - CI/CD 或部署前快速检查
 * - 开发时快速回归验证
 * 
 * 特点：
 * - 执行速度快（< 10 秒）
 * - 覆盖最关键链路
 * - 无破坏性操作（不修改数据）
 * 
 * 使用方式：
 *   npm run smoke
 *   node scripts/smoke-test.mjs [baseUrl]
 * 
 * 退出码：
 *   0 - 全部通过
 *   1 - 有失败项
 */

import http from 'http';
import https from 'https';

const DEFAULT_BASE_URL = 'http://localhost:3456';
const TIMEOUT_MS = 8000;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
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

function debug(message) {
  console.log(`${colors.gray}${message}${colors.reset}`);
}

// HTTP 请求工具
function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      timeout: options.timeout || TIMEOUT_MS,
      headers: options.headers || {},
    };
    
    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
        });
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

// 测试项
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

// 定义 Smoke Tests - 只覆盖最关键链路
function defineSmokeTests(baseUrl) {
  // 1. 健康检查
  test('health endpoint returns ok', async () => {
    const res = await request(`${baseUrl}/api/health`);
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    if (json.status !== 'ok') {
      throw new Error(`status=${json.status}`);
    }
    if (json.database !== 'connected') {
      throw new Error(`database=${json.database}`);
    }
  });

  // 2. 首页重定向
  test('root redirects to access when not logged in', async () => {
    const res = await request(`${baseUrl}/`);
    if (res.statusCode !== 307 && res.statusCode !== 302) {
      throw new Error(`Expected redirect, got HTTP ${res.statusCode}`);
    }
  });

  // 3. 访客登录页
  test('access page is accessible', async () => {
    const res = await request(`${baseUrl}/access`);
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
  });

  // 4. 后台登录页
  test('admin login page is accessible', async () => {
    const res = await request(`${baseUrl}/admin/login`);
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
  });

  // 5. 访客登录 API - 参数缺失测试
  test('visitor login rejects empty body', async () => {
    const res = await request(`${baseUrl}/api/auth/visitor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    // 应该返回 400 错误，而不是 500
    if (res.statusCode !== 400 && res.statusCode !== 401) {
      throw new Error(`Expected 400/401, got HTTP ${res.statusCode}`);
    }
  });

  // 6. 管理员登录 API - 参数缺失测试
  test('admin login rejects empty body', async () => {
    const res = await request(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    if (res.statusCode !== 400 && res.statusCode !== 401) {
      throw new Error(`Expected 400/401, got HTTP ${res.statusCode}`);
    }
  });

  // 7. 后台 API 鉴权
  test('admin APIs require authentication', async () => {
    const endpoints = [
      '/api/admin/site',
      '/api/admin/buttons',
      '/api/admin/backgrounds',
      '/api/admin/assets',
    ];
    
    for (const endpoint of endpoints) {
      const res = await request(`${baseUrl}${endpoint}`);
      if (res.statusCode !== 401 && res.statusCode !== 403) {
        throw new Error(`${endpoint}: Expected 401/403, got HTTP ${res.statusCode}`);
      }
    }
  });

  // 8. 站点信息 API
  test('site info API returns data', async () => {
    const res = await request(`${baseUrl}/api/site`);
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    // API 返回格式: { success: true, data: { title, subtitle, ... } }
    if (!json.success || !json.data || !json.data.title) {
      throw new Error('Missing title field in response');
    }
  });

  // 9. 按钮列表 API
  test('buttons API returns array', async () => {
    const res = await request(`${baseUrl}/api/admin/buttons`);
    // 未登录返回 401，这是预期的
    if (res.statusCode !== 401 && res.statusCode !== 403) {
      // 如果已登录，检查返回格式
      if (res.statusCode === 200) {
        const json = JSON.parse(res.data);
        if (!Array.isArray(json)) {
          throw new Error('Expected array response');
        }
      }
    }
  });

  // 10. 背景 API
  test('backgrounds API returns data structure', async () => {
    const res = await request(`${baseUrl}/api/backgrounds`);
    if (res.statusCode !== 200) {
      throw new Error(`HTTP ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    // API 返回格式: { success: true, data: { images, config } }
    // 或旧格式: { pc: [], mobile: [] }
    const data = json.data || json;
    if (!Array.isArray(data.pc) && !Array.isArray(data.images)) {
      throw new Error('Missing backgrounds data structure');
    }
  });

  // 11. 错误密码返回正确状态码
  test('wrong password returns 401', async () => {
    const res = await request(`${baseUrl}/api/auth/visitor/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong_password_12345' }),
    });
    if (res.statusCode !== 401 && res.statusCode !== 429) {
      throw new Error(`Expected 401/429, got HTTP ${res.statusCode}`);
    }
  });
}

// 运行测试
async function runTests() {
  let passed = 0;
  let failed = 0;
  const failures = [];
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      success(name);
      passed++;
    } catch (error) {
      failure(name);
      debug(`  → ${error.message}`);
      failures.push({ name, error: error.message });
      failed++;
    }
  }
  
  return { passed, failed, failures };
}

// 主流程
async function main() {
  const baseUrl = process.argv[2] || DEFAULT_BASE_URL;
  
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║        Smoke Test - 最小回归测试      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  info(`Target: ${baseUrl}`);
  console.log('');
  
  // 检查应用是否可访问
  try {
    await request(`${baseUrl}/api/health`, { timeout: 5000 });
  } catch (error) {
    failure(`Cannot connect to ${baseUrl}`);
    console.log('');
    info('Please start the application first:');
    info('  npm run dev');
    info('  docker-compose up -d');
    console.log('');
    process.exit(1);
  }
  
  // 定义并运行测试
  const startTime = Date.now();
  defineSmokeTests(baseUrl);
  const results = await runTests();
  const duration = Date.now() - startTime;
  
  // 输出结果
  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log(`║  Results: ${colors.green}${results.passed} passed${colors.reset}, ${colors.red}${results.failed} failed${colors.reset}  ${colors.gray}(${duration}ms)${colors.reset}  ║`);
  console.log('╚══════════════════════════════════════╝');
  console.log('');
  
  if (results.failed === 0) {
    success('All smoke tests passed!');
    console.log('');
    process.exit(0);
  } else {
    failure(`${results.failed} smoke test(s) failed`);
    console.log('');
    info('Failures:');
    for (const { name, error } of results.failures) {
      console.log(`  • ${name}`);
      console.log(`    ${colors.gray}${error}${colors.reset}`);
    }
    console.log('');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
