/**
 * 密码管理 API
 * PUT /api/admin/security/password - 修改密码
 * Body: { type: "visitor" | "admin", newPassword: string, confirmPassword: string }
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/auth/session";
import { validatePassword } from "@/lib/security/password";
import { errorResponse, unauthorizedResponse, serverErrorResponse } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";

// 请求体验证
const updatePasswordSchema = z.object({
  type: z.enum(["visitor", "admin"]),
  enabled: z.enum(["true", "false"]).optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
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

    const { type, enabled, newPassword = "", confirmPassword = "" } = result.data;
    const ip = request.headers.get("x-forwarded-for") || "unknown";
    const hasPassword = newPassword.length > 0;

    // 管理员必须提供密码
    if (type === "admin" && !hasPassword) {
      return errorResponse("新密码不能为空", 400);
    }

    // 访客：如果既没有开关也没有密码，则报错
    if (type === "visitor" && enabled === undefined && !hasPassword) {
      return errorResponse("请至少修改一项内容", 400);
    }

    // ===== 所有参数先校验，后写入 =====
    if (hasPassword) {
      if (newPassword !== confirmPassword) {
        return errorResponse("两次输入的密码不一致", 400);
      }
      const validation = validatePassword(newPassword);
      if (!validation.valid) {
        return errorResponse(validation.message || "密码不符合要求", 400);
      }
    }

    // 构造原子写入操作
    const operations: Array<ReturnType<typeof prisma.siteConfig.upsert>> = [];
    if (type === "visitor" && enabled !== undefined) {
      operations.push(
        prisma.siteConfig.upsert({
          where: { key: "visitor_password_enabled" },
          update: { value: enabled },
          create: { key: "visitor_password_enabled", value: enabled, description: "" },
        })
      );
    }
    if (hasPassword) {
      const hash = hashSync(newPassword, 10);
      const key = type === "visitor" ? "visitor_password_hash" : "admin_password_hash";
      operations.push(
        prisma.siteConfig.upsert({
          where: { key },
          update: { value: hash },
          create: { key, value: hash, description: "" },
        })
      );
    }

    if (operations.length === 0) {
      return errorResponse("没有需要保存的变更", 400);
    }

    await prisma.$transaction(operations);

    // 记录操作日志（异步）
    const changedItems: string[] = [];
    if (type === "visitor" && enabled !== undefined) {
      changedItems.push(`访客密码开关: ${enabled === "true" ? "开启" : "关闭"}`);
    }
    if (hasPassword) {
      changedItems.push(`修改${type === "visitor" ? "访客" : "管理员"}密码`);
    }

    prisma.operationLog.create({
      data: {
        userType: "admin",
        action: "UPDATE_SECURITY_SETTINGS",
        details: changedItems.join("; ") || `更新了 ${type === "visitor" ? "访客" : "管理员"}安全设置`,
        ip,
      },
    }).catch(() => {});

    let message = "";
    if (type === "visitor") {
      if (hasPassword && enabled !== undefined) {
        message = `访客密码开关与密码已更新`;
      } else if (hasPassword) {
        message = "访客密码修改成功";
      } else {
        message = `访客密码已${enabled === "true" ? "开启" : "关闭"}`;
      }
    } else {
      message = "管理员密码修改成功";
    }

    return NextResponse.json({ success: true, message });

  } catch (error) {
    console.error("Update password error:", error);
    return serverErrorResponse("密码修改失败", error);
  }
}
