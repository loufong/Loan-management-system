import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/config/prisma';
import { UserRole, UserStatus } from '@prisma/client';

async function main() {
  const email = 'phonrithya313@gmail.com';
  const fullName = 'Phon Rithya';
  const rawPassword = 'Phonrithya@admin1';
  const username = 'phonrithya';

  console.log(`🔐 Setting up Super Admin account for ${fullName} (${email})...`);

  const passwordHash = await bcrypt.hash(rawPassword, 10);

  // Check if user exists by email
  const existingByEmail = await prisma.user.findUnique({
    where: { email }
  });

  // Check if username is taken
  const existingByUsername = await prisma.user.findUnique({
    where: { username }
  });

  let targetId = existingByEmail?.id || (existingByUsername ? existingByUsername.id : undefined);

  if (targetId) {
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        email,
        username,
        fullName,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        department: 'Super Administration & Executive Governance',
        position: 'Super Administrator'
      }
    });
    console.log(`✅ Super Admin updated successfully:`);
    console.log({
      id: updated.id,
      fullName: updated.fullName,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      status: updated.status
    });
  } else {
    const created = await prisma.user.create({
      data: {
        email,
        username,
        fullName,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phone: '+855 17 790 800',
        department: 'Super Administration & Executive Governance',
        position: 'Super Administrator'
      }
    });
    console.log(`✅ Super Admin created successfully:`);
    console.log({
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      username: created.username,
      role: created.role,
      status: created.status
    });
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Failed to setup Super Admin:', err);
  process.exit(1);
});
