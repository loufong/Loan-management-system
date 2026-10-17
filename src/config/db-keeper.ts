import { ChildProcess, spawn, execSync } from 'child_process';
import { prisma } from './prisma';

let wslKeeperProcess: ChildProcess | null = null;

export function ensureWslActive() {
  if (process.platform === 'win32') {
    try {
      execSync('wsl -d Ubuntu -u root service postgresql start', { stdio: 'ignore' });
    } catch {
      // Ignore
    }
    if (!wslKeeperProcess) {
      try {
        wslKeeperProcess = spawn('wsl', ['-d', 'Ubuntu', 'tail', '-f', '/dev/null'], {
          stdio: 'ignore',
          windowsHide: true,
        });
        wslKeeperProcess.on('error', () => {
          wslKeeperProcess = null;
        });
        wslKeeperProcess.on('exit', () => {
          wslKeeperProcess = null;
        });
      } catch {
        // Fallback
      }
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
  if (wslKeeperProcess) {
    try {
      wslKeeperProcess.kill();
    } catch {
      // ignore
    }
    wslKeeperProcess = null;
  }
}
