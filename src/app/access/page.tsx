import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AccessBackground from "@/components/access-background";
import SiteFooterMeta from "@/components/site-footer-meta";
import AccessForm from "./access-form";
import { getPublicAccessBackground, getFooterMetaConfig, getAccessPageTitle, getVisitorPasswordEnabled } from "@/lib/site/config";
import { isVisitorAuthenticated } from "@/lib/auth/session";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const title = await getAccessPageTitle();
  return { title };
}

export default async function AccessPage() {
  const passwordEnabled = await getVisitorPasswordEnabled();

  // 关闭访客密码时，/access 自动跳转到首页
  if (!passwordEnabled) {
    redirect("/");
  }

  // 已登录访客直接进首页
  const isAuth = await isVisitorAuthenticated();
  if (isAuth) {
    redirect("/");
  }

  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || undefined;

  const [backgroundData, footerMeta] = await Promise.all([
    getPublicAccessBackground(userAgent),
    getFooterMetaConfig(),
  ]);

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* 背景层 */}
      <AccessBackground backgroundData={backgroundData} />

      {/* 内容层 */}
      <AccessForm />

      {/* 底部备案信息 */}
      <SiteFooterMeta config={footerMeta} page="access" />
    </main>
  );
}
