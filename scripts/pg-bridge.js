const net = require('net');
const { execSync } = require('child_process');

function getWslIp() {
  try {
    const out = execSync('wsl -d Ubuntu hostname -I', { encoding: 'utf8', timeout: 3000 });
    const ip = out.trim().split(/\s+/)[0];
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
      return ip;
    }
  } catch (err) {
    // fallback
  }
  return '172.31.55.59';
}

const TARGET_HOST = getWslIp();
const TARGET_PORT = 5432;
const LISTEN_PORT = 5432;
const LISTEN_HOST = '127.0.0.1';

console.log(`[PG-Bridge] Forwarding ${LISTEN_HOST}:${LISTEN_PORT} -> ${TARGET_HOST}:${TARGET_PORT}`);

const server = net.createServer((clientSocket) => {
  const targetSocket = net.createConnection({ host: TARGET_HOST, port: TARGET_PORT }, () => {
    clientSocket.pipe(targetSocket);
    targetSocket.pipe(clientSocket);
  });

  clientSocket.on('error', (err) => {
    targetSocket.destroy();
  });

  targetSocket.on('error', (err) => {
    clientSocket.destroy();
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`[PG-Bridge] Port ${LISTEN_PORT} already in use; bridge or postgres already active.`);
    process.exit(0);
  } else {
    console.error('[PG-Bridge] Server error:', err);
  }
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[PG-Bridge] Ready: listening on ${LISTEN_HOST}:${LISTEN_PORT}`);
});

process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
