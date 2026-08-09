import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    adapter: "pg",
    url: env("DATABASE_URL"),
  },
});