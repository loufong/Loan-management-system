const { execSync } = require('child_process');

function freePort(port = 5000) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = output.split(/\r?\n/).filter((line) => line.includes('LISTENING'));
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0' && pid !== String(process.pid)) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } catch (_) {}
        }
      }
    }
  } catch (_) {
    // Port is already free
  }
}

if (require.main === module) {
  freePort(5000);
  process.exit(0);
}

module.exports = { freePort };
