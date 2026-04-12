/**
 * 资源读取 API
 * GET /api/assets/[filename] - 读取资源文件
 * 公开接口，无需登录（资源 URL 是公开的）
 */

import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import { getResourceByFilename, getResourcePath } from "@/lib/assets";
import { errorResponse, serverErrorResponse } from "@/lib/api-response";

/**
 * GET - 读取资源文件
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // 查找资源记录
    const resource = await getResourceByFilename(filename);

    if (!resource) {
      // 如果是缩略图，尝试直接读取文件（缩略图没有独立数据库记录）
      if (filename.includes(".thumb.")) {
        try {
          const filepath = getResourcePath(filename);
          const fileBuffer = await fs.readFile(filepath);
          return new Response(fileBuffer, {
            headers: {
              "Content-Type": "image/jpeg",
              "Cache-Control": "public, max-age=31536000, immutable",
            },
          });
        } catch {
          return errorResponse("资源不存在", 404);
        }
      }
      return errorResponse("资源不存在", 404);
    }

    // 读取文件
    const filepath = getResourcePath(filename);
    const fileBuffer = await fs.readFile(filepath);

    // 返回文件内容，设置正确的 Content-Type
    return new Response(fileBuffer, {
      headers: {
        "Content-Type": resource.mimeType,
        "Cache-Control": "public, max-age=31536000, immutable", // 静态资源长期缓存
      },
    });
  } catch (error) {
    console.error("Get asset error:", error);
    return serverErrorResponse("读取资源失败", error);
  }
}
