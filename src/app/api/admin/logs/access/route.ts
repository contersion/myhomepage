/**
 * 访问日志 API
 * GET /api/admin/logs/access - 获取访问日志
 * DELETE /api/admin/logs/access - 清理访问日志
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { getAccessLogs, clearAccessLogs } from "@/lib/logs";
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取访问日志（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getAccessLogs({ limit, offset });
    return successResponse(result);
  } catch (error) {
    console.error("Get access logs error:", error);
    return serverErrorResponse("获取日志失败", error);
  }
}

/**
 * DELETE - 清理访问日志（需要管理员权限）
 */
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "0", 10);
    
    // days=0 表示清理全部，否则清理 N 天前的
    const before = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : undefined;
    
    const result = await clearAccessLogs(before);
    
    // 记录操作日志（异步）
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "CLEAR_ACCESS_LOGS",
        details: before 
          ? `清理了 ${days} 天前的访问日志，共 ${result.count} 条`
          : `清理了全部访问日志，共 ${result.count} 条`,
        ip,
      },
    }).catch(() => {});
    
    return successResponse({ 
      message: before ? `已清理 ${days} 天前的日志` : "已清理全部日志",
      count: result.count 
    });
  } catch (error) {
    console.error("Clear access logs error:", error);
    return serverErrorResponse("清理日志失败", error);
  }
}
