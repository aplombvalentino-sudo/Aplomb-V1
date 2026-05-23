import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// PRISMA_DATABASE_URL takes priority so the preview runner's inherited
// DATABASE_URL placeholder (localhost:5432) cannot shadow the real Supabase URL.
const databaseUrl =
  process.env.PRISMA_DATABASE_URL ?? process.env.DATABASE_URL;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
