/**
 * 公开站点信息 API
 * GET /api/site
 * 返回站点标题、副标题、简介等公开信息
 */

import { NextRequest } from "next/server";
import { getPublicSiteInfo } from "@/lib/site/config";
import { successResponse, serverErrorResponse } from "@/lib/api-response";
import { writeAccessLog, extractAccessInfo } from "@/lib/logs/access-logger";

export async function GET(request: NextRequest) {
  try {
    const info = await getPublicSiteInfo();
    
    // 记录访问日志（异步，不等待）
    const accessInfo = extractAccessInfo(request, 200);
    writeAccessLog(accessInfo).catch(() => {});
    
    return successResponse(info);
  } catch (error) {
    console.error("Get site info error:", error);
    return serverErrorResponse("获取站点信息失败", error);
  }
}
