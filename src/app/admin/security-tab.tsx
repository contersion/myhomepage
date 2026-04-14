"use client";

import { useState, useEffect } from "react";

export default function SecurityTab() {
  const [activeTab, setActiveTab] = useState<"visitor" | "admin">("visitor");
  const [visitorEnabled, setVisitorEnabled] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/site")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setVisitorEnabled(data.data.visitor_password_enabled === "true");
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async () => {
    const isChangingPassword = password.length > 0;

    if (activeTab === "visitor") {
      // 只要填写了新密码，就做完整校验（与开关状态无关）
      if (isChangingPassword) {
        if (password.length < 6) {
          setMessage({ type: "error", text: "密码长度至少 6 位" });
          return;
        }
        if (password !== confirmPassword) {
          setMessage({ type: "error", text: "两次输入的密码不一致" });
          return;
        }
      }
    } else {
      // 管理员必须提供密码
      if (!isChangingPassword) {
        setMessage({ type: "error", text: "请输入新密码" });
        return;
      }
      if (password.length < 6) {
        setMessage({ type: "error", text: "密码长度至少 6 位" });
        return;
      }
      if (password !== confirmPassword) {
        setMessage({ type: "error", text: "两次输入的密码不一致" });
        return;
      }
    }

    setLoading(true);
    setMessage(null);

    try {
      const body: Record<string, string> = { type: activeTab };
      if (activeTab === "visitor") {
        body.enabled = visitorEnabled ? "true" : "false";
      }
      if (isChangingPassword) {
        body.newPassword = password;
        body.confirmPassword = confirmPassword;
      }

      const res = await fetch("/api/admin/security/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: data.message });
        setPassword("");
        setConfirmPassword("");
      } else {
        setMessage({ type: "error", text: data.error || "修改失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">安全设置</h2>

      {/* 标签切换 */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => {
            setActiveTab("visitor");
            setPassword("");
            setConfirmPassword("");
            setMessage(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "visitor"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          访客密码
        </button>
        <button
          onClick={() => {
            setActiveTab("admin");
            setPassword("");
            setConfirmPassword("");
            setMessage(null);
          }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "admin"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          管理员密码
        </button>
      </div>

      {/* 说明 */}
      <div className="mb-6 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <p className="text-sm text-gray-400">
          修改{activeTab === "visitor" ? "访客" : "管理员"}密码。
          {activeTab === "visitor" 
            ? "访客密码用于访问首页，修改后立即生效。" 
            : "管理员密码用于登录后台，修改后立即生效，当前会话保持有效。"}
        </p>
      </div>

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

      {/* 密码表单 */}
      <div className="space-y-4 max-w-md">
        {activeTab === "visitor" && (
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={visitorEnabled}
                onChange={(e) => setVisitorEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
              />
              <span className="text-sm text-gray-300">启用访客密码</span>
            </label>
            <p className="text-xs text-gray-500">
              {visitorEnabled
                ? "开启后，访问首页需要输入访客密码"
                : "关闭后，首页可直接访问，/access 页面将自动跳转到首页"}
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            新密码 {activeTab === "admin" || visitorEnabled ? <span className="text-red-400">*</span> : null}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
            placeholder="输入新密码"
          />
          <p className="text-gray-500 text-xs mt-1">密码长度至少 6 位</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            确认密码 <span className="text-red-400">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
            placeholder="再次输入新密码"
          />
        </div>

        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white rounded-lg font-medium transition-all"
          >
            {loading ? "保存中..." : "保存修改"}
          </button>
        </div>
      </div>
    </div>
  );
}
