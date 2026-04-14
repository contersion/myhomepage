"use client";

import { useState, useEffect, useCallback } from "react";

// 资源类型（阶段 4-E 增强：包含缩略图 URL）
interface Resource {
  id: string;
  url: string;
  thumbUrl?: string; // 阶段 4-E 新增：缩略图 URL
  originalName: string;
  type: "background" | "icon";
}

// 类型定义
interface BackgroundItem {
  id: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
  device: "pc" | "mobile";
}

interface BackgroundConfig {
  interval: number;
  randomStart: boolean;
  mobileInheritPc: boolean;
  blur: number;
  overlay: number;
}

type ViewMode = "list" | "add-pc" | "edit-pc" | "add-mobile" | "edit-mobile";

export default function BackgroundsTab() {
  // 状态
  const [view, setView] = useState<ViewMode>("list");
  const [pcBackgrounds, setPcBackgrounds] = useState<BackgroundItem[]>([]);
  const [mobileBackgrounds, setMobileBackgrounds] = useState<BackgroundItem[]>([]);
  const [config, setConfig] = useState<BackgroundConfig>({
    interval: 5,
    randomStart: true,
    mobileInheritPc: true,
    blur: 10,
    overlay: 0.3,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // 表单状态
  const [selectedId, setSelectedId] = useState<string>("");
  const [form, setForm] = useState({
    url: "",
    sortOrder: 0,
    isActive: true,
  });
  
  // 资源选择
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResourceId, setSelectedResourceId] = useState<string>("");
  const [useResource, setUseResource] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [pcRes, mobileRes, configRes, resourcesRes] = await Promise.all([
        fetch("/api/admin/backgrounds?device=pc"),
        fetch("/api/admin/backgrounds?device=mobile"),
        fetch("/api/admin/background-config"),
        fetch("/api/admin/assets?type=background"),
      ]);
      
      const pcData = await pcRes.json();
      const mobileData = await mobileRes.json();
      const configData = await configRes.json();
      const resourcesData = await resourcesRes.json();
      
      if (pcData.success) setPcBackgrounds(pcData.data);
      if (mobileData.success) setMobileBackgrounds(mobileData.data);
      if (configData.success) setConfig(configData.data);
      if (resourcesData.success) setResources(resourcesData.data);
    } catch {
      setMessage({ type: "error", text: "加载数据失败" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // 重置表单
  const resetForm = () => {
    setForm({ url: "", sortOrder: 0, isActive: true });
    setSelectedId("");
    setSelectedResourceId("");
    setUseResource(false);
  };

  // 保存配置
  const handleSaveConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/background-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "配置保存成功" });
      } else {
        setMessage({ type: "error", text: data.error || "保存失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  // 创建背景
  const handleCreate = async (device: "pc" | "mobile") => {
    // 确定最终 URL
    let finalUrl = form.url.trim();
    if (useResource && selectedResourceId) {
      const resource = resources.find(r => r.id === selectedResourceId);
      if (resource) {
        finalUrl = resource.url;
      }
    }
    
    if (!finalUrl) {
      setMessage({ type: "error", text: "请选择资源或输入 URL" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/backgrounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, url: finalUrl, device }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "创建成功" });
        resetForm();
        setView("list");
        loadData();
      } else {
        setMessage({ type: "error", text: data.error || "创建失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  // 更新背景
  const handleUpdate = async () => {
    // 确定最终 URL
    let finalUrl = form.url.trim();
    if (useResource && selectedResourceId) {
      const resource = resources.find(r => r.id === selectedResourceId);
      if (resource) {
        finalUrl = resource.url;
      }
    }
    
    if (!finalUrl) {
      setMessage({ type: "error", text: "请选择资源或输入 URL" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/backgrounds/${selectedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, url: finalUrl }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "更新成功" });
        setView("list");
        loadData();
      } else {
        setMessage({ type: "error", text: data.error || "更新失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  // 删除背景
  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这张背景图吗？")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/backgrounds/${id}`, {
        method: "DELETE",
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "删除成功" });
        loadData();
      } else {
        setMessage({ type: "error", text: data.error || "删除失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  // 编辑背景
  const startEdit = (bg: BackgroundItem, mode: "edit-pc" | "edit-mobile") => {
    setSelectedId(bg.id);
    // 检查是否是已上传资源
    const matchedResource = resources.find(r => r.url === bg.url);
    if (matchedResource) {
      setUseResource(true);
      setSelectedResourceId(matchedResource.id);
    } else {
      setUseResource(false);
      setSelectedResourceId("");
    }
    setForm({
      url: bg.url,
      sortOrder: bg.sortOrder,
      isActive: bg.isActive,
    });
    setMessage(null);
    setView(mode);
  };

  // ========== 列表视图 ==========
  if (view === "list") {
    return (
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">背景管理</h2>
        
        {/* 配置区域 */}
        <div className="mb-8 p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-4">
            轮播配置
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">轮播间隔（秒）</label>
              <input
                type="number"
                min={1}
                max={60}
                value={config.interval}
                onChange={(e) => setConfig({ ...config, interval: parseInt(e.target.value) || 5 })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">模糊强度（px）</label>
              <input
                type="number"
                min={0}
                max={50}
                value={config.blur}
                onChange={(e) => setConfig({ ...config, blur: Number.isNaN(parseInt(e.target.value)) ? 10 : parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">遮罩透明度（0-1）</label>
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={config.overlay}
                onChange={(e) => setConfig({ ...config, overlay: Number.isNaN(parseFloat(e.target.value)) ? 0.3 : parseFloat(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.randomStart}
                  onChange={(e) => setConfig({ ...config, randomStart: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                />
                <span className="text-sm text-gray-300">随机起始</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.mobileInheritPc}
                  onChange={(e) => setConfig({ ...config, mobileInheritPc: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700"
                />
                <span className="text-sm text-gray-300">手机继承PC</span>
              </label>
            </div>
          </div>
          <button
            onClick={handleSaveConfig}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? "保存中..." : "保存配置"}
          </button>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}>
            {message.text}
          </div>
        )}

        {/* PC 背景 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              PC 背景 ({pcBackgrounds.length})
            </h3>
            <button
              onClick={() => { resetForm(); setMessage(null); setView("add-pc"); }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors"
            >
              + 添加
            </button>
          </div>
          
          {pcBackgrounds.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
              暂无 PC 背景
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {pcBackgrounds.map((bg) => (
                <div key={bg.id} className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                  <img
                    src={bg.url}
                    alt=""
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='60' fill='%23333'%3E%3Crect width='100' height='60'/%3E%3Ctext x='50' y='30' text-anchor='middle' fill='%23666' font-size='10'%3E加载失败%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => startEdit(bg, "edit-pc")}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(bg.id)}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                    >
                      删除
                    </button>
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">排序: {bg.sortOrder}</span>
                      {!bg.isActive && <span className="text-xs text-gray-500">隐藏</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 手机背景 */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
              手机背景 ({mobileBackgrounds.length})
              {config.mobileInheritPc && mobileBackgrounds.length === 0 && (
                <span className="ml-2 text-xs text-blue-400">（继承 PC）</span>
              )}
            </h3>
            <button
              onClick={() => { resetForm(); setMessage(null); setView("add-mobile"); }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-sm transition-colors"
            >
              + 添加
            </button>
          </div>
          
          {mobileBackgrounds.length === 0 ? (
            <div className="text-center py-6 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
              {config.mobileInheritPc ? "已开启继承 PC 背景" : "暂无手机背景"}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {mobileBackgrounds.map((bg) => (
                <div key={bg.id} className="group relative bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
                  <img
                    src={bg.url}
                    alt=""
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23333'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' fill='%23666' font-size='10'%3E失败%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={() => startEdit(bg, "edit-mobile")}
                      className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(bg.id)}
                      className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                    >
                      删除
                    </button>
                  </div>
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">排序: {bg.sortOrder}</span>
                      {!bg.isActive && <span className="text-xs text-gray-500">隐藏</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ========== 表单视图 ==========
  const isEdit = view.startsWith("edit");
  const deviceType = view.includes("pc") ? "PC" : "手机";

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => setView("list")}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← 返回
        </button>
        <h2 className="text-xl font-semibold text-white">
          {isEdit ? `编辑${deviceType}背景` : `添加${deviceType}背景`}
        </h2>
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg ${
          message.type === "success"
            ? "bg-green-500/10 border border-green-500/20 text-green-400"
            : "bg-red-500/10 border border-red-500/20 text-red-400"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-4 max-w-lg">
        {/* 资源选择开关 */}
        <div className="flex items-center gap-3 pb-4 border-b border-gray-700">
          <input
            type="checkbox"
            id="use-resource"
            checked={useResource}
            onChange={(e) => {
              setUseResource(e.target.checked);
              if (e.target.checked) {
                setForm({ ...form, url: "" });
              } else {
                setSelectedResourceId("");
              }
            }}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
          />
          <label htmlFor="use-resource" className="text-sm text-gray-300">
            从资源库选择（推荐）
          </label>
        </div>

        {/* 资源选择器 */}
        {useResource ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              选择背景资源 <span className="text-red-400">*</span>
            </label>
            {resources.length === 0 ? (
              <div className="p-4 bg-gray-800/50 rounded-lg text-gray-500 text-sm">
                暂无背景资源，请先前往「资源管理」上传
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-800 rounded-lg border border-gray-700">
                {resources.map((resource) => (
                  <button
                    key={resource.id}
                    onClick={() => {
                      setSelectedResourceId(resource.id);
                      setForm({ ...form, url: resource.url });
                    }}
                    className={`relative aspect-video rounded overflow-hidden border-2 transition-all ${
                      selectedResourceId === resource.id
                        ? "border-indigo-500 ring-2 ring-indigo-500/30"
                        : "border-gray-600 hover:border-gray-500"
                    }`}
                  >
                    <img
                      src={resource.thumbUrl || resource.url}
                      alt={resource.originalName}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    {selectedResourceId === resource.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              图片 URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
              placeholder="https://example.com/bg.jpg"
            />
            <p className="text-gray-500 text-xs mt-1">
              支持外链图片，建议使用 https 链接
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            排序值
          </label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all"
          />
          <p className="text-gray-500 text-xs mt-1">数值越小排序越靠前</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="bg-isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
          />
          <label htmlFor="bg-isActive" className="text-sm text-gray-300">
            显示此背景
          </label>
        </div>

        {form.url && (
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400 mb-2">预览:</p>
            <img
              src={form.url}
              alt=""
              className="w-full h-32 object-cover rounded border border-gray-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <button
            onClick={() => isEdit ? handleUpdate() : handleCreate(view.includes("pc") ? "pc" : "mobile")}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 text-white rounded-lg font-medium transition-all"
          >
            {loading ? "保存中..." : "保存"}
          </button>
          <button
            onClick={() => setView("list")}
            className="px-6 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
