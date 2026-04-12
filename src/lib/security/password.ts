/**
 * 密码管理
 * 提供密码更新能力
 */

import { hashSync } from "bcryptjs";
import { updateSiteConfig } from "@/lib/site/config";

/**
 * 更新访客密码
 * @param newPassword 新密码（明文）
 */
export async function updateVisitorPassword(newPassword: string): Promise<void> {
  const hash = hashSync(newPassword, 10);
  await updateSiteConfig({
    visitor_password_hash: hash,
  });
}

/**
 * 更新管理员密码
 * @param newPassword 新密码（明文）
 */
export async function updateAdminPassword(newPassword: string): Promise<void> {
  const hash = hashSync(newPassword, 10);
  await updateSiteConfig({
    admin_password_hash: hash,
  });
}

/**
 * 密码强度校验（最小实现）
 * @param password 密码
 * @returns { valid: boolean; message?: string }
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length === 0) {
    return { valid: false, message: "密码不能为空" };
  }

  if (password.length < 6) {
    return { valid: false, message: "密码长度至少 6 位" };
  }

  if (password.length > 100) {
    return { valid: false, message: "密码过长" };
  }

  return { valid: true };
}
