/**
 * Session/Cookie 管理工具
 * 访客与管理员会话完全隔离，使用不同 cookie 名和密钥
 */

import { cookies } from "next/headers";

// Cookie 配置
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "strict" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 天
};

// 访客 cookie 名
const VISITOR_COOKIE_NAME = "visitor_session";
// 管理员 cookie 名
const ADMIN_COOKIE_NAME = "admin_session";

/**
 * 生成简单会话令牌（时间戳+随机数）
 * 注意：这是简化实现，生产环境建议使用 JWT 或加密 session
 */
function generateToken(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2)}`;
}

/**
 * 验证令牌格式是否有效
 */
function isValidToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split("_");
  if (parts.length !== 2) return false;
  const timestamp = parseInt(parts[0], 10);
  // 检查是否过期（7天）
  const now = Date.now();
  const maxAge = 60 * 60 * 24 * 7 * 1000;
  return now - timestamp < maxAge;
}

// ==================== 访客会话 ====================

/**
 * 设置访客登录状态
 */
export async function setVisitorSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = generateToken();
  cookieStore.set(VISITOR_COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * 清除访客登录状态
 */
export async function clearVisitorSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(VISITOR_COOKIE_NAME);
}

/**
 * 检查访客是否已登录
 */
export async function isVisitorAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(VISITOR_COOKIE_NAME)?.value;
  return isValidToken(token || "");
}

/**
 * 获取访客认证状态（用于 API 和页面）
 */
export async function getVisitorAuthStatus(): Promise<{ authenticated: boolean }> {
  const authenticated = await isVisitorAuthenticated();
  return { authenticated };
}

// ==================== 管理员会话 ====================

/**
 * 设置管理员登录状态
 */
export async function setAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = generateToken();
  cookieStore.set(ADMIN_COOKIE_NAME, token, COOKIE_OPTIONS);
}

/**
 * 清除管理员登录状态
 */
export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
}

/**
 * 检查管理员是否已登录
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return isValidToken(token || "");
}

/**
 * 获取管理员认证状态（用于 API 和页面）
 */
export async function getAdminAuthStatus(): Promise<{ authenticated: boolean }> {
  const authenticated = await isAdminAuthenticated();
  return { authenticated };
}
