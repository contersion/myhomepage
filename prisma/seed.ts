import { PrismaClient } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Start seeding...");

  // 检查是否已初始化过，避免每次重启覆盖已有数据或重建已删除的默认数据
  const seeded = await prisma.siteConfig.findUnique({
    where: { key: "__seeded__" },
  });

  if (seeded?.value === "true") {
    console.log("Database already seeded, skipping.");
    return;
  }

  // 初始化站点配置
  const configs = [
    { key: "site_title", value: "我的个人主页", description: "站点标题" },
    { key: "site_subtitle", value: "欢迎来到我的个人空间", description: "站点副标题" },
    { key: "site_description", value: "这里记录着我的生活点滴与作品", description: "站点简介" },
    { key: "visitor_password_hash", value: hashSync(process.env.VISITOR_PASSWORD || "visitor123", 10), description: "访客密码哈希" },
    { key: "admin_password_hash", value: hashSync(process.env.ADMIN_PASSWORD || "admin123", 10), description: "管理员密码哈希" },
    { key: "card_style", value: "glass", description: "卡片样式: glass/solid" },
    { key: "background_blur", value: "10", description: "背景模糊度(px)" },
    { key: "background_overlay", value: "0.3", description: "背景遮罩透明度" },
    { key: "background_interval", value: "5", description: "背景轮播间隔(秒)" },
    { key: "background_random", value: "true", description: "背景随机起始" },
    { key: "background_mobile_inherit", value: "true", description: "手机背景继承PC" },
  ];

  for (const config of configs) {
    await prisma.siteConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  // 创建示例按钮分组
  const defaultGroup = await prisma.buttonGroup.upsert({
    where: { id: "default-group" },
    update: {},
    create: {
      id: "default-group",
      name: "常用链接",
      sortOrder: 0,
    },
  });

  // 创建示例按钮
  const defaultButtons = [
    { title: "GitHub", url: "https://github.com", sortOrder: 0 },
    { title: "Twitter", url: "https://twitter.com", sortOrder: 1 },
    { title: "Blog", url: "https://example.com", sortOrder: 2 },
  ];

  for (const btn of defaultButtons) {
    await prisma.button.upsert({
      where: { id: `btn-${btn.sortOrder}` },
      update: {},
      create: {
        id: `btn-${btn.sortOrder}`,
        ...btn,
        groupId: defaultGroup.id,
      },
    });
  }

  // 创建默认背景（示例数据，实际使用时替换为真实图片）
  const defaultBackgrounds = [
    { url: "/api/placeholder/1920/1080", device: "pc", sortOrder: 0 },
    { url: "/api/placeholder/750/1334", device: "mobile", sortOrder: 0 },
  ];

  for (let i = 0; i < defaultBackgrounds.length; i++) {
    await prisma.background.upsert({
      where: { id: `bg-${i}` },
      update: {},
      create: {
        id: `bg-${i}`,
        ...defaultBackgrounds[i],
      },
    });
  }

  // 写入初始化完成标记
  await prisma.siteConfig.upsert({
    where: { key: "__seeded__" },
    update: {},
    create: { key: "__seeded__", value: "true", description: "数据库已初始化标记" },
  });

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
