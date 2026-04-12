/**
 * 访客登录 API
 * POST /api/auth/visitor/login
 * Body: { password: string }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { setVisitorSession } from "@/lib/auth/session";
import { getPasswordHash } from "@/lib/site/config";
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { checkLoginLocked, recordLoginFailure, clearLoginAttempts, getRemainingAttempts } from "@/lib/security/login-attempts";

// 请求体验证
const loginSchema = z.object({
  password: z.string().min(1, "密码不能为空"),
});

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body = await request.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }
    
    const { password } = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    
    // 检查是否处于冷却期
    const lockStatus = await checkLoginLocked(ip, "visitor");
    if (lockStatus.locked) {
      // 记录尝试（在冷却期内仍尝试登录）
      prisma.operationLog.create({
        data: {
          userType: "visitor",
          action: "LOGIN_FAILED",
          details: `访客登录被拒绝（冷却中，剩余 ${lockStatus.remainingMinutes} 分钟）`,
          ip,
        },
      }).catch(() => {});
      
      return errorResponse(
        `登录尝试过于频繁，请 ${lockStatus.remainingMinutes} 分钟后再试`,
        429
      );
    }
    
    // 获取访客密码哈希
    const hash = await getPasswordHash("visitor");
    
    if (!hash) {
      return errorResponse("系统配置错误，请联系管理员", 500);
    }
    
    // 校验密码
    const isValid = verifyPassword(password, hash);
    
    if (!isValid) {
      // 记录失败次数
      const failureResult = await recordLoginFailure(ip, "visitor");
      
      // 记录登录失败日志（异步）
      prisma.operationLog.create({
        data: {
          userType: "visitor",
          action: "LOGIN_FAILED",
          details: failureResult.locked 
            ? `访客密码错误（已达最大尝试次数，锁定 ${failureResult.remainingMinutes} 分钟）`
            : `访客密码错误（剩余 ${getRemainingAttempts(failureResult.attempts)} 次机会）`,
          ip,
        },
      }).catch(() => {});
      
      if (failureResult.locked) {
        return errorResponse(
          `密码错误次数过多，请 ${failureResult.remainingMinutes} 分钟后再试`,
          429
        );
      }
      
      return errorResponse(
        `密码错误，还剩 ${getRemainingAttempts(failureResult.attempts)} 次机会`,
        401
      );
    }
    
    // 登录成功，清除失败记录
    await clearLoginAttempts(ip, "visitor");
    
    // 设置会话
    await setVisitorSession();
    
    // 记录登录成功日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "visitor",
        action: "LOGIN_SUCCESS",
        details: "访客登录成功",
        ip,
      },
    }).catch(() => {});
    
    return successResponse({ message: "登录成功" });
    
  } catch (error) {
    console.error("Visitor login error:", error);
    return serverErrorResponse("登录处理失败", error);
  }
}
