import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/* Created lazily on first use, so a misconfigured DB (missing DATABASE_URL,
   ungenerated client, read-only filesystem on Vercel…) throws inside the
   caller's try/catch instead of crashing the whole route at import time. */
function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    /* directUrl is only needed by the Prisma CLI; default it so the client never fails on a missing var */
    process.env.DATABASE_URL_UNPOOLED ??= process.env.DATABASE_URL
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'production' ? ['error'] : ['query'],
    })
  }
  return globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})
