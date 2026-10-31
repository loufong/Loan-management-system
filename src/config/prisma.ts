import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function appendPoolParameters(rawUrl: string): string {
  try {
    const urlObj = new URL(rawUrl);
    if (!urlObj.searchParams.has('connection_limit')) {
      urlObj.searchParams.set('connection_limit', '10');
    }
    if (!urlObj.searchParams.has('pool_timeout')) {
      urlObj.searchParams.set('pool_timeout', '20');
    }
    if (!urlObj.searchParams.has('connect_timeout')) {
      urlObj.searchParams.set('connect_timeout', '10');
    }
    return urlObj.toString();
  } catch {
    if (!rawUrl.includes('connection_limit=')) {
      const sep = rawUrl.includes('?') ? '&' : '?';
      return `${rawUrl}${sep}connection_limit=10&pool_timeout=20&connect_timeout=10`;
    }
    return rawUrl;
  }
}

export function getResolvedDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) return undefined;

  let resolvedUrl = envUrl;

  // On Windows, if connecting to 127.0.0.1 or localhost, automatically resolve WSL IP for seamless connectivity
  if (process.platform === 'win32' && (envUrl.includes('127.0.0.1') || envUrl.includes('localhost'))) {
    try {
      const wslIp = execSync('wsl -d Ubuntu hostname -I', { encoding: 'utf8', timeout: 5000 }).trim().split(/\s+/)[0];
      if (wslIp && /^\d+\.\d+\.\d+\.\d+$/.test(wslIp)) {
        resolvedUrl = envUrl.replace('127.0.0.1', wslIp).replace('localhost', wslIp);
      }
    } catch {
      // Fallback to original envUrl
    }
  }

  return appendPoolParameters(resolvedUrl);
}

const dbUrl = getResolvedDatabaseUrl();

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Self-healing retry middleware for transient network / VM power state drops
  client.$use(async (params, next) => {
    let attempts = 0;
    const maxAttempts = 3;
    while (true) {
      try {
        return await next(params);
      } catch (error: any) {
        attempts++;
        const msg = error?.message || String(error);
        const isConnectionError =
          msg.includes('E57P01') ||
          msg.includes('57P01') ||
          msg.includes('terminating connection') ||
          msg.includes('administrator command') ||
          msg.includes('P1017') ||
          msg.includes('P1001') ||
          msg.includes('Connection is closed') ||
          msg.includes('Server has closed the connection') ||
          msg.includes('broken pipe') ||
          msg.includes('ECONNREFUSED') ||
          msg.includes('ECONNRESET');

        if (isConnectionError && attempts <= maxAttempts) {
          console.warn(
            `⚠️ [Prisma Middleware] Transient DB connection severed on ${params.model || 'model'}.${params.action} (attempt ${attempts}/${maxAttempts}). Refreshing pool...`
          );
          try {
            await client.$disconnect();
          } catch {
            // Ignore disconnect error
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
          continue;
        }
        throw error;
      }
    }
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
