const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Migrating database to 2 roles (ADMIN & USER) ---');
  
  // 1. Update users table
  const r1 = await prisma.$executeRawUnsafe(
    `UPDATE users SET role = 'USER'::"UserRole" WHERE role::text = 'BORROWER'`
  );
  console.log(`Updated ${r1} BORROWER users to USER.`);

  const r2 = await prisma.$executeRawUnsafe(
    `UPDATE users SET role = 'ADMIN'::"UserRole" WHERE role::text IN ('MANAGER', 'LOAN_OFFICER', 'CREDIT_OFFICER', 'CASHIER')`
  );
  console.log(`Updated ${r2} staff users to ADMIN.`);

  // 2. Add device tracking columns to refresh_tokens table if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE refresh_tokens 
    ADD COLUMN IF NOT EXISTS device_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50),
    ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ(6),
    ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ(6);
  `);
  console.log('Added session/device tracking columns to refresh_tokens table.');

  // 3. Add idempotency_key to payments table if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100)
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL
  `);
  console.log('Added idempotency_key to payments table.');

  // Check user distribution
  const counts = await prisma.user.groupBy({
    by: ['role'],
    _count: { id: true }
  });
  console.log('Current user role counts in DB:', counts);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
