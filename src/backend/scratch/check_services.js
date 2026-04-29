
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkServices() {
  try {
    const services = await prisma.service.findMany({
      select: {
        id: true,
        name: true,
        professionalIds: true,
        tenantId: true
      }
    });
    console.log(JSON.stringify(services, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkServices();
