/**
 * 站点配置管理
 * 读取和更新站点标题、副标题、简介等配置
 */

import { prisma } from "@/lib/db";

// 默认站点配置（数据库无记录时的兜底）
export const DEFAULT_SITE_CONFIG = {
  site_title: "我的个人主页",
  site_subtitle: "欢迎来到我的个人空间",
  site_description: "这里记录着我的生活点滴与作品",
  card_style: "glass",
  background_blur: "10",
  background_overlay: "0.3",
  // Access 页面背景
  access_background_enabled: "false",
  access_background_asset_id: "",
  access_background_mobile_asset_id: "",
  access_background_overlay: "0.3",
  access_background_blur: "10",
  // 页面标题
  access_page_title: "",
  home_page_title: "",
  admin_page_title: "",
  // 站点图标
  site_favicon_asset_id: "",
  // 头像
  site_avatar_asset_id: "",
  site_avatar_shape: "circle",
  // 访客密码开关
  visitor_password_enabled: "true",
  // 底部备案信息
  footer_meta_enabled: "false",
  footer_meta_display_scope: "none",
  icp_enabled: "false",
  icp_number: "",
  icp_link: "",
  psb_enabled: "false",
  psb_number: "",
  psb_link: "",
};

/**
 * 获取所有站点配置
 * @returns 配置键值对象
 */
export async function getSiteConfig(): Promise<Record<string, string>> {
  const configs = await prisma.siteConfig.findMany();
  
  const result: Record<string, string> = {};
  
  // 先填充默认值
  Object.entries(DEFAULT_SITE_CONFIG).forEach(([key, value]) => {
    result[key] = value;
  });
  
  // 用数据库值覆盖
  configs.forEach((config) => {
    result[config.key] = config.value;
  });
  
  return result;
}

/**
 * 获取单个配置项
 * @param key 配置键
 * @param defaultValue 默认值
 * @returns 配置值
 */
export async function getSiteConfigValue(
  key: string,
  defaultValue: string = ""
): Promise<string> {
  const config = await prisma.siteConfig.findUnique({
    where: { key },
  });
  
  return config?.value ?? defaultValue;
}

/**
 * 更新多个配置项
 * @param configs 配置键值对象
 */
export async function updateSiteConfig(
  configs: Record<string, string>
): Promise<void> {
  const updates = Object.entries(configs).map(([key, value]) =>
    prisma.siteConfig.upsert({
      where: { key },
      update: { value },
      create: { key, value, description: "" },
    })
  );
  
  await prisma.$transaction(updates);
}

/**
 * 获取公开站点信息（用于首页展示）
 * 不包含敏感配置
 */
export async function getPublicSiteInfo(): Promise<{
  title: string;
  subtitle: string;
  description: string;
  avatar: string | null;
  avatarShape: string;
}> {
  const config = await getSiteConfig();

  let avatarUrl: string | null = null;
  if (config.site_avatar_asset_id) {
    const resource = await prisma.resource.findUnique({
      where: { id: config.site_avatar_asset_id },
      select: { url: true },
    });
    avatarUrl = resource?.url || null;
  }

  const validShapes = ["circle", "rounded-xl", "rounded-2xl"];
  const avatarShape = validShapes.includes(config.site_avatar_shape)
    ? config.site_avatar_shape
    : "circle";

  return {
    title: config.site_title || DEFAULT_SITE_CONFIG.site_title,
    subtitle: config.site_subtitle || DEFAULT_SITE_CONFIG.site_subtitle,
    description: config.site_description || DEFAULT_SITE_CONFIG.site_description,
    avatar: avatarUrl,
    avatarShape,
  };
}

// ==================== Access 页面背景配置 ====================

export interface AccessBackgroundConfig {
  enabled: boolean;
  assetId: string | null;
  mobileAssetId: string | null;
  overlay: number;
  blur: number;
}

export async function getAccessBackgroundConfig(): Promise<AccessBackgroundConfig> {
  const config = await getSiteConfig();
  return {
    enabled: config.access_background_enabled === "true",
    assetId: config.access_background_asset_id || null,
    mobileAssetId: config.access_background_mobile_asset_id || null,
    overlay: Number.isNaN(parseFloat(config.access_background_overlay || "0.3")) ? 0.3 : parseFloat(config.access_background_overlay || "0.3"),
    blur: Number.isNaN(parseInt(config.access_background_blur || "10", 10)) ? 10 : parseInt(config.access_background_blur || "10", 10),
  };
}

export interface PublicAccessBackgroundData {
  url: string | null;
  blur: number;
  overlay: number;
}

function isMobileDevice(userAgent?: string): boolean {
  if (!userAgent) return false;
  return /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
}

export async function getPublicAccessBackground(
  userAgent?: string
): Promise<PublicAccessBackgroundData> {
  const bgConfig = await getAccessBackgroundConfig();

  if (!bgConfig.enabled) {
    return { url: null, blur: bgConfig.blur, overlay: bgConfig.overlay };
  }

  const isMobile = isMobileDevice(userAgent);
  let assetId = isMobile ? bgConfig.mobileAssetId : bgConfig.assetId;

  // 移动端回退到 PC 背景
  if (isMobile && !assetId) {
    assetId = bgConfig.assetId;
  }

  if (!assetId) {
    return { url: null, blur: bgConfig.blur, overlay: bgConfig.overlay };
  }

  const resource = await prisma.resource.findUnique({
    where: { id: assetId },
    select: { url: true },
  });

  return {
    url: resource?.url || null,
    blur: bgConfig.blur,
    overlay: bgConfig.overlay,
  };
}

// ==================== 底部备案信息配置 ====================

export type FooterMetaDisplayScope = "none" | "access" | "home" | "both";

export interface FooterMetaConfig {
  enabled: boolean;
  displayScope: FooterMetaDisplayScope;
  icpEnabled: boolean;
  icpNumber: string;
  icpLink: string;
  psbEnabled: boolean;
  psbNumber: string;
  psbLink: string;
}

export async function getFooterMetaConfig(): Promise<FooterMetaConfig> {
  const config = await getSiteConfig();
  const scope = config.footer_meta_display_scope as FooterMetaDisplayScope;
  return {
    enabled: config.footer_meta_enabled === "true",
    displayScope: ["none", "access", "home", "both"].includes(scope) ? scope : "none",
    icpEnabled: config.icp_enabled === "true",
    icpNumber: config.icp_number || "",
    icpLink: config.icp_link || "",
    psbEnabled: config.psb_enabled === "true",
    psbNumber: config.psb_number || "",
    psbLink: config.psb_link || "",
  };
}

// ==================== 页面标题与图标 ====================

async function resolvePageTitle(pageTitleKey: "access_page_title" | "home_page_title" | "admin_page_title"): Promise<string> {
  const [pageTitle, siteTitle] = await Promise.all([
    getSiteConfigValue(pageTitleKey, ""),
    getSiteConfigValue("site_title", DEFAULT_SITE_CONFIG.site_title),
  ]);
  return pageTitle || siteTitle || DEFAULT_SITE_CONFIG.site_title;
}

export async function getAccessPageTitle(): Promise<string> {
  return resolvePageTitle("access_page_title");
}

export async function getHomePageTitle(): Promise<string> {
  return resolvePageTitle("home_page_title");
}

export async function getAdminPageTitle(): Promise<string> {
  return resolvePageTitle("admin_page_title");
}

export async function getSiteFavicon(): Promise<string | null> {
  try {
    const assetId = await getSiteConfigValue("site_favicon_asset_id", "");
    if (!assetId) return null;
    const resource = await prisma.resource.findUnique({
      where: { id: assetId },
      select: { url: true },
    });
    return resource?.url || null;
  } catch {
    return null;
  }
}

// ==================== 访客认证开关 ====================

export async function getVisitorPasswordEnabled(): Promise<boolean> {
  const value = await getSiteConfigValue("visitor_password_enabled", "true");
  return value === "true";
}

/**
 * 获取密码哈希（用于登录校验）
 * @param type "visitor" | "admin"
 * @returns 密码哈希值
 */
export async function getPasswordHash(
  type: "visitor" | "admin"
): Promise<string | null> {
  const key = type === "visitor" ? "visitor_password_hash" : "admin_password_hash";
  const hash = await getSiteConfigValue(key);
  return hash || null;
}
