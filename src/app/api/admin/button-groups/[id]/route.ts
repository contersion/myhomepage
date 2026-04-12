/**
 * 单个按钮分组管理 API
 * GET /api/admin/button-groups/[id] - 获取分组详情
 * PUT /api/admin/button-groups/[id] - 更新分组
 * DELETE /api/admin/button-groups/[id] - 删除分组
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import {
  getGroupById,
  updateGroup,
  deleteGroup,
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
 * GET - 获取分组详情（需要管理员权限）
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
    const group = await getGroupById(id);

    if (!group) {
      return errorResponse("分组不存在", 404);
    }

    return successResponse(group);
  } catch (error) {
    console.error("Get group error:", error);
    return serverErrorResponse("获取分组失败", error);
  }
}

// 更新分组请求体验证
const updateGroupSchema = z.object({
  name: z.string().min(1, "分组名称不能为空").max(50, "名称过长").optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

/**
 * PUT - 更新分组（需要管理员权限）
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

    // 检查分组是否存在
    const exists = await groupExists(id);
    if (!exists) {
      return errorResponse("分组不存在", 404);
    }

    const body = await request.json();
    const result = updateGroupSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    await updateGroup(id, data);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_BUTTON_GROUP",
        details: `更新分组: ${id}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "更新成功" });
  } catch (error) {
    console.error("Update group error:", error);
    return serverErrorResponse("更新分组失败", error);
  }
}

/**
 * DELETE - 删除分组（需要管理员权限）
 * 注意：删除分组会联动删除其下所有按钮（由 Prisma onDelete: Cascade 处理）
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

    // 检查分组是否存在
    const exists = await groupExists(id);
    if (!exists) {
      return errorResponse("分组不存在", 404);
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    await deleteGroup(id);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "DELETE_BUTTON_GROUP",
        details: `删除分组: ${id}（联动删除其下按钮）`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "删除成功" });
  } catch (error) {
    console.error("Delete group error:", error);
    return serverErrorResponse("删除分组失败", error);
  }
}
