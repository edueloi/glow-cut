/**
 * baileys-manager.ts — Bot Central com Fila por Setor
 *
 * Fluxo do cliente:
 *  1. Msg → pede nome
 *  2. Pede assunto
 *  3. Exibe menu de setores
 *  4. Entra na fila do setor → recebe posição (1°, 2°, 3°...)
 *  5. Atendentes são notificados. ACEITAR aceita o 1° da fila. RECUSAR pula para o próximo.
 *  6. Quando atendimento encerra → próximo da fila é notificado e atendentes recebem novo alerta
 *  7. &SAIR ou 0 encerra. Inatividade 30min encerra.
 */

import path from "path";
import fs from "fs";
import { prisma } from "../prisma";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WppStatus = "not_configured" | "disconnected" | "qr_pending" | "connecting" | "connected";

export interface SessionInfo {
  tenantId: string;
  status: WppStatus;
  phone: string | null;
  qrDataUrl: string | null;
}

interface ActiveSession {
  sock: any;
  status: WppStatus;
  phone: string | null;
  qrDataUrl: string | null;
  qrRaw: string | null;
  listeners: Set<(info: SessionInfo) => void>;
}

type ClientStep = "ask_name" | "main_menu" | "ask_subject" | "menu" | "waiting" | "in_chat";

interface ClientState {
  step: ClientStep;
  remoteJid: string;      // JID original Baileys — usar SEMPRE para enviar
  name?: string;
  subject?: string;
  sectorId?: string;
  sectorName?: string;
  attendantJid?: string;
  conversationId?: string;
  queuePos?: number;       // posição na fila (1-based)
  lastActivity: number;
  warnedInactive?: boolean;
}

// Map<tenantId, Map<clientKey, ClientState>>
const clientStates = new Map<string, Map<string, ClientState>>();
// Map<tenantId, Map<attJid, clientKey>> — ponte atendente→cliente
const attToClient = new Map<string, Map<string, string>>();
// Map<tenantId, Map<sectorId, clientKey[]>> — fila ordenada por chegada
const sectorQueues = new Map<string, Map<string, string[]>>();

interface PendingAttendantAction {
  clientKey: string;
  sectorId: string;
  sectorName: string;
  expiresAt: number;
}

const pendingAttendantActions = new Map<string, Map<string, PendingAttendantAction>>();
const PENDING_ATTENDANT_ACTION_MS = 30 * 60 * 1000;

function getPendingAttendantMap(tenantId: string): Map<string, PendingAttendantAction> {
  if (!pendingAttendantActions.has(tenantId)) {
    pendingAttendantActions.set(tenantId, new Map());
  }

  return pendingAttendantActions.get(tenantId)!;
}

function pendingAttendantKey(jid: string): string {
  return normalizeForKey(jid);
}

function setPendingAttendantAction(
  tenantId: string,
  attJid: string,
  action: Omit<PendingAttendantAction, "expiresAt">
) {
  getPendingAttendantMap(tenantId).set(pendingAttendantKey(attJid), {
    ...action,
    expiresAt: Date.now() + PENDING_ATTENDANT_ACTION_MS,
  });
}

function getPendingAttendantAction(
  tenantId: string,
  attJid: string
): PendingAttendantAction | undefined {
  const map = getPendingAttendantMap(tenantId);
  const key = pendingAttendantKey(attJid);
  const action = map.get(key);

  if (!action) return undefined;

  if (Date.now() > action.expiresAt) {
    map.delete(key);
    return undefined;
  }

  return action;
}

function clearPendingAttendantAction(tenantId: string, attJid: string) {
  getPendingAttendantMap(tenantId).delete(pendingAttendantKey(attJid));
}

function clearPendingActionsForClient(tenantId: string, clientKey: string) {
  const map = getPendingAttendantMap(tenantId);

  for (const [attKey, action] of map.entries()) {
    if (action.clientKey === clientKey) {
      map.delete(attKey);
    }
  }
}

const INACTIVITY_WARN_MS = 15 * 60 * 1000;
const INACTIVITY_CLOSE_MS = 20 * 60 * 1000;
const EXIT_CMD   = /^&sair$/i;
const BACK_CMD   = /^(0|menu|inicio|início|voltar|cancelar|sair)$/i;
const ACCEPT_CMD = /^(aceitar|1)$/i;
const REFUSE_CMD = /^(recusar|0)$/i;

setInterval(() => cleanInactive(), 5 * 60 * 1000);

const sessions = new Map<string, ActiveSession>();
const SESSIONS_DIR = path.join(process.cwd(), "wpp-sessions");

// ── Helpers JID ───────────────────────────────────────────────────────────────

function jidToPhone(jid: string): string {
  return jid.replace(/@.*/, "").replace(/:[0-9]+$/, "");
}

function phoneToJid(phone: string): string {
  const d = String(phone).replace(/\D/g, "");
  return `${d.startsWith("55") ? d : `55${d}`}@s.whatsapp.net`;
}

function normalizeForKey(jid: string): string {
  return jid.replace(/@.*/, "").replace(/:[0-9]+$/, "");
}

function normalizePhoneDigits(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function getBrazilPhoneVariants(phone: string): string[] {
  const normalized = normalizePhoneDigits(phone);
  const variants = new Set<string>([normalized]);

  if (normalized.startsWith("55")) {
    const country = normalized.slice(0, 2);
    const ddd = normalized.slice(2, 4);
    const number = normalized.slice(4);

    // Com nono dígito
    if (number.length === 9 && number.startsWith("9")) {
      variants.add(`${country}${ddd}${number.slice(1)}`);
    }

    // Sem nono dígito
    if (number.length === 8) {
      variants.add(`${country}${ddd}9${number}`);
    }
  }

  return Array.from(variants);
}

function jidMatchesPhone(jid: string, phone: string): boolean {
  const jidPhone = normalizeForKey(jid);
  return getBrazilPhoneVariants(phone).includes(jidPhone);
}

function saudacao(): string {
  const h = parseInt(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

async function qrToDataUrl(q: string): Promise<string | null> {
  try { const QR = await import("qrcode"); return await QR.default.toDataURL(q, { width: 300, margin: 2 }); }
  catch { return null; }
}

function makeLogger(): any {
  const noop = () => {};
  const l: any = { level: "silent", trace: noop, debug: noop, info: noop, warn: noop, error: noop };
  l.child = () => makeLogger(); return l;
}

function broadcast(tenantId: string) {
  const s = sessions.get(tenantId);
  if (!s) return;
  const info: SessionInfo = { tenantId, status: s.status, phone: s.phone, qrDataUrl: s.qrDataUrl };
  s.listeners.forEach(fn => { try { fn(info); } catch {} });
}

async function updateDb(tenantId: string, status: WppStatus, phone: string | null, qrCode: string | null) {
  try {
    await (prisma as any).wppInstance.updateMany({
      where: { tenantId },
      data: { status, phone, isActive: status === "connected", qrCode: status === "connected" ? null : qrCode },
    });
  } catch {}
}

// ── Estado do cliente ─────────────────────────────────────────────────────────

function getState(tenantId: string, key: string): ClientState | undefined {
  return clientStates.get(tenantId)?.get(key);
}

function setState(tenantId: string, key: string, state: ClientState) {
  if (!clientStates.has(tenantId)) clientStates.set(tenantId, new Map());
  clientStates.get(tenantId)!.set(key, { ...state, lastActivity: Date.now(), warnedInactive: false });
}

function clearState(tenantId: string, key: string) {
  const s = clientStates.get(tenantId)?.get(key);
  if (s?.attendantJid) attToClient.get(tenantId)?.delete(s.attendantJid);
  if (s?.sectorId) removeFromQueue(tenantId, s.sectorId, key);
  clientStates.get(tenantId)?.delete(key);
}

function touch(tenantId: string, key: string) {
  const s = clientStates.get(tenantId)?.get(key);
  if (s) {
    s.lastActivity = Date.now();
    s.warnedInactive = false;
  }
}

// ── Fila por setor ────────────────────────────────────────────────────────────

function getQueue(tenantId: string, sectorId: string): string[] {
  if (!sectorQueues.has(tenantId)) sectorQueues.set(tenantId, new Map());
  const m = sectorQueues.get(tenantId)!;
  if (!m.has(sectorId)) m.set(sectorId, []);
  return m.get(sectorId)!;
}

function addToQueue(tenantId: string, sectorId: string, clientKey: string): number {
  const q = getQueue(tenantId, sectorId);
  if (!q.includes(clientKey)) q.push(clientKey);
  return q.indexOf(clientKey) + 1; // posição 1-based
}

function removeFromQueue(tenantId: string, sectorId: string, clientKey: string) {
  const q = getQueue(tenantId, sectorId);
  const idx = q.indexOf(clientKey);
  if (idx !== -1) q.splice(idx, 1);
}

function queuePosition(tenantId: string, sectorId: string, clientKey: string): number {
  return getQueue(tenantId, sectorId).indexOf(clientKey) + 1;
}

function nextInQueue(tenantId: string, sectorId: string): string | undefined {
  return getQueue(tenantId, sectorId)[0];
}

/** Atualiza posição de todos na fila e avisa quem avançou */
async function notifyQueueUpdate(tenantId: string, sectorId: string, sectorName: string, sock: any) {
  const q = getQueue(tenantId, sectorId);
  for (let i = 0; i < q.length; i++) {
    const key = q[i];
    const state = getState(tenantId, key);
    if (!state || state.step !== "waiting") continue;
    const pos = i + 1;
    const oldPos = state.queuePos ?? pos;
    setState(tenantId, key, { ...state, queuePos: pos });
    if (pos !== oldPos) {
      // Avançou na fila
      const emoji = pos === 1 ? "🟢" : pos === 2 ? "🟡" : "🔴";
      await send(sock, state.remoteJid,
        `${emoji} *Atualização da fila — ${sectorName}*\n\n` +
        `Você avançou! Agora está na posição *${pos}°* da fila.\n` +
        (pos === 1 ? `Você é o próximo! Um atendente irá te chamar em instantes. 🎉` : `Aguarde, há *${pos - 1}* pessoa(s) na sua frente.`) +
        `\n\n_Digite *sair* ou *0* a qualquer momento para cancelar._`
      );
    }
  }
}

// ── Ponte atendente ───────────────────────────────────────────────────────────

function linkAtt(tenantId: string, attJid: string, clientKey: string) {
  if (!attToClient.has(tenantId)) attToClient.set(tenantId, new Map());
  attToClient.get(tenantId)!.set(attJid, clientKey);
}

function unlinkAtt(tenantId: string, attJid: string) {
  attToClient.get(tenantId)?.delete(attJid);
}

function clientByAtt(tenantId: string, attJid: string): string | undefined {
  return attToClient.get(tenantId)?.get(attJid);
}

// ── Limpeza inatividade ───────────────────────────────────────────────────────

async function cleanInactive() {
  const now = Date.now();
  for (const [tenantId, map] of clientStates.entries()) {
    const sock = sessions.get(tenantId)?.sock;
    for (const [key, state] of map.entries()) {
      if (state.step === "waiting") {
        // Não encerra se estiver na fila aguardando
        continue;
      }
      
      const elapsed = now - state.lastActivity;
      
      if (elapsed > INACTIVITY_CLOSE_MS) {
        console.log(`[Bot] Inatividade: ${key}`);
        if (sock) {
          try { await sock.sendMessage(state.remoteJid, { text: `⏰ Atendimento encerrado por falta de interação.\n\nQualquer hora que precisar é só mandar mensagem de novo! 😊` }); } catch {}
          if (state.attendantJid && state.step === "in_chat") {
            try { await sock.sendMessage(state.attendantJid, { text: `ℹ️ Conversa com *${state.name || key}* encerrada por inatividade do cliente.` }); } catch {}
          }
        }
        if (state.conversationId) await closeConv(state.conversationId, "system").catch(() => {});
        const sectorId = state.sectorId;
        const sectorName = state.sectorName || "";
        clearState(tenantId, key);
        if (sectorId && sock) await notifyQueueUpdate(tenantId, sectorId, sectorName, sock).catch(() => {});
      } else if (elapsed > INACTIVITY_WARN_MS && !state.warnedInactive) {
        state.warnedInactive = true;
        if (sock) {
          try { await sock.sendMessage(state.remoteJid, { text: `👀 Oi! Tem alguém aí?\n\nSeu atendimento será encerrado em 5 minutos por inatividade. Responda algo para continuarmos.` }); } catch {}
        }
      }
    }
  }
}

// ── DB helpers ────────────────────────────────────────────────────────────────

async function loadSectors(tenantId: string): Promise<any[]> {
  try {
    return await (prisma as any).wppBotSector.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch { return []; }
}

async function createConv(tenantId: string, sectorId: string, clientPhone: string, name: string, subject: string): Promise<string> {
  const conv = await (prisma as any).wppConversation.create({
    data: { tenantId, sectorId, clientPhone, clientName: name, status: "waiting", firstMessage: subject },
  });
  await saveMsg(conv.id, "bot", undefined, `Conversa iniciada. Cliente: ${name}, Assunto: ${subject}`);
  return conv.id;
}

async function closeConv(id: string, by: string) {
  await (prisma as any).wppConversation.update({ where: { id }, data: { status: "closed", closedBy: by, closedAt: new Date() } }).catch(() => {});
}

async function saveMsg(convId: string, role: string, phone: string | undefined, body: string) {
  await (prisma as any).wppConversationMessage.create({ data: { conversationId: convId, fromRole: role, fromPhone: phone || null, body } }).catch(() => {});
}

// ── Envio fila anti-spam ──────────────────────────────────────────────────────

const sendQ = new Map<string, Promise<void>>();

async function send(sock: any, jid: string, text: string) {
  const prev = sendQ.get(jid) || Promise.resolve();
  const next = prev.then(async () => {
    try {
      const delay = Math.min(1000 + (text.length / 100) * 1500, 3500);
      
      await sock.presenceSubscribe(jid).catch(() => {});
      await sock.sendPresenceUpdate("composing", jid).catch(() => {});
      
      await new Promise(r => setTimeout(r, delay));
      
      await sock.sendPresenceUpdate("paused", jid).catch(() => {});
      
      await sock.sendMessage(jid, { text });
      console.log(`[Bot] → ${jid.slice(0, 15)}: ${text.slice(0, 50)}`);
    } catch (e) { console.warn(`[Bot] Erro envio ${jid}:`, e); }
  });
  sendQ.set(jid, next);
  next.finally(() => { if (sendQ.get(jid) === next) sendQ.delete(jid); });
  return next;
}

// ── Mensagens ─────────────────────────────────────────────────────────────────

function msgMainMenu(name: string, sectors: any[]): string {
  let t = `Olá, *${name}*! Como posso te ajudar hoje?\n\n`;
  
  t += `*1* — Como funciona a plataforma?\n`;
  t += `*2* — Planos e Valores\n`;
  t += `*3* — Conhecer a Agendelle\n`;
  t += `*4* — Conhecer a Develoi\n\n`;

  if (sectors && sectors.length > 0) {
    for (const s of sectors) {
      t += `*${s.menuKey}* — ${s.name}\n`;
    }
    t += `\n`;
  }
  
  t += `*0* — Encerrar Atendimento\n`;
  
  return t;
}

function msgComoFunciona(): string {
  return (
    `*Como funciona o sistema?*\n\n` +
    `A plataforma foi desenhada para ser simples e poderosa:\n\n` +
    `• *Link de Agendamento:* Você ganha um site próprio onde seus clientes agendam sozinhos 24h por dia.\n` +
    `• *Gestão Completa:* Acompanhe seu caixa, lance comandas, gerencie comissões da equipe e controle o estoque de produtos.\n` +
    `• *WhatsApp:* Envie lembretes automáticos de horários para evitar faltas e atenda clientes através do nosso bot inteligente integrado.\n\n` +
    `Tudo em um só lugar, acessível pelo celular ou computador.`
  );
}

function msgConhecerAgendelle(): string {
  return (
    `*Conheça a Agendelle*\n\n` +
    `A Agendelle nasceu para revolucionar a forma como profissionais e empresas gerenciam seus negócios e se conectam com seus clientes.\n\n` +
    `Muito mais que uma agenda, somos uma plataforma completa de gestão que oferece vitrine digital, agendamento online inteligente, controle financeiro, gestão de comandas, comissionamento automático e atendimento automatizado via WhatsApp.\n\n` +
    `Nosso objetivo é tirar a burocracia do seu dia a dia para que você tenha mais tempo livre e foque no que realmente importa: encantar seus clientes e fazer seu negócio crescer.\n\n` +
    `Saiba mais em nosso site oficial:\n` +
    `👉 https://agendelle.com.br`
  );
}

function msgConhecerDeveloi(): string {
  return (
    `*Conheça a Develoi*\n\n` +
    `A Develoi é a software house responsável por dar vida a grandes projetos como a Agendelle.\n\n` +
    `Somos especialistas em desenvolver soluções tecnológicas sob medida, desde aplicativos móveis e sistemas web complexos até integrações avançadas e inteligência artificial.\n\n` +
    `Se você tem uma ideia de negócio ou precisa transformar a tecnologia da sua empresa, nós podemos ajudar a construir o futuro do seu projeto.\n\n` +
    `Conheça nosso trabalho e portfólio:\n` +
    `👉 https://develoi.com.br`
  );
}

async function sendPlanosFlow(sock: any, remoteJid: string, name: string, sectors: any[]) {
  try {
    const plans = await (prisma as any).plan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' }
    });
    
    if (!plans || plans.length === 0) {
      await send(sock, remoteJid, `*Nossos Planos*\n\nNo momento não temos planos configurados. Acesse https://agendelle.com.br para mais informações.`);
      await send(sock, remoteJid, msgMainMenu(name, sectors));
      return;
    }

    await send(sock, remoteJid, `*Nossos Planos e Valores*\n\nConheça as opções que preparamos para você e aproveite *30 DIAS GRÁTIS* para testar o sistema completo! 🎁`);
    
    for (const p of plans) {
      let t = `*${p.name}* — R$ ${p.price.toFixed(2).replace('.', ',')}/mês\n`;
      const features = [];
      if (p.maxProfessionals > 0) features.push(`Até ${p.maxProfessionals} Profissionais`);
      if (p.siteEnabled) features.push(`Site/Vitrine`);
      if (p.agendaExternaEnabled) features.push(`Agendamento Online`);
      if (p.qrCodeBotEnabled) features.push(`Bot Próprio do WhatsApp`);
      else if (p.systemBotEnabled) features.push(`Notificações WhatsApp`);
      
      if (features.length > 0) {
        t += `_${features.join(" • ")}_\n`;
      }
      await send(sock, remoteJid, t.trim());
    }
    
    await send(sock, remoteJid, `Para iniciar seus 30 dias grátis, assine agora pelo link seguro:\n👉 https://agendelle.com.br/assinar?ref=b150f27b-917b-43a4-8d86-541301c65b1d`);
    
    await send(sock, remoteJid, msgMainMenu(name, sectors));
  } catch (e) {
    await send(sock, remoteJid, `*Nossos Planos*\n\nAcesse nosso site para conferir a tabela completa: https://agendelle.com.br`);
    await send(sock, remoteJid, msgMainMenu(name, sectors));
  }
}

function msgFila(pos: number, sectorName: string, total: number): string {
  if (pos === 1) {
    return (
      `✅ Você entrou na fila do setor *${sectorName}*!\n\n` +
      `🟢 Você é o *1° da fila* — será atendido em instantes!\n\n` +
      `_Digite *sair* ou *0* para cancelar._`
    );
  }
  return (
    `✅ Você entrou na fila do setor *${sectorName}*!\n\n` +
    `🔴 Sua posição: *${pos}°* na fila\n` +
    `👥 Total aguardando: *${total}* pessoa(s)\n\n` +
    `Você será notificado conforme avançar na fila.\n` +
    `_Digite *sair* ou *0* para cancelar._`
  );
}

function msgNotifAtendente(name: string, subject: string, clientKey: string, sectorName: string, pos: number, total: number): string {
  return (
    `🔔 *Nova solicitação — ${sectorName}*\n\n` +
    `👤 Cliente: *${name}*\n` +
    `📱 Número: *${clientKey}*\n` +
    `💬 Assunto: _${subject}_\n` +
    `📋 Fila: *${pos}° de ${total}*\n\n` +
    `Digite *1* para ACEITAR\n` +
    `Digite *0* para RECUSAR`
  );
}

// ── Fluxo do cliente ──────────────────────────────────────────────────────────

async function handleClient(tenantId: string, sock: any, remoteJid: string, clientKey: string, text: string, pushName: string) {
  const trimmed = text.trim();
  const state = getState(tenantId, clientKey);

  if (EXIT_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "client"); return; }

  if (!state) {
    const sectors = await loadSectors(tenantId);
    setState(tenantId, clientKey, { step: "main_menu", remoteJid, lastActivity: Date.now(), name: pushName });
    await send(sock, remoteJid, `${saudacao()}! Bem-vindo(a) ao atendimento *Agendelle*.\n\n` + msgMainMenu(pushName, sectors));
    return;
  }

  touch(tenantId, clientKey);

  if (state.step === "main_menu") {
    if (BACK_CMD.test(trimmed)) {
       if (trimmed.toLowerCase() === "sair" || trimmed === "0") {
          await doExit(tenantId, sock, clientKey, "client");
       } else {
          await send(sock, remoteJid, `Comando inválido. Digite uma das opções do menu ou *0* para sair.`);
       }
       return;
    }
    
    const upper = trimmed.toUpperCase();
    const sectors = await loadSectors(tenantId);
    
    if (upper === "1") {
       await send(sock, remoteJid, msgComoFunciona());
       await send(sock, remoteJid, msgMainMenu(state.name!, sectors));
       return;
    }
    if (upper === "2") {
       await sendPlanosFlow(sock, remoteJid, state.name!, sectors);
       return;
    }
    if (upper === "3") {
       await send(sock, remoteJid, msgConhecerAgendelle());
       await send(sock, remoteJid, msgMainMenu(state.name!, sectors));
       return;
    }
    if (upper === "4") {
       await send(sock, remoteJid, msgConhecerDeveloi());
       await send(sock, remoteJid, msgMainMenu(state.name!, sectors));
       return;
    }
    
    const chosen = sectors.find(s => String(s.menuKey).toLowerCase() === trimmed.toLowerCase());
    
    if (chosen) {
       setState(tenantId, clientKey, { ...state, step: "ask_name", sectorId: chosen.id, sectorName: chosen.name });
       await send(sock, remoteJid, `Certo! Para agilizarmos o atendimento no setor *${chosen.name}*, por favor, me diga seu *nome completo*:`);
       return;
    }
    
    await send(sock, remoteJid, `Opção inválida. Digite uma das opções do menu ou *0* para sair.`);
    return;
  }

  if (state.step === "ask_name") {
    if (BACK_CMD.test(trimmed)) {
       if (trimmed.toLowerCase() === "sair") { await doExit(tenantId, sock, clientKey, "client"); return; }
       const sectors = await loadSectors(tenantId);
       setState(tenantId, clientKey, { ...state, step: "main_menu", sectorId: undefined, sectorName: undefined });
       await send(sock, remoteJid, msgMainMenu(state.name!, sectors));
       return;
    }
    if (trimmed.length < 2) { await send(sock, remoteJid, `Por favor, informe seu *nome completo*:`); return; }
    setState(tenantId, clientKey, { ...state, step: "ask_subject", name: trimmed });
    await send(sock, remoteJid, `Obrigado, *${trimmed}*! E qual é o assunto que você gostaria de tratar?`);
    return;
  }

  if (state.step === "ask_subject") {
    if (BACK_CMD.test(trimmed)) {
       if (trimmed.toLowerCase() === "sair") {
          await doExit(tenantId, sock, clientKey, "client");
          return;
       }
       const sectors = await loadSectors(tenantId);
       setState(tenantId, clientKey, { ...state, step: "main_menu", sectorId: undefined, sectorName: undefined });
       await send(sock, remoteJid, msgMainMenu(state.name!, sectors));
       return;
    }
    if (trimmed.length < 3) { await send(sock, remoteJid, `Por favor, descreva melhor o assunto:`); return; }
    
    const sectors = await loadSectors(tenantId);
    const chosen = sectors.find(s => s.id === state.sectorId);
    
    if (!chosen) {
      await send(sock, remoteJid, `Nossa equipe de atendimento está indisponível no momento.`);
      setState(tenantId, clientKey, { ...state, step: "main_menu", sectorId: undefined, sectorName: undefined });
      await send(sock, remoteJid, msgMainMenu(state.name!, sectors));
      return;
    }
    
    const newState = { ...state, subject: trimmed };
    setState(tenantId, clientKey, newState);
    await enterSector(tenantId, sock, clientKey, newState, chosen);
    return;
  }

  if (state.step === "waiting") {
    if (BACK_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "client"); return; }
    const pos = state.sectorId ? queuePosition(tenantId, state.sectorId, clientKey) : "?";
    await send(sock, remoteJid, `⏳ Você está na posição *${pos}°* da fila. Aguarde.\n_Digite *sair* ou *0* para sair da fila._`);
    return;
  }

  if (state.step === "in_chat") {
    if (BACK_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "client"); return; }
    if (state.attendantJid) {
      await send(sock, state.attendantJid, `💬 *${state.name}*: ${trimmed}`);
      if (state.conversationId) await saveMsg(state.conversationId, "client", clientKey, trimmed);
    }
    return;
  }
}

interface AttendantEntry { phone: string; name: string; }

function parseAttendants(raw: string): AttendantEntry[] {
  try {
    const arr = JSON.parse(raw || "[]");
    return arr.map((a: any) =>
      typeof a === "object" && a !== null
        ? { phone: String(a.phone || "").replace(/\D/g, ""), name: String(a.name || "").trim() }
        : { phone: String(a).replace(/\D/g, ""), name: "" }
    ).filter((a: AttendantEntry) => a.phone.length >= 10);
  } catch { return []; }
}

async function enterSector(tenantId: string, sock: any, clientKey: string, state: ClientState, sector: any) {
  const attendants = parseAttendants(sector.attendants);

  if (attendants.length === 0) {
    await send(sock, state.remoteJid, `😔 O setor *${sector.name}* não tem atendentes disponíveis no momento. Por favor, escolha outra opção.`);
    const sectors = await loadSectors(tenantId);
    setState(tenantId, clientKey, { ...state, step: "main_menu", sectorId: undefined, sectorName: undefined });
    await send(sock, state.remoteJid, msgMainMenu(state.name!, sectors));
    return;
  }

  const convId = await createConv(tenantId, sector.id, clientKey, state.name!, state.subject!);
  const pos = addToQueue(tenantId, sector.id, clientKey);
  const total = getQueue(tenantId, sector.id).length;

  setState(tenantId, clientKey, {
    ...state,
    step: "waiting",
    sectorId: sector.id,
    sectorName: sector.name,
    conversationId: convId,
    queuePos: pos,
  });

  await send(sock, state.remoteJid, msgFila(pos, sector.name, total));

  // Só notifica atendentes se for o 1° da fila (os demais chegam depois)
  if (pos === 1) {
    for (const att of attendants) {
      const attJid = phoneToJid(att.phone);
      try {
        setPendingAttendantAction(tenantId, attJid, {
          clientKey,
          sectorId: sector.id,
          sectorName: sector.name,
        });

        await sock.sendMessage(attJid, {
          text: msgNotifAtendente(state.name!, state.subject!, clientKey, sector.name, pos, total),
        });
      } catch (e) { console.warn(`[Bot] Notif atendente ${att.phone}:`, e); }
    }
  }
}

/** Resolve o JID real de um telefone usando sock.onWhatsApp */
async function resolvePhoneToJid(sock: any, phone: string): Promise<string | null> {
  try {
    const d = String(phone).replace(/\D/g, "");
    const full = d.startsWith("55") ? d : `55${d}`;
    const results = await sock.onWhatsApp(full);
    if (results && results.length > 0 && results[0].exists) {
      return normalizeForKey(results[0].jid);
    }
  } catch {}
  return null;
}

/** Retorna o nome registrado do atendente no setor, ou fallback para pushName */
async function resolveAttendantName(tenantId: string, sock: any, attJid: string, pushName: string, sectorId?: string): Promise<string> {
  const normalizedAtt = normalizeForKey(attJid);
  try {
    const sectors = sectorId
      ? [await (prisma as any).wppBotSector.findUnique({ where: { id: sectorId } })]
      : await (prisma as any).wppBotSector.findMany({ where: { tenantId, isActive: true } });
    for (const sector of sectors) {
      if (!sector) continue;
      const attendants = parseAttendants(sector.attendants);
      for (const att of attendants) {
        const resolvedJid = await resolvePhoneToJid(sock, att.phone);
        if (resolvedJid && resolvedJid === normalizedAtt) {
          return att.name || pushName;
        }
      }
    }
  } catch {}
  return pushName;
}

async function isAttendant(tenantId: string, sock: any, attJid: string): Promise<boolean> {
  const normalizedAtt = normalizeForKey(attJid);

  try {
    const sectors = await (prisma as any).wppBotSector.findMany({
      where: { tenantId, isActive: true },
    });

    for (const sector of sectors) {
      const attendants = parseAttendants(sector.attendants);

      for (const att of attendants) {
        if (jidMatchesPhone(attJid, att.phone)) {
          return true;
        }

        const resolvedJid = await resolvePhoneToJid(sock, att.phone);

        if (resolvedJid && resolvedJid === normalizedAtt) {
          return true;
        }
      }
    }
  } catch {}

  return false;
}

// ── Fluxo do atendente ────────────────────────────────────────────────────────

async function handleAttendant(tenantId: string, sock: any, attJid: string, attName: string, text: string): Promise<boolean> {
  const trimmed = text.trim();

  // Atendente tem cliente vinculado (ponte ativa)
  const clientKey = clientByAtt(tenantId, attJid);
  if (clientKey) {
    const state = getState(tenantId, clientKey);
    if (!state || state.step !== "in_chat") { unlinkAtt(tenantId, attJid); return false; }

    if (EXIT_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "attendant"); return true; }
    const displayName = await resolveAttendantName(tenantId, sock, attJid, attName, state.sectorId);
    await send(sock, state.remoteJid, `💬 *${displayName}*: ${trimmed}`);
    if (state.conversationId) await saveMsg(state.conversationId, "attendant", attJid, trimmed);
    touch(tenantId, clientKey);
    return true;
  }

  // Atendente responde ACEITAR / RECUSAR para fila
  if (ACCEPT_CMD.test(trimmed) || REFUSE_CMD.test(trimmed)) {
    const pendingAction = getPendingAttendantAction(tenantId, attJid);
    const isAtt = pendingAction ? true : await isAttendant(tenantId, sock, attJid);

    console.log(`[Bot][DEBUG] handleAttendant: jid=${attJid} isAtt=${isAtt} hasPending=${!!pendingAction}`);

    if (!isAtt) return false;

    let waiting = pendingAction?.clientKey;

    if (!waiting) {
      waiting = await findWaitingForAttendant(tenantId, sock, attJid);
    }

    if (!waiting) {
      await send(sock, attJid, `ℹ️ Não há clientes aguardando na fila para o(s) seu(s) setor(es) no momento.`);
      return true;
    }

    const state = getState(tenantId, waiting);

    if (!state || state.step !== "waiting") {
      clearPendingAttendantAction(tenantId, attJid);
      await send(sock, attJid, `ℹ️ Essa solicitação já não está mais disponível.`);
      return true;
    }

    const currentFirst = state.sectorId ? nextInQueue(tenantId, state.sectorId) : undefined;

    if (currentFirst !== waiting) {
      clearPendingAttendantAction(tenantId, attJid);
      await send(sock, attJid, `ℹ️ Esse cliente não é mais o primeiro da fila.`);
      return true;
    }

    if (REFUSE_CMD.test(trimmed)) {
      removeFromQueue(tenantId, state.sectorId!, waiting);
      clearPendingActionsForClient(tenantId, waiting);

      const sectors = await loadSectors(tenantId);

      setState(tenantId, waiting, {
        ...state,
        step: "main_menu",
        attendantJid: undefined,
        queuePos: undefined,
        sectorId: undefined,
        sectorName: undefined,
      });

      await send(sock, state.remoteJid, `😔 O setor *${state.sectorName}* está *ocupado* no momento. Por favor, escolha outra opção.`);
      await send(sock, state.remoteJid, msgMainMenu(state.name!, sectors));

      if (state.conversationId) {
        await closeConv(state.conversationId, "attendant_refused");
      }

      await send(sock, attJid, `ℹ️ Você recusou o atendimento de *${state.name}*.`);

      await notifyQueueUpdate(tenantId, state.sectorId!, state.sectorName!, sock);
      await callNextInQueue(tenantId, sock, state.sectorId!, state.sectorName!);

      return true;
    }

    const displayName = await resolveAttendantName(tenantId, sock, attJid, attName, state.sectorId);

    linkAtt(tenantId, attJid, waiting);
    removeFromQueue(tenantId, state.sectorId!, waiting);
    clearPendingActionsForClient(tenantId, waiting);

    setState(tenantId, waiting, {
      ...state,
      step: "in_chat",
      attendantJid: attJid,
      queuePos: undefined,
    });

    await (prisma as any).wppConversation.update({
      where: { id: state.conversationId },
      data: {
        status: "active",
        attendantPhone: jidToPhone(attJid),
      },
    }).catch(() => {});

    if (state.conversationId) {
      await saveMsg(state.conversationId, "bot", undefined, `${displayName} aceitou.`);
    }

    await send(sock, state.remoteJid, `🎉 *${displayName}* aceitou seu atendimento!\n\nPode enviar sua mensagem normalmente.\n_Digite *sair* ou *0* para encerrar._`);

    await send(sock, attJid, `✅ Atendendo *${state.name}*.\n💬 Assunto: _${state.subject}_\n\n_Digite *&SAIR* para encerrar._`);

    await notifyQueueUpdate(tenantId, state.sectorId!, state.sectorName!, sock);

    return true;
  }

  return false;
}

/** Busca o 1° da fila em qualquer setor que contenha este atendente */
async function findWaitingForAttendant(tenantId: string, sock: any, attJid: string): Promise<string | undefined> {
  const normalizedAtt = normalizeForKey(attJid);
  const map = sectorQueues.get(tenantId);
  if (!map) return undefined;

  for (const [sectorId, queue] of map.entries()) {
    if (queue.length === 0) continue;
    try {
      const sector = await (prisma as any).wppBotSector.findUnique({ where: { id: sectorId } });
      if (!sector) continue;
      const attendants = parseAttendants(sector.attendants);
      for (const att of attendants) {
        const resolvedJid = await resolvePhoneToJid(sock, att.phone);
        console.log(`[Bot][DEBUG] findWaiting: sector=${sector.name} attPhone=${att.phone} resolvedJid=${resolvedJid} normalizedAtt=${normalizedAtt} match=${resolvedJid === normalizedAtt}`);
        if (resolvedJid && resolvedJid === normalizedAtt) return queue[0];
      }
    } catch {}
  }
  return undefined;
}

/** Notifica atendentes quando o próximo da fila está aguardando */
async function callNextInQueue(tenantId: string, sock: any, sectorId: string, sectorName: string) {
  const nextKey = nextInQueue(tenantId, sectorId);
  if (!nextKey) return;
  const state = getState(tenantId, nextKey);
  if (!state || state.step !== "waiting") return;

  try {
    const sector = await (prisma as any).wppBotSector.findUnique({ where: { id: sectorId } });
    if (!sector) return;
    const attendants = parseAttendants(sector.attendants);
    const total = getQueue(tenantId, sectorId).length;
    for (const att of attendants) {
      const attJid = phoneToJid(att.phone);
      try {
        setPendingAttendantAction(tenantId, attJid, {
          clientKey: nextKey,
          sectorId,
          sectorName,
        });

        await sock.sendMessage(attJid, {
          text: msgNotifAtendente(state.name!, state.subject!, nextKey, sectorName, 1, total),
        });
      } catch {}
    }
  } catch {}
}

// ── Encerrar ──────────────────────────────────────────────────────────────────

async function doExit(tenantId: string, sock: any, clientKey: string, by: "client" | "attendant" | "system") {
  const state = getState(tenantId, clientKey);
  if (!state) return;

  clearPendingActionsForClient(tenantId, clientKey);

  const sectorId = state.sectorId;
  const sectorName = state.sectorName || "";

  if (state.conversationId) {
    await closeConv(state.conversationId, by);
    await saveMsg(state.conversationId, "bot", undefined, `Encerrado por ${by}.`);
  }
  if (state.attendantJid && state.step === "in_chat") {
    unlinkAtt(tenantId, state.attendantJid);
    if (by === "client") {
      await send(sock, state.attendantJid, `ℹ️ *${state.name || clientKey}* encerrou o atendimento.`);
    }
  }

  clearState(tenantId, clientKey);
  await send(sock, state.remoteJid, `✅ Atendimento encerrado. Obrigado por entrar em contato! 😊\n\nQualquer hora que precisar é só mandar mensagem.`);

  // Se saiu da fila, notifica próximos e chama atendentes
  if (sectorId && (state.step === "waiting" || state.step === "in_chat")) {
    // Se saiu da fila enquanto esperava, avisa os atendentes
    if (state.step === "waiting" && by === "client") {
      try {
        const sector = await (prisma as any).wppBotSector.findUnique({ where: { id: sectorId } });
        if (sector) {
          const attendants = parseAttendants(sector.attendants);
          for (const att of attendants) {
            const attJid = phoneToJid(att.phone);
            await send(sock, attJid, `ℹ️ O cliente *${state.name || clientKey}* cancelou a solicitação no setor *${sectorName}* e saiu da fila.`);
          }
        }
      } catch {}
    }

    await notifyQueueUpdate(tenantId, sectorId, sectorName, sock).catch(() => {});
    if (state.step === "in_chat") {
      // Atendimento encerrado → chama próximo da fila
      await callNextInQueue(tenantId, sock, sectorId, sectorName).catch(() => {});
    }
  }
}

// ── Sessão Baileys ────────────────────────────────────────────────────────────

export async function initSession(tenantId: string): Promise<void> {
  const existing = sessions.get(tenantId);
  if (existing && existing.status === "connected") return;
  if (existing?.sock) { try { existing.sock.end(); } catch {} sessions.delete(tenantId); }

  let makeWASocket: any, useMultiFileAuthState: any, DisconnectReason: any;
  try {
    const b = await import("@whiskeysockets/baileys");
    makeWASocket = (b as any).makeWASocket || b.default;
    useMultiFileAuthState = b.useMultiFileAuthState;
    DisconnectReason = b.DisconnectReason;
    if (!makeWASocket || !useMultiFileAuthState) throw new Error("Baileys exports not found");
  } catch (e: any) { console.error("[Baileys] Não instalado:", e?.message); await updateDb(tenantId, "disconnected", null, null); return; }

  const dir = path.join(SESSIONS_DIR, tenantId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  let waVersion: [number, number, number] = [2, 3000, 1015901307];
  try { const { fetchLatestBaileysVersion } = await import("@whiskeysockets/baileys"); waVersion = (await fetchLatestBaileysVersion()).version; } catch {}

  const session: ActiveSession = { sock: null, status: "connecting", phone: null, qrDataUrl: null, qrRaw: null, listeners: existing?.listeners ?? new Set() };
  sessions.set(tenantId, session);

  const sock = makeWASocket({ version: waVersion, auth: state, browser: ["Chrome (Linux)", "", ""], printQRInTerminal: false, syncFullHistory: false, markOnlineOnConnect: false, connectTimeoutMs: 60_000, retryRequestDelayMs: 2000, logger: makeLogger() });
  session.sock = sock;

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) { session.qrRaw = qr; session.status = "qr_pending"; session.qrDataUrl = await qrToDataUrl(qr); await updateDb(tenantId, "qr_pending", null, session.qrDataUrl); broadcast(tenantId); }
    if (connection === "open") {
      session.status = "connected"; session.phone = jidToPhone(sock.user?.id || ""); session.qrDataUrl = null; session.qrRaw = null;
      await updateDb(tenantId, "connected", session.phone, null); broadcast(tenantId);
      console.log(`[Baileys][${tenantId}] Conectado como ${session.phone}`);
    }
    if (connection === "close") {
      const loggedOut = (lastDisconnect?.error as any)?.output?.statusCode === DisconnectReason.loggedOut;
      session.status = "disconnected"; session.qrDataUrl = null; session.phone = null;
      await updateDb(tenantId, "disconnected", null, null); broadcast(tenantId);
      if (loggedOut) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch {} sessions.delete(tenantId); }
      else setTimeout(() => initSession(tenantId), 5000);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m: any) => {
    if (m.type !== "notify") return;
    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const remoteJid: string = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us")) continue;
      const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
      if (!text) continue;
      const clientKey = normalizeForKey(remoteJid);
      const pushName: string = msg.pushName || clientKey;
      // if (tenantId !== "system") continue;
      console.log(`[Bot] ${clientKey} (${pushName}): ${text}`);
      try {
        const handled = await handleAttendant(tenantId, sock, remoteJid, pushName, text);

        if (handled) {
          continue;
        }

        const registeredAttendant = await isAttendant(tenantId, sock, remoteJid);

        if (registeredAttendant) {
          await send(
            sock,
            remoteJid,
            `ℹ️ Você está cadastrado como atendente.\n\nQuando receber uma nova solicitação, digite *1* para aceitar ou *0* para recusar.\n\nO menu automático é exibido apenas para clientes.`
          );
          continue;
        }

        await handleClient(tenantId, sock, remoteJid, clientKey, text, pushName);
      } catch (e) { console.error(`[Bot] Erro:`, e); }
    }
  });
}

// ── API pública ───────────────────────────────────────────────────────────────

export function getSessionInfo(tenantId: string): SessionInfo {
  const s = sessions.get(tenantId);
  return { tenantId, status: s?.status ?? "disconnected", phone: s?.phone ?? null, qrDataUrl: s?.qrDataUrl ?? null };
}

export function onSessionUpdate(tenantId: string, fn: (info: SessionInfo) => void): () => void {
  let s = sessions.get(tenantId);
  if (!s) { s = { sock: null, status: "disconnected", phone: null, qrDataUrl: null, qrRaw: null, listeners: new Set() }; sessions.set(tenantId, s); }
  s.listeners.add(fn);
  return () => s!.listeners.delete(fn);
}

export async function connectSession(tenantId: string): Promise<SessionInfo> {
  await initSession(tenantId);
  await new Promise<void>(resolve => { const t = setTimeout(resolve, 3000); onSessionUpdate(tenantId, () => { clearTimeout(t); resolve(); }); });
  return getSessionInfo(tenantId);
}

export async function disconnectSession(tenantId: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (s?.sock) { try { await s.sock.logout(); } catch {} try { s.sock.end(); } catch {} }
  sessions.delete(tenantId); clientStates.delete(tenantId); attToClient.delete(tenantId); sectorQueues.delete(tenantId);
  try { fs.rmSync(path.join(SESSIONS_DIR, tenantId), { recursive: true, force: true }); } catch {}
  await updateDb(tenantId, "disconnected", null, null);
}

const sendingLocks = new Map<string, Promise<void>>();
export async function sendMessage(tenantId: string, phone: string, text: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (!s || s.status !== "connected" || !s.sock) return;
  const jid = phoneToJid(phone);
  const prev = sendingLocks.get(tenantId) || Promise.resolve();
  const curr = prev.then(async () => {
    try { await new Promise(r => setTimeout(r, 1500 + Math.random() * 2500)); await s.sock.sendMessage(jid, { text }); }
    catch (e) { console.warn(`[Baileys] sendMessage error:`, e); }
  });
  sendingLocks.set(tenantId, curr);
  curr.finally(() => { if (sendingLocks.get(tenantId) === curr) sendingLocks.delete(tenantId); });
  return curr;
}

export function getQrCode(tenantId: string): string | null { return sessions.get(tenantId)?.qrDataUrl ?? null; }

export async function restoreAllSessions(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
    const full = path.join(SESSIONS_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "creds.json"));
  });
  console.log(`[Baileys] Restaurando ${dirs.length} sessão(ões)...`);
  for (const tid of dirs) { try { await initSession(tid); } catch (e) { console.warn(`[Baileys] Erro ${tid}:`, e); } }
}
