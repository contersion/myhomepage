/**
 * Next.js Middleware
 * 处理路由保护和重定向逻辑
 * 
 * 注意：Middleware 在 Edge Runtime 运行，无法直接访问 Node.js 模块
 * 访客访问控制已下沉到页面服务端组件处理，这里仅保留管理员路由保护
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 需要管理员认证的路径前缀
const ADMIN_PROTECTED_PATHS = ["/admin"];
// 管理员登录页面
const ADMIN_LOGIN_PATH = "/admin/login";

/**
 * 验证简单 session token 格式
 * 注意：这是简化检查，完整验证在服务端完成
 */
function isValidTokenFormat(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split("_");
  if (parts.length !== 2) return false;
  const timestamp = parseInt(parts[0], 10);
  if (isNaN(timestamp)) return false;
  // 检查是否过期（7天）
  const now = Date.now();
  const maxAge = 60 * 60 * 24 * 7 * 1000;
  return now - timestamp < maxAge;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ========== 管理员路由保护 ==========
  const isAdminProtected = ADMIN_PROTECTED_PATHS.some(
    (path) => pathname.startsWith(path) && pathname !== ADMIN_LOGIN_PATH
  );
  const isAdminLoginPage = pathname === ADMIN_LOGIN_PATH;
  
  // 检查管理员认证状态
  const adminToken = request.cookies.get("admin_session")?.value;
  const isAdminAuth = isValidTokenFormat(adminToken);
  
  // 未登录访问后台受保护页面 -> 重定向到后台登录页
  if (isAdminProtected && !isAdminAuth) {
    const loginUrl = new URL(ADMIN_LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }
  
  // 已登录访问后台登录页 -> 重定向到后台首页
  if (isAdminLoginPage && isAdminAuth) {
    const adminUrl = new URL("/admin", request.url);
    return NextResponse.redirect(adminUrl);
  }
  
  return NextResponse.next();
}

// 配置 middleware 匹配路径
export const config = {
  matcher: [
    "/admin/:path*",
  ],
};
