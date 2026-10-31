import { execSync } from 'child_process';
import { prisma } from './prisma';

export function ensureWslActive() {
  if (process.platform === 'win32') {
    try {
      execSync('wsl -d Ubuntu service postgresql start', { stdio: 'ignore', timeout: 3000 });
    } catch {
      // Ignore
    }
  }
}

export async function ensureDatabaseConnected(maxRetries = 5): Promise<void> {
  if (process.platform === 'win32') {
    ensureWslActive();
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return;
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw err;
      }
      if (process.platform === 'win32') {
        ensureWslActive();
      }
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

export function stopWslKeeper() {
  // No-op
}
