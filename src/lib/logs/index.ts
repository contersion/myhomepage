/**
 * 日志管理
 * 提供操作日志与访问日志的查询和清理能力
 */

import { prisma } from "@/lib/db";

// 重新导出访问日志记录器
export { 
  writeAccessLog, 
  extractAccessInfo, 
  shouldLogAccess,
  type AccessLogData 
} from "./access-logger";

// ==================== 类型定义 ====================

export interface OperationLog {
  id: string;
  userType: string;
  action: string;
  details?: string;
  ip: string;
  timestamp: Date;
}

export interface AccessLog {
  id: string;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  status: number;
  timestamp: Date;
}

// ==================== 操作日志 ====================

/**
 * 获取操作日志列表
 * @param options 查询选项
 */
export async function getOperationLogs(options: {
  userType?: "visitor" | "admin";
  limit?: number;
  offset?: number;
} = {}): Promise<{ logs: OperationLog[]; total: number }> {
  const { userType, limit = 50, offset = 0 } = options;

  const where = userType ? { userType } : {};

  const [logs, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.operationLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      userType: l.userType,
      action: l.action,
      details: l.details || undefined,
      ip: l.ip,
      timestamp: l.timestamp,
    })),
    total,
  };
}

/**
 * 清理操作日志
 * @param before 清理此时间之前的日志（不传则清理全部）
 */
export async function clearOperationLogs(before?: Date): Promise<{ count: number }> {
  const where = before ? { timestamp: { lt: before } } : {};
  
  const result = await prisma.operationLog.deleteMany({
    where,
  });

  return { count: result.count };
}

// ==================== 访问日志 ====================

// writeAccessLog 从 ./access-logger 重新导出

/**
 * 获取访问日志列表
 */
export async function getAccessLogs(options: {
  limit?: number;
  offset?: number;
} = {}): Promise<{ logs: AccessLog[]; total: number }> {
  const { limit = 50, offset = 0 } = options;

  const [logs, total] = await Promise.all([
    prisma.accessLog.findMany({
      orderBy: { timestamp: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.accessLog.count(),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      ip: l.ip,
      userAgent: l.userAgent || undefined,
      path: l.path,
      method: l.method,
      status: l.status,
      timestamp: l.timestamp,
    })),
    total,
  };
}

/**
 * 清理访问日志
 */
export async function clearAccessLogs(before?: Date): Promise<{ count: number }> {
  const where = before ? { timestamp: { lt: before } } : {};
  
  const result = await prisma.accessLog.deleteMany({
    where,
  });

  return { count: result.count };
}

// ==================== 工具函数 ====================

/**
 * 格式化日期时间
 */
export function formatDateTime(date: Date): string {
  return new Date(date).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * 获取操作类型中文描述
 */
export function getActionDescription(action: string): string {
  const map: Record<string, string> = {
    LOGIN_SUCCESS: "登录成功",
    LOGIN_FAILED: "登录失败",
    LOGOUT: "退出登录",
    UPDATE_SITE_CONFIG: "修改站点配置",
    CREATE_BUTTON_GROUP: "创建按钮分组",
    UPDATE_BUTTON_GROUP: "修改按钮分组",
    DELETE_BUTTON_GROUP: "删除按钮分组",
    CREATE_BUTTON: "创建按钮",
    UPDATE_BUTTON: "修改按钮",
    DELETE_BUTTON: "删除按钮",
    CREATE_BACKGROUND: "创建背景",
    UPDATE_BACKGROUND: "修改背景",
    DELETE_BACKGROUND: "删除背景",
    UPDATE_BACKGROUND_CONFIG: "修改背景配置",
    UPLOAD_ASSET: "上传资源",
    DELETE_ASSET: "删除资源",
    UPDATE_PASSWORD: "修改密码",
    CLEAR_OPERATION_LOGS: "清理操作日志",
    CLEAR_ACCESS_LOGS: "清理访问日志",
  };
  return map[action] || action;
}
