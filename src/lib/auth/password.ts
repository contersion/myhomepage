/**
 * 密码哈希与校验工具
 * 使用 bcryptjs 进行密码哈希和校验
 */

import { hashSync, compareSync } from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * 生成密码哈希
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export function hashPassword(password: string): string {
  return hashSync(password, SALT_ROUNDS);
}

/**
 * 校验密码
 * @param password 明文密码
 * @param hash 哈希值
 * @returns 是否匹配
 */
export function verifyPassword(password: string, hash: string): boolean {
  return compareSync(password, hash);
}
