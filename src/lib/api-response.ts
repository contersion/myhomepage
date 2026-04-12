/**
 * API 响应封装工具
 * 统一 API 返回格式，便于前端处理和错误追踪
 */

import { NextResponse } from "next/server";

/**
 * 成功响应
 * @param data 响应数据
 * @param status HTTP 状态码
 */
export function successResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
}

/**
 * 错误响应
 * @param message 错误信息
 * @param status HTTP 状态码
 * @param details 详细错误（可选，仅开发环境返回）
 */
export function errorResponse(
  message: string,
  status: number = 400,
  details?: unknown
): NextResponse {
  const response: {
    success: false;
    error: string;
    details?: unknown;
  } = {
    success: false,
    error: message,
  };
  
  // 仅在开发环境返回详细错误
  if (process.env.NODE_ENV === "development" && details) {
    response.details = details;
  }
  
  return NextResponse.json(response, { status });
}

/**
 * 认证错误响应
 */
export function unauthorizedResponse(message: string = "未登录或会话已过期"): NextResponse {
  return errorResponse(message, 401);
}

/**
 * 禁止访问响应
 */
export function forbiddenResponse(message: string = "无权访问此资源"): NextResponse {
  return errorResponse(message, 403);
}

/**
 * 服务器错误响应
 */
export function serverErrorResponse(
  message: string = "服务器内部错误",
  details?: unknown
): NextResponse {
  return errorResponse(message, 500, details);
}
