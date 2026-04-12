"use client";

import { useState, useEffect, useCallback } from "react";

// 类型定义（阶段 4-E 增强：包含缩略图 URL）
interface Resource {
  id: string;
  type: "background" | "icon";
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;   // 图片宽度
  height?: number;  // 图片高度
  url: string;
  thumbUrl?: string; // 阶段 4-E 新增：缩略图 URL
  createdAt: string;
}

export default function AssetsTab() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [filter, setFilter] = useState<"all" | "background" | "icon">("all");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // 上传表单
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadType, setUploadType] = useState<"background" | "icon">("background");

  // 格式化文件大小
  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 加载资源列表
  const loadResources = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/admin/assets" : `/api/admin/assets?type=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.success) {
        setResources(data.data);
      } else {
        setMessage({ type: "error", text: data.error || "加载失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setMessage(null);
    }
  };

  // 上传资源
  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: "error", text: "请选择文件" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", uploadType);

      const res = await fetch("/api/admin/assets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "上传成功" });
        setSelectedFile(null);
        // 重置文件输入
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        loadResources();
      } else {
        setMessage({ type: "error", text: data.error || "上传失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setUploading(false);
    }
  };

  // 删除资源
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`确定要删除资源 "${name}" 吗？\n注意：删除后，已引用该资源的背景和按钮将无法正常显示。`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/assets/${id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        setMessage({ type: "success", text: "删除成功" });
        loadResources();
      } else {
        setMessage({ type: "error", text: data.error || "删除失败" });
      }
    } catch {
      setMessage({ type: "error", text: "网络错误" });
    } finally {
      setLoading(false);
    }
  };

  // 复制 URL
  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setMessage({ type: "success", text: "URL 已复制到剪贴板" });
      setTimeout(() => setMessage(null), 2000);
    });
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-white mb-6">资源管理</h2>

      {/* 上传区域 - 阶段 4-C 增强：更清晰的提示 */}
      <div className="mb-6 p-3 sm:p-4 bg-gray-800/50 border border-gray-700 rounded-xl">
        <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-4">
          上传资源
        </h3>
        
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            <input
              type="file"
              id="file-input"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
            />
            {/* 阶段 4-C 增强：更详细的格式说明 */}
            <div className="mt-2 text-xs text-gray-500 space-y-1">
              <p>
                <span className="text-gray-400">支持格式：</span>PNG, JPG, WebP, GIF
              </p>
              <p>
                <span className="text-gray-400">大小限制：</span>最大 5MB（超大图片会自动压缩）
              </p>
              <p>
                <span className="text-gray-400">尺寸限制：</span>
                背景图最大 1920×1080，图标最大 256×256
              </p>
              <p className="text-yellow-500/80">
                <span className="text-gray-400">注意：</span>SVG 格式暂不支持（安全风险）
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={uploadType}
              onChange={(e) => setUploadType(e.target.value as "background" | "icon")}
              className="w-full sm:w-auto px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="background">背景图</option>
              <option value="icon">图标</option>
            </select>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900/50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
            >
              {uploading ? "上传中..." : "上传"}
            </button>
          </div>
        </div>

        {selectedFile && (
          <div className="mt-3 p-3 bg-gray-900/50 rounded-lg">
            <p className="text-sm text-gray-300 break-all">
              已选择: {selectedFile.name} ({formatSize(selectedFile.size)})
            </p>
          </div>
        )}
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-sm text-gray-400">筛选:</span>
        <div className="flex gap-2">
          {(["all", "background", "icon"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === type
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              {type === "all" ? "全部" : type === "background" ? "背景图" : "图标"}
            </button>
          ))}
        </div>
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

      {/* 资源列表 */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">加载中...</p>
        </div>
      ) : resources.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-800/30 rounded-lg border border-gray-700/50">
          暂无资源
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 group"
            >
              {/* 缩略图 - 阶段 4-E：优先使用缩略图，添加懒加载 */}
              <div className="aspect-square relative bg-gray-900">
                <img
                  src={resource.thumbUrl || resource.url}
                  alt={resource.originalName}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' fill='%23333'%3E%3Crect width='100' height='100'/%3E%3Ctext x='50' y='50' text-anchor='middle' fill='%23666' font-size='10'%3E失败%3C/text%3E%3C/svg%3E";
                  }}
                />
                {/* 悬停操作 */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => copyUrl(resource.url)}
                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded"
                    title="复制 URL"
                  >
                    复制URL
                  </button>
                  <button
                    onClick={() => handleDelete(resource.id, resource.originalName)}
                    className="px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white rounded"
                    title="删除"
                  >
                    删除
                  </button>
                </div>
              </div>
              
              {/* 信息 - 阶段 4-C 增强：展示更多元数据 */}
              <div className="p-3">
                <p className="text-xs text-gray-400 truncate mb-1" title={resource.originalName}>
                  {resource.originalName}
                </p>
                
                {/* 类型与大小 */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    resource.type === "background"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-green-500/20 text-green-400"
                  }`}>
                    {resource.type === "background" ? "背景" : "图标"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatSize(resource.size)}
                  </span>
                </div>
                
                {/* MIME 类型与尺寸 */}
                <div className="text-[10px] text-gray-500 space-y-0.5">
                  <div className="truncate" title={resource.mimeType}>
                    {resource.mimeType.replace("image/", "").toUpperCase()}
                  </div>
                  {resource.width && resource.height && (
                    <div>{resource.width} × {resource.height}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
