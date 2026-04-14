/**
 * 全站 favicon 运行时入口
 * GET /api/site/favicon
 * 根据后台配置的 site_favicon_asset_id 返回对应图标，未配置时返回默认透明 PNG
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSiteConfigValue } from "@/lib/site/config";

// 1x1 透明 PNG（base64）
const DEFAULT_FAVICON_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

const CACHE_CONTROL = "no-store, no-cache, must-revalidate, proxy-revalidate";

export async function GET(request: NextRequest) {
  try {
    const assetId = await getSiteConfigValue("site_favicon_asset_id", "");
    if (assetId) {
      const resource = await prisma.resource.findUnique({
        where: { id: assetId },
        select: { url: true },
      });
      if (resource?.url) {
        return NextResponse.redirect(new URL(resource.url, request.url), {
          status: 307,
          headers: { "Cache-Control": CACHE_CONTROL },
        });
      }
    }
  } catch {
    // 任何异常都回退到默认图标
  }

  const buf = Buffer.from(DEFAULT_FAVICON_B64, "base64");
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": CACHE_CONTROL,
    },
  });
}
