/**
 * 登录失败限制与冷却机制
 * 基于 IP + 类型（visitor/admin）进行限制
 */

import { prisma } from "@/lib/db";

// 配置常量（首版用常量，后续可迁到 .env）
const MAX_ATTEMPTS = 5; // 最大尝试次数
const LOCK_DURATION_MINUTES = 15; // 冷却时间（分钟）

/**
 * 检查登录是否被锁定
 * @param ip 客户端 IP
 * @param type "visitor" | "admin"
 * @returns { locked: boolean; remainingMinutes?: number }
 */
export async function checkLoginLocked(
  ip: string,
  type: "visitor" | "admin"
): Promise<{ locked: boolean; remainingMinutes?: number }> {
  const attempt = await prisma.loginAttempt.findFirst({
    where: { ip, type },
  });

  if (!attempt) {
    return { locked: false };
  }

  // 检查是否处于冷却期
  if (attempt.lockedUntil && attempt.lockedUntil > new Date()) {
    const remainingMs = attempt.lockedUntil.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
    return { locked: true, remainingMinutes };
  }

  // 冷却期已过，自动解锁
  if (attempt.lockedUntil && attempt.lockedUntil <= new Date()) {
    await prisma.loginAttempt.delete({
      where: { id: attempt.id },
    });
    return { locked: false };
  }

  return { locked: false };
}

/**
 * 记录登录失败
 * @param ip 客户端 IP
 * @param type "visitor" | "admin"
 * @returns { locked: boolean; remainingMinutes?: number; attempts: number }
 */
export async function recordLoginFailure(
  ip: string,
  type: "visitor" | "admin"
): Promise<{ locked: boolean; remainingMinutes?: number; attempts: number }> {
  const now = new Date();

  // 查找或创建记录
  let attempt = await prisma.loginAttempt.findFirst({
    where: { ip, type },
  });

  if (!attempt) {
    attempt = await prisma.loginAttempt.create({
      data: {
        ip,
        type,
        count: 1,
        lastAttempt: now,
      },
    });
    return { locked: false, attempts: 1 };
  }

  // 增加计数
  const newCount = attempt.count + 1;

  // 检查是否达到阈值
  if (newCount >= MAX_ATTEMPTS) {
    const lockedUntil = new Date(now.getTime() + LOCK_DURATION_MINUTES * 60 * 1000);
    await prisma.loginAttempt.update({
      where: { id: attempt.id },
      data: {
        count: newCount,
        lastAttempt: now,
        lockedUntil,
      },
    });
    return { locked: true, remainingMinutes: LOCK_DURATION_MINUTES, attempts: newCount };
  }

  // 未达阈值，仅更新计数
  await prisma.loginAttempt.update({
    where: { id: attempt.id },
    data: {
      count: newCount,
      lastAttempt: now,
    },
  });

  return { locked: false, attempts: newCount };
}

/**
 * 登录成功后清除失败记录
 * @param ip 客户端 IP
 * @param type "visitor" | "admin"
 */
export async function clearLoginAttempts(
  ip: string,
  type: "visitor" | "admin"
): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: { ip, type },
  });
}

/**
 * 获取剩余尝试次数
 */
export function getRemainingAttempts(currentAttempts: number): number {
  return Math.max(0, MAX_ATTEMPTS - currentAttempts);
}
