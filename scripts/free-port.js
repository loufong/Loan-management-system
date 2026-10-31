const { execSync } = require('child_process');

function freePort(port = 5000) {
  try {
    const cmd = `powershell -NoProfile -Command "$conns = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue; if ($conns) { $conns.OwningProcess | Select-Object -Unique }"`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }).trim();
    if (output) {
      const pids = output.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
      for (const pid of pids) {
        if (pid && pid !== String(process.pid)) {
          try {
            process.kill(Number(pid));
          } catch (_) {
            try {
              execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            } catch (__) {}
          }
        }
      }
    }
  } catch (_) {
    // Silently continue
  }
}

if (require.main === module) {
  freePort(5000);
}

module.exports = { freePort };

