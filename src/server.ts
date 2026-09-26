import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { prisma } from './config/prisma';
import { initOverdueCronJob, stopOverdueCronJob } from './modules/overdue/overdue.cron';

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap() {
  const app = createApp();

  const server = app.listen(PORT, () => {
    console.log(`
  =============================================================
  🎓 Academic Loan Management System (LMS) - Backend Server
  =============================================================
  🚀 Server running at: http://localhost:${PORT}
  📡 API Base URL     : http://localhost:${PORT}/api/v1
  🩺 Health Check     : http://localhost:${PORT}/api/v1/health
  ⚙️  Environment      : ${process.env.NODE_ENV || 'development'}
  =============================================================
    `);

    // Initialize automated daily overdue detection cron job
    initOverdueCronJob();
  });

  // Graceful Shutdown Handlers
  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    stopOverdueCronJob();
    server.close(async () => {
      console.log('🔒 Closed HTTP Server.');
      await prisma.$disconnect();
      console.log('💾 Disconnected from Database.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('❌ Failed to start LMS Server:', err);
  process.exit(1);
});
