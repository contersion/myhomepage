/**
 * 操作日志 API
 * GET /api/admin/logs/operations - 获取操作日志
 * DELETE /api/admin/logs/operations - 清理操作日志
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { getOperationLogs, clearOperationLogs } from "@/lib/logs";
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取操作日志（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const userType = searchParams.get("userType") as "visitor" | "admin" | undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const result = await getOperationLogs({ userType, limit, offset });
    return successResponse(result);
  } catch (error) {
    console.error("Get operation logs error:", error);
    return serverErrorResponse("获取日志失败", error);
  }
}

/**
 * DELETE - 清理操作日志（需要管理员权限）
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
    
    const result = await clearOperationLogs(before);
    
    // 记录操作日志（异步）
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "CLEAR_OPERATION_LOGS",
        details: before 
          ? `清理了 ${days} 天前的操作日志，共 ${result.count} 条`
          : `清理了全部操作日志，共 ${result.count} 条`,
        ip,
      },
    }).catch(() => {});
    
    return successResponse({ 
      message: before ? `已清理 ${days} 天前的日志` : "已清理全部日志",
      count: result.count 
    });
  } catch (error) {
    console.error("Clear operation logs error:", error);
    return serverErrorResponse("清理日志失败", error);
  }
}
