#!/usr/bin/env node
/**
 * 验收检查脚本
 * 
 * 用途：
 * - 自动化验收测试
 * - 检查核心功能是否正常
 * - 验证部署是否成功
 * 
 * 使用方式：
 *   # 检查本地开发环境
 *   node scripts/acceptance-check.mjs
 * 
 *   # 检查指定 URL
 *   node scripts/acceptance-check.mjs http://localhost:3456
 * 
 * 检查项：
 * 1. 健康检查端点
 * 2. 首页可访问
 * 3. 访客登录端点
 * 4. 后台登录页面
 * 5. 管理员登录端点
 * 6. 后台 API 鉴权
 */

import http from 'http';
import https from 'https';

const DEFAULT_BASE_URL = 'http://localhost:3456';
const TIMEOUT_MS = 10000;

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

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    smoke: args.includes('--smoke'),
    full: args.includes('--full'),
    baseUrl: args.find(arg => !arg.startsWith('--')) || DEFAULT_BASE_URL,
  };
}

// 定义测试
function defineTests(baseUrl, mode) {
  // 1. 健康检查
  test('健康检查端点 /api/health', async () => {
    const res = await request(`${baseUrl}/api/health`);
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    if (json.status !== 'ok') {
      throw new Error(`Health status is not ok: ${json.status}`);
    }
    if (json.database !== 'connected') {
      throw new Error(`Database not connected: ${json.database}`);
    }
  });

  // 2. 首页可访问
  test('首页 /', async () => {
    const res = await request(`${baseUrl}/`);
    // 未登录应重定向到 /access
    if (res.statusCode !== 307 && res.statusCode !== 302) {
      throw new Error(`Expected redirect, got ${res.statusCode}`);
    }
  });

  // 3. 访客登录页面
  test('访客登录页面 /access', async () => {
    const res = await request(`${baseUrl}/access`);
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    if (!res.data.includes('密码') && !res.data.includes('password')) {
      throw new Error('Login page does not contain password field indicator');
    }
  });

  // 4. 访客登录 API
  test('访客登录 API /api/auth/visitor/login', async () => {
    const res = await request(`${baseUrl}/api/auth/visitor/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'wrong_password' }),
    });
    // 即使密码错误，端点应该存在（返回 401）
    if (res.statusCode !== 401 && res.statusCode !== 400 && res.statusCode !== 429) {
      throw new Error(`Expected 401/400/429, got ${res.statusCode}`);
    }
  });

  // 5. 后台登录页面
  test('后台登录页面 /admin/login', async () => {
    const res = await request(`${baseUrl}/admin/login`);
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
  });

  // 6. 管理员登录 API
  test('管理员登录 API /api/auth/admin/login', async () => {
    const res = await request(`${baseUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'wrong_password' }),
    });
    if (res.statusCode !== 401 && res.statusCode !== 400 && res.statusCode !== 429) {
      throw new Error(`Expected 401/400/429, got ${res.statusCode}`);
    }
  });

  // 7. 后台 API 鉴权检查
  test('后台 API 鉴权 /api/admin/site', async () => {
    const res = await request(`${baseUrl}/api/admin/site`);
    // 未登录应返回 401
    if (res.statusCode !== 401 && res.statusCode !== 403) {
      throw new Error(`Expected 401/403 for unauthenticated request, got ${res.statusCode}`);
    }
  });

  // 8. 站点信息 API
  test('站点信息 API /api/site', async () => {
    const res = await request(`${baseUrl}/api/site`);
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    // API 返回格式: { success: true, data: { title, ... } }
    const data = json.data || json;
    if (!data.title) {
      throw new Error('Site info missing title');
    }
  });

  // 9. 背景 API
  test('背景 API /api/backgrounds', async () => {
    const res = await request(`${baseUrl}/api/backgrounds`);
    if (res.statusCode !== 200) {
      throw new Error(`Expected 200, got ${res.statusCode}`);
    }
    const json = JSON.parse(res.data);
    // API 返回格式: { success: true, data: { images, config } } 或 { pc: [], mobile: [] }
    const data = json.data || json;
    if (!Array.isArray(data.pc) && !Array.isArray(data.images)) {
      throw new Error('Backgrounds response missing data structure');
    }
  });

  // 10. 按钮列表 API（完整模式）
  if (mode === 'full') {
    test('按钮列表 API /api/admin/buttons (auth check)', async () => {
      const res = await request(`${baseUrl}/api/admin/buttons`);
      if (res.statusCode !== 401 && res.statusCode !== 403) {
        throw new Error(`Expected 401/403, got ${res.statusCode}`);
      }
    });
  }

  // 11. 资源列表 API 鉴权（完整模式）
  if (mode === 'full') {
    test('资源列表 API /api/admin/assets (auth check)', async () => {
      const res = await request(`${baseUrl}/api/admin/assets`);
      if (res.statusCode !== 401 && res.statusCode !== 403) {
        throw new Error(`Expected 401/403, got ${res.statusCode}`);
      }
    });
  }

  // 12. 日志 API 鉴权（完整模式）
  if (mode === 'full') {
    test('日志 API /api/admin/logs/access (auth check)', async () => {
      const res = await request(`${baseUrl}/api/admin/logs/access`);
      if (res.statusCode !== 401 && res.statusCode !== 403) {
        throw new Error(`Expected 401/403, got ${res.statusCode}`);
      }
    });
  }

  // 13. 访客登录 API 参数校验（完整模式）
  if (mode === 'full') {
    test('访客登录 API 参数校验', async () => {
      const res = await request(`${baseUrl}/api/auth/visitor/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.statusCode !== 400 && res.statusCode !== 401) {
        throw new Error(`Expected 400/401 for empty body, got ${res.statusCode}`);
      }
    });
  }
}

// 运行测试
async function runTests() {
  let passed = 0;
  let failed = 0;
  
  for (const { name, fn } of tests) {
    try {
      await fn();
      success(name);
      passed++;
    } catch (error) {
      failure(`${name}: ${error.message}`);
      failed++;
    }
  }
  
  return { passed, failed };
}

// 主流程
async function main() {
  const args = parseArgs();
  const baseUrl = args.baseUrl;
  const mode = args.full ? 'full' : args.smoke ? 'smoke' : 'normal';
  
  console.log('');
  console.log('======================================');
  console.log('     My Homepage Acceptance Check     ');
  console.log('======================================');
  if (mode === 'full') {
    console.log('             [Full Mode]              ');
  } else if (mode === 'smoke') {
    console.log('            [Smoke Mode]              ');
  }
  console.log('');
  info(`Target URL: ${baseUrl}`);
  info(`Mode: ${mode}`);
  console.log('');
  
  // 先检查应用是否可访问
  try {
    await request(`${baseUrl}/api/health`, { timeout: 5000 });
  } catch (error) {
    failure(`Cannot connect to ${baseUrl}`);
    info('Please ensure the application is running:');
    info('  npm run dev    (for development)');
    info('  docker-compose up -d  (for Docker)');
    console.log('');
    process.exit(1);
  }
  
  // 定义并运行测试
  defineTests(baseUrl, mode);
  const results = await runTests();
  
  // 输出结果
  console.log('');
  console.log('======================================');
  console.log(`Results: ${colors.green}${results.passed} passed${colors.reset}, ${colors.red}${results.failed} failed${colors.reset}`);
  console.log('======================================');
  console.log('');
  
  if (results.failed === 0) {
    success('All acceptance checks passed!');
    console.log('');
    
    if (mode !== 'smoke') {
      info('Manual verification checklist:');
      info('  [ ] 访客登录流程（密码: visitor123）');
      info('  [ ] 管理员登录流程（密码: admin123）');
      info('  [ ] 后台站点信息修改');
      info('  [ ] 按钮分组与按钮管理');
      info('  [ ] 背景图片上传与配置');
      info('  [ ] 资源管理（上传/删除）');
      info('  [ ] 日志查看与清理');
      info('  [ ] 密码修改功能');
      info('  [ ] 登录失败限制（连续5次错误密码）');
      console.log('');
    }
    
    process.exit(0);
  } else {
    failure('Some acceptance checks failed');
    console.log('');
    
    if (mode === 'smoke') {
      info('Tip: Run full acceptance test for more details:');
      info('  node scripts/acceptance-check.mjs --full');
      console.log('');
    }
    
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
