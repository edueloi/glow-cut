const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.superAdmin.updateMany({
    where: { username: 'admin' },
    data: { permissions: '["all"]' }
  });
  console.log('Permissões do usuário admin atualizadas para ["all"]');
}

main().catch(console.error).finally(() => prisma.$disconnect());
