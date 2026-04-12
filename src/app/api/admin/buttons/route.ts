/**
 * 按钮管理 API
 * GET /api/admin/buttons - 获取所有按钮
 * POST /api/admin/buttons - 创建按钮
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import {
  getAllButtons,
  createButton,
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
 * GET - 获取所有按钮（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    // 可选按分组筛选
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId") || undefined;

    const buttons = await getAllButtons(groupId);
    return successResponse(buttons);
  } catch (error) {
    console.error("Get buttons error:", error);
    return serverErrorResponse("获取按钮失败", error);
  }
}

// URL 格式校验（最小校验）
const urlSchema = z.string().min(1, "URL 不能为空").refine(
  (url) => {
    // 允许相对路径或以 http/https 开头的绝对路径
    return url.startsWith("/") ||
           url.startsWith("http://") ||
           url.startsWith("https://");
  },
  { message: "URL 格式不正确，应以 / 或 http:// 或 https:// 开头" }
);

// 创建按钮请求体验证
const createButtonSchema = z.object({
  title: z.string().min(1, "按钮标题不能为空").max(50, "标题过长"),
  url: urlSchema,
  icon: z.string().max(500, "图标链接过长").optional(),
  openInNew: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  groupId: z.string().min(1, "必须选择所属分组"),
});

/**
 * POST - 创建按钮（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = createButtonSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;

    // 检查分组是否存在
    const groupExistsResult = await groupExists(data.groupId);
    if (!groupExistsResult) {
      return errorResponse("所属分组不存在", 400);
    }

    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const { id } = await createButton(data);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "CREATE_BUTTON",
        details: `创建按钮: ${data.title}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ id, message: "创建成功" }, 201);
  } catch (error) {
    console.error("Create button error:", error);
    return serverErrorResponse("创建按钮失败", error);
  }
}
