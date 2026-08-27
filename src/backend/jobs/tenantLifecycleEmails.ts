import { prisma } from "../prisma";
import { sendExpiringSoonEmail, sendWinbackEmail } from "../utils/emailService";

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRING_SOON_WINDOW_DAYS = 5;
const WINBACK_MIN_DAYS = 3;
const WINBACK_MAX_DAYS = 4;

/**
 * Roda uma vez por dia (chamado a partir de server.ts). Verifica:
 *  - Tenants ativos com o plano vencendo em breve → aviso de renovação.
 *  - Tenants bloqueados/inativos há alguns dias → e-mail de reativação (win-back).
 *
 * Deduplicação: compara a data do último e-mail enviado contra a data do evento atual
 * (expiresAt/blockedAt) em vez de zerar um campo em outro lugar do código — se o tenant
 * renovou ou foi bloqueado de novo depois do último envio, a comparação já libera um novo
 * envio sozinha, sem precisar mexer no webhook do Stripe nem no super-admin.
 */
export async function runTenantLifecycleEmailsCheck(): Promise<void> {
  await checkExpiringSoon().catch((e) => console.error("[TenantLifecycleEmails] Erro no check de vencimento:", e));
  await checkWinback().catch((e) => console.error("[TenantLifecycleEmails] Erro no check de win-back:", e));
}

async function checkExpiringSoon(): Promise<void> {
  const now = new Date();
  const soon = new Date(now.getTime() + EXPIRING_SOON_WINDOW_DAYS * DAY_MS);

  const candidates = await (prisma as any).tenant.findMany({
    where: { isActive: true, expiresAt: { gte: now, lte: soon } },
    select: { id: true, name: true, ownerEmail: true, ownerName: true, expiresAt: true, expiryReminderSentAt: true },
  });

  for (const t of candidates) {
    if (!t.expiresAt || !t.ownerEmail) continue;
    const cycleStart = new Date(t.expiresAt.getTime() - 20 * DAY_MS);
    const alreadySentThisCycle = t.expiryReminderSentAt && t.expiryReminderSentAt >= cycleStart;
    if (alreadySentThisCycle) continue;

    const daysLeft = Math.max(1, Math.round((t.expiresAt.getTime() - now.getTime()) / DAY_MS));
    try {
      await sendExpiringSoonEmail({
        toEmail: t.ownerEmail,
        toName: t.ownerName || "profissional",
        tenantName: t.name,
        expiresAt: t.expiresAt,
        daysLeft,
      });
      await (prisma as any).tenant.update({ where: { id: t.id }, data: { expiryReminderSentAt: now } });
      console.log(`[TenantLifecycleEmails] Aviso de vencimento enviado: ${t.name} (${t.ownerEmail})`);
    } catch (e) {
      console.error(`[TenantLifecycleEmails] Falha ao enviar aviso de vencimento pra ${t.ownerEmail}:`, e);
    }
  }
}

async function checkWinback(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINBACK_MAX_DAYS * DAY_MS);
  const windowEnd = new Date(now.getTime() - WINBACK_MIN_DAYS * DAY_MS);

  const candidates = await (prisma as any).tenant.findMany({
    where: { isActive: false, blockedAt: { gte: windowStart, lte: windowEnd } },
    select: { id: true, name: true, ownerEmail: true, ownerName: true, blockedAt: true, winbackEmailSentAt: true },
  });

  for (const t of candidates) {
    if (!t.blockedAt || !t.ownerEmail) continue;
    const alreadySentThisCycle = t.winbackEmailSentAt && t.winbackEmailSentAt >= t.blockedAt;
    if (alreadySentThisCycle) continue;

    try {
      await sendWinbackEmail({
        toEmail: t.ownerEmail,
        toName: t.ownerName || "profissional",
        tenantName: t.name,
      });
      await (prisma as any).tenant.update({ where: { id: t.id }, data: { winbackEmailSentAt: now } });
      console.log(`[TenantLifecycleEmails] E-mail de win-back enviado: ${t.name} (${t.ownerEmail})`);
    } catch (e) {
      console.error(`[TenantLifecycleEmails] Falha ao enviar win-back pra ${t.ownerEmail}:`, e);
    }
  }
}
