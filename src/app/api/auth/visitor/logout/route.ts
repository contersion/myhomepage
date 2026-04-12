/**
 * 访客登出 API
 * POST /api/auth/visitor/logout
 */

import { clearVisitorSession } from "@/lib/auth/session";
import { successResponse, serverErrorResponse } from "@/lib/api-response";

export async function POST() {
  try {
    await clearVisitorSession();
    return successResponse({ message: "已退出登录" });
  } catch (error) {
    console.error("Visitor logout error:", error);
    return serverErrorResponse("退出登录失败", error);
  }
}
