import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./storage/data/app.db"),
  VISITOR_SESSION_SECRET: z.string().min(32, "访客会话密钥至少需要 32 位"),
  ADMIN_SESSION_SECRET: z.string().min(32, "管理员会话密钥至少需要 32 位"),
  UPLOAD_DIR: z.string().default("./storage/uploads"),
  MAX_UPLOAD_SIZE: z.string().default("10485760"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.string().default("3000"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ 环境变量验证失败:");
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  });
  process.exit(1);
}

export const env = parsedEnv.data;
