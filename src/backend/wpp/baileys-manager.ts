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

const INACTIVITY_WARN_MS = 15 * 60 * 1000;
const INACTIVITY_CLOSE_MS = 20 * 60 * 1000;
const EXIT_CMD   = /^&sair$/i;
const BACK_CMD   = /^(0|menu|inicio|início|voltar|cancelar|sair)$/i;
const ACCEPT_CMD = /^(aceitar|1)$/i;
const REFUSE_CMD = /^(recusar|2)$/i;

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
      await new Promise(r => setTimeout(r, 500 + Math.random() * 800));
      await sock.sendMessage(jid, { text });
      console.log(`[Bot] → ${jid.slice(0, 15)}: ${text.slice(0, 50)}`);
    } catch (e) { console.warn(`[Bot] Erro envio ${jid}:`, e); }
  });
  sendQ.set(jid, next);
  next.finally(() => { if (sendQ.get(jid) === next) sendQ.delete(jid); });
  return next;
}

// ── Mensagens ─────────────────────────────────────────────────────────────────

function msgBemVindo(): string {
  return `${saudacao()}! 😊\n\nBem-vindo(a) ao atendimento *Agendelle*.\n\nPara começar, me diga seu *nome completo*:`;
}

function msgMainMenu(name: string): string {
  return (
    `Olá, *${name}*! Como posso te ajudar hoje?\n\n` +
    `*1* — 🗣️ Falar com um Atendente\n` +
    `*2* — ❓ Como funciona a plataforma?\n` +
    `*3* — 💳 Planos e Valores\n` +
    `*4* — 🌐 Conhecer a Agendelle\n` +
    `*5* — 🚀 Conhecer a Develoi\n\n` +
    `*0* — ❌ Encerrar Atendimento\n`
  );
}

function msgComoFunciona(): string {
  return (
    `⚙️ *Como funciona o sistema?*\n\n` +
    `Nós somos uma plataforma inteligente de agendamentos e gestão para o seu negócio.\n\n` +
    `✅ *Link de Agendamento:* Seus clientes agendam sozinhos 24h por dia.\n` +
    `✅ *Gestão:* Controle financeiro, comandas, estoque e comissões.\n` +
    `✅ *WhatsApp:* Lembretes automáticos e bot de atendimento integrado.\n\n` +
    `Quer saber mais? Escolha a opção de Falar com Atendente no menu!`
  );
}

function msgPlanos(): string {
  return (
    `💳 *Nossos Planos*\n\n` +
    `Temos planos flexíveis que cabem no seu bolso e acompanham o crescimento do seu negócio.\n\n` +
    `Acesse nosso site para conferir a tabela completa de preços atualizada:\n` +
    `👉 https://agendelle.com.br\n\n` +
    `Se preferir, fale com nossa equipe pelo menu principal!`
  );
}

function msgMenu(sectors: any[]): string {
  let t = `Para qual setor deseja ser encaminhado?\n\n`;
  for (const s of sectors) {
    t += `*${s.menuKey}* — ${s.name}`;
    if (s.description) t += `\n   _${s.description}_`;
    t += `\n`;
  }
  return t + `\n*0* — 🔙 Voltar ao Menu Anterior\n\n_Digite *sair* a qualquer momento para encerrar._`;
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
    `Responda *ACEITAR* para iniciar\n` +
    `Responda *RECUSAR* se não puder atender`
  );
}

// ── Fluxo do cliente ──────────────────────────────────────────────────────────

async function handleClient(tenantId: string, sock: any, remoteJid: string, clientKey: string, text: string) {
  const trimmed = text.trim();
  const state = getState(tenantId, clientKey);

  if (EXIT_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "client"); return; }

  if (!state) {
    setState(tenantId, clientKey, { step: "ask_name", remoteJid, lastActivity: Date.now() });
    await send(sock, remoteJid, msgBemVindo());
    return;
  }

  touch(tenantId, clientKey);

  if (state.step === "ask_name") {
    if (trimmed.length < 2) { await send(sock, remoteJid, `Por favor, informe seu *nome completo*:`); return; }
    setState(tenantId, clientKey, { ...state, step: "main_menu", name: trimmed });
    await send(sock, remoteJid, msgMainMenu(trimmed));
    return;
  }

  if (state.step === "main_menu") {
    if (BACK_CMD.test(trimmed)) {
       if (trimmed.toLowerCase() === "sair" || trimmed === "0") {
          await doExit(tenantId, sock, clientKey, "client");
       } else {
          await send(sock, remoteJid, `❓ Comando inválido. Digite um número do menu ou *0* para sair.`);
       }
       return;
    }
    
    if (trimmed === "1") {
       setState(tenantId, clientKey, { ...state, step: "ask_subject" });
       await send(sock, remoteJid, `Certo! Sobre o que você gostaria de falar com nossa equipe?\n_(Descreva brevemente o assunto)_`);
       return;
    }
    if (trimmed === "2") {
       await send(sock, remoteJid, msgComoFunciona());
       await send(sock, remoteJid, msgMainMenu(state.name!));
       return;
    }
    if (trimmed === "3") {
       await send(sock, remoteJid, msgPlanos());
       await send(sock, remoteJid, msgMainMenu(state.name!));
       return;
    }
    if (trimmed === "4") {
       await send(sock, remoteJid, `🌐 *Conheça a Agendelle*\n\nAcesse nosso site oficial para saber mais sobre a plataforma: https://agendelle.com.br`);
       await send(sock, remoteJid, msgMainMenu(state.name!));
       return;
    }
    if (trimmed === "5") {
       await send(sock, remoteJid, `🚀 *Conheça a Develoi*\n\nNossa software house responsável por grandes projetos! Acesse: https://develoi.com.br`);
       await send(sock, remoteJid, msgMainMenu(state.name!));
       return;
    }
    
    await send(sock, remoteJid, `❓ Opção inválida. Digite um número do menu ou *0* para sair.`);
    return;
  }

  if (state.step === "ask_subject") {
    if (BACK_CMD.test(trimmed)) {
       if (trimmed.toLowerCase() === "sair") {
          await doExit(tenantId, sock, clientKey, "client");
          return;
       }
       setState(tenantId, clientKey, { ...state, step: "main_menu" });
       await send(sock, remoteJid, msgMainMenu(state.name!));
       return;
    }
    if (trimmed.length < 3) { await send(sock, remoteJid, `Por favor, descreva melhor o assunto:`); return; }
    const sectors = await loadSectors(tenantId);
    if (sectors.length === 0) {
      await send(sock, remoteJid, `😔 Nossa equipe de atendimento está indisponível no momento. Tente novamente mais tarde.`);
      setState(tenantId, clientKey, { ...state, step: "main_menu" });
      await send(sock, remoteJid, msgMainMenu(state.name!));
      return;
    }
    setState(tenantId, clientKey, { ...state, step: "menu", subject: trimmed });
    await send(sock, remoteJid, msgMenu(sectors));
    return;
  }

  if (state.step === "menu") {
    if (BACK_CMD.test(trimmed)) { 
       if (trimmed.toLowerCase() === "sair") {
          await doExit(tenantId, sock, clientKey, "client");
          return;
       }
       setState(tenantId, clientKey, { ...state, step: "main_menu" });
       await send(sock, remoteJid, msgMainMenu(state.name!));
       return; 
    }
    const sectors = await loadSectors(tenantId);
    const chosen = sectors.find(s => s.menuKey === trimmed);
    if (!chosen) { await send(sock, remoteJid, `❓ Opção inválida. Responda com o *número* do setor ou *0* para voltar.`); return; }
    await enterSector(tenantId, sock, clientKey, state, chosen);
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
    await send(sock, state.remoteJid, `😔 O setor *${sector.name}* não tem atendentes disponíveis no momento.\n\nEscolha outro setor:`);
    const sectors = await loadSectors(tenantId);
    setState(tenantId, clientKey, { ...state, step: "menu" });
    await send(sock, state.remoteJid, msgMenu(sectors));
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
        await sock.sendMessage(attJid, { text: msgNotifAtendente(state.name!, state.subject!, clientKey, sector.name, pos, total) });
      } catch (e) { console.warn(`[Bot] Notif atendente ${att.phone}:`, e); }
    }
  }
}

/** Retorna o nome registrado do atendente no setor, ou fallback para pushName */
async function resolveAttendantName(tenantId: string, attJid: string, pushName: string, sectorId?: string): Promise<string> {
  const attPhone = jidToPhone(attJid).replace(/\D/g, "");
  try {
    const sectors = sectorId
      ? [await (prisma as any).wppBotSector.findUnique({ where: { id: sectorId } })]
      : await (prisma as any).wppBotSector.findMany({ where: { tenantId, isActive: true } });
    for (const sector of sectors) {
      if (!sector) continue;
      const attendants = parseAttendants(sector.attendants);
      const found = attendants.find(a => {
        const ad = a.phone.replace(/\D/g, "");
        return ad === attPhone || ad === `55${attPhone}` || `55${ad}` === attPhone;
      });
      if (found?.name) return found.name;
    }
  } catch {}
  return pushName; // fallback: nome do contato no WhatsApp
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
    const displayName = await resolveAttendantName(tenantId, attJid, attName, state.sectorId);
    await send(sock, state.remoteJid, `💬 *${displayName}*: ${trimmed}`);
    if (state.conversationId) await saveMsg(state.conversationId, "attendant", attJid, trimmed);
    touch(tenantId, clientKey);
    return true;
  }

  // Atendente responde ACEITAR / RECUSAR para fila
  if (ACCEPT_CMD.test(trimmed) || REFUSE_CMD.test(trimmed)) {
    // Busca o 1° da fila nos setores onde este atendente está cadastrado
    const waiting = await findWaitingForAttendant(tenantId, attJid);
    if (!waiting) {
      await send(sock, attJid, `ℹ️ Não há clientes aguardando na fila para o(s) seu(s) setor(es) no momento.`);
      return true;
    }
    const state = getState(tenantId, waiting);
    if (!state || state.step !== "waiting") return false;

    if (REFUSE_CMD.test(trimmed)) {
      // Remove da fila, volta ao menu, notifica próximo
      removeFromQueue(tenantId, state.sectorId!, waiting);
      const sectors = await loadSectors(tenantId);
      setState(tenantId, waiting, { ...state, step: "menu", attendantJid: undefined, queuePos: undefined });
      await send(sock, state.remoteJid, `😔 O setor *${state.sectorName}* está *ocupado* no momento.\n\nDeseja escolher outro setor?`);
      await send(sock, state.remoteJid, msgMenu(sectors));
      if (state.conversationId) await closeConv(state.conversationId, "attendant_refused");
      await send(sock, attJid, `ℹ️ Você recusou o atendimento de *${state.name}*. O próximo da fila foi notificado.`);
      // Atualiza posições e notifica próximo
      await notifyQueueUpdate(tenantId, state.sectorId!, state.sectorName!, sock);
      await callNextInQueue(tenantId, sock, state.sectorId!, state.sectorName!);
      return true;
    }

    // ACEITAR — liga ponte
    const displayName = await resolveAttendantName(tenantId, attJid, attName, state.sectorId);
    linkAtt(tenantId, attJid, waiting);
    removeFromQueue(tenantId, state.sectorId!, waiting);
    setState(tenantId, waiting, { ...state, step: "in_chat", attendantJid: attJid, queuePos: undefined });
    await (prisma as any).wppConversation.update({ where: { id: state.conversationId }, data: { status: "active", attendantPhone: jidToPhone(attJid) } }).catch(() => {});
    if (state.conversationId) await saveMsg(state.conversationId, "bot", undefined, `${displayName} aceitou.`);

    await send(sock, state.remoteJid, `🎉 *${displayName}* aceitou seu atendimento!\n\nPode enviar sua mensagem normalmente.\n_Digite *sair* ou *0* para encerrar._`);
    await send(sock, attJid, `✅ Atendendo *${state.name}*.\n💬 Assunto: _${state.subject}_\n\n_Digite *&SAIR* para encerrar._`);

    // Atualiza posições dos que ficaram na fila
    await notifyQueueUpdate(tenantId, state.sectorId!, state.sectorName!, sock);
    return true;
  }

  return false;
}

/** Busca o 1° da fila em qualquer setor que contenha este atendente */
async function findWaitingForAttendant(tenantId: string, attJid: string): Promise<string | undefined> {
  const attPhone = jidToPhone(attJid).replace(/\D/g, "");
  const map = sectorQueues.get(tenantId);
  if (!map) return undefined;

  for (const [sectorId, queue] of map.entries()) {
    if (queue.length === 0) continue;
    try {
      const sector = await (prisma as any).wppBotSector.findUnique({ where: { id: sectorId } });
      if (!sector) continue;
      const attendants = parseAttendants(sector.attendants);
      const match = attendants.some(a => {
        const ad = a.phone.replace(/\D/g, "");
        return ad === attPhone || ad === `55${attPhone}` || `55${ad}` === attPhone;
      });
      if (match) return queue[0];
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
        await sock.sendMessage(attJid, { text: msgNotifAtendente(state.name!, state.subject!, nextKey, sectorName, 1, total) });
      } catch {}
    }
  } catch {}
}

// ── Encerrar ──────────────────────────────────────────────────────────────────

async function doExit(tenantId: string, sock: any, clientKey: string, by: "client" | "attendant" | "system") {
  const state = getState(tenantId, clientKey);
  if (!state) return;

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
        if (!handled) await handleClient(tenantId, sock, remoteJid, clientKey, text);
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
