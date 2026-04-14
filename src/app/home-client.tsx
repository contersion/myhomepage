"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PublicButtonGroup } from "@/lib/buttons";
import type { PublicBackgroundData } from "@/lib/backgrounds";
import type { FooterMetaConfig } from "@/lib/site/config";
import SiteFooterMeta from "@/components/site-footer-meta";
import { logPageAccess } from "@/lib/logs/client-logger";

interface HomeClientProps {
  siteInfo: {
    title: string;
    subtitle: string;
    description: string;
  };
  backgroundData: PublicBackgroundData;
  buttonGroups: PublicButtonGroup[];
  footerMeta: FooterMetaConfig;
}

export default function HomeClient({ siteInfo, backgroundData, buttonGroups, footerMeta }: HomeClientProps) {
  const [loading, setLoading] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();
  
  // 记录页面访问
  useEffect(() => {
    logPageAccess("/");
  }, []);
  
  const { images, config } = backgroundData;
  
  // 切换背景
  const nextBackground = useCallback(() => {
    if (images.length <= 1) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentBgIndex((prev) => (prev + 1) % images.length);
      setIsTransitioning(false);
    }, 500);
  }, [images.length]);
  
  // 轮播定时器
  useEffect(() => {
    if (images.length <= 1) return;
    
    const interval = setInterval(nextBackground, config.interval * 1000);
    return () => clearInterval(interval);
  }, [images.length, config.interval, nextBackground]);
  
  const handleLogout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/visitor/logout", {
        method: "POST",
      });
      if (res.ok) {
        router.push("/access");
        router.refresh();
      }
    } catch {
      console.error("Logout error");
    } finally {
      setLoading(false);
    }
  };

  // 兜底背景（当无背景时）
  const fallbackBg = "linear-gradient(to bottom right, rgb(17, 24, 39), rgb(88, 28, 135), rgb(76, 29, 149))";

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 背景层 */}
      <div className="absolute inset-0">
        {images.length === 0 ? (
          // 无背景时使用兜底渐变
          <div 
            className="absolute inset-0"
            style={{ background: fallbackBg }}
          />
        ) : images.length === 1 ? (
          // 单张背景
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${images[0]})` }}
          />
        ) : (
          // 多张背景轮播
          images.map((img, index) => (
            <div
              key={index}
              className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ${
                index === currentBgIndex ? "opacity-100" : "opacity-0"
              }`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))
        )}
      </div>
      
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0"
        style={{ 
          backdropFilter: `blur(${config.blur}px)`,
          WebkitBackdropFilter: `blur(${config.blur}px)`,
        }}
      />
      <div 
        className="absolute inset-0 bg-black"
        style={{ opacity: config.overlay }}
      />

      {/* 内容区 */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-4 sm:py-8">
        <div className="w-full max-w-md mx-auto">
          {/* 主卡片 - 玻璃拟态效果 */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-5 sm:p-8 shadow-2xl">
            {/* 头像占位 */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 sm:mb-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-600 flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-lg">
              ME
            </div>

            {/* 标题 - 从数据库读取 */}
            <h1 className="text-xl sm:text-2xl font-bold text-white text-center mb-2">
              {siteInfo.title}
            </h1>
            <p className="text-white/70 text-center mb-4 sm:mb-6 text-sm sm:text-base">
              {siteInfo.subtitle}
            </p>

            {/* 简介 - 从数据库读取 */}
            <p className="text-white/60 text-center text-xs sm:text-sm mb-6 sm:mb-8 leading-relaxed line-clamp-3">
              {siteInfo.description}
            </p>

            {/* 按钮分组 - 从数据库读取 */}
            <div className="space-y-3 sm:space-y-4">
              {buttonGroups.length === 0 ? (
                <div className="text-center py-8 text-white/40 text-sm">
                  暂无按钮，请在后台添加
                </div>
              ) : (
                buttonGroups.map((group) => (
                  <div key={group.id} className="bg-white/5 rounded-lg p-3 sm:p-4">
                    <h3 className="text-white/80 text-xs sm:text-sm font-medium mb-2 sm:mb-3 px-1">
                      {group.name}
                    </h3>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {group.buttons.map((button) => (
                        <a
                          key={button.id}
                          href={button.url}
                          target={button.openInNew ? "_blank" : undefined}
                          rel={button.openInNew ? "noopener noreferrer" : undefined}
                          className={`px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 text-white/90 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium flex items-center justify-center gap-1.5 sm:gap-2 min-h-[40px] ${
                            group.buttons.length === 1 ? "col-span-2" : ""
                          }`}
                        >
                          {button.icon && (
                            <img
                              src={button.icon}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              width="16"
                              height="16"
                              className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain flex-shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          )}
                          <span className="truncate">{button.title}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 轮播指示器（多张背景时显示） */}
            {images.length > 1 && (
              <div className="flex justify-center gap-2 mt-4 sm:mt-6">
                {images.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setIsTransitioning(true);
                      setTimeout(() => {
                        setCurrentBgIndex(index);
                        setIsTransitioning(false);
                      }, 300);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentBgIndex 
                        ? "bg-white w-4" 
                        : "bg-white/40 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}

            {/* 页脚 */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 flex items-center justify-between">
              <p className="text-white/40 text-[10px] sm:text-xs">
                © 2026 My Homepage
              </p>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="text-white/40 hover:text-white/70 text-[10px] sm:text-xs transition-colors disabled:opacity-50 px-2 py-1"
              >
                {loading ? "退出中..." : "退出登录"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 底部备案信息 */}
      <SiteFooterMeta config={footerMeta} page="home" />
    </main>
  );
}
