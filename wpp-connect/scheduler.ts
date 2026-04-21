/**
 * wpp-connect/scheduler.ts
 *
 * Processo PM2 ISOLADO — roda independente do app principal (agendelle).
 * Reiniciar/rebuildar o app NÃO afeta este processo.
 *
 * PM2: pm2 start wpp-connect/scheduler.ts --name agendelle-wpp --interpreter tsx
 *
 * Responsabilidades:
 *  - A cada minuto, checa agendamentos que precisam de lembrete 24h
 *  - A cada minuto, checa agendamentos que precisam de lembrete 60min
 *  - Envia mensagem para o CLIENTE e para o PROFISSIONAL (quando habilitado)
 *  - Usa a mesma tabela WppMessageSent para deduplicação (evita envio duplo)
 *  - Usa Baileys via baileys-manager (sem Evolution API)
 */

import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";
import { addHours, addMinutes, format } from "date-fns";

// Garante que o path resolve corretamente quando rodando de wpp-connect/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");

// Configura cwd para root do projeto, necessário para baileys-manager encontrar wpp-sessions/
process.chdir(ROOT);

// Import baileys-manager e wppController do app principal
import { sendMessage, getSessionInfo, restoreAllSessions } from "../src/backend/wpp/baileys-manager.js";

// Envia usando bot do parceiro; fallback para bot do sistema
async function sendWppToPhone(tenantId: string, phone: string, text: string): Promise<void> {
  try {
    const info = getSessionInfo(tenantId);
    if (info.status === "connected") {
      await sendMessage(tenantId, phone, text);
      return;
    }
    const systemInfo = getSessionInfo("system");
    if (systemInfo.status === "connected") {
      await sendMessage("system", phone, text);
      return;
    }
    console.log(`[WPP Scheduler] Sem sessão conectada para ${tenantId} nem system — mensagem descartada`);
  } catch (e) {
    console.warn(`[WPP Scheduler][${tenantId}] sendWppToPhone error:`, e);
  }
}

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSaudacao(): string {
  // Pega a hora atual no fuso do Brasil, independente do fuso do servidor
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false });
  const h = parseInt(dateStr, 10);
  
  if (h >= 6 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function applyVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}


async function getTemplate(tenantId: string, type: string): Promise<string | null> {
  try {
    const t = await (prisma as any).wppMessageTemplate.findUnique({
      where: { tenantId_type: { tenantId, type } },
    });
    if (t?.isActive && t?.body) return t.body;
  } catch {}
  return null;
}

async function wasSent(appointmentId: string, type: string): Promise<boolean> {
  try {
    const r = await (prisma as any).wppMessageSent.findUnique({
      where: { appointmentId_type: { appointmentId, type } },
    });
    return !!r;
  } catch {
    return false;
  }
}

async function markSent(appointmentId: string, type: string, tenantId: string): Promise<void> {
  try {
    await (prisma as any).wppMessageSent.upsert({
      where: { appointmentId_type: { appointmentId, type } },
      create: { appointmentId, type, tenantId, sentAt: new Date() },
      update: { sentAt: new Date() },
    });
  } catch (err) {
    console.warn("[WPP Scheduler] markSent error:", err);
  }
}

// ─── Helper: checa se tenant tem WPP ativo ───────────────────────────────────

async function tenantHasWpp(tenantId: string): Promise<boolean> {
  try {
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
      select: { wppOverride: true, planId: true },
    });
    if (!tenant) return false;

    if (tenant.wppOverride === true) return true;
    if (tenant.wppOverride === false) return false;

    const plan = await (prisma as any).plan.findUnique({
      where: { id: tenant.planId },
      select: { wppEnabled: true },
    });
    return !!plan?.wppEnabled;
  } catch {
    return false;
  }
}

// ─── Cron: Lembrete 24h ──────────────────────────────────────────────────────

async function processReminders24h(): Promise<void> {
  const now = new Date();
  const windowStart = addHours(now, 23);
  const windowEnd = addHours(now, 25);

  try {
    const appts: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT
        a.id, a.tenantId, a.startTime, a.date,
        c.name  AS clientName,  c.phone AS clientPhone,
        p.name  AS profName,    p.phone AS profPhone,
        s.name  AS serviceName
      FROM Appointment a
      LEFT JOIN Client       c ON c.id = a.clientId
      LEFT JOIN Professional p ON p.id = a.professionalId
      LEFT JOIN Service      s ON s.id = a.serviceId
      WHERE a.status IN ('scheduled','confirmed')
        AND a.date >= ? AND a.date < ?
    `, windowStart, windowEnd);

    for (const appt of appts) {
      if (!appt.tenantId) continue;

      const isWppEnabled = await tenantHasWpp(appt.tenantId);
      if (!isWppEnabled) continue;

      const [config, tenant] = await Promise.all([
        (prisma as any).wppBotConfig.findUnique({ where: { tenantId: appt.tenantId } }),
        (prisma as any).tenant.findUnique({ where: { id: appt.tenantId }, select: { name: true } }),
      ]);

      if (!config?.botEnabled) continue;

      const vars: Record<string, string> = {
        saudacao: getSaudacao(),
        nome_cliente: appt.clientName || "",
        profissional: appt.profName || "",
        servico: appt.serviceName || "",
        nome_estabelecimento: tenant?.name || "",
        data_agendamento: new Date(appt.date).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" }),
        hora_agendamento: appt.startTime || "",
      };

      // Mensagem para o CLIENTE
      if (config.sendReminder24h && appt.clientPhone) {
        const key = `reminder_24h_client`;
        if (!(await wasSent(appt.id, key))) {
          const tpl = await getTemplate(appt.tenantId, "reminder_24h");
          if (tpl) {
            await sendWppToPhone(appt.tenantId, appt.clientPhone, applyVars(tpl, vars));
            await markSent(appt.id, key, appt.tenantId);
            console.log(`[WPP 24h] Cliente ${appt.clientName} → ${appt.clientPhone}`);
          }
        }
      }

      // Mensagem para o PROFISSIONAL
      if (config.sendProfReminder24h && appt.profPhone) {
        const key = `reminder_24h_prof`;
        if (!(await wasSent(appt.id, key))) {
          const tpl = await getTemplate(appt.tenantId, "prof_reminder_24h");
          if (tpl) {
            await sendWppToPhone(appt.tenantId, appt.profPhone, applyVars(tpl, vars));
            await markSent(appt.id, key, appt.tenantId);
            console.log(`[WPP 24h] Profissional ${appt.profName} → ${appt.profPhone}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[WPP Scheduler] processReminders24h error:", err);
  }
}

// ─── Cron: Lembrete 60min ────────────────────────────────────────────────────

async function processReminders60min(): Promise<void> {
  const now = new Date();
  const windowStart = addMinutes(now, 55);
  const windowEnd = addMinutes(now, 65);

  const timeStart = format(windowStart, "HH:mm");
  const timeEnd = format(windowEnd, "HH:mm");
  const dateStr = format(now, "yyyy-MM-dd");

  try {
    const appts: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT
        a.id, a.tenantId, a.startTime, a.date,
        c.name  AS clientName,  c.phone AS clientPhone,
        p.name  AS profName,    p.phone AS profPhone,
        s.name  AS serviceName
      FROM Appointment a
      LEFT JOIN Client       c ON c.id = a.clientId
      LEFT JOIN Professional p ON p.id = a.professionalId
      LEFT JOIN Service      s ON s.id = a.serviceId
      WHERE a.status IN ('scheduled','confirmed')
        AND DATE(a.date) = ?
        AND a.startTime >= ? AND a.startTime < ?
    `, dateStr, timeStart, timeEnd);

    for (const appt of appts) {
      if (!appt.tenantId) continue;

      const isWppEnabled = await tenantHasWpp(appt.tenantId);
      if (!isWppEnabled) continue;

      const [config, tenant] = await Promise.all([
        (prisma as any).wppBotConfig.findUnique({ where: { tenantId: appt.tenantId } }),
        (prisma as any).tenant.findUnique({ where: { id: appt.tenantId }, select: { name: true } }),
      ]);

      if (!config?.botEnabled) continue;

      const vars: Record<string, string> = {
        saudacao: getSaudacao(),
        nome_cliente: appt.clientName || "",
        profissional: appt.profName || "",
        servico: appt.serviceName || "",
        nome_estabelecimento: tenant?.name || "",
        data_agendamento: new Date(appt.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        hora_agendamento: appt.startTime || "",
      };

      // Mensagem para o CLIENTE
      if (config.sendReminder60min && appt.clientPhone) {
        const key = `reminder_60min_client`;
        if (!(await wasSent(appt.id, key))) {
          const tpl = await getTemplate(appt.tenantId, "reminder_60min");
          if (tpl) {
            await sendWppToPhone(appt.tenantId, appt.clientPhone, applyVars(tpl, vars));
            await markSent(appt.id, key, appt.tenantId);
            console.log(`[WPP 60min] Cliente ${appt.clientName} → ${appt.clientPhone}`);
          }
        }
      }

      // Mensagem para o PROFISSIONAL
      if (config.sendProfReminder60min && appt.profPhone) {
        const key = `reminder_60min_prof`;
        if (!(await wasSent(appt.id, key))) {
          const tpl = await getTemplate(appt.tenantId, "prof_reminder_60min");
          if (tpl) {
            await sendWppToPhone(appt.tenantId, appt.profPhone, applyVars(tpl, vars));
            await markSent(appt.id, key, appt.tenantId);
            console.log(`[WPP 60min] Profissional ${appt.profName} → ${appt.profPhone}`);
          }
        }
      }
    }
  } catch (err) {
    console.error("[WPP Scheduler] processReminders60min error:", err);
  }
}

// ─── Cron: Aniversários ──────────────────────────────────────────────────────

async function processBirthdays(): Promise<void> {
  const now = new Date();
  const brHourStr = new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false });
  const brHour = parseInt(brHourStr, 10);

  // Somente envia feliz aniversário entre as 09:00 e 18:00
  if (brHour < 9 || brHour > 18) return;

  const currentMonthNum = now.getMonth() + 1;
  const currentDay = now.getDate();
  const currentYear = now.getFullYear();

  try {
    const clients: any[] = await (prisma as any).$queryRawUnsafe(`
      SELECT c.id, c.tenantId, c.name, c.phone, c.birthDate, t.name as tenantName
      FROM Client c
      JOIN Tenant t ON t.id = c.tenantId
      WHERE c.birthDate IS NOT NULL AND c.birthDate != ''
    `);

    for (const client of clients) {
      if (!client.tenantId || !client.phone) continue;

      const parts = client.birthDate.split(/[-/]/);
      let day, month;
      if (parts[0].length === 4) { // yyyy-mm-dd
        day = parseInt(parts[2], 10);
        month = parseInt(parts[1], 10);
      } else { // dd/mm/yyyy
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }

      if (day !== currentDay || month !== currentMonthNum) continue;

      const isWppEnabled = await tenantHasWpp(client.tenantId);
      if (!isWppEnabled) continue;

      const config = await (prisma as any).wppBotConfig.findUnique({ where: { tenantId: client.tenantId } });
      if (!config?.botEnabled || !config?.sendBirthday) continue;

      const keyType = `birthday_${currentYear}`;
      // Reutiliza wppMessageSent, passando o ID do cliente no lugar do appointmentId
      const hasSent = await wasSent(client.id, keyType); 
      if (hasSent) continue;

      const tpl = await getTemplate(client.tenantId, "birthday");
      if (tpl) {
        const vars: Record<string, string> = {
          saudacao: getSaudacao(),
          nome_cliente: client.name || "",
          nome_estabelecimento: client.tenantName || "",
        };

        await sendWppToPhone(client.tenantId, client.phone, applyVars(tpl, vars));
        await markSent(client.id, keyType, client.tenantId);
        console.log(`[WPP Birthday] Cliente ${client.name} → ${client.phone}`);
      }
    }
  } catch (err) {
    console.error("[WPP Scheduler] processBirthdays error:", err);
  }
}

// ─── Loop principal ──────────────────────────────────────────────────────────

async function tick(): Promise<void> {
  console.log(`[WPP Scheduler] tick ${new Date().toISOString()}`);
  await Promise.allSettled([processReminders24h(), processReminders60min(), processBirthdays()]);
}

async function main() {
  console.log("[WPP Scheduler] Iniciando processo isolado...");

  // Cria tabela de deduplicação se não existir
  try {
    await (prisma as any).$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS WppMessageSent (
        id            VARCHAR(36)  NOT NULL DEFAULT (UUID()),
        appointmentId VARCHAR(36)  NOT NULL,
        type          VARCHAR(50)  NOT NULL,
        tenantId      VARCHAR(36)  NOT NULL,
        sentAt        DATETIME(0)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_wpp_sent (appointmentId, type),
        KEY idx_wpp_sent_tenant (tenantId),
        KEY idx_wpp_sent_sent (sentAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  } catch (e: any) {
    console.warn("[WPP Scheduler] WppMessageSent table:", e?.message);
  }

  // Restaura sessões Baileys que tinham creds salvas em disco
  try {
    await restoreAllSessions();
    console.log("[WPP Scheduler] Sessões Baileys restauradas.");
  } catch (e) {
    console.warn("[WPP Scheduler] restoreAllSessions error:", e);
  }

  // Executa imediatamente e depois a cada 60 segundos
  await tick();
  setInterval(tick, 60_000);
}

main().catch((e) => {
  console.error("[WPP Scheduler] Fatal:", e);
  process.exit(1);
});
