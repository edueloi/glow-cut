import webpush from "web-push";
import { randomUUID } from "crypto";
import { prisma } from "../prisma";
import { normalizePhone } from "../utils/helpers";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
}

let configured = false;

export function configureWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    console.warn("[WebPush] VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY/VAPID_SUBJECT ausentes — push notifications desativadas.");
    return;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export function isWebPushConfigured(): boolean {
  return configured;
}

export async function saveSubscription(params: {
  tenantId: string;
  phone: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  const phone = normalizePhone(params.phone);
  if (!phone) throw new Error("Telefone inválido.");

  const client = await (prisma as any).client.findFirst({
    where: { tenantId: params.tenantId, phone },
    select: { id: true },
  });

  const existing = await (prisma as any).pushSubscription.findUnique({ where: { endpoint: params.endpoint } });
  if (existing) {
    await (prisma as any).pushSubscription.update({
      where: { endpoint: params.endpoint },
      data: { tenantId: params.tenantId, role: "client", clientId: client?.id || null, phone, professionalId: null, p256dh: params.p256dh, auth: params.auth, userAgent: params.userAgent || null },
    });
    return;
  }

  await (prisma as any).pushSubscription.create({
    data: {
      id: randomUUID(),
      tenantId: params.tenantId,
      role: "client",
      clientId: client?.id || null,
      phone,
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      userAgent: params.userAgent || null,
    },
  });
}

export async function saveProfessionalSubscription(params: {
  tenantId: string;
  professionalId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  const existing = await (prisma as any).pushSubscription.findUnique({ where: { endpoint: params.endpoint } });
  if (existing) {
    await (prisma as any).pushSubscription.update({
      where: { endpoint: params.endpoint },
      data: { tenantId: params.tenantId, role: "professional", professionalId: params.professionalId, phone: null, clientId: null, p256dh: params.p256dh, auth: params.auth, userAgent: params.userAgent || null },
    });
    return;
  }

  await (prisma as any).pushSubscription.create({
    data: {
      id: randomUUID(),
      tenantId: params.tenantId,
      role: "professional",
      professionalId: params.professionalId,
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      userAgent: params.userAgent || null,
    },
  });
}

// Admin/dono logado no painel — recebe todo novo agendamento do salão (visão de gestor), não só
// os de um profissional específico. Sem clientId/phone/professionalId: identificado só por
// tenantId+role, já que pode haver mais de um admin/usuário por tenant recebendo o mesmo aviso.
export async function saveAdminSubscription(params: {
  tenantId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}): Promise<void> {
  const existing = await (prisma as any).pushSubscription.findUnique({ where: { endpoint: params.endpoint } });
  if (existing) {
    await (prisma as any).pushSubscription.update({
      where: { endpoint: params.endpoint },
      data: { tenantId: params.tenantId, role: "admin", professionalId: null, phone: null, clientId: null, p256dh: params.p256dh, auth: params.auth, userAgent: params.userAgent || null },
    });
    return;
  }

  await (prisma as any).pushSubscription.create({
    data: {
      id: randomUUID(),
      tenantId: params.tenantId,
      role: "admin",
      endpoint: params.endpoint,
      p256dh: params.p256dh,
      auth: params.auth,
      userAgent: params.userAgent || null,
    },
  });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await (prisma as any).pushSubscription.deleteMany({ where: { endpoint } });
}

// Envia a mesma push message pra uma lista de subscriptions já resolvida — compartilhado entre
// sendPushToPhone (cliente) e sendPushToProfessional. Subscription expirada/revogada (404/410 do
// próprio endpoint do navegador) é removida do banco na hora, senão o histórico de endpoints
// mortos só cresce e continua sendo tentado pra sempre.
async function deliver(tenantId: string, subs: any[], payload: PushPayload): Promise<void> {
  if (subs.length === 0) return;
  await Promise.all(subs.map(async (sub: any) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
    } catch (e: any) {
      const statusCode = e?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await (prisma as any).pushSubscription.deleteMany({ where: { id: sub.id } });
      } else {
        console.warn(`[WebPush][${tenantId}] Falha ao enviar para ${sub.endpoint}:`, e?.message || e);
      }
    }
  }));
}

// Fire-and-forget: manda pra TODAS as subscriptions daquele telefone+tenant (o cliente pode ter
// instalado o app em mais de um aparelho).
export async function sendPushToPhone(tenantId: string, phone: string, payload: PushPayload): Promise<void> {
  if (!configured) return;
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  try {
    const subs = await (prisma as any).pushSubscription.findMany({ where: { tenantId, phone: normalized } });
    await deliver(tenantId, subs, payload);
  } catch (e: any) {
    console.warn(`[WebPush][${tenantId}] sendPushToPhone error:`, e?.message || e);
  }
}

// Fire-and-forget: notifica o PROFISSIONAL logado (novo agendamento, etc) — identificado por
// professionalId (sessão autenticada), não por telefone como o cliente.
export async function sendPushToProfessional(tenantId: string, professionalId: string, payload: PushPayload): Promise<void> {
  if (!configured || !professionalId) return;
  try {
    const subs = await (prisma as any).pushSubscription.findMany({ where: { tenantId, professionalId, role: "professional" } });
    await deliver(tenantId, subs, payload);
  } catch (e: any) {
    console.warn(`[WebPush][${tenantId}] sendPushToProfessional error:`, e?.message || e);
  }
}

// Fire-and-forget: notifica TODOS os admins/donos do tenant que ativaram push no painel —
// usado pra "todo novo agendamento do salão" (visão de gestor), independente de qual
// profissional foi escolhido pelo cliente.
export async function sendPushToTenantAdmins(tenantId: string, payload: PushPayload): Promise<void> {
  if (!configured) return;
  try {
    const subs = await (prisma as any).pushSubscription.findMany({ where: { tenantId, role: "admin" } });
    await deliver(tenantId, subs, payload);
  } catch (e: any) {
    console.warn(`[WebPush][${tenantId}] sendPushToTenantAdmins error:`, e?.message || e);
  }
}
