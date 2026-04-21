import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const t = "17ec7eb1-a00c-474e-9c8f-51007814f940";

  const premiumTemplates = [
    { type: "confirmation",    name: "Confirmação de Agendamento (Cliente)",  body: "{{saudacao}}, *{{nome_cliente}}*! 🌟\n\nSeu agendamento em *{{nome_estabelecimento}}* foi confirmado com sucesso! 🎉\n\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n👤 *Profissional:* {{profissional}}\n💰 *Valor:* {{valor_agendamento}}\n\n📍 *Local:* {{local}}\n\nAgradecemos a preferência e estamos te esperando! Qualquer dúvida, é só chamar.\n\nCom carinho,\n*Equipe {{nome_estabelecimento}}* 💙" },
    { type: "reminder_24h",    name: "Lembrete 24h Antes (Cliente)",          body: "{{saudacao}}, *{{nome_cliente}}*! ⏳\n\nPassando para lembrar do seu horário amanhã com a gente!\n\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n👤 *Com:* {{profissional}}\n\nAté logo!\n*Equipe {{nome_estabelecimento}}* 💙" },
    { type: "reminder_60min",  name: "Lembrete 60min Antes (Cliente)",        body: "{{saudacao}}, *{{nome_cliente}}*! ⏰\n\nFalta pouco! Seu atendimento começa em 1 hora:\n\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n\nJá estamos te esperando no local!\n*Equipe {{nome_estabelecimento}}* 📍" },
    { type: "birthday",        name: "Parabéns de Aniversário",               body: "{{saudacao}}, *{{nome_cliente}}*! 🎈🎂\n\nToda a nossa equipe deseja um feliz aniversário e um novo ciclo cheio de alegrias e realizações! Aproveite muito o seu dia! 🎉\n\n*Equipe {{nome_estabelecimento}}*" },
    { type: "cobranca",        name: "Cobrança / Pagamento Pendente",         body: "{{saudacao}}, *{{nome_cliente}}*.\n\nConsta em nosso sistema um valor pendente referente ao seu último atendimento em *{{nome_estabelecimento}}*. Se precisar de ajuda com o pagamento ou houver algum equívoco, responda esta mensagem para resolvermos juntos! 🤝" },
    { type: "welcome",         name: "Boas-vindas",                           body: "{{saudacao}}, *{{nome_cliente}}*! 👋\n\nSeja muito bem-vindo(a) a *{{nome_estabelecimento}}*. É um prazer ter você com a gente!\n\nQualquer dúvida ou se quiser agendar um horário, nossa equipe está por aqui." },
    // Profissional
    { type: "prof_new_booking",    name: "Novo Agendamento Online (Profissional)", body: "{{saudacao}}, *{{profissional}}*! 🚀\n\nVocê acaba de receber um *novo agendamento online*!\n\n👤 *Cliente:* {{nome_cliente}}\n✂️ *Serviço:* {{servico}}\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n\n✅ *Confirme o agendamento no painel do sistema para que o cliente receba a notificação de confirmação.*\n\n🔗 Acesse: {{link_painel}}\n\nBora pra cima! 💪" },
    { type: "prof_reminder_24h",   name: "Lembrete 24h Antes (Profissional)",     body: "{{saudacao}}, *{{profissional}}*! 📅\n\nLembrete de agendamento para *amanhã*:\n\n👤 *Cliente:* {{nome_cliente}}\n✂️ *Serviço:* {{servico}}\n⏰ *Horário:* {{hora_agendamento}}\n\nBom descanso e bom trabalho amanhã!" },
    { type: "prof_reminder_60min", name: "Lembrete 60min Antes (Profissional)",   body: "{{saudacao}}, *{{profissional}}*! ⏰\n\nAtenção: Seu próximo cliente chega em *1 hora*.\n\n👤 *Cliente:* {{nome_cliente}}\n✂️ *Serviço:* {{servico}}\n⏰ *Horário:* {{hora_agendamento}}\n\nPrepare-se!" },
  ];

  for(const tpl of premiumTemplates) {
    await prisma.wppMessageTemplate.upsert({
      where: { tenantId_type: { tenantId: t, type: tpl.type } },
      create: { id: tpl.type + "-id", tenantId: t, ...tpl, isActive: true, isDefault: true },
      update: { body: tpl.body, isActive: true }
    });
  }
  
  console.log("TEMPLATES VIP ATUALIZADOS COM SUCESSO!");
}

main().catch(console.error).finally(()=>prisma.$disconnect());
