const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const tenants = await prisma.tenant.findMany({ select: { slug: true } });
    console.log('Available slugs:', tenants.map(t => t.slug).join(', '));
  } catch (e) {
    console.error('Error fetching tenants:', e.message);
  }
}

main().finally(() => prisma.$disconnect());
