import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const t = "17ec7eb1-a00c-474e-9c8f-51007814f940";
  
  // Cria ou atualiza a config para force-enable
  await prisma.wppBotConfig.upsert({
    where: { tenantId: t },
    create: {
      id: "force-config",
      tenantId: t,
      botEnabled: true,
      sendConfirmation: true,
      sendProfNewBooking: true
    },
    update: {
      botEnabled: true,
      sendConfirmation: true,
      sendProfNewBooking: true
    }
  });

  // Cria os templates caso não existam
  const templates = [
    { type: "confirmation", name: "Confirmação", body: "Olá, *{{nome_cliente}}*! Seu agendamento de *{{servico}}* em *{{nome_estabelecimento}}* está confirmado para *{{data_agendamento}}* às *{{hora_agendamento}}*. Valor: *{{valor_agendamento}}*. Local: *{{local}}*." },
    { type: "prof_new_booking", name: "Novo Booking", body: "Olá, *{{profissional}}*! Novo agendamento de *{{nome_cliente}}* para *{{servico}}* em *{{data_agendamento}}* às *{{hora_agendamento}}*." }
  ];

  for(const tpl of templates) {
    await prisma.wppMessageTemplate.upsert({
      where: { tenantId_type: { tenantId: t, type: tpl.type } },
      create: { id: tpl.type + "-id", tenantId: t, ...tpl, isActive: true, isDefault: true },
      update: { isActive: true }
    });
  }
  
  console.log("Configurações e Templates ativados à força com sucesso!");
}

main().catch(console.error).finally(()=>prisma.$disconnect());
