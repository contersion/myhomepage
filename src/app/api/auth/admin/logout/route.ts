/**
 * 管理员登出 API
 * POST /api/auth/admin/logout
 */

import { clearAdminSession } from "@/lib/auth/session";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

export async function POST() {
  try {
    await clearAdminSession();
    return successResponse({ message: "已退出登录" });
  } catch (error) {
    console.error("Admin logout error:", error);
    return serverErrorResponse("退出登录失败", error);
  }
}
