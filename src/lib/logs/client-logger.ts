/**
 * 客户端访问日志记录
 * 
 * 用途：
 * - 在页面组件（Client Component）中记录页面访问
 * - 通过调用 /api/log-access API 间接写入数据库
 * 
 * 注意：
 * - 这是一个"尽力而为"的记录，失败不影响页面功能
 * - 只在生产环境或明确启用时记录（避免开发时产生大量日志）
 */

/**
 * 记录页面访问
 * @param path 当前页面路径
 */
export async function logPageAccess(path: string): Promise<void> {
  // 开发环境可选是否记录（默认不记录，避免干扰）
  if (process.env.NODE_ENV === "development" && !process.env.ENABLE_DEV_ACCESS_LOG) {
    return;
  }
  
  try {
    // 使用 sendBeacon 如果可用（页面卸载时更可靠）
    if (navigator.sendBeacon) {
      const blob = new Blob([JSON.stringify({ path })], { type: "application/json" });
      navigator.sendBeacon("/api/log-access", blob);
      return;
    }
    
    // 回退到 fetch
    await fetch("/api/log-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
      // 不等待响应
      keepalive: true,
    });
  } catch {
    // 记录失败静默处理，不影响用户体验
  }
}

/**
 * React Hook: 在组件挂载时记录页面访问
 * 
 * 使用示例：
 * function MyPage() {
 *   usePageAccess("/my-page");
 *   // ...
 * }
 */
import { useEffect } from "react";

export function usePageAccess(path: string) {
  useEffect(() => {
    logPageAccess(path);
  }, [path]);
}
