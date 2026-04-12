/**
 * 管理员站点配置 API
 * GET /api/admin/site - 获取所有站点配置
 * PUT /api/admin/site - 更新站点配置
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { getSiteConfig, updateSiteConfig } from "@/lib/site/config";
import {
  successResponse,
  errorResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { writeAccessLog, extractAccessInfo } from "@/lib/logs/access-logger";

/**
 * GET - 获取所有站点配置（需要管理员权限）
 */
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      // 记录未授权访问
      const accessInfo = extractAccessInfo(request, 401);
      writeAccessLog(accessInfo).catch(() => {});
      return unauthorizedResponse();
    }
    
    const config = await getSiteConfig();
    
    // 记录访问日志（异步，不等待）
    const accessInfo = extractAccessInfo(request, 200);
    writeAccessLog(accessInfo).catch(() => {});
    
    return successResponse(config);
    
  } catch (error) {
    console.error("Get admin site config error:", error);
    return serverErrorResponse("获取配置失败", error);
  }
}

// 更新配置请求体验证
const updateConfigSchema = z.object({
  site_title: z.string().min(1, "标题不能为空").max(100).optional(),
  site_subtitle: z.string().max(200).optional(),
  site_description: z.string().max(500).optional(),
});

/**
 * PUT - 更新站点配置（需要管理员权限）
 */
export async function PUT(request: NextRequest) {
  try {
    // 检查管理员权限
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      // 记录未授权访问
      const accessInfo = extractAccessInfo(request, 401);
      writeAccessLog(accessInfo).catch(() => {});
      return unauthorizedResponse();
    }
    
    // 解析请求体
    const body = await request.json();
    const result = updateConfigSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }
    
    const updates = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    
    // 更新配置
    await updateSiteConfig(updates);
    
    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_SITE_CONFIG",
        details: `更新了站点配置: ${Object.keys(updates).join(", ")}`,
        ip,
      },
    }).catch(() => {});
    
    // 记录访问日志（异步，不等待）
    const accessInfo = extractAccessInfo(request, 200);
    writeAccessLog(accessInfo).catch(() => {});
    
    return successResponse({ message: "保存成功" });
    
  } catch (error) {
    console.error("Update site config error:", error);
    return serverErrorResponse("保存失败", error);
  }
}
