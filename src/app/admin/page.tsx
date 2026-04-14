"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ButtonsTab from "./buttons-tab";
import BackgroundsTab from "./backgrounds-tab";
import AssetsTab from "./assets-tab";
import LogsTab from "./logs-tab";
import SecurityTab from "./security-tab";
import { logPageAccess } from "@/lib/logs/client-logger";

// 资源类型
interface Resource {
  id: string;
  url: string;
  thumbUrl?: string;
  originalName: string;
  type: "background" | "icon";
}

// 站点信息配置类型
interface SiteConfig {
  site_title: string;
  site_subtitle: string;
  site_description: string;
  // Access 背景
  access_background_enabled: boolean;
  access_background_asset_id: string;
  access_background_mobile_asset_id: string;
  access_background_overlay: number;
  access_background_blur: number;
  // 页面标题与图标
  access_page_title: string;
  home_page_title: string;
  admin_page_title: string;
  site_favicon_asset_id: string;
  // 底部备案
  footer_meta_enabled: boolean;
  footer_meta_display_scope: "none" | "access" | "home" | "both";
  icp_enabled: boolean;
  icp_number: string;
  icp_link: string;
  psb_enabled: boolean;
  psb_number: string;
  psb_link: string;
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

  useEffect(() => {
    let cancelled = false;
    document.title = "管理后台";

    fetch("/api/admin/site")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.success) {
          document.title = data.data.admin_page_title || data.data.site_title || "管理后台";
        }
      })
      .catch(() => {
        if (!cancelled) {
          document.title = "管理后台";
        }
      });

    return () => {
      cancelled = true;
    };
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

// 资源选择器（内联）
function ResourcePicker({
  label,
  selectedId,
  onChange,
  assetType,
}: {
  label: string;
  selectedId: string;
  onChange: (id: string) => void;
  assetType?: "background" | "icon";
}) {
  const [resources, setResources] = useState<Resource[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const url = assetType ? `/api/admin/assets?type=${assetType}` : "/api/admin/assets";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setResources(data.data);
      });
  }, [assetType]);

  const selectedResource = resources.find((r) => r.id === selectedId);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      {selectedId && selectedResource ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-700 mb-3">
          <img
            src={selectedResource.thumbUrl || selectedResource.url}
            alt={selectedResource.originalName}
            className="w-full h-24 object-cover"
          />
          <button
            onClick={() => onChange("")}
            className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-900/80 hover:bg-gray-900 text-white rounded border border-gray-600"
          >
            清除选择
          </button>
        </div>
      ) : null}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm text-white transition-colors"
        >
          {selectedId ? "更换图片" : "从资源库选择"}
        </button>
      ) : (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">点击选择图片</span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs text-gray-400 hover:text-white"
            >
              收起
            </button>
          </div>
          {resources.length === 0 ? (
            <div className="text-sm text-gray-500 py-4 text-center">
              暂无背景资源，请先前往「资源管理」上传
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
              {resources.map((resource) => (
                <button
                  key={resource.id}
                  onClick={() => {
                    onChange(resource.id);
                    setOpen(false);
                  }}
                  className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                    selectedId === resource.id
                      ? "border-indigo-500 ring-2 ring-indigo-500/30"
                      : "border-gray-600 hover:border-gray-500"
                  }`}
                >
                  <img
                    src={resource.thumbUrl || resource.url}
                    alt={resource.originalName}
                    className="w-full h-full object-cover"
                  />
                  {selectedId === resource.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 站点信息配置标签页
function SiteConfigTab() {
  const [config, setConfig] = useState<SiteConfig>({
    site_title: "",
    site_subtitle: "",
    site_description: "",
    access_background_enabled: false,
    access_background_asset_id: "",
    access_background_mobile_asset_id: "",
    access_background_overlay: 0.3,
    access_background_blur: 10,
    access_page_title: "",
    home_page_title: "",
    admin_page_title: "",
    site_favicon_asset_id: "",
    footer_meta_enabled: false,
    footer_meta_display_scope: "none",
    icp_enabled: false,
    icp_number: "",
    icp_link: "",
    psb_enabled: false,
    psb_number: "",
    psb_link: "",
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
            access_background_enabled: data.data.access_background_enabled === "true",
            access_background_asset_id: data.data.access_background_asset_id || "",
            access_background_mobile_asset_id: data.data.access_background_mobile_asset_id || "",
            access_background_overlay: parseFloat(data.data.access_background_overlay || "0.3") || 0.3,
            access_background_blur: parseInt(data.data.access_background_blur || "10", 10) || 10,
            access_page_title: data.data.access_page_title || "",
            home_page_title: data.data.home_page_title || "",
            admin_page_title: data.data.admin_page_title || "",
            site_favicon_asset_id: data.data.site_favicon_asset_id || "",
            footer_meta_enabled: data.data.footer_meta_enabled === "true",
            footer_meta_display_scope: ["none", "access", "home", "both"].includes(data.data.footer_meta_display_scope)
              ? data.data.footer_meta_display_scope
              : "none",
            icp_enabled: data.data.icp_enabled === "true",
            icp_number: data.data.icp_number || "",
            icp_link: data.data.icp_link || "",
            psb_enabled: data.data.psb_enabled === "true",
            psb_number: data.data.psb_number || "",
            psb_link: data.data.psb_link || "",
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

    const payload = {
      site_title: config.site_title,
      site_subtitle: config.site_subtitle,
      site_description: config.site_description,
      access_background_enabled: config.access_background_enabled ? "true" : "false",
      access_background_asset_id: config.access_background_asset_id,
      access_background_mobile_asset_id: config.access_background_mobile_asset_id,
      access_background_overlay: String(config.access_background_overlay),
      access_background_blur: String(config.access_background_blur),
      access_page_title: config.access_page_title,
      home_page_title: config.home_page_title,
      admin_page_title: config.admin_page_title,
      site_favicon_asset_id: config.site_favicon_asset_id,
      footer_meta_enabled: config.footer_meta_enabled ? "true" : "false",
      footer_meta_display_scope: config.footer_meta_display_scope,
      icp_enabled: config.icp_enabled ? "true" : "false",
      icp_number: config.icp_number,
      icp_link: config.icp_link,
      psb_enabled: config.psb_enabled ? "true" : "false",
      psb_number: config.psb_number,
      psb_link: config.psb_link,
    };

    try {
      const res = await fetch("/api/admin/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">站点信息</h2>

        <div className="space-y-6 max-w-2xl">
          {/* 基础信息 */}
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              基础信息
            </h3>

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
          </div>

          {/* 页面标题与图标 */}
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              页面标题与图标
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                访问页标题 (/access)
              </label>
              <input
                type="text"
                value={config.access_page_title}
                onChange={(e) => setConfig({ ...config, access_page_title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="留空则使用默认站点标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                首页标题 (/)
              </label>
              <input
                type="text"
                value={config.home_page_title}
                onChange={(e) => setConfig({ ...config, home_page_title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="留空则使用默认站点标题"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                后台管理标题 (/admin)
              </label>
              <input
                type="text"
                value={config.admin_page_title}
                onChange={(e) => setConfig({ ...config, admin_page_title: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="留空则使用默认站点标题"
              />
            </div>

            <ResourcePicker
              label="站点图标 (favicon)"
              selectedId={config.site_favicon_asset_id}
              onChange={(id) => setConfig({ ...config, site_favicon_asset_id: id })}
            />
            <p className="text-xs text-gray-500">建议尺寸 32×32 或 64×64，支持 PNG、JPG、WebP、GIF</p>
          </div>

          {/* Access 页面背景配置 */}
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              访问页背景 (/access)
            </h3>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.access_background_enabled}
                onChange={(e) => setConfig({ ...config, access_background_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
              />
              <span className="text-sm text-gray-300">启用访问页背景</span>
            </label>

            {config.access_background_enabled && (
              <div className="space-y-4 pt-2 border-t border-gray-700/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ResourcePicker
                    label="PC 背景图"
                    selectedId={config.access_background_asset_id}
                    onChange={(id) => setConfig({ ...config, access_background_asset_id: id })}
                  />
                  <ResourcePicker
                    label="手机背景图（可选）"
                    selectedId={config.access_background_mobile_asset_id}
                    onChange={(id) => setConfig({ ...config, access_background_mobile_asset_id: id })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">遮罩透明度（0-1）</label>
                    <input
                      type="number"
                      min={0}
                      max={1}
                      step={0.1}
                      value={config.access_background_overlay}
                      onChange={(e) => setConfig({ ...config, access_background_overlay: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">模糊强度（0-50 px）</label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={1}
                      value={config.access_background_blur}
                      onChange={(e) => setConfig({ ...config, access_background_blur: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 底部备案信息配置 */}
          <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-xl space-y-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              底部备案信息
            </h3>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.footer_meta_enabled}
                onChange={(e) => setConfig({ ...config, footer_meta_enabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
              />
              <span className="text-sm text-gray-300">启用备案信息区</span>
            </label>

            {config.footer_meta_enabled && (
              <div className="space-y-4 pt-2 border-t border-gray-700/50">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">显示范围</label>
                  <select
                    value={config.footer_meta_display_scope}
                    onChange={(e) => setConfig({ ...config, footer_meta_display_scope: e.target.value as SiteConfig["footer_meta_display_scope"] })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
                  >
                    <option value="none">完全隐藏</option>
                    <option value="access">仅在访问页显示</option>
                    <option value="home">仅在首页显示</option>
                    <option value="both">两边都显示</option>
                  </select>
                </div>

                {config.footer_meta_display_scope !== "none" && (
                  <>
                    {/* ICP */}
                    <div className="p-3 bg-gray-900/50 rounded-lg space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.icp_enabled}
                          onChange={(e) => setConfig({ ...config, icp_enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
                        />
                        <span className="text-sm text-gray-300">显示 ICP 备案</span>
                      </label>

                      {config.icp_enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={config.icp_number}
                            onChange={(e) => setConfig({ ...config, icp_number: e.target.value })}
                            placeholder="备案号，如：京ICP备12345678号"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          />
                          <input
                            type="text"
                            value={config.icp_link}
                            onChange={(e) => setConfig({ ...config, icp_link: e.target.value })}
                            placeholder="链接（可选）"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          />
                        </div>
                      )}
                    </div>

                    {/* 公安 */}
                    <div className="p-3 bg-gray-900/50 rounded-lg space-y-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={config.psb_enabled}
                          onChange={(e) => setConfig({ ...config, psb_enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
                        />
                        <span className="text-sm text-gray-300">显示公安备案</span>
                      </label>

                      {config.psb_enabled && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            value={config.psb_number}
                            onChange={(e) => setConfig({ ...config, psb_number: e.target.value })}
                            placeholder="备案号，如：京公网安备12345678号"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          />
                          <input
                            type="text"
                            value={config.psb_link}
                            onChange={(e) => setConfig({ ...config, psb_link: e.target.value })}
                            placeholder="链接（可选）"
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 提示信息 */}
          <div className="p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
            <p className="text-gray-400 text-sm">
              💡 修改保存后，刷新前台页面即可看到效果。
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
