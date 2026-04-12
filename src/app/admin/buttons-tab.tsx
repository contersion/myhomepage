"use client";

import { useState, useEffect, useCallback } from "react";

// 资源类型
interface Resource {
  id: string;
  url: string;
  thumbUrl?: string; // 阶段 4-E 新增：缩略图 URL
  originalName: string;
  type: "background" | "icon";
}

// 类型定义
interface ButtonGroup {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  buttonCount: number;
}

interface Button {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  openInNew: boolean;
  sortOrder: number;
  isActive: boolean;
  groupId: string;
  groupName: string;
}

type ViewMode = "list" | "add-group" | "edit-group" | "add-button" | "edit-button";

export default function ButtonsTab() {
  // 状态
  const [view, setView] = useState<ViewMode>("list");
  const [groups, setGroups] = useState<ButtonGroup[]>([]);
  const [buttons, setButtons] = useState<Button[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // 表单状态
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedButtonId, setSelectedButtonId] = useState<string>("");
  
  // 分组表单
  const [groupForm, setGroupForm] = useState({
    name: "",
    sortOrder: 0,
    isActive: true,
  });
  
  // 按钮表单
  const [buttonForm, setButtonForm] = useState({
    title: "",
    url: "",
    icon: "",
    openInNew: true,
    sortOrder: 0,
    isActive: true,
    groupId: "",
  });
  
  // 图标资源选择
  const [iconResources, setIconResources] = useState<Resource[]>([]);
  const [selectedIconResourceId, setSelectedIconResourceId] = useState<string>("");
  const [useIconResource, setUseIconResource] = useState(false);

  // 加载数据
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [groupsRes, buttonsRes, resourcesRes] = await Promise.all([
        fetch("/api/admin/button-groups"),
        fetch("/api/admin/buttons"),
        fetch("/api/admin/assets?type=icon"),
      ]);
      
      const groupsData = await groupsRes.json();
      const buttonsData = await buttonsRes.json();
      const resourcesData = await resourcesRes.json();
      
      if (groupsData.success) setGroups(groupsData.data);
      if (buttonsData.success) setButtons(buttonsData.data);
      if (resourcesData.success) setIconResources(resourcesData.data);
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
  const resetGroupForm = () => {
    setGroupForm({ name: "", sortOrder: 0, isActive: true });
  };
  
  const resetButtonForm = () => {
    setButtonForm({
      title: "",
      url: "",
      icon: "",
      openInNew: true,
      sortOrder: 0,
      isActive: true,
      groupId: groups[0]?.id || "",
    });
    setSelectedIconResourceId("");
    setUseIconResource(false);
  };

  // 创建分组
  const handleCreateGroup = async () => {
    if (!groupForm.name.trim()) {
      setMessage({ type: "error", text: "分组名称不能为空" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/button-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "创建成功" });
        resetGroupForm();
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

  // 更新分组
  const handleUpdateGroup = async () => {
    if (!groupForm.name.trim()) {
      setMessage({ type: "error", text: "分组名称不能为空" });
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/button-groups/${selectedGroupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm),
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

  // 删除分组
  const handleDeleteGroup = async (id: string, name: string) => {
    if (!confirm(`确定要删除分组 "${name}" 吗？\n该分组下的所有按钮将被一并删除。`)) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/button-groups/${id}`, {
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

  // 创建按钮
  const handleCreateButton = async () => {
    if (!buttonForm.title.trim()) {
      setMessage({ type: "error", text: "按钮标题不能为空" });
      return;
    }
    if (!buttonForm.url.trim()) {
      setMessage({ type: "error", text: "URL 不能为空" });
      return;
    }
    if (!buttonForm.groupId) {
      setMessage({ type: "error", text: "请选择所属分组" });
      return;
    }
    
    // 确定图标 URL
    let finalIcon = buttonForm.icon.trim();
    if (useIconResource && selectedIconResourceId) {
      const resource = iconResources.find(r => r.id === selectedIconResourceId);
      if (resource) {
        finalIcon = resource.url;
      }
    }
    
    setLoading(true);
    try {
      const res = await fetch("/api/admin/buttons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buttonForm, icon: finalIcon }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: "success", text: "创建成功" });
        resetButtonForm();
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

  // 更新按钮
  const handleUpdateButton = async () => {
    if (!buttonForm.title.trim()) {
      setMessage({ type: "error", text: "按钮标题不能为空" });
      return;
    }
    if (!buttonForm.url.trim()) {
      setMessage({ type: "error", text: "URL 不能为空" });
      return;
    }
    
    // 确定图标 URL
    let finalIcon = buttonForm.icon.trim();
    if (useIconResource && selectedIconResourceId) {
      const resource = iconResources.find(r => r.id === selectedIconResourceId);
      if (resource) {
        finalIcon = resource.url;
      }
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/buttons/${selectedButtonId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...buttonForm, icon: finalIcon }),
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

  // 删除按钮
  const handleDeleteButton = async (id: string, title: string) => {
    if (!confirm(`确定要删除按钮 "${title}" 吗？`)) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/buttons/${id}`, {
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

  // 编辑分组
  const startEditGroup = (group: ButtonGroup) => {
    setSelectedGroupId(group.id);
    setGroupForm({
      name: group.name,
      sortOrder: group.sortOrder,
      isActive: group.isActive,
    });
    setMessage(null);
    setView("edit-group");
  };

  // 编辑按钮
  const startEditButton = (button: Button) => {
    setSelectedButtonId(button.id);
    // 检查图标是否是已上传资源
    const matchedResource = button.icon ? iconResources.find(r => r.url === button.icon) : null;
    if (matchedResource) {
      setUseIconResource(true);
      setSelectedIconResourceId(matchedResource.id);
    } else {
      setUseIconResource(false);
      setSelectedIconResourceId("");
    }
    setButtonForm({
      title: button.title,
      url: button.url,
      icon: button.icon || "",
      openInNew: button.openInNew,
      sortOrder: button.sortOrder,
      isActive: button.isActive,
      groupId: button.groupId,
    });
    setMessage(null);
    setView("edit-button");
  };

  // ========== 列表视图 ==========
  if (view === "list") {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-semibold text-white">按钮管理</h2>
          <div className="flex gap-2">
            <button
              onClick={() => { resetGroupForm(); setMessage(null); setView("add-group"); }}
              className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建分组
            </button>
            <button
              onClick={() => { resetButtonForm(); setMessage(null); setView("add-button"); }}
              disabled={groups.length === 0}
              className="flex-1 sm:flex-none px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              + 新建按钮
            </button>
          </div>
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

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <p className="text-gray-400 mt-4">加载中...</p>
          </div>
        ) : (
          <>
            {/* 分组列表 */}
            <div className="mb-8">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                分组列表
              </h3>
              {groups.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  暂无分组，请先创建分组
                </div>
              ) : (
                <div className="space-y-2">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg gap-3"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-8 h-8 rounded bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-medium flex-shrink-0">
                          {group.sortOrder}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium flex items-center gap-2 flex-wrap">
                            <span className="break-all">{group.name}</span>
                            {!group.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded flex-shrink-0">隐藏</span>
                            )}
                          </div>
                          <div className="text-gray-500 text-sm">
                            {group.buttonCount} 个按钮
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <button
                          onClick={() => startEditGroup(group)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteGroup(group.id, group.name)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 按钮列表 */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                按钮列表
              </h3>
              {buttons.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
                  暂无按钮
                </div>
              ) : (
                <div className="space-y-2">
                  {buttons.map((button) => (
                    <div
                      key={button.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-800/50 border border-gray-700 rounded-lg gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {button.icon && (
                          <img
                            src={button.icon}
                            alt=""
                            className="w-6 h-6 object-contain flex-shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-white font-medium flex items-center gap-2 flex-wrap">
                            <span className="break-all">{button.title}</span>
                            {!button.isActive && (
                              <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded flex-shrink-0">隐藏</span>
                            )}
                            {button.openInNew && (
                              <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded flex-shrink-0">新窗口</span>
                            )}
                          </div>
                          <div className="text-gray-500 text-sm truncate max-w-full">
                            {button.url}
                          </div>
                          <div className="text-gray-600 text-xs">
                            分组: {button.groupName}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 sm:flex-shrink-0">
                        <button
                          onClick={() => startEditButton(button)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteButton(button.id, button.title)}
                          className="flex-1 sm:flex-none px-3 py-1.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // ========== 分组表单视图 ==========
  if (view === "add-group" || view === "edit-group") {
    const isEdit = view === "edit-group";
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
            {isEdit ? "编辑分组" : "新建分组"}
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              分组名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={groupForm.name}
              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
              placeholder="输入分组名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              排序值
            </label>
            <input
              type="number"
              value={groupForm.sortOrder}
              onChange={(e) => setGroupForm({ ...groupForm, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <p className="text-gray-500 text-xs mt-1">数值越小排序越靠前</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="group-isActive"
              checked={groupForm.isActive}
              onChange={(e) => setGroupForm({ ...groupForm, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="group-isActive" className="text-sm text-gray-300">
              显示该分组
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={isEdit ? handleUpdateGroup : handleCreateGroup}
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

  // ========== 按钮表单视图 ==========
  if (view === "add-button" || view === "edit-button") {
    const isEdit = view === "edit-button";
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
            {isEdit ? "编辑按钮" : "新建按钮"}
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
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              所属分组 <span className="text-red-400">*</span>
            </label>
            <select
              value={buttonForm.groupId}
              onChange={(e) => setButtonForm({ ...buttonForm, groupId: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-indigo-500 transition-all"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              按钮标题 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={buttonForm.title}
              onChange={(e) => setButtonForm({ ...buttonForm, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
              placeholder="输入按钮标题"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={buttonForm.url}
              onChange={(e) => setButtonForm({ ...buttonForm, url: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
              placeholder="https://example.com 或 /path"
            />
          </div>

          {/* 图标选择 */}
          <div className="pb-4 border-b border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="use-icon-resource"
                checked={useIconResource}
                onChange={(e) => {
                  setUseIconResource(e.target.checked);
                  if (e.target.checked) {
                    setButtonForm({ ...buttonForm, icon: "" });
                  } else {
                    setSelectedIconResourceId("");
                  }
                }}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600"
              />
              <label htmlFor="use-icon-resource" className="text-sm text-gray-300">
                从资源库选择图标
              </label>
            </div>

            {useIconResource ? (
              <div>
                {iconResources.length === 0 ? (
                  <div className="p-4 bg-gray-800/50 rounded-lg text-gray-500 text-sm">
                    暂无图标资源，请先前往「资源管理」上传
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-800 rounded-lg border border-gray-700">
                    {iconResources.map((resource) => (
                      <button
                        key={resource.id}
                        onClick={() => {
                          setSelectedIconResourceId(resource.id);
                          setButtonForm({ ...buttonForm, icon: resource.url });
                        }}
                        className={`relative aspect-square rounded overflow-hidden border-2 transition-all ${
                          selectedIconResourceId === resource.id
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
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  图标 URL
                </label>
                <input
                  type="text"
                  value={buttonForm.icon}
                  onChange={(e) => setButtonForm({ ...buttonForm, icon: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
                  placeholder="https://example.com/icon.svg（可选）"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              排序值
            </label>
            <input
              type="number"
              value={buttonForm.sortOrder}
              onChange={(e) => setButtonForm({ ...buttonForm, sortOrder: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-all"
            />
            <p className="text-gray-500 text-xs mt-1">数值越小排序越靠前</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="button-openInNew"
              checked={buttonForm.openInNew}
              onChange={(e) => setButtonForm({ ...buttonForm, openInNew: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="button-openInNew" className="text-sm text-gray-300">
              在新窗口打开
            </label>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="button-isActive"
              checked={buttonForm.isActive}
              onChange={(e) => setButtonForm({ ...buttonForm, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="button-isActive" className="text-sm text-gray-300">
              显示该按钮
            </label>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              onClick={isEdit ? handleUpdateButton : handleCreateButton}
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

  return null;
}
