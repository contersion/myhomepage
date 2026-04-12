/**
 * 页面访问日志记录 API
 * POST /api/log-access
 * 用于页面组件记录访问日志（因为页面在浏览器端运行，无法直接写数据库）
 * 
 * Body: { path: string }
 * 其他信息（IP、User-Agent）从请求头自动提取
 */

import { NextRequest } from "next/server";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { writeAccessLog, extractAccessInfo } from "@/lib/logs/access-logger";

export async function POST(request: NextRequest) {
  try {
    // 从请求体获取路径
    const body = await request.json().catch(() => ({}));
    const { path } = body;
    
    if (!path || typeof path !== "string") {
      return errorResponse("缺少 path 参数", 400);
    }
    
    // 只允许记录特定页面路径（安全限制）
    const allowedPaths = ["/", "/access", "/admin", "/admin/login"];
    const isAllowed = allowedPaths.some(p => path === p || path.startsWith(p + "/"));
    
    if (!isAllowed) {
      return errorResponse("不允许记录的路径", 403);
    }
    
    // 提取访问信息并记录
    const accessInfo = extractAccessInfo(request, 200);
    // 使用前端传入的路径（因为对于页面，实际访问的路径是页面的 path）
    await writeAccessLog({
      ...accessInfo,
      path,
      method: "GET", // 页面访问视为 GET
    });
    
    return successResponse({ message: "已记录" });
    
  } catch (error) {
    console.error("Log access error:", error);
    // 日志记录失败返回 200，不影响页面主流程
    return successResponse({ message: "忽略" });
  }
}
