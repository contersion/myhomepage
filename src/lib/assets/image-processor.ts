/**
 * 图片处理模块
 * 
 * 提供图片压缩、格式转换、尺寸限制、元数据提取等能力
 * 
 * 策略说明：
 * 1. PNG/JPEG/WebP：压缩处理，限制最大尺寸
 * 2. GIF：仅做大小限制，不做压缩（避免破坏动画）
 * 3. SVG：明确禁用（安全风险），返回清晰错误
 * 
 * 依赖：sharp (Next.js 自带)
 */

import sharp from "sharp";

// ==================== 配置 ====================

// 背景图尺寸限制
const BACKGROUND_MAX_WIDTH = 1920;
const BACKGROUND_MAX_HEIGHT = 1080;
const BACKGROUND_QUALITY = 85; // JPEG/WebP 质量

// 图标尺寸限制
const ICON_MAX_WIDTH = 256;
const ICON_MAX_HEIGHT = 256;
const ICON_QUALITY = 90;

// 文件大小限制
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 缩略图配置
const THUMB_MAX_SIZE = 320; // 缩略图最大边长
const THUMB_QUALITY = 80; // 缩略图质量

// ==================== 类型定义 ====================

export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
}

export interface ProcessResult {
  success: boolean;
  buffer?: Buffer;
  metadata?: ImageMetadata;
  error?: string;
}

// ==================== 工具函数 ====================

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * 检查是否为支持的图片格式
 */
export function isSupportedImageFormat(mimeType: string): boolean {
  const supported = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ];
  return supported.includes(mimeType);
}

/**
 * 检查是否为 SVG
 */
export function isSVG(mimeType: string, filename: string): boolean {
  return mimeType === "image/svg+xml" || filename.toLowerCase().endsWith(".svg");
}

/**
 * 计算目标尺寸（保持比例）
 */
function calculateTargetSize(
  origWidth: number,
  origHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = origWidth;
  let height = origHeight;

  // 如果图片在限制范围内，不缩放
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // 计算缩放比例
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

// ==================== 核心处理函数 ====================

/**
 * 处理 PNG/JPEG/WebP 图片
 * 
 * 处理流程：
 * 1. 获取图片元数据
 * 2. 如果尺寸超限，缩放
 * 3. 压缩（WebP 优先，JPEG 次之）
 * 4. 返回处理后的 buffer 和元数据
 */
async function processRasterImage(
  buffer: Buffer,
  type: "background" | "icon"
): Promise<ProcessResult> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, error: "无法读取图片尺寸" };
    }

    // 根据类型确定最大尺寸
    const maxWidth = type === "background" ? BACKGROUND_MAX_WIDTH : ICON_MAX_WIDTH;
    const maxHeight = type === "background" ? BACKGROUND_MAX_HEIGHT : ICON_MAX_HEIGHT;
    const quality = type === "background" ? BACKGROUND_QUALITY : ICON_QUALITY;

    // 计算目标尺寸
    const { width, height } = calculateTargetSize(
      metadata.width,
      metadata.height,
      maxWidth,
      maxHeight
    );

    // 是否需要缩放
    const needsResize = width !== metadata.width || height !== metadata.height;

    // 保持原始栅格格式：PNG -> PNG，WebP -> WebP，其他受支持格式 -> JPEG
    const outputFormat: keyof sharp.FormatEnum =
      metadata.format === "webp" ? "webp" : metadata.format === "png" ? "png" : "jpeg";

    // 构建处理管道
    let pipeline = image;

    // 缩放（需要时）
    if (needsResize) {
      pipeline = pipeline.resize(width, height, { fit: "inside", withoutEnlargement: true });
    }

    // 压缩
    if (outputFormat === "webp") {
      pipeline = pipeline.webp({ quality, effort: 4 });
    } else if (outputFormat === "png") {
      pipeline = pipeline.png({ compressionLevel: 9, progressive: true });
    } else {
      // JPEG 格式，带渐进式加载
      pipeline = pipeline.jpeg({ 
        quality, 
        progressive: true,
        mozjpeg: true 
      });
    }

    // 执行处理
    const processedBuffer = await pipeline.toBuffer();
    const processedMetadata = await sharp(processedBuffer).metadata();

    return {
      success: true,
      buffer: processedBuffer,
      metadata: {
        width: processedMetadata.width || width,
        height: processedMetadata.height || height,
        format: outputFormat,
        size: processedBuffer.length,
      },
    };
  } catch (error) {
    console.error("Process raster image error:", error);
    return { success: false, error: "图片处理失败" };
  }
}

/**
 * 处理 GIF 图片
 * 
 * 策略：仅做大小限制，不做压缩（避免破坏动画）
 */
async function processGIF(buffer: Buffer): Promise<ProcessResult> {
  try {
    // GIF 仅提取元数据，不做压缩
    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, error: "无法读取 GIF 尺寸" };
    }

    // 检查大小
    if (buffer.length > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `GIF 文件过大: ${formatFileSize(buffer.length)}，最大允许: ${formatFileSize(MAX_FILE_SIZE)}。建议压缩后再上传。`,
      };
    }

    return {
      success: true,
      buffer, // 返回原 buffer
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: "gif",
        size: buffer.length,
      },
    };
  } catch (error) {
    console.error("Process GIF error:", error);
    return { success: false, error: "GIF 处理失败" };
  }
}

/**
 * 处理上传图片
 * 
 * 入口函数，根据 MIME 类型分发到不同的处理逻辑
 */
export async function processImage(
  buffer: Buffer,
  mimeType: string,
  type: "background" | "icon"
): Promise<ProcessResult> {
  // 检查文件大小
  if (buffer.length > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `文件过大: ${formatFileSize(buffer.length)}，最大允许: ${formatFileSize(MAX_FILE_SIZE)}`,
    };
  }

  // 检查是否为支持的格式
  if (!isSupportedImageFormat(mimeType)) {
    return {
      success: false,
      error: `不支持的图片格式: ${mimeType}。仅支持: PNG, JPG, WebP, GIF`,
    };
  }

  // 根据类型处理
  if (mimeType === "image/gif") {
    return processGIF(buffer);
  }

  // PNG / JPEG / WebP
  return processRasterImage(buffer, type);
}

/**
 * 验证图片文件（仅检查，不处理）
 * 
 * 用于提前检查文件是否有效，避免保存脏数据
 */
export async function validateImage(buffer: Buffer, mimeType: string): Promise<{ valid: boolean; error?: string }> {
  // 检查是否为 SVG
  if (isSVG(mimeType, "")) {
    return { valid: false, error: "SVG 格式暂不支持，存在安全风险。请转换为 PNG 或 JPG 后上传。" };
  }

  // 检查格式支持
  if (!isSupportedImageFormat(mimeType)) {
    return { valid: false, error: `不支持的格式: ${mimeType}` };
  }

  // 检查大小
  if (buffer.length > MAX_FILE_SIZE) {
    return { 
      valid: false, 
      error: `文件过大: ${formatFileSize(buffer.length)}，最大允许: ${formatFileSize(MAX_FILE_SIZE)}` 
    };
  }

  // 尝试读取图片元数据，验证文件有效性
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return { valid: false, error: "无法读取图片尺寸，文件可能已损坏" };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: "图片文件无效或已损坏" };
  }
}

/**
 * 获取图片元数据（不处理）
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata | null> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return null;
    }
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format || "unknown",
      size: buffer.length,
    };
  } catch (error) {
    return null;
  }
}

// ==================== 缩略图生成（阶段 4-E 新增） ====================

/**
 * 生成缩略图
 * 
 * 策略：
 * - 最大边长 320px，保持比例
 * - 使用 JPEG 格式，质量 80%
 * - GIF 生成静态缩略图（取第一帧）
 * 
 * @param buffer 原图 buffer
 * @param mimeType MIME 类型
 * @returns 缩略图 buffer 或 null（生成失败时）
 */
export async function generateThumbnail(
  buffer: Buffer,
  mimeType: string
): Promise<Buffer | null> {
  try {
    // GIF 特殊处理：生成静态缩略图
    if (mimeType === "image/gif") {
      const thumbnail = await sharp(buffer, { animated: false })
        .resize(THUMB_MAX_SIZE, THUMB_MAX_SIZE, { 
          fit: "inside", 
          withoutEnlargement: true 
        })
        .jpeg({ quality: THUMB_QUALITY, progressive: true })
        .toBuffer();
      return thumbnail;
    }

    // 其他格式：PNG/JPEG/WebP
    const thumbnail = await sharp(buffer)
      .resize(THUMB_MAX_SIZE, THUMB_MAX_SIZE, { 
        fit: "inside", 
        withoutEnlargement: true 
      })
      .jpeg({ quality: THUMB_QUALITY, progressive: true })
      .toBuffer();
    
    return thumbnail;
  } catch (error) {
    console.error("Generate thumbnail error:", error);
    return null;
  }
}

/**
 * 获取缩略图文件名
 * 
 * 命名约定：原文件名 + .thumb.jpg
 * 例如：1234567890-abcdef.jpg → 1234567890-abcdef.thumb.jpg
 * 
 * @param filename 原文件名
 * @returns 缩略图文件名
 */
export function getThumbnailFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  if (dotIndex === -1) {
    return `${filename}.thumb.jpg`;
  }
  return `${filename.substring(0, dotIndex)}.thumb.jpg`;
}

/**
 * 检查是否为缩略图请求
 * 
 * @param filename 请求的文件名
 * @returns 是否是缩略图文件
 */
export function isThumbnailFile(filename: string): boolean {
  return filename.includes(".thumb.");
}
