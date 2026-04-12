"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ButtonsTab from "./buttons-tab";
import BackgroundsTab from "./backgrounds-tab";
import AssetsTab from "./assets-tab";
import LogsTab from "./logs-tab";
import SecurityTab from "./security-tab";
import { logPageAccess } from "@/lib/logs/client-logger";

// 站点信息配置类型
interface SiteConfig {
  site_title: string;
  site_subtitle: string;
  site_description: string;
}

// 标签页类型
type TabId = "overview" | "site" | "buttons" | "backgrounds" | "resources" | "logs" | "security";

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const router = useRouter();
  
  // 记录页面访问
  useEffect(() => {
    logPageAccess("/admin");
  }, []);

  const tabs = [
    { id: "overview" as TabId, name: "概览", icon: "📊" },
    { id: "site" as TabId, name: "站点信息", icon: "🌐" },
    { id: "buttons" as TabId, name: "按钮管理", icon: "🔘" },
    { id: "backgrounds" as TabId, name: "背景管理", icon: "🖼️" },
    { id: "resources" as TabId, name: "资源管理", icon: "📁" },
    { id: "logs" as TabId, name: "日志查看", icon: "📝" },
    { id: "security" as TabId, name: "安全设置", icon: "🔐" },
  ];

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/auth/admin/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/admin/login");
        router.refresh();
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 顶部导航 */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                A
              </div>
              <h1 className="text-lg font-semibold text-white">管理后台</h1>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/"
                target="_blank"
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                查看站点 →
              </a>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                退出登录
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 lg:py-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 侧边栏 - 移动端改为横向滚动标签 */}
          <aside className="lg:w-64 flex-shrink-0">
            {/* 移动端：横向滚动标签 */}
            <nav className="lg:hidden flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
            
            {/* 桌面端：垂直导航 */}
            <nav className="hidden lg:block bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      ? "bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>

            {/* 系统状态卡片 - 仅桌面端显示 */}
            <div className="hidden lg:block mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-gray-400 text-xs font-medium uppercase tracking-wider mb-3">
                系统状态
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">版本</span>
                  <span className="text-gray-300">v0.2.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">环境</span>
                  <span className="text-green-400">运行中</span>
                </div>
              </div>
            </div>
          </aside>

          {/* 主内容区 */}
          <main className="flex-1 min-w-0">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              {activeTab === "overview" && <OverviewTab onChangeTab={setActiveTab} />}
              {activeTab === "site" && <SiteConfigTab />}
              {activeTab === "buttons" && <ButtonsTab />}
              {activeTab === "backgrounds" && <BackgroundsTab />}
              {activeTab === "resources" && <AssetsTab />}
              {activeTab === "logs" && <LogsTab />}
              {activeTab === "security" && <SecurityTab />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

// 概览标签页
function OverviewTab({ onChangeTab }: { onChangeTab: (tab: TabId) => void }) {
  const stats = [
    { name: "按钮分组", value: "1", icon: "📁" },
    { name: "按钮数量", value: "3", icon: "🔘" },
    { name: "背景图片", value: "2", icon: "🖼️" },
    { name: "上传资源", value: "0", icon: "📎" },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">概览</h2>
      
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-4"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.name}</div>
          </div>
        ))}
      </div>

      {/* 快捷操作 */}
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
          快捷操作
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button 
            onClick={() => onChangeTab("site")}
            className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-2xl">🌐</span>
            <div>
              <div className="font-medium text-white">编辑站点信息</div>
              <div className="text-sm text-gray-500">修改标题、简介等</div>
            </div>
          </button>
          <button 
            onClick={() => onChangeTab("buttons")}
            className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-2xl">🔘</span>
            <div>
              <div className="font-medium text-white">管理按钮</div>
              <div className="text-sm text-gray-500">添加、编辑、排序</div>
            </div>
          </button>
          <button 
            onClick={() => onChangeTab("backgrounds")}
            className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-2xl">🖼️</span>
            <div>
              <div className="font-medium text-white">更换背景</div>
              <div className="text-sm text-gray-500">上传背景图片</div>
            </div>
          </button>
          <button 
            onClick={() => onChangeTab("security")}
            className="flex items-center gap-3 p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:bg-gray-800 transition-colors text-left"
          >
            <span className="text-2xl">🔐</span>
            <div>
              <div className="font-medium text-white">修改密码</div>
              <div className="text-sm text-gray-500">更新访客/管理员密码</div>
            </div>
          </button>
        </div>
      </div>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <p className="text-indigo-300 text-sm">
          💡 提示：当前为阶段 2-A 版本，已实现认证与站点信息管理功能。
        </p>
      </div>
    </div>
  );
}

// 站点信息配置标签页
function SiteConfigTab() {
  const [config, setConfig] = useState<SiteConfig>({
    site_title: "",
    site_subtitle: "",
    site_description: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 加载配置
  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/site");
        const data = await res.json();
        if (data.success) {
          setConfig({
            site_title: data.data.site_title || "",
            site_subtitle: data.data.site_subtitle || "",
            site_description: data.data.site_description || "",
          });
        }
      } catch (error) {
        console.error("Load config error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "保存成功" });
      } else {
        setMessage({ type: "error", text: data.error || "保存失败" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "网络错误，请重试" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-400 mt-4">加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">站点信息</h2>
      
      <div className="space-y-4 max-w-xl">
        {/* 标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            站点标题
          </label>
          <input
            type="text"
            value={config.site_title}
            onChange={(e) => setConfig({ ...config, site_title: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            placeholder="输入站点标题"
          />
        </div>

        {/* 副标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            副标题
          </label>
          <input
            type="text"
            value={config.site_subtitle}
            onChange={(e) => setConfig({ ...config, site_subtitle: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            placeholder="输入副标题"
          />
        </div>

        {/* 简介 */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            简介
          </label>
          <textarea
            value={config.site_description}
            onChange={(e) => setConfig({ ...config, site_description: e.target.value })}
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
            placeholder="输入站点简介"
          />
        </div>

        {/* 提示信息 */}
        <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
          <p className="text-gray-400 text-sm">
            💡 修改保存后，刷新首页即可看到效果。
          </p>
        </div>

        {/* 状态消息 */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === "success" 
              ? "bg-green-500/10 border border-green-500/20 text-green-400" 
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* 保存按钮 */}
        <div className="pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all duration-200"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                保存中...
              </span>
            ) : (
              "保存"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// 占位标签页
function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center text-3xl">
        🚧
      </div>
      <h3 className="text-lg font-medium text-white mb-2">{title}</h3>
      <p className="text-gray-500 text-sm">该功能将在后续版本中实现</p>
    </div>
  );
}
