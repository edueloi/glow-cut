import { Request, Response } from "express";
import { prisma } from "../prisma";
import { randomUUID } from "crypto";
import { getTenantId, normalizePhone } from "../utils/helpers";

const DEFAULT_TEMPLATES = [
  {
    type: "confirmation",
    name: "Confirmação de Agendamento",
    body: "{{saudacao}}, *{{nome_cliente}}*! Seu agendamento em *{{nome_estabelecimento}}* está confirmado para *{{data_agendamento}}* às *{{hora_agendamento}}* com *{{profissional}}* para *{{servico}}*.",
  },
  {
    type: "reminder_24h",
    name: "Lembrete 24h Antes",
    body: "{{saudacao}}, *{{nome_cliente}}*! Passando para lembrar do seu horário amanhã, *{{data_agendamento}}* às *{{hora_agendamento}}*, para *{{servico}}* com *{{profissional}}*.",
  },
  {
    type: "birthday",
    name: "Parabéns de Aniversário",
    body: "{{saudacao}}, *{{nome_cliente}}*! Toda a equipe de *{{nome_estabelecimento}}* te deseja um feliz aniversário e um novo ciclo incrível. 🎉",
  },
  {
    type: "cobranca",
    name: "Cobrança / Pagamento Pendente",
    body: "{{saudacao}}, *{{nome_cliente}}*! Ficou pendente um valor referente ao seu atendimento em *{{nome_estabelecimento}}*. Se precisar, responda esta mensagem para regularizarmos juntos.",
  },
  {
    type: "welcome",
    name: "Boas-vindas",
    body: "{{saudacao}}, *{{nome_cliente}}*! Seja bem-vindo(a) a *{{nome_estabelecimento}}*. Qualquer dúvida, estamos por aqui.",
  },
];

function sanitizeApiUrl(apiUrl: string) {
  return apiUrl.replace(/\/+$/, "");
}

function getHeaders(apiKey?: string, withJson = false) {
  const headers: Record<string, string> = {};
  if (apiKey) headers.apikey = apiKey;
  if (withJson) headers["Content-Type"] = "application/json";
  return headers;
}

function getErrorMessage(payload: any, fallback: string) {
  if (!payload) return fallback;
  return payload?.response?.message || payload?.message || payload?.error || fallback;
}

function normalizeStatus(rawStatus?: string | null) {
  const status = String(rawStatus || "").toLowerCase();
  if (["open", "connected"].includes(status)) return "connected";
  if (["connecting", "qr", "qrcode", "pairing", "qr_pending"].includes(status)) return "qr_pending";
  if (["close", "closed", "logout", "disconnected"].includes(status)) return "disconnected";
  return "not_configured";
}

async function evolutionRequest(instance: any, path: string, init: RequestInit = {}) {
  const response = await fetch(`${sanitizeApiUrl(instance.apiUrl)}${path}`, {
    ...init,
    headers: {
      ...getHeaders(instance.apiKey, !!init.body),
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text || null;
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, `Evolution API retornou ${response.status}.`));
  }

  return payload;
}

function findRemoteInstance(payload: any, instanceName: string) {
  const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.response) ? payload.response : [];
  return rows.find((row: any) => row?.instance?.instanceName === instanceName)?.instance || null;
}

async function ensureRemoteInstance(instance: any) {
  const fetched = await evolutionRequest(instance, "/instance/fetchInstances");
  const current = findRemoteInstance(fetched, instance.instanceName);
  if (current) return current;

  await evolutionRequest(instance, "/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName: instance.instanceName,
      integration: "WHATSAPP-BAILEYS",
      token: instance.apiKey || "",
      qrcode: false,
    }),
  });

  const refetched = await evolutionRequest(instance, "/instance/fetchInstances");
  return findRemoteInstance(refetched, instance.instanceName);
}

async function qrTextToDataUrl(qrText: string) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrText)}`;
  const response = await fetch(qrUrl);
  if (!response.ok) return null;
  const bytes = Buffer.from(await response.arrayBuffer());
  return `data:image/png;base64,${bytes.toString("base64")}`;
}

async function ensureTemplates(tenantId: string) {
  for (const template of DEFAULT_TEMPLATES) {
    const existing = await (prisma as any).wppMessageTemplate.findUnique({
      where: { tenantId_type: { tenantId, type: template.type } },
    });

    if (!existing) {
      await (prisma as any).wppMessageTemplate.create({
        data: {
          id: randomUUID(),
          tenantId,
          type: template.type,
          name: template.name,
          body: template.body,
          isActive: true,
          isDefault: true,
        },
      });
    }
  }
}

async function ensureBotConfig(tenantId: string) {
  const existing = await (prisma as any).wppBotConfig.findUnique({ where: { tenantId } });
  if (existing) return existing;

  return (prisma as any).wppBotConfig.create({
    data: {
      id: randomUUID(),
      tenantId,
      botEnabled: false,
      sendConfirmation: true,
      sendReminder24h: true,
      sendBirthday: true,
      sendCobranca: false,
      sendWelcome: true,
      menuEnabled: false,
      menuWelcomeMsg: "",
      menuOptions: "[]",
    },
  });
}

async function syncInstanceStatus(instance: any) {
  const statePayload = await evolutionRequest(instance, `/instance/connectionState/${encodeURIComponent(instance.instanceName)}`);
  const remoteState = statePayload?.instance?.state || statePayload?.status;
  const remoteStatus = normalizeStatus(remoteState);

  let phone: string | null = instance.phone || null;
  try {
    const fetched = await evolutionRequest(instance, "/instance/fetchInstances");
    const remote = findRemoteInstance(fetched, instance.instanceName);
    if (remote?.owner) phone = normalizePhone(remote.owner);
  } catch {
    // status sync continua sem telefone
  }

  return (prisma as any).wppInstance.update({
    where: { tenantId: instance.tenantId },
    data: {
      status: remoteStatus,
      phone,
      isActive: remoteStatus === "connected",
      qrCode: remoteStatus === "connected" ? null : instance.qrCode,
    },
  });
}

export const wppController = {
  async getInstance(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const instance = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      if (!instance) return res.json(null);
      res.json(instance);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar instância." });
    }
  },

  async saveInstance(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const { instanceName, apiUrl, apiKey } = req.body;
    if (!instanceName || !apiUrl) {
      return res.status(400).json({ error: "instanceName e apiUrl são obrigatórios." });
    }

    try {
      const instance = await (prisma as any).wppInstance.upsert({
        where: { tenantId },
        create: {
          id: randomUUID(),
          tenantId,
          instanceName: String(instanceName).trim(),
          apiUrl: String(apiUrl).trim(),
          apiKey: String(apiKey || "").trim() || null,
          status: "disconnected",
          isActive: false,
        },
        update: {
          instanceName: String(instanceName).trim(),
          apiUrl: String(apiUrl).trim(),
          apiKey: String(apiKey || "").trim() || null,
        },
      });

      await Promise.all([ensureTemplates(tenantId), ensureBotConfig(tenantId)]);
      res.json(instance);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao salvar instância." });
    }
  },

  async connect(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const instance = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      if (!instance) return res.status(404).json({ error: "Instância não configurada." });

      await ensureRemoteInstance(instance);
      const payload = await evolutionRequest(instance, `/instance/connect/${encodeURIComponent(instance.instanceName)}`);
      const qrRaw = payload?.code || payload?.qrcode || payload?.base64 || null;
      const qrCode = qrRaw
        ? (
            qrRaw.startsWith?.("data:")
              ? qrRaw
              : (qrRaw.length > 500 && /^[A-Za-z0-9+/=\r\n]+$/.test(qrRaw))
                ? qrRaw
                : await qrTextToDataUrl(qrRaw)
          )
        : null;

      const updated = await (prisma as any).wppInstance.update({
        where: { tenantId },
        data: {
          status: qrCode ? "qr_pending" : "disconnected",
          qrCode,
          isActive: false,
        },
      });

      res.json({
        ...updated,
        pairingCode: payload?.pairingCode || null,
      });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao conectar WhatsApp." });
    }
  },

  async status(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const instance = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      if (!instance) return res.json({ status: "not_configured" });

      const synced = await syncInstanceStatus(instance);
      res.json({ status: synced.status, phone: synced.phone || null });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao verificar status." });
    }
  },

  async disconnect(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const instance = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      if (!instance) return res.status(404).json({ error: "Instância não configurada." });

      await evolutionRequest(instance, `/instance/logout/${encodeURIComponent(instance.instanceName)}`, {
        method: "DELETE",
      });

      await (prisma as any).wppInstance.update({
        where: { tenantId },
        data: {
          status: "disconnected",
          isActive: false,
          qrCode: null,
          phone: null,
        },
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao desconectar WhatsApp." });
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
      res.status(500).json({ error: e?.message || "Erro ao buscar templates." });
    }
  },

  async updateTemplate(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const { body, name, isActive } = req.body;
    if (!req.params.type) return res.status(400).json({ error: "Tipo do template é obrigatório." });

    try {
      const current = DEFAULT_TEMPLATES.find((template) => template.type === req.params.type);
      const template = await (prisma as any).wppMessageTemplate.upsert({
        where: { tenantId_type: { tenantId, type: req.params.type } },
        create: {
          id: randomUUID(),
          tenantId,
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
      res.status(400).json({ error: e?.message || "Erro ao salvar template." });
    }
  },

  async getBotConfig(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    try {
      const config = await ensureBotConfig(tenantId);
      res.json(config);
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Erro ao buscar configurações do bot." });
    }
  },

  async updateBotConfig(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const {
      botEnabled,
      sendConfirmation,
      sendReminder24h,
      sendBirthday,
      sendCobranca,
      sendWelcome,
      menuEnabled,
      menuWelcomeMsg,
      menuOptions,
    } = req.body;

    try {
      const config = await (prisma as any).wppBotConfig.upsert({
        where: { tenantId },
        create: {
          id: randomUUID(),
          tenantId,
          botEnabled: !!botEnabled,
          sendConfirmation: sendConfirmation !== false,
          sendReminder24h: sendReminder24h !== false,
          sendBirthday: sendBirthday !== false,
          sendCobranca: !!sendCobranca,
          sendWelcome: sendWelcome !== false,
          menuEnabled: !!menuEnabled,
          menuWelcomeMsg: menuWelcomeMsg || null,
          menuOptions: JSON.stringify(menuOptions || []),
        },
        update: {
          ...(botEnabled !== undefined && { botEnabled: !!botEnabled }),
          ...(sendConfirmation !== undefined && { sendConfirmation: !!sendConfirmation }),
          ...(sendReminder24h !== undefined && { sendReminder24h: !!sendReminder24h }),
          ...(sendBirthday !== undefined && { sendBirthday: !!sendBirthday }),
          ...(sendCobranca !== undefined && { sendCobranca: !!sendCobranca }),
          ...(sendWelcome !== undefined && { sendWelcome: !!sendWelcome }),
          ...(menuEnabled !== undefined && { menuEnabled: !!menuEnabled }),
          ...(menuWelcomeMsg !== undefined && { menuWelcomeMsg: menuWelcomeMsg || null }),
          ...(menuOptions !== undefined && { menuOptions: JSON.stringify(menuOptions || []) }),
        },
      });
      res.json(config);
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao salvar configurações do bot." });
    }
  },

  async sendTest(req: Request, res: Response) {
    const tenantId = getTenantId(req);
    if (!tenantId) return res.status(400).json({ error: "tenantId obrigatório." });

    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "phone e message são obrigatórios." });
    }

    try {
      const instance = await (prisma as any).wppInstance.findUnique({ where: { tenantId } });
      if (!instance) return res.status(404).json({ error: "Instância não configurada." });

      await evolutionRequest(instance, `/message/sendText/${encodeURIComponent(instance.instanceName)}`, {
        method: "POST",
        body: JSON.stringify({
          number: normalizePhone(phone),
          text: String(message),
        }),
      });

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Erro ao enviar mensagem teste." });
    }
  },
};
