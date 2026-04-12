/**
 * 背景配置管理 API
 * GET /api/admin/background-config - 获取背景配置
 * PUT /api/admin/background-config - 更新背景配置
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { getBackgroundConfig } from "@/lib/backgrounds";
import { updateSiteConfig } from "@/lib/site/config";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";

/**
 * GET - 获取背景配置（需要管理员权限）
 */
export async function GET() {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const config = await getBackgroundConfig();
    return successResponse(config);
  } catch (error) {
    console.error("Get background config error:", error);
    return serverErrorResponse("获取配置失败", error);
  }
}

// 更新配置请求体验证
const updateConfigSchema = z.object({
  interval: z.number().int().min(1).max(60).optional(),
  randomStart: z.boolean().optional(),
  mobileInheritPc: z.boolean().optional(),
  blur: z.number().int().min(0).max(50).optional(),
  overlay: z.number().min(0).max(1).optional(),
});

/**
 * PUT - 更新背景配置（需要管理员权限）
 */
export async function PUT(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    const body = await request.json();
    const result = updateConfigSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const data = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // 转换为 SiteConfig 键值对
    const configUpdates: Record<string, string> = {};
    if (data.interval !== undefined) configUpdates.background_interval = String(data.interval);
    if (data.randomStart !== undefined) configUpdates.background_random = String(data.randomStart);
    if (data.mobileInheritPc !== undefined) configUpdates.background_mobile_inherit = String(data.mobileInheritPc);
    if (data.blur !== undefined) configUpdates.background_blur = String(data.blur);
    if (data.overlay !== undefined) configUpdates.background_overlay = String(data.overlay);

    if (Object.keys(configUpdates).length > 0) {
      await updateSiteConfig(configUpdates);
    }

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_BACKGROUND_CONFIG",
        details: `更新背景配置: ${Object.keys(configUpdates).join(", ")}`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ message: "保存成功" });
  } catch (error) {
    console.error("Update background config error:", error);
    return serverErrorResponse("保存失败", error);
  }
}
