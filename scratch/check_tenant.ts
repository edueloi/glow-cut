import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'eduardo-eloi' } });
  console.log(JSON.stringify(tenant, null, 2));
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
