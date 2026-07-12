import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Boshlang'ich Admin hisobini yaratadi (Admin Panel - apps/admin - uchun).
 * Ishga tushirish: npm run prisma:seed --workspace=apps/api
 * (yoki `prisma migrate dev` avtomatik seed'ni ham chaqiradi, package.json'dagi "prisma.seed" orqali)
 */
async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@influencex.uz';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      language: 'uz',
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Admin hisobi tayyor: ${admin.email} (parol: ${password} — birinchi kirishdan keyin albatta almashtiring)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
