/**
 * 背景管理
 * 提供背景配置、背景项 CRUD、首页背景 DTO 整理、PC/mobile 继承逻辑
 */

import { prisma } from "@/lib/db";
import { getSiteConfigValue } from "@/lib/site/config";

// ==================== 类型定义 ====================

export interface BackgroundItem {
  id: string;
  url: string;
  title?: string;
  sortOrder: number;
  isActive: boolean;
  device: "pc" | "mobile";
}

export interface BackgroundConfig {
  interval: number; // 轮播间隔（秒）
  randomStart: boolean; // 是否随机起始
  mobileInheritPc: boolean; // 手机是否继承 PC
  blur: number; // 模糊强度
  overlay: number; // 遮罩透明度
}

export interface PublicBackgroundData {
  images: string[]; // 背景图片 URL 列表
  config: {
    interval: number;
    randomStart: boolean;
    blur: number;
    overlay: number;
  };
}

// ==================== 背景项 CRUD ====================

/**
 * 获取所有背景项（可选按设备类型筛选）
 */
export async function getAllBackgrounds(device?: "pc" | "mobile"): Promise<BackgroundItem[]> {
  const backgrounds = await prisma.background.findMany({
    where: device ? { device } : undefined,
    orderBy: { sortOrder: "asc" },
  });

  return backgrounds.map((b) => ({
    id: b.id,
    url: b.url,
    title: undefined, // 当前 schema 无 title 字段
    sortOrder: b.sortOrder,
    isActive: b.isActive,
    device: b.device as "pc" | "mobile",
  }));
}

/**
 * 获取单个背景项
 */
export async function getBackgroundById(id: string): Promise<BackgroundItem | null> {
  const bg = await prisma.background.findUnique({
    where: { id },
  });

  if (!bg) return null;

  return {
    id: bg.id,
    url: bg.url,
    sortOrder: bg.sortOrder,
    isActive: bg.isActive,
    device: bg.device as "pc" | "mobile",
  };
}

/**
 * 创建背景项
 */
export async function createBackground(data: {
  url: string;
  device: "pc" | "mobile";
  sortOrder: number;
  isActive: boolean;
}): Promise<{ id: string }> {
  const bg = await prisma.background.create({
    data: {
      url: data.url,
      device: data.device,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
  return { id: bg.id };
}

/**
 * 更新背景项
 */
export async function updateBackground(
  id: string,
  data: {
    url?: string;
    device?: "pc" | "mobile";
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<void> {
  await prisma.background.update({
    where: { id },
    data,
  });
}

/**
 * 删除背景项
 */
export async function deleteBackground(id: string): Promise<void> {
  await prisma.background.delete({
    where: { id },
  });
}

// ==================== 背景配置管理 ====================

// 默认背景配置
const DEFAULT_BG_CONFIG: BackgroundConfig = {
  interval: 5,
  randomStart: true,
  mobileInheritPc: true,
  blur: 10,
  overlay: 0.3,
};

/**
 * 获取背景配置
 */
export async function getBackgroundConfig(): Promise<BackgroundConfig> {
  const [interval, randomStart, mobileInheritPc, blur, overlay] = await Promise.all([
    getSiteConfigValue("background_interval", String(DEFAULT_BG_CONFIG.interval)),
    getSiteConfigValue("background_random", String(DEFAULT_BG_CONFIG.randomStart)),
    getSiteConfigValue("background_mobile_inherit", String(DEFAULT_BG_CONFIG.mobileInheritPc)),
    getSiteConfigValue("background_blur", String(DEFAULT_BG_CONFIG.blur)),
    getSiteConfigValue("background_overlay", String(DEFAULT_BG_CONFIG.overlay)),
  ]);

  return {
    interval: parseInt(interval, 10) || DEFAULT_BG_CONFIG.interval,
    randomStart: randomStart === "true",
    mobileInheritPc: mobileInheritPc === "true",
    blur: parseInt(blur, 10) || DEFAULT_BG_CONFIG.blur,
    overlay: parseFloat(overlay) || DEFAULT_BG_CONFIG.overlay,
  };
}

// ==================== 首页展示数据 ====================

/**
 * 获取用户代理字符串判断是否为移动端
 */
function isMobileDevice(userAgent?: string): boolean {
  if (!userAgent) return false;
  return /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
}

/**
 * 获取首页公开背景数据
 * 自动处理 PC/mobile 继承逻辑
 * 只返回可见背景
 */
export async function getPublicBackgrounds(userAgent?: string): Promise<PublicBackgroundData> {
  const isMobile = isMobileDevice(userAgent);
  const config = await getBackgroundConfig();

  // 获取对应设备的背景
  let images: string[] = [];

  if (isMobile) {
    // 先尝试获取手机背景
    const mobileBgs = await prisma.background.findMany({
      where: { device: "mobile", isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { url: true },
    });

    if (mobileBgs.length > 0) {
      images = mobileBgs.map((b) => b.url);
    } else if (config.mobileInheritPc) {
      // 手机无背景且开启继承，使用 PC 背景
      const pcBgs = await prisma.background.findMany({
        where: { device: "pc", isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { url: true },
      });
      images = pcBgs.map((b) => b.url);
    }
  } else {
    // PC 端直接使用 PC 背景
    const pcBgs = await prisma.background.findMany({
      where: { device: "pc", isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { url: true },
    });
    images = pcBgs.map((b) => b.url);
  }

  // 随机起始：随机打乱顺序
  if (config.randomStart && images.length > 1) {
    // Fisher-Yates 洗牌算法
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [images[i], images[j]] = [images[j], images[i]];
    }
  }

  return {
    images,
    config: {
      interval: config.interval,
      randomStart: config.randomStart,
      blur: config.blur,
      overlay: config.overlay,
    },
  };
}

// ==================== 校验工具 ====================

/**
 * 检查背景项是否存在
 */
export async function backgroundExists(id: string): Promise<boolean> {
  const count = await prisma.background.count({
    where: { id },
  });
  return count > 0;
}
