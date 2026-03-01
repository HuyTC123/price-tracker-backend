import "dotenv/config";
import { defineConfig } from "@prisma/config";

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("Missing DATABASE_URL in .env");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {  
    url: dbUrl, 
  },
});
