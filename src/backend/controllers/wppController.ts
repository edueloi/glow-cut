import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId } from "../utils/helpers";
import {
  connectSession,
  disconnectSession,
  getSessionInfo,
  sendMessage,
  getQrCode,
} from "../wpp/baileys-manager";

// ── Templates padrão ──────────────────────────────────────────────────────────

export const DEFAULT_TEMPLATES = [
  // Cliente
  { type: "confirmation",    name: "Confirmação de Agendamento (Cliente)",  body: "{{saudacao}}, *{{nome_cliente}}*! 🌟\n\nSeu agendamento em *{{nome_estabelecimento}}* foi confirmado com sucesso! 🎉\n\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n👤 *Profissional:* {{profissional}}\n💰 *Valor:* {{valor_agendamento}}\n\n📍 *Local:* {{local}}\n\nAgradecemos a preferência e estamos te esperando! Qualquer dúvida, é só chamar.\n\nCom carinho,\n*Equipe {{nome_estabelecimento}}* 💙" },
  { type: "reminder_24h",    name: "Lembrete 24h Antes (Cliente)",          body: "{{saudacao}}, *{{nome_cliente}}*! ⏳\n\nPassando para lembrar do seu horário amanhã com a gente!\n\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n👤 *Com:* {{profissional}}\n\nAté logo!\n*Equipe {{nome_estabelecimento}}* 💙" },
  { type: "reminder_60min",  name: "Lembrete 60min Antes (Cliente)",        body: "{{saudacao}}, *{{nome_cliente}}*! ⏰\n\nFalta pouco! Seu atendimento começa em 1 hora:\n\n⏰ *Horário:* {{hora_agendamento}}\n✂️ *Serviço:* {{servico}}\n\nJá estamos te esperando no local!\n*Equipe {{nome_estabelecimento}}* 📍" },
  { type: "birthday",        name: "Parabéns de Aniversário",               body: "{{saudacao}}, *{{nome_cliente}}*! 🎈🎂\n\nToda a nossa equipe deseja um feliz aniversário e um novo ciclo cheio de alegrias e realizações! Aproveite muito o seu dia! 🎉\n\n*Equipe {{nome_estabelecimento}}*" },
  { type: "cobranca",        name: "Cobrança / Pagamento Pendente",         body: "{{saudacao}}, *{{nome_cliente}}*.\n\nConsta em nosso sistema um valor pendente referente ao seu último atendimento em *{{nome_estabelecimento}}*. Se precisar de ajuda com o pagamento ou houver algum equívoco, responda esta mensagem para resolvermos juntos! 🤝" },
  { type: "welcome",         name: "Boas-vindas",                           body: "{{saudacao}}, *{{nome_cliente}}*! 👋\n\nSeja muito bem-vindo(a) a *{{nome_estabelecimento}}*. É um prazer ter você com a gente!\n\nQualquer dúvida ou se quiser agendar um horário, nossa equipe está por aqui." },
  // Profissional
  { type: "prof_new_booking",    name: "Novo Agendamento Online (Profissional)", body: "{{saudacao}}, *{{profissional}}*! 🚀\n\nVocê acaba de receber um novo agendamento online!\n\n👤 *Cliente:* {{nome_cliente}}\n✂️ *Serviço:* {{servico}}\n📅 *Data:* {{data_agendamento}}\n⏰ *Horário:* {{hora_agendamento}}\n\nBora pra cima! 💪" },
  { type: "prof_reminder_24h",   name: "Lembrete 24h Antes (Profissional)",     body: "{{saudacao}}, *{{profissional}}*! 📅\n\nLembrete de agendamento para **amanhã**:\n\n👤 *Cliente:* {{nome_cliente}}\n✂️ *Serviço:* {{servico}}\n⏰ *Horário:* {{hora_agendamento}}\n\nBom descanso e bom trabalho amanhã!" },
  { type: "prof_reminder_60min", name: "Lembrete 60min Antes (Profissional)",   body: "{{saudacao}}, *{{profissional}}*! ⏰\n\nAtenção: Seu próximo cliente chega em **1 hora**.\n\n👤 *Cliente:* {{nome_cliente}}\n✂️ *Serviço:* {{servico}}\n⏰ *Horário:* {{hora_agendamento}}\n\nPrepare-se!" },
];

// ── Helpers internos ──────────────────────────────────────────────────────────

async function ensureTemplates(tenantId: string) {
  for (const tpl of DEFAULT_TEMPLATES) {
    const exists = await (prisma as any).wppMessageTemplate.findUnique({
      where: { tenantId_type: { tenantId, type: tpl.type } },
    });
    if (!exists) {
      await (prisma as any).wppMessageTemplate.create({
        data: { id: randomUUID(), tenantId, ...tpl, isActive: true, isDefault: true },
      });
    }
  }
}

async function ensureBotConfig(tenantId: string) {
  const existing = await (prisma as any).wppBotConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;
  return (prisma as any).wppBotConfig.create({
    data: {
      id: randomUUID(), tenantId,
      botEnabled: false,
      sendConfirmation: true,
      sendReminder24h: true,
      sendReminder60min: true,
      sendBirthday: true,
      sendCobranca: false,
      sendWelcome: true,
      sendProfNewBooking: true,
      sendProfReminder24h: true,
      sendProfReminder60min: false,
      menuEnabled: false,
      menuWelcomeMsg: "",
      menuOptions: "[]",
    },
  });
}

function getSaudacao(hour?: number): string {
  const h = hour ?? new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// ── Funções exportadas para disparo externo (agendaController, scheduler) ─────

export async function sendWppToPhone(tenantId: string, phone: string, text: string): Promise<void> {
  try {
    // Tenta usar bot próprio do parceiro
    const info = getSessionInfo(tenantId);
    if (info.status === "connected") {
      await sendMessage(tenantId, phone, text);
      return;
    }
    // Fallback: usa bot do sistema
    const systemInfo = getSessionInfo("system");
    if (systemInfo.status === "connected") {
      await sendMessage("system", phone, text);
      return;
    }
    console.warn(`[WPP][${tenantId}] Nenhuma sessão conectada (própria nem sistema) — mensagem descartada para ${phone}`);
  } catch (e) {
    console.warn(`[WPP][${tenantId}] sendWppToPhone error:`, e);
  }
}

export async function getTemplateBody(tenantId: string, type: string): Promise<string | null> {
  try {
    const t = await (prisma as any).wppMessageTemplate.findUnique({
      where: { tenantId_type: { tenantId, type } },
    });
    return t?.isActive && t?.body ? t.body : null;
  } catch { return null; }
}

export async function fireWppProfNewBooking(tenantId: string, appt: any): Promise<void> {
  try {
    const [config, tenant] = await Promise.all([
      (prisma as any).wppBotConfig.findUnique({ where: { tenantId } }),
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);
    if (!config?.botEnabled || !config?.sendProfNewBooking) {
      console.log(`[WPP] IGNORANDO prof_new_booking: botEnabled=${config?.botEnabled}, sendProfNewBooking=${config?.sendProfNewBooking}`);
      return;
    }
    if (!appt?.professional?.phone) {
      console.log(`[WPP] IGNORANDO prof_new_booking: Telefone do profissional ausente no banco.`);
      return;
    }

    const tpl = await getTemplateBody(tenantId, "prof_new_booking");
    if (!tpl) {
      console.log(`[WPP] IGNORANDO prof_new_booking: Template não encontrado ou ativo no banco.`);
      return;
    }

    const vars: Record<string, string> = {
      saudacao: getSaudacao(),
      nome_cliente: appt.client?.name || "",
      profissional: appt.professional?.name || "",
      servico: appt.service?.name || "",
      nome_estabelecimento: tenant?.name || "",
      data_agendamento: new Date(appt.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
      hora_agendamento: appt.startTime || "",
    };

    await sendWppToPhone(tenantId, appt.professional.phone, applyVars(tpl, vars));
  } catch (err) {
    console.warn("[WPP] fireWppProfNewBooking error:", err);
  }
}

export async function fireWppConfirmation(tenantId: string, appt: any): Promise<void> {
  try {
    const [config, tenant] = await Promise.all([
      (prisma as any).wppBotConfig.findUnique({ where: { tenantId } }),
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, address: true } }),
    ]);
    if (!config?.botEnabled || !config?.sendConfirmation) {
      console.log(`[WPP] IGNORANDO confirmation: botEnabled=${config?.botEnabled}, sendConfirmation=${config?.sendConfirmation}`);
      return;
    }
    if (!appt?.client?.phone) {
      console.log(`[WPP] IGNORANDO confirmation: Telefone do cliente ausente no banco.`);
      return;
    }

    const tpl = await getTemplateBody(tenantId, "confirmation");
    if (!tpl) {
      console.log(`[WPP] IGNORANDO confirmation: Template não encontrado ou ativo no banco.`);
      return;
    }

    const vars: Record<string, string> = {
      saudacao: getSaudacao(),
      nome_cliente: appt.client?.name || "",
      profissional: appt.professional?.name || "",
      servico: appt.service?.name || "",
      nome_estabelecimento: tenant?.name || "",
      data_agendamento: new Date(appt.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
      hora_agendamento: appt.startTime || "",
      valor_agendamento: appt.service?.price != null ? appt.service.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "",
      local: tenant?.address || "",
    };

    await sendWppToPhone(tenantId, appt.client.phone, applyVars(tpl, vars));
  } catch (err) {
    console.warn("[WPP] fireWppConfirmation error:", err);
  }
}

// ── Controller HTTP ───────────────────────────────────────────────────────────

export const wppController = {

  /** GET /api/wpp/instance — retorna registro do BD + status da sessão em memória */
  async getInstance(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const record = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      const sessionInfo = getSessionInfo(tenantId);
      // Mescla: prioriza status em memória (mais atualizado)
      res.json(record ? { ...record, status: sessionInfo.status, phone: sessionInfo.phone, qrCode: sessionInfo.qrDataUrl } : null);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  },

  /** POST /api/wpp/instance — salva nome do bot no BD e garante templates/config */
  async saveInstance(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { instanceName } = req.body;
    if (!instanceName) return res.status(400).json({ error: "instanceName obrigatório." });
    try {
      const instance = await (prisma as any).wppInstance.upsert({
        where: { tenantId },
        create: {
          id: randomUUID(),
          tenantId,
          instanceName: String(instanceName).trim(),
          apiUrl: "",        // não usado com Baileys
          apiKey: null,
          status: "disconnected",
          isActive: false,
        },
        update: {
          instanceName: String(instanceName).trim(),
        },
      });
      await Promise.all([ensureTemplates(tenantId), ensureBotConfig(tenantId)]);
      res.json(instance);
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  /** POST /api/wpp/connect — inicia sessão Baileys e retorna QR code */
  async connect(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const record = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      if (!record) return res.status(404).json({ error: "Instância não configurada. Salve primeiro." });

      const info = await connectSession(tenantId);
      res.json({
        status: info.status,
        phone: info.phone,
        qrCode: info.qrDataUrl,
      });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao iniciar conexão." });
    }
  },

  /** GET /api/wpp/status — retorna status atual da sessão em memória */
  async status(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      const info = getSessionInfo(tenantId);
      res.json({ status: info.status, phone: info.phone, qrCode: info.qrDataUrl });
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  /** GET /api/wpp/qr — retorna QR code atual (polling pelo frontend) */
  async getQr(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const qr = getQrCode(tenantId);
    const info = getSessionInfo(tenantId);
    res.json({ status: info.status, phone: info.phone, qrCode: qr });
  },

  /** POST /api/wpp/disconnect — logout e apaga credenciais */
  async disconnect(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await disconnectSession(tenantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  async getTemplates(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      await ensureTemplates(tenantId);
      const templates = await (prisma as any).wppMessageTemplate.findMany({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
      });
      res.json(templates);
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  },

  async updateTemplate(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { body, name, isActive } = req.body;
    if (!req.params.type) return res.status(400).json({ error: "Tipo do template é obrigatório." });
    try {
      const current = DEFAULT_TEMPLATES.find(t => t.type === req.params.type);
      const template = await (prisma as any).wppMessageTemplate.upsert({
        where: { tenantId_type: { tenantId, type: req.params.type } },
        create: {
          id: randomUUID(), tenantId,
          type: req.params.type,
          name: name || current?.name || req.params.type,
          body: body || current?.body || "",
          isActive: isActive !== false,
          isDefault: false,
        },
        update: {
          ...(name !== undefined && { name }),
          ...(body !== undefined && { body }),
          ...(isActive !== undefined && { isActive: !!isActive }),
        },
      });
      res.json(template);
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  async getBotConfig(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    try {
      res.json(await ensureBotConfig(tenantId));
    } catch (e: any) {
      res.status(500).json({ error: e?.message });
    }
  },

  async updateBotConfig(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const {
      botEnabled, sendConfirmation, sendReminder24h, sendReminder60min,
      sendBirthday, sendCobranca, sendWelcome,
      sendProfNewBooking, sendProfReminder24h, sendProfReminder60min,
      menuEnabled, menuWelcomeMsg, menuOptions,
    } = req.body;
    try {
      const config = await (prisma as any).wppBotConfig.upsert({
        where: { tenantId },
        create: {
          id: randomUUID(), tenantId,
          botEnabled: !!botEnabled,
          sendConfirmation: sendConfirmation !== false,
          sendReminder24h: sendReminder24h !== false,
          sendReminder60min: sendReminder60min !== false,
          sendBirthday: sendBirthday !== false,
          sendCobranca: !!sendCobranca,
          sendWelcome: sendWelcome !== false,
          sendProfNewBooking: sendProfNewBooking !== false,
          sendProfReminder24h: sendProfReminder24h !== false,
          sendProfReminder60min: !!sendProfReminder60min,
          menuEnabled: !!menuEnabled,
          menuWelcomeMsg: menuWelcomeMsg || null,
          menuOptions: JSON.stringify(menuOptions || []),
        },
        update: {
          ...(botEnabled !== undefined && { botEnabled: !!botEnabled }),
          ...(sendConfirmation !== undefined && { sendConfirmation: !!sendConfirmation }),
          ...(sendReminder24h !== undefined && { sendReminder24h: !!sendReminder24h }),
          ...(sendReminder60min !== undefined && { sendReminder60min: !!sendReminder60min }),
          ...(sendBirthday !== undefined && { sendBirthday: !!sendBirthday }),
          ...(sendCobranca !== undefined && { sendCobranca: !!sendCobranca }),
          ...(sendWelcome !== undefined && { sendWelcome: !!sendWelcome }),
          ...(sendProfNewBooking !== undefined && { sendProfNewBooking: !!sendProfNewBooking }),
          ...(sendProfReminder24h !== undefined && { sendProfReminder24h: !!sendProfReminder24h }),
          ...(sendProfReminder60min !== undefined && { sendProfReminder60min: !!sendProfReminder60min }),
          ...(menuEnabled !== undefined && { menuEnabled: !!menuEnabled }),
          ...(menuWelcomeMsg !== undefined && { menuWelcomeMsg: menuWelcomeMsg || null }),
          ...(menuOptions !== undefined && { menuOptions: JSON.stringify(menuOptions || []) }),
        },
      });
      res.json(config);
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },

  /** POST /api/wpp/send-test — envia mensagem de teste */
  async sendTest(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });
    const { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: "phone e message obrigatórios." });
    try {
      const info = getSessionInfo(tenantId);
      if (info.status !== "connected") {
        return res.status(400).json({ error: "WhatsApp não está conectado. Escaneie o QR Code primeiro." });
      }
      await sendMessage(tenantId, phone, String(message));
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message });
    }
  },
};
