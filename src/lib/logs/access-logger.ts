/**
 * 统一访问日志记录器
 * 
 * 设计原则：
 * 1. 不在 middleware 中直接写数据库（Edge Runtime 限制）
 * 2. 在 API 层统一收口，确保覆盖主要访问路径
 * 3. 异步写入，失败不影响主流程
 * 4. 避免与操作日志重复记录登录行为
 */

import { prisma } from "@/lib/db";

// 不需要记录访问日志的路径（静态资源、内部 API）
const EXCLUDED_PATHS = [
  /^\/_next\//,           // Next.js 内部资源
  /^\/favicon\.ico$/,     // 网站图标
  /^\/api\/_next\//,      // 内部 API
];

// 需要记录的路径模式
const INCLUDED_PATHS = [
  /^\/$/,                 // 首页
  /^\/access$/,           // 访客登录页
  /^\/admin/,             // 后台相关
  /^\/api\//,             // API 接口
];

/**
 * 判断是否需要记录访问日志
 */
export function shouldLogAccess(path: string): boolean {
  // 排除静态资源
  if (EXCLUDED_PATHS.some(pattern => pattern.test(path))) {
    return false;
  }
  
  // 只记录指定路径
  return INCLUDED_PATHS.some(pattern => pattern.test(path));
}

/**
 * 访问日志数据
 */
export interface AccessLogData {
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  status: number;
  // 可选的额外信息
  referer?: string;
}

/**
 * 写入访问日志（异步，失败不影响主流程）
 * 
 * 使用场景：
 * 1. API Route 中记录 API 访问
 * 2. 页面加载时通过 API 记录页面访问
 */
export async function writeAccessLog(data: AccessLogData): Promise<void> {
  // 检查是否需要记录
  if (!shouldLogAccess(data.path)) {
    return;
  }
  
  // 异步写入，不阻塞主流程
  try {
    await prisma.accessLog.create({
      data: {
        ip: data.ip,
        userAgent: data.userAgent || null,
        path: data.path,
        method: data.method,
        status: data.status,
      },
    });
  } catch (error) {
    // 日志写入失败不抛出，避免影响主流程
    console.error("[AccessLog] Failed to write:", error);
  }
}

/**
 * 批量写入访问日志（用于高并发场景）
 * 当前项目暂不需要，预留接口
 * 
 * 注意：SQLite 不支持 createMany 的 skipDuplicates 选项，
 * 如需使用需单独处理重复问题
 */
export async function batchWriteAccessLog(dataArray: AccessLogData[]): Promise<void> {
  if (dataArray.length === 0) return;
  
  // SQLite 不支持 createMany，使用逐个写入
  const filtered = dataArray.filter(d => shouldLogAccess(d.path));
  
  for (const data of filtered) {
    try {
      await writeAccessLog(data);
    } catch {
      // 单个失败继续处理其他
    }
  }
}

/**
 * 从 NextRequest 提取访问信息
 * 用于 API Route 中快速记录
 */
export function extractAccessInfo(
  request: Request,
  responseStatus: number = 200
): AccessLogData {
  const headers = request.headers;
  
  // 获取 IP（考虑反向代理）
  const ip = headers.get("x-forwarded-for") || 
             headers.get("x-real-ip") || 
             headers.get("cf-connecting-ip") ||
             "unknown";
  
  return {
    ip: ip.split(",")[0].trim(), // 取第一个 IP
    userAgent: headers.get("user-agent") || undefined,
    path: new URL(request.url).pathname,
    method: request.method,
    status: responseStatus,
    referer: headers.get("referer") || undefined,
  };
}

/**
 * 带访问日志记录的高阶函数
 * 用于包装 API Route Handler
 * 
 * 使用示例：
 * export const GET = withAccessLog(async (request) => {
 *   // 原有逻辑
 *   return Response.json(data);
 * });
 */
export function withAccessLog(
  handler: (request: Request) => Promise<Response>
): (request: Request) => Promise<Response> {
  return async (request: Request) => {
    const startTime = Date.now();
    
    try {
      // 执行原处理器
      const response = await handler(request);
      
      // 记录访问日志（异步，不等待）
      const accessInfo = extractAccessInfo(request, response.status);
      writeAccessLog(accessInfo).catch(() => {});
      
      return response;
    } catch (error) {
      // 出错时记录 500
      const accessInfo = extractAccessInfo(request, 500);
      writeAccessLog(accessInfo).catch(() => {});
      
      throw error;
    }
  };
}
