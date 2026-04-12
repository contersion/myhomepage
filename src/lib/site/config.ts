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
}> {
  const config = await getSiteConfig();
  
  return {
    title: config.site_title || DEFAULT_SITE_CONFIG.site_title,
    subtitle: config.site_subtitle || DEFAULT_SITE_CONFIG.site_subtitle,
    description: config.site_description || DEFAULT_SITE_CONFIG.site_description,
  };
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
