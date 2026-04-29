
import { PrismaClient } from "@prisma/client";
import { getSessionInfo } from "../wpp/baileys-manager.js";

const prisma = new PrismaClient();

async function check() {
  console.log("=== CHECKING WPP SESSIONS ===");
  
  const systemInfo = getSessionInfo("system");
  console.log("System Bot Status:", systemInfo.status);
  
  const instances = await prisma.wppInstance.findMany();
  console.log(`Found ${instances.length} partner instances.`);
  
  for (const inst of instances) {
    const info = getSessionInfo(inst.tenantId);
    console.log(`- Tenant ${inst.tenantId} (${inst.instanceName}): ${info.status}`);
  }
  
  const configs = await prisma.wppBotConfig.findMany();
  console.log(`\nFound ${configs.length} bot configs.`);
  for (const conf of configs) {
    console.log(`- Tenant ${conf.tenantId}: enabled=${conf.botEnabled}, sendProf=${conf.sendProfNewBooking}, sendConf=${conf.sendConfirmation}`);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
