/**
 * 单个背景项管理 API
 * GET /api/admin/backgrounds/[id] - 获取背景详情
 * PUT /api/admin/backgrounds/[id] - 更新背景
 * DELETE /api/admin/backgrounds/[id] - 删除背景
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import {
  getBackgroundById,
  updateBackground,
  deleteBackground,
  backgroundExists,
} from "@/lib/backgrounds";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取背景详情（需要管理员权限）
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
    const background = await getBackgroundById(id);

    if (!background) {
      return errorResponse("背景不存在", 404);
    }

    return successResponse(background);
  } catch (error) {
    console.error("Get background error:", error);
    return serverErrorResponse("获取背景失败", error);
  }
}

// URL 格式校验
const urlSchema = z.string().min(1, "URL 不能为空").refine(
  (url) => {
    return url.startsWith("/") ||
           url.startsWith("http://") ||
           url.startsWith("https://");
  },
  { message: "URL 格式不正确" }
);

// 更新背景请求体验证
const updateBackgroundSchema = z.object({
  url: urlSchema.optional(),
  device: z.enum(["pc", "mobile"]).optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT - 更新背景（需要管理员权限）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { id } = await params;

    const exists = await backgroundExists(id);
    if (!exists) {
      return errorResponse("背景不存在", 404);
    }

    const body = await request.json();
    const result = updateBackgroundSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    await updateBackground(id, data);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_BACKGROUND",
        details: `更新背景: ${id}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "更新成功" });
  } catch (error) {
    console.error("Update background error:", error);
    return serverErrorResponse("更新背景失败", error);
  }
}

/**
 * DELETE - 删除背景（需要管理员权限）
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

    const exists = await backgroundExists(id);
    if (!exists) {
      return errorResponse("背景不存在", 404);
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    await deleteBackground(id);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "DELETE_BACKGROUND",
        details: `删除背景: ${id}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "删除成功" });
  } catch (error) {
    console.error("Delete background error:", error);
    return serverErrorResponse("删除背景失败", error);
  }
}
