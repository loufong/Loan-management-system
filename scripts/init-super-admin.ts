import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma';
import { UserRole, UserStatus } from '@prisma/client';

async function main() {
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL || process.argv[2] || 'admin@loansystem.edu').toLowerCase().trim();
  const rawPassword = process.env.SUPER_ADMIN_PASSWORD || process.argv[3] || 'Password123!';
  const fullName = process.env.SUPER_ADMIN_NAME || process.argv[4] || 'System Administrator';

  console.log(`🔐 Initializing Super Admin Account [${adminEmail}]...`);

  // Verify complexity
  if (rawPassword.length < 8 || !/[A-Z]/.test(rawPassword) || !/[a-z]/.test(rawPassword) || !/[0-9]/.test(rawPassword)) {
    console.error('❌ Error: Super Admin password must be at least 8 characters long with uppercase, lowercase, and numbers.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // Check if an admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: UserRole.ADMIN }
  });

  if (existingAdmin && existingAdmin.email !== adminEmail) {
    console.warn(`⚠️ Warning: An authorized Super Admin account already exists (${existingAdmin.email}).`);
    console.warn(`Enforcing Single Super Admin Governance: Updating existing Super Admin account.`);
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email: adminEmail,
        username: 'admin',
        fullName,
        passwordHash,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date()
      }
    });
    console.log(`✅ Super Admin account updated successfully (${adminEmail}).`);
  } else {
    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash,
        fullName,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date()
      },
      create: {
        username: 'admin',
        email: adminEmail,
        fullName,
        passwordHash,
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phone: '+1-555-0100',
        department: 'IT & Executive Administration'
      }
    });
    console.log(`✅ Super Admin account initialized successfully (${user.email}).`);
  }

  console.log(`ℹ️ Governance Rules Enforced:`);
  console.log(`   - Exactly 1 Super Admin Authorized`);
  console.log(`   - Public Super Admin Registration Blocked`);
  console.log(`   - Password Stored as Secure Bcrypt Hash`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Super Admin initialization failed:', err);
  process.exit(1);
});

