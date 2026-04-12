/**
 * 按钮分组管理 API
 * GET /api/admin/button-groups - 获取所有分组
 * POST /api/admin/button-groups - 创建分组
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import {
  getAllGroups,
  createGroup,
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
 * GET - 获取所有分组（需要管理员权限）
 */
export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const groups = await getAllGroups();
    return successResponse(groups);
  } catch (error) {
    console.error("Get groups error:", error);
    return serverErrorResponse("获取分组失败", error);
  }
}

// 创建分组请求体验证
const createGroupSchema = z.object({
  name: z.string().min(1, "分组名称不能为空").max(50, "名称过长"),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

/**
 * POST - 创建分组（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = createGroupSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const { id } = await createGroup(data);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "CREATE_BUTTON_GROUP",
        details: `创建分组: ${data.name}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ id, message: "创建成功" }, 201);
  } catch (error) {
    console.error("Create group error:", error);
    return serverErrorResponse("创建分组失败", error);
  }
}
