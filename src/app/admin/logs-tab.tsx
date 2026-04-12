"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime, getActionDescription } from "@/lib/logs";

// 类型定义
interface OperationLog {
  id: string;
  userType: string;
  action: string;
  details?: string;
  ip: string;
  timestamp: string;
}

interface AccessLog {
  id: string;
  ip: string;
  userAgent?: string;
  path: string;
  method: string;
  status: number;
  timestamp: string;
}

export default function LogsTab() {
  const [activeLogType, setActiveLogType] = useState<"operation" | "access">("operation");
  const [operationLogs, setOperationLogs] = useState<OperationLog[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "visitor" | "admin">("all");

  // 加载操作日志
  const loadOperationLogs = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" 
        ? "/api/admin/logs/operations" 
        : `/api/admin/logs/operations?userType=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setOperationLogs(data.data.logs);
      } else {
        setMessage({ type: "error", text: data.error || "加载失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  // 加载访问日志
  const loadAccessLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs/access");
      const data = await res.json();
      
      if (data.success) {
        setAccessLogs(data.data.logs);
      } else {
        setMessage({ type: "error", text: data.error || "加载失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  }, []);

  // 切换日志类型时加载
  useEffect(() => {
    if (activeLogType === "operation") {
      loadOperationLogs();
    } else {
      loadAccessLogs();
    }
  }, [activeLogType, loadOperationLogs, loadAccessLogs]);

  // 清理日志
  const handleClear = async (type: "operation" | "access", days?: number) => {
    if (!confirm(days 
      ? `确定要清理 ${days} 天前的${type === "operation" ? "操作" : "访问"}日志吗？` 
      : `确定要清理全部${type === "operation" ? "操作" : "访问"}日志吗？`)) {
      return;
    }

    setLoading(true);
    try {
      const url = days 
        ? `/api/admin/logs/${type}?days=${days}` 
        : `/api/admin/logs/${type}`;
      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        // 刷新列表
        if (type === "operation") {
          loadOperationLogs();
        } else {
          loadAccessLogs();
        }
      } else {
        setMessage({ type: "error", text: data.error || "清理失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-white">日志管理</h2>
        <div className="flex gap-2">
          <button
            onClick={() => activeLogType === "operation" ? loadOperationLogs() : loadAccessLogs()}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
          >
            刷新
          </button>
        </div>
      </div>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveLogType("operation")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeLogType === "operation"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          操作日志
        </button>
        <button
          onClick={() => setActiveLogType("access")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeLogType === "access"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          访问日志
        </button>
      </div>

      {/* 操作日志筛选 */}
      {activeLogType === "operation" && (
        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm text-gray-400">筛选:</span>
          <div className="flex gap-2">
            {(["all", "visitor", "admin"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  filter === f
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {f === "all" ? "全部" : f === "visitor" ? "访客" : "管理员"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === "success"
            ? "bg-green-500/10 border border-green-500/20 text-green-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      {/* 清理按钮 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => handleClear(activeLogType, 7)}
          disabled={loading}
          className="px-3 py-1.5 bg-yellow-600/50 hover:bg-yellow-600 text-yellow-200 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          清理7天前
        </button>
        <button
          onClick={() => handleClear(activeLogType, 30)}
          disabled={loading}
          className="px-3 py-1.5 bg-yellow-600/50 hover:bg-yellow-600 text-yellow-200 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          清理30天前
        </button>
        <button
          onClick={() => handleClear(activeLogType)}
          disabled={loading}
          className="px-3 py-1.5 bg-red-600/50 hover:bg-red-600 text-red-200 rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          清理全部
        </button>
      </div>

      {/* 日志列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">加载中...</p>
        </div>
      ) : activeLogType === "operation" ? (
        // 操作日志列表
        <div className="space-y-2">
          {operationLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
              暂无操作日志
            </div>
          ) : (
            operationLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.userType === "admin"
                          ? "bg-indigo-500/20 text-indigo-400"
                          : "bg-green-500/20 text-green-400"
                      }`}>
                        {log.userType === "admin" ? "管理员" : "访客"}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {getActionDescription(log.action)}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-sm text-gray-400 mb-1">{log.details}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>IP: {log.ip}</span>
                      <span>{formatDateTime(new Date(log.timestamp))}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        // 访问日志列表
        <div className="space-y-2">
          {accessLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
              暂无访问日志
            </div>
          ) : (
            accessLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        log.status >= 400
                          ? "bg-red-500/20 text-red-400"
                          : log.status >= 300
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-green-500/20 text-green-400"
                      }`}>
                        {log.status}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {log.method} {log.path}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>IP: {log.ip}</span>
                      <span>{formatDateTime(new Date(log.timestamp))}</span>
                    </div>
                    {log.userAgent && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {log.userAgent}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
