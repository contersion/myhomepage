import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "我的个人主页",
  description: "个人展示站",
  icons: {
    icon: "/api/site/favicon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
