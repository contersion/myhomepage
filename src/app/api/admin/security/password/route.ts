/**
 * 密码管理 API
 * PUT /api/admin/security/password - 修改密码
 * Body: { type: "visitor" | "admin", newPassword: string, confirmPassword: string }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { updateVisitorPassword, updateAdminPassword, validatePassword } from "@/lib/security/password";
import { successResponse, errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";

// 请求体验证
const updatePasswordSchema = z.object({
  type: z.enum(["visitor", "admin"]),
  newPassword: z.string().min(1, "新密码不能为空"),
  confirmPassword: z.string().min(1, "请确认密码"),
});

export async function PUT(request: NextRequest) {
  try {
    // 检查管理员权限
    const isAdmin = await isAdminAuthenticated();
    if (!isAdmin) {
      return unauthorizedResponse();
    }

    // 解析请求体
    const body = await request.json();
    const result = updatePasswordSchema.safeParse(body);

    if (!result.success) {
      return errorResponse(result.error.errors[0].message, 400);
    }

    const { type, newPassword, confirmPassword } = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";

    // 检查两次输入是否一致
    if (newPassword !== confirmPassword) {
      return errorResponse("两次输入的密码不一致", 400);
    }

    // 校验密码强度
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return errorResponse(validation.message || "密码不符合要求", 400);
    }

    // 更新密码
    if (type === "visitor") {
      await updateVisitorPassword(newPassword);
    } else {
      await updateAdminPassword(newPassword);
    }

    // 记录操作日志（异步）
    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_PASSWORD",
        details: `修改了 ${type === "visitor" ? "访客" : "管理员"}密码`,
        ip,
      },
    }).catch(() => {});

    return successResponse({ 
      message: `${type === "visitor" ? "访客" : "管理员"}密码修改成功` 
    });

  } catch (error) {
    console.error("Update password error:", error);
    return serverErrorResponse("密码修改失败", error);
  }
}
