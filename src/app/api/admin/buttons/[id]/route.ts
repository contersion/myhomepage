/**
 * 单个按钮管理 API
 * GET /api/admin/buttons/[id] - 获取按钮详情
 * PUT /api/admin/buttons/[id] - 更新按钮
 * DELETE /api/admin/buttons/[id] - 删除按钮
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import {
  getButtonById,
  updateButton,
  deleteButton,
  buttonExists,
  groupExists,
} from "@/lib/buttons";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取按钮详情（需要管理员权限）
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
    const button = await getButtonById(id);

    if (!button) {
      return errorResponse("按钮不存在", 404);
    }

    return successResponse(button);
  } catch (error) {
    console.error("Get button error:", error);
    return serverErrorResponse("获取按钮失败", error);
  }
}

// URL 格式校验（最小校验）
const urlSchema = z.string().min(1, "URL 不能为空").refine(
  (url) => {
    return url.startsWith("/") ||
           url.startsWith("http://") ||
           url.startsWith("https://");
  },
  { message: "URL 格式不正确，应以 / 或 http:// 或 https:// 开头" }
);

// 更新按钮请求体验证
const updateButtonSchema = z.object({
  title: z.string().min(1, "按钮标题不能为空").max(50, "标题过长").optional(),
  url: urlSchema.optional(),
  icon: z.string().max(500, "图标链接过长").optional(),
  openInNew: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  groupId: z.string().optional(),
});

/**
 * PUT - 更新按钮（需要管理员权限）
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

    // 检查按钮是否存在
    const exists = await buttonExists(id);
    if (!exists) {
      return errorResponse("按钮不存在", 404);
    }

    const body = await request.json();
    const result = updateButtonSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;

    // 如果更换分组，检查新分组是否存在
    if (data.groupId) {
      const groupExistsResult = await groupExists(data.groupId);
      if (!groupExistsResult) {
        return errorResponse("所属分组不存在", 400);
      }
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    await updateButton(id, data);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_BUTTON",
        details: `更新按钮: ${id}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "更新成功" });
  } catch (error) {
    console.error("Update button error:", error);
    return serverErrorResponse("更新按钮失败", error);
  }
}

/**
 * DELETE - 删除按钮（需要管理员权限）
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

    // 检查按钮是否存在
    const exists = await buttonExists(id);
    if (!exists) {
      return errorResponse("按钮不存在", 404);
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    await deleteButton(id);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "DELETE_BUTTON",
        details: `删除按钮: ${id}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "删除成功" });
  } catch (error) {
    console.error("Delete button error:", error);
    return serverErrorResponse("删除按钮失败", error);
  }
}
