/**
 * 背景管理 API
 * GET /api/admin/backgrounds?device=pc|mobile - 获取背景列表
 * POST /api/admin/backgrounds - 创建背景项
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import {
  getAllBackgrounds,
  createBackground,
} from "@/lib/backgrounds";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取背景列表（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const device = searchParams.get("device") as "pc" | "mobile" | undefined;

    const backgrounds = await getAllBackgrounds(device);
    return successResponse(backgrounds);
  } catch (error) {
    console.error("Get backgrounds error:", error);
    return serverErrorResponse("获取背景列表失败", error);
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

// 创建背景请求体验证
const createBackgroundSchema = z.object({
  url: urlSchema,
  device: z.enum(["pc", "mobile"]),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

/**
 * POST - 创建背景项（需要管理员权限）
 */
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = createBackgroundSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    const { id } = await createBackground(data);

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "CREATE_BACKGROUND",
        details: `创建${data.device === "pc" ? "PC" : "手机"}背景`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ id, message: "创建成功" }, 201);
  } catch (error) {
    console.error("Create background error:", error);
    return serverErrorResponse("创建背景失败", error);
  }
}
