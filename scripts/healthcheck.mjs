#!/usr/bin/env node
/**
 * 健康检查脚本
 * 
 * 用途：
 * - 检查应用是否正常运行
 * - 检查数据库连接是否正常
 * - 供 Docker healthcheck 或外部监控使用
 * 
 * 使用方式：
 *   node scripts/healthcheck.mjs [url]
 * 
 * 默认检查 http://localhost:3456/api/health
 * 
 * 退出码：
 *   0 - 健康
 *   1 - 不健康
 */

import http from 'http';

const DEFAULT_URL = 'http://localhost:3456/api/health';
const TIMEOUT_MS = 5000;

// 解析 URL
function parseUrl(urlString) {
  try {
    return new URL(urlString);
  } catch {
    console.error(`Invalid URL: ${urlString}`);
    process.exit(1);
  }
}

// 执行健康检查
function checkHealth(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = parseUrl(url);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: TIMEOUT_MS,
    };
    
    const protocol = parsedUrl.protocol === 'https:' ? require('https') : http;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const json = JSON.parse(data);
            resolve({
              healthy: true,
              status: json.status,
              database: json.database,
              timestamp: json.timestamp,
            });
          } catch {
            resolve({ healthy: true, status: 'ok', raw: data });
          }
        } else {
          resolve({
            healthy: false,
            statusCode: res.statusCode,
            error: `HTTP ${res.statusCode}`,
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// 主流程
async function main() {
  const url = process.argv[2] || DEFAULT_URL;
  
  console.log(`Health check: ${url}`);
  
  try {
    const result = await checkHealth(url);
    
    if (result.healthy) {
      console.log('✓ Application is healthy');
      console.log(`  Status: ${result.status}`);
      console.log(`  Database: ${result.database || 'unknown'}`);
      process.exit(0);
    } else {
      console.error('✗ Application is unhealthy');
      console.error(`  Error: ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('✗ Health check failed');
    console.error(`  Error: ${error.message}`);
    process.exit(1);
  }
}

main();
