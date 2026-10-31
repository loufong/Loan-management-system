import { execSync, spawn, ChildProcess } from 'child_process';
import { prisma } from './prisma';

let wslKeeperProcess: ChildProcess | null = null;
let pingInterval: NodeJS.Timeout | null = null;

export function ensureWslActive(): void {
  if (process.platform === 'win32') {
    // 1. Maintain a persistent long-running background WSL process
    // This prevents Windows WSL subsystem from detecting an idle VM and powering down
    if (!wslKeeperProcess || wslKeeperProcess.exitCode !== null) {
      try {
        wslKeeperProcess = spawn('wsl.exe', ['-d', 'Ubuntu', 'sleep', 'infinity'], {
          stdio: 'ignore',
          windowsHide: true,
          detached: false,
        });
        wslKeeperProcess.on('exit', () => {
          wslKeeperProcess = null;
        });
      } catch (err) {
        console.warn('⚠️ [DB-Keeper] Note on spawning WSL background keeper:', err);
      }
    }

    // 2. Ensure PostgreSQL service is active in WSL
    try {
      execSync('wsl -d Ubuntu systemctl start postgresql', { stdio: 'ignore', timeout: 5000 });
    } catch {
      try {
        execSync('wsl -d Ubuntu service postgresql start', { stdio: 'ignore', timeout: 5000 });
      } catch {
        // Best effort
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

      // Start background heartbeat ping to keep connection warm and healthy
      if (!pingInterval) {
        pingInterval = setInterval(async () => {
          try {
            await prisma.$queryRaw`SELECT 1`;
          } catch {
            ensureWslActive();
            try {
              await prisma.$disconnect();
              await prisma.$connect();
            } catch {
              // Best effort reconnect
            }
          }
        }, 20000);
        pingInterval.unref();
      }
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

export function stopWslKeeper(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (wslKeeperProcess) {
    try {
      wslKeeperProcess.kill('SIGTERM');
    } catch {
      // Ignore
    }
    wslKeeperProcess = null;
  }
}
