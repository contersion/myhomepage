import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isVisitorAuthenticated } from "@/lib/auth/session";
import { getPublicSiteInfo } from "@/lib/site/config";
import { getPublicBackgrounds } from "@/lib/backgrounds";
import { getPublicButtons } from "@/lib/buttons";
import HomeClient from "./home-client";

/**
 * 首页（服务端组件）
 * 检查访客认证状态，获取站点信息、背景、按钮数据，传递给客户端组件
 */
export default async function HomePage() {
  // 检查访客认证（Middleware 已做一层，这里做二次确认）
  const isAuthenticated = await isVisitorAuthenticated();
  
  if (!isAuthenticated) {
    redirect("/access");
  }
  
  // 获取 User-Agent 用于判断 PC/手机
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || undefined;
  
  // 并行获取数据
  const [siteInfo, backgroundData, buttonGroups] = await Promise.all([
    getPublicSiteInfo(),
    getPublicBackgrounds(userAgent),
    getPublicButtons(),
  ]);
  
  return (
    <HomeClient 
      siteInfo={siteInfo} 
      backgroundData={backgroundData}
      buttonGroups={buttonGroups}
    />
  );
}
