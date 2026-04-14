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
  // 站点基础信息
  site_title: z.string().min(1, "标题不能为空").max(100).optional(),
  site_subtitle: z.string().max(200).optional(),
  site_description: z.string().max(500).optional(),
  // Access 页面背景
  access_background_enabled: z.enum(["true", "false"]).optional(),
  access_background_asset_id: z.union([z.string().max(100), z.literal("")]).optional().nullable(),
  access_background_mobile_asset_id: z.union([z.string().max(100), z.literal("")]).optional().nullable(),
  access_background_overlay: z.string().optional(),
  access_background_blur: z.string().optional(),
  // 页面标题与图标
  access_page_title: z.string().max(100).optional(),
  home_page_title: z.string().max(100).optional(),
  admin_page_title: z.string().max(100).optional(),
  site_favicon_asset_id: z.union([z.string().max(100), z.literal("")]).optional().nullable(),
  // 底部备案信息
  footer_meta_enabled: z.enum(["true", "false"]).optional(),
  footer_meta_display_scope: z.enum(["none", "access", "home", "both"]).optional(),
  icp_enabled: z.enum(["true", "false"]).optional(),
  icp_number: z.string().max(100).optional(),
  icp_link: z.string().max(500).optional(),
  psb_enabled: z.enum(["true", "false"]).optional(),
  psb_number: z.string().max(100).optional(),
  psb_link: z.string().max(500).optional(),
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

    // 校验背景资源 ID 是否合法（去重后校验，允许 PC 与手机使用同一资源）
    const assetIds = [
      ...new Set(
        [
          updates.access_background_asset_id,
          updates.access_background_mobile_asset_id,
        ].filter((id): id is string => !!id)
      ),
    ];

    if (assetIds.length > 0) {
      const existingCount = await prisma.resource.count({
        where: { id: { in: assetIds } },
      });
      if (existingCount !== assetIds.length) {
        return errorResponse("选择的背景资源不存在或已被删除", 400);
      }
    }

    // 校验站点图标资源（允许资源池稳定产出的图片格式）
    if (updates.site_favicon_asset_id) {
      const resource = await prisma.resource.findUnique({
        where: { id: updates.site_favicon_asset_id },
        select: { mimeType: true },
      });
      if (!resource) {
        return errorResponse("选择的站点图标资源不存在或已被删除", 400);
      }
      const allowedMimes = [
        "image/png",
        "image/jpeg",
        "image/webp",
        "image/gif",
      ];
      if (!allowedMimes.includes(resource.mimeType)) {
        return errorResponse("站点图标仅支持 PNG、JPG、WebP、GIF 格式", 400);
      }
    }

    // 数值字段基础校验
    if (updates.access_background_overlay !== undefined) {
      const overlay = parseFloat(updates.access_background_overlay);
      if (Number.isNaN(overlay) || overlay < 0 || overlay > 1) {
        return errorResponse("背景遮罩透明度需在 0-1 之间", 400);
      }
    }
    if (updates.access_background_blur !== undefined) {
      const blur = parseInt(updates.access_background_blur, 10);
      if (Number.isNaN(blur) || blur < 0 || blur > 50) {
        return errorResponse("背景模糊强度需在 0-50 之间", 400);
      }
    }

    // 归一化：null/undefined 转空字符串，便于统一存入 SiteConfig
    const normalizedUpdates: Record<string, string> = {};
    for (const [key, value] of Object.entries(updates)) {
      normalizedUpdates[key] = value === null || value === undefined ? "" : String(value);
    }

    // 更新配置
    await updateSiteConfig(normalizedUpdates);
    
    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_SITE_CONFIG",
        details: `更新了站点配置: ${Object.keys(normalizedUpdates).join(", ")}`,
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
