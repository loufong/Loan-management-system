import dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getResolvedDatabaseUrl(): string | undefined {
  const envUrl = process.env.DATABASE_URL;
  if (!envUrl) return undefined;

  // On Windows, if connecting to 127.0.0.1 or localhost, automatically resolve WSL IP for seamless connectivity
  if (process.platform === 'win32' && (envUrl.includes('127.0.0.1') || envUrl.includes('localhost'))) {
    try {
      const wslIp = execSync('wsl -d Ubuntu hostname -I', { encoding: 'utf8', timeout: 1500 }).trim().split(/\s+/)[0];
      if (wslIp && /^\d+\.\d+\.\d+\.\d+$/.test(wslIp)) {
        return envUrl.replace('127.0.0.1', wslIp).replace('localhost', wslIp);
      }
    } catch {
      // Fallback to original envUrl
    }
  }

  return envUrl;
}

const dbUrl = getResolvedDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
