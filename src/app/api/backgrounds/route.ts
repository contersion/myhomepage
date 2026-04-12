/**
 * 公开背景数据 API
 * GET /api/backgrounds - 获取首页背景数据
 * 根据 User-Agent 自动判断 PC/手机
 */

import { NextRequest } from "next/server";
import { getPublicBackgrounds } from "@/lib/backgrounds";
import { successResponse, serverErrorResponse } from "@/lib/api-response";
import { writeAccessLog, extractAccessInfo } from "@/lib/logs/access-logger";

/**
 * GET - 获取公开背景数据
 */
export async function GET(request: NextRequest) {
  try {
    const userAgent = request.headers.get("user-agent") || undefined;
    const data = await getPublicBackgrounds(userAgent);
    
    // 记录访问日志（异步，不等待）
    const accessInfo = extractAccessInfo(request, 200);
    writeAccessLog(accessInfo).catch(() => {});
    
    return successResponse(data);
  } catch (error) {
    console.error("Get public backgrounds error:", error);
    return serverErrorResponse("获取背景数据失败", error);
  }
}
