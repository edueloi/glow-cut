import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const config = await prisma.wppBotConfig.findMany({ 
    where: { tenantId: "17ec7eb1-a00c-474e-9c8f-51007814f940" } 
  });
  console.dir(config, {depth: null});
}
main().catch(console.error).finally(()=>prisma.$disconnect());
