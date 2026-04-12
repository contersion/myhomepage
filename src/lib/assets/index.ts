/**
 * 资源管理（上传资源）
 * 提供文件上传保存、元数据记录、资源读取、删除等能力
 * 
 * 阶段 4-C 增强：
 * - 图片自动压缩（PNG/JPEG/WebP）
 * - 尺寸限制与智能缩放
 * - SVG 明确禁用
 * - 元数据增强（宽高）
 */

import { promises as fs } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";
import { processImage, validateImage, formatFileSize, isSVG, generateThumbnail, getThumbnailFilename } from "./image-processor";

// ==================== 配置 ====================

// 上传目录
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./storage/uploads";

// 白名单类型（更新说明：SVG 已明确禁用）
const ALLOWED_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // SVG 明确禁用：存在 XSS 安全风险，暂不支持
];

// 最大文件大小 (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ==================== 类型定义 ====================

export interface Resource {
  id: string;
  type: "background" | "icon";
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;   // 阶段 4-C 新增：图片宽度
  height?: number;  // 阶段 4-C 新增：图片高度
  url: string;
  thumbUrl?: string; // 阶段 4-E 新增：缩略图 URL
  createdAt: Date;
}

export interface UploadResult {
  success: boolean;
  resource?: Resource;
  error?: string;
}

// ==================== 工具函数 ====================

/**
 * 生成安全文件名
 * 格式: timestamp-random.ext
 * 
 * 阶段 4-C 更新：根据处理后的格式确定扩展名
 */
function generateSafeFilename(originalName: string, processedFormat?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  
  // 如果有处理后的格式，使用处理后的格式扩展名
  if (processedFormat) {
    const ext = processedFormat === "jpeg" ? "jpg" : processedFormat;
    return `${timestamp}-${random}.${ext}`;
  }
  
  // 否则使用原始扩展名
  const ext = originalName.split(".").pop()?.toLowerCase() || "bin";
  return `${timestamp}-${random}.${ext}`;
}

/**
 * 验证文件类型（阶段 4-C 更新：增加 SVG 检查）
 */
function validateMimeType(mimeType: string, filename: string): { valid: boolean; error?: string } {
  // 明确拒绝 SVG
  if (isSVG(mimeType, filename)) {
    return {
      valid: false,
      error: "SVG 格式暂不支持，存在安全风险（XSS）。请转换为 PNG、JPG 或 WebP 后上传。",
    };
  }
  
  // 检查是否在白名单
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `不支持的文件类型: ${mimeType}。仅支持: PNG, JPG, WebP, GIF`,
    };
  }
  
  return { valid: true };
}

/**
 * 验证文件大小
 */
function validateFileSize(size: number): boolean {
  return size > 0 && size <= MAX_FILE_SIZE;
}

// 从 image-processor 重新导出
export { formatFileSize, getThumbnailFilename, isThumbnailFile } from "./image-processor";

// ==================== 核心操作 ====================

/**
 * 保存上传文件（阶段 4-E 增强：集成缩略图生成）
 * 
 * 处理流程：
 * 1. 验证文件类型（明确拒绝 SVG）
 * 2. 图片处理（压缩、尺寸限制）
 * 3. 保存处理后的文件
 * 4. 生成缩略图（阶段 4-E 新增）
 * 5. 写入数据库（包含宽高元数据）
 * 
 * @param file 上传的文件 Buffer
 * @param originalName 原始文件名
 * @param mimeType MIME 类型
 * @param type 资源类型
 */
export async function saveUpload(
  file: Buffer,
  originalName: string,
  mimeType: string,
  type: "background" | "icon"
): Promise<UploadResult> {
  // ========== 阶段 1: 验证 ==========
  
  // 校验文件类型（包含 SVG 检查）
  const typeValidation = validateMimeType(mimeType, originalName);
  if (!typeValidation.valid) {
    return { success: false, error: typeValidation.error };
  }

  // ========== 阶段 2: 图片处理 ==========
  
  // 处理图片（压缩、尺寸限制）
  const processResult = await processImage(file, mimeType, type);
  
  if (!processResult.success) {
    return { success: false, error: processResult.error };
  }

  const processedBuffer = processResult.buffer!;
  const metadata = processResult.metadata!;

  // ========== 阶段 3: 保存文件 ==========
  
  try {
    // 生成安全文件名（使用处理后的格式）
    const filename = generateSafeFilename(originalName, metadata.format);
    const filepath = join(UPLOAD_DIR, filename);

    // 确保上传目录存在
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // 写入处理后的文件
    await fs.writeFile(filepath, processedBuffer);

    // 构造访问 URL
    const url = `/api/assets/${filename}`;

    // 确定最终 MIME 类型
    const finalMimeType = metadata.format === "jpeg" 
      ? "image/jpeg" 
      : metadata.format === "webp"
      ? "image/webp"
      : metadata.format === "gif"
      ? "image/gif"
      : "image/png";

    // ========== 阶段 4: 生成缩略图（阶段 4-E 新增）==========
    
    let thumbFilename: string | null = null;
    let thumbUrl: string | null = null;
    
    try {
      const thumbnailBuffer = await generateThumbnail(processedBuffer, finalMimeType);
      if (thumbnailBuffer) {
        thumbFilename = getThumbnailFilename(filename);
        const thumbPath = join(UPLOAD_DIR, thumbFilename);
        await fs.writeFile(thumbPath, thumbnailBuffer);
        thumbUrl = `/api/assets/${thumbFilename}`;
        console.log(`[Thumb] Generated: ${thumbFilename} (${formatFileSize(thumbnailBuffer.length)})`);
      }
    } catch (thumbError) {
      // 缩略图生成失败不影响主图，记录日志即可
      console.warn("[Thumb] Failed to generate thumbnail:", thumbError);
    }

    // ========== 阶段 5: 写入数据库 ==========
    
    const resource = await prisma.resource.create({
      data: {
        type,
        filename,
        originalName,
        mimeType: finalMimeType,
        size: processedBuffer.length,
        width: metadata.width,
        height: metadata.height,
        path: filepath,
        url,
      },
    });

    return {
      success: true,
      resource: {
        id: resource.id,
        type: resource.type as "background" | "icon",
        filename: resource.filename,
        originalName: resource.originalName,
        mimeType: resource.mimeType,
        size: resource.size,
        width: resource.width || undefined,
        height: resource.height || undefined,
        url: resource.url,
        thumbUrl: thumbUrl || undefined, // 阶段 4-E 新增：缩略图 URL
        createdAt: resource.createdAt,
      },
    };
  } catch (error) {
    console.error("Save upload error:", error);
    
    // 清理可能已写入的文件（防御性编程）
    try {
      // 尝试删除可能已创建的文件
      // 注意：这里 filepath 可能未定义，所以用 try-catch 包裹
    } catch {
      // 忽略清理错误
    }
    
    return {
      success: false,
      error: "文件保存失败，请重试",
    };
  }
}

/**
 * 构建缩略图 URL（阶段 4-E 新增）
 */
function buildThumbUrl(filename: string): string {
  const thumbFilename = getThumbnailFilename(filename);
  return `/api/assets/${thumbFilename}`;
}

/**
 * 检查缩略图是否存在（阶段 4-E 新增）
 */
async function thumbExists(filename: string): Promise<boolean> {
  try {
    const thumbFilename = getThumbnailFilename(filename);
    const thumbPath = join(UPLOAD_DIR, thumbFilename);
    await fs.access(thumbPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取资源列表（阶段 4-E 增强：包含缩略图 URL）
 */
export async function getResources(type?: "background" | "icon"): Promise<Resource[]> {
  const resources = await prisma.resource.findMany({
    where: type ? { type } : undefined,
    orderBy: { createdAt: "desc" },
  });

  // 阶段 4-E：并行检查缩略图存在性
  const resourcesWithThumb = await Promise.all(
    resources.map(async (r) => {
      const hasThumb = await thumbExists(r.filename);
      return {
        id: r.id,
        type: r.type as "background" | "icon",
        filename: r.filename,
        originalName: r.originalName,
        mimeType: r.mimeType,
        size: r.size,
        width: r.width || undefined,
        height: r.height || undefined,
        url: r.url,
        thumbUrl: hasThumb ? buildThumbUrl(r.filename) : undefined,
        createdAt: r.createdAt,
      };
    })
  );

  return resourcesWithThumb;
}

/**
 * 获取单个资源（阶段 4-E 增强：包含缩略图 URL）
 */
export async function getResourceById(id: string): Promise<Resource | null> {
  const resource = await prisma.resource.findUnique({
    where: { id },
  });

  if (!resource) return null;

  const hasThumb = await thumbExists(resource.filename);

  return {
    id: resource.id,
    type: resource.type as "background" | "icon",
    filename: resource.filename,
    originalName: resource.originalName,
    mimeType: resource.mimeType,
    size: resource.size,
    width: resource.width || undefined,
    height: resource.height || undefined,
    url: resource.url,
    thumbUrl: hasThumb ? buildThumbUrl(resource.filename) : undefined,
    createdAt: resource.createdAt,
  };
}

/**
 * 通过文件名获取资源（阶段 4-E 增强：包含缩略图 URL）
 */
export async function getResourceByFilename(filename: string): Promise<Resource | null> {
  const resource = await prisma.resource.findFirst({
    where: { filename },
  });

  if (!resource) return null;

  const hasThumb = await thumbExists(resource.filename);

  return {
    id: resource.id,
    type: resource.type as "background" | "icon",
    filename: resource.filename,
    originalName: resource.originalName,
    mimeType: resource.mimeType,
    size: resource.size,
    width: resource.width || undefined,
    height: resource.height || undefined,
    url: resource.url,
    thumbUrl: hasThumb ? buildThumbUrl(resource.filename) : undefined,
    createdAt: resource.createdAt,
  };
}

/**
 * 删除资源（阶段 4-E 增强：同时删除缩略图）
 * 策略：删除数据库记录和本地文件（包括缩略图），引用处由页面兜底为空
 */
export async function deleteResource(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
    });

    if (!resource) {
      return { success: false, error: "资源不存在" };
    }

    // 删除数据库记录
    await prisma.resource.delete({
      where: { id },
    });

    // 尝试删除本地主文件（容错处理）
    try {
      await fs.unlink(resource.path);
    } catch (fsError) {
      // 文件可能已被删除，记录但不报错
      console.warn("File not found during deletion:", resource.path);
    }

    // 阶段 4-E：尝试删除缩略图文件
    try {
      const thumbFilename = getThumbnailFilename(resource.filename);
      const thumbPath = join(UPLOAD_DIR, thumbFilename);
      await fs.unlink(thumbPath);
      console.log("[Thumb] Deleted:", thumbFilename);
    } catch {
      // 缩略图可能不存在，忽略错误
    }

    return { success: true };
  } catch (error) {
    console.error("Delete resource error:", error);
    return { success: false, error: "删除失败" };
  }
}

/**
 * 获取资源文件路径
 */
export function getResourcePath(filename: string): string {
  return join(UPLOAD_DIR, filename);
}

/**
 * 检查资源是否存在
 */
export async function resourceExists(id: string): Promise<boolean> {
  const count = await prisma.resource.count({
    where: { id },
  });
  return count > 0;
}
