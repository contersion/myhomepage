/**
 * 资源管理 API
 * GET /api/admin/assets?type=background|icon - 获取资源列表
 * POST /api/admin/assets - 上传资源
 */

import { NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { getResources, saveUpload, formatFileSize } from "@/lib/assets";
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取资源列表（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "background" | "icon" | undefined;

    const resources = await getResources(type);
    return successResponse(resources);
  } catch (error) {
    console.error("Get resources error:", error);
    return serverErrorResponse("获取资源列表失败", error);
  }
}

/**
 * POST - 上传资源（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as "background" | "icon" | null;

    if (!file) {
      return errorResponse("请选择文件", 400);
    }

    if (!type || !["background", "icon"].includes(type)) {
      return errorResponse("请指定资源类型 (background 或 icon)", 400);
    }

    // 读取文件内容
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 保存上传
    const result = await saveUpload(buffer, file.name, file.type, type);

    if (!result.success) {
      return errorResponse(result.error || "上传失败", 400);
    }

    // 记录操作日志（异步）
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPLOAD_ASSET",
        details: `上传资源: ${file.name} (${formatFileSize(file.size)})`,
        ip,
      },
    }).catch(() => {});

    return successResponse(result.resource, 201);
  } catch (error) {
    console.error("Upload error:", error);
    return serverErrorResponse("上传失败", error);
  }
}
