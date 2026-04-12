/**
 * 单个资源管理 API
 * GET /api/admin/assets/[id] - 获取资源详情
 * DELETE /api/admin/assets/[id] - 删除资源
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { getResourceById, deleteResource, resourceExists } from "@/lib/assets";
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取资源详情（需要管理员权限）
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { id } = await params;
    const resource = await getResourceById(id);

    if (!resource) {
      return errorResponse("资源不存在", 404);
    }

    return successResponse(resource);
  } catch (error) {
    console.error("Get resource error:", error);
    return serverErrorResponse("获取资源失败", error);
  }
}

/**
 * DELETE - 删除资源（需要管理员权限）
 * 策略：删除数据库记录和本地文件，引用处由页面兜底为空
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    // 检查资源是否存在
    const exists = await resourceExists(id);
    if (!exists) {
      return errorResponse("资源不存在", 404);
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // 删除资源
    const result = await deleteResource(id);

    if (!result.success) {
      return errorResponse(result.error || "删除失败", 500);
    }

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "DELETE_ASSET",
        details: `删除资源: ${id}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "删除成功" });
  } catch (error) {
    console.error("Delete resource error:", error);
    return serverErrorResponse("删除失败", error);
  }
}
