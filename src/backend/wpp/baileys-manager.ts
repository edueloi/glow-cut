/**
 * baileys-manager.ts — Bot Central de Atendimento
 *
 * PROBLEMA RESOLVIDO: O Baileys entrega remoteJid em formato próprio (ex: 28390019088557@s.whatsapp.net)
 * que não é o mesmo que o JID construído a partir do número (5515992675429@s.whatsapp.net).
 * Para ENVIAR corretamente, sempre usamos o remoteJid original recebido do Baileys.
 * O phone normalizado é usado apenas como chave interna de estado.
 *
 * Fluxo do cliente:
 *  1. Manda qualquer msg → bot pede o nome
 *  2. Bot pede o assunto
 *  3. Bot exibe menu de setores
 *  4. Cliente escolhe setor → bot notifica atendente: "ACEITAR / RECUSAR"
 *  5a. Atendente ACEITAR → ponte bidirecional ativa
 *  5b. Atendente RECUSAR → cliente recebe aviso, volta ao menu
 *  6. &SAIR ou 0 encerra a qualquer momento
 *  7. Inatividade 30 min → encerra automaticamente
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

type ClientStep = "ask_name" | "ask_subject" | "menu" | "waiting" | "in_chat";

interface ClientState {
  step: ClientStep;
  remoteJid: string;     // JID original do Baileys — usar SEMPRE para enviar
  name?: string;
  subject?: string;
  sectorId?: string;
  sectorName?: string;
  attendantJid?: string; // JID do atendente conectado
  conversationId?: string;
  lastActivity: number;
}

// Map<tenantId, Map<phone_normalizado, ClientState>>
const clientStates = new Map<string, Map<string, ClientState>>();
// Map<tenantId, Map<attendantJid, clientPhone>> — ponte reversa
const attJidToClient = new Map<string, Map<string, string>>();

const INACTIVITY_MS = 30 * 60 * 1000;
const EXIT_CMD   = /^&sair$/i;
const BACK_CMD   = /^(0|menu|inicio|início|voltar|cancelar)$/i;
const ACCEPT_CMD = /^(aceitar|1)$/i;
const REFUSE_CMD = /^(recusar|2)$/i;

setInterval(() => cleanInactive(), 5 * 60 * 1000);

const sessions = new Map<string, ActiveSession>();
const SESSIONS_DIR = path.join(process.cwd(), "wpp-sessions");

// ── Helpers de JID / phone ────────────────────────────────────────────────────

/** Remove domínio e sufixo :X do JID → string só de dígitos */
function jidToPhone(jid: string): string {
  return jid.replace(/@.*/, "").replace(/:[0-9]+$/, "");
}

/** Constrói JID para ENVIAR a um número de atendente cadastrado (somente dígitos com DDI) */
function phoneToJid(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `${num}@s.whatsapp.net`;
}

function normalizeForKey(jid: string): string {
  // Usa o JID sem domínio como chave — preserva o formato que o Baileys usa
  return jid.replace(/@.*/, "").replace(/:[0-9]+$/, "");
}

function saudacao(): string {
  const h = parseInt(new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

async function qrToDataUrl(qrText: string): Promise<string | null> {
  try {
    const QRCode = await import("qrcode");
    return await QRCode.default.toDataURL(qrText, { width: 300, margin: 2 });
  } catch { return null; }
}

function makeLogger(): any {
  const noop = () => {};
  const l: any = { level: "silent", trace: noop, debug: noop, info: noop, warn: noop, error: noop };
  l.child = () => makeLogger();
  return l;
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
  clientStates.get(tenantId)!.set(key, { ...state, lastActivity: Date.now() });
}

function clearState(tenantId: string, key: string) {
  const s = clientStates.get(tenantId)?.get(key);
  if (s?.attendantJid) attJidToClient.get(tenantId)?.delete(s.attendantJid);
  clientStates.get(tenantId)?.delete(key);
}

function touch(tenantId: string, key: string) {
  const s = clientStates.get(tenantId)?.get(key);
  if (s) s.lastActivity = Date.now();
}

function linkAtt(tenantId: string, attJid: string, clientKey: string) {
  if (!attJidToClient.has(tenantId)) attJidToClient.set(tenantId, new Map());
  attJidToClient.get(tenantId)!.set(attJid, clientKey);
}

function unlinkAtt(tenantId: string, attJid: string) {
  attJidToClient.get(tenantId)?.delete(attJid);
}

function clientKeyByAtt(tenantId: string, attJid: string): string | undefined {
  return attJidToClient.get(tenantId)?.get(attJid);
}

// ── Limpeza por inatividade ───────────────────────────────────────────────────

async function cleanInactive() {
  const now = Date.now();
  for (const [tenantId, map] of clientStates.entries()) {
    const sock = sessions.get(tenantId)?.sock;
    for (const [key, state] of map.entries()) {
      if (now - state.lastActivity < INACTIVITY_MS) continue;
      console.log(`[Bot][${tenantId}] Inatividade: ${key}`);
      if (sock) {
        try { await sock.sendMessage(state.remoteJid, { text: `⏰ Conversa encerrada por *inatividade* (30 min).\n\nQualquer hora que precisar, é só mandar mensagem! 😊` }); } catch {}
        if (state.attendantJid && state.step === "in_chat") {
          try { await sock.sendMessage(state.attendantJid, { text: `ℹ️ Conversa com *${state.name || key}* encerrada por inatividade.` }); } catch {}
        }
      }
      if (state.conversationId) await closeConv(state.conversationId, "system").catch(() => {});
      clearState(tenantId, key);
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

// ── Envio com fila anti-spam ──────────────────────────────────────────────────

const sendQ = new Map<string, Promise<void>>();

async function send(sock: any, jid: string, text: string) {
  const prev = sendQ.get(jid) || Promise.resolve();
  const next = prev.then(async () => {
    try {
      await new Promise(r => setTimeout(r, 600 + Math.random() * 900));
      await sock.sendMessage(jid, { text });
      console.log(`[Bot] → ${jid}: ${text.slice(0, 60)}`);
    } catch (e) { console.warn(`[Bot] Erro ao enviar para ${jid}:`, e); }
  });
  sendQ.set(jid, next);
  next.finally(() => { if (sendQ.get(jid) === next) sendQ.delete(jid); });
  return next;
}

// ── Mensagens do bot ──────────────────────────────────────────────────────────

function msgBemVindo(): string {
  return `${saudacao()}! 😊\n\nBem-vindo(a) ao atendimento *Agendelle*.\n\nPara começar, por favor me diga seu *nome completo*:`;
}

function msgMenu(sectors: any[]): string {
  let txt = `Perfeito! Para qual setor deseja ser encaminhado?\n\n`;
  for (const s of sectors) {
    txt += `*${s.menuKey}* — ${s.name}`;
    if (s.description) txt += `\n   _${s.description}_`;
    txt += `\n`;
  }
  txt += `\n*0* — ❌ Cancelar\n\n_Digite *&SAIR* a qualquer momento para encerrar._`;
  return txt;
}

// ── Fluxo do cliente ──────────────────────────────────────────────────────────

async function handleClient(tenantId: string, sock: any, remoteJid: string, clientKey: string, text: string) {
  const trimmed = text.trim();
  const state = getState(tenantId, clientKey);

  // &SAIR universal
  if (EXIT_CMD.test(trimmed)) {
    await doExit(tenantId, sock, clientKey, "client");
    return;
  }

  // Nova conversa
  if (!state) {
    setState(tenantId, clientKey, { step: "ask_name", remoteJid, lastActivity: Date.now() });
    await send(sock, remoteJid, msgBemVindo());
    return;
  }

  touch(tenantId, clientKey);

  if (state.step === "ask_name") {
    if (trimmed.length < 2) { await send(sock, remoteJid, `Por favor, informe seu *nome completo*:`); return; }
    setState(tenantId, clientKey, { ...state, step: "ask_subject", name: trimmed });
    await send(sock, remoteJid, `Obrigado, *${trimmed}*! 😊\n\nAgora me conte *sobre o que você gostaria de falar*?\n_(Descreva brevemente seu assunto)_`);
    return;
  }

  if (state.step === "ask_subject") {
    if (trimmed.length < 3) { await send(sock, remoteJid, `Por favor, descreva melhor o assunto:`); return; }
    const sectors = await loadSectors(tenantId);
    if (sectors.length === 0) {
      await send(sock, remoteJid, `😔 Nosso atendimento está sendo configurado. Tente novamente em breve!`);
      clearState(tenantId, clientKey);
      return;
    }
    setState(tenantId, clientKey, { ...state, step: "menu", subject: trimmed });
    await send(sock, remoteJid, msgMenu(sectors));
    return;
  }

  if (state.step === "menu") {
    if (BACK_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "client"); return; }
    const sectors = await loadSectors(tenantId);
    const chosen = sectors.find(s => s.menuKey === trimmed);
    if (!chosen) { await send(sock, remoteJid, `❓ Opção inválida. Responda com o *número* do setor ou *0* para cancelar.`); return; }
    await enterSector(tenantId, sock, clientKey, state, chosen);
    return;
  }

  if (state.step === "waiting") {
    if (BACK_CMD.test(trimmed)) { await doExit(tenantId, sock, clientKey, "client"); return; }
    await send(sock, remoteJid, `⏳ Você já está na fila. Aguarde um atendente.\n_Digite *&SAIR* ou *0* para cancelar._`);
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

async function enterSector(tenantId: string, sock: any, clientKey: string, state: ClientState, sector: any) {
  const attendants: string[] = JSON.parse(sector.attendants || "[]");

  if (attendants.length === 0) {
    await send(sock, state.remoteJid, `😔 O setor *${sector.name}* não tem atendentes disponíveis no momento.\n\nTente outro setor ou tente novamente mais tarde.`);
    const sectors = await loadSectors(tenantId);
    setState(tenantId, clientKey, { ...state, step: "menu" });
    await send(sock, state.remoteJid, msgMenu(sectors));
    return;
  }

  const convId = await createConv(tenantId, sector.id, clientKey, state.name!, state.subject!);
  setState(tenantId, clientKey, { ...state, step: "waiting", sectorId: sector.id, sectorName: sector.name, conversationId: convId });
  await send(sock, state.remoteJid, `✅ Encaminhando para *${sector.name}*...\n\n⏳ Aguarde, um atendente irá responder em breve.\n_Digite *&SAIR* ou *0* para cancelar._`);

  // Notifica atendentes
  for (const attPhone of attendants) {
    const attJid = phoneToJid(attPhone);
    try {
      await sock.sendMessage(attJid, {
        text:
          `🔔 *Nova solicitação — ${sector.name}*\n\n` +
          `👤 Cliente: *${state.name}*\n` +
          `📱 Número: *${clientKey}*\n` +
          `💬 Assunto: _${state.subject}_\n\n` +
          `Responda *ACEITAR* para iniciar o atendimento\n` +
          `Responda *RECUSAR* se não puder atender agora`,
      });
    } catch (e) { console.warn(`[Bot] Não enviou notif para atendente ${attPhone}:`, e); }
  }
}

// ── Fluxo do atendente ────────────────────────────────────────────────────────

async function handleAttendant(tenantId: string, sock: any, attJid: string, attName: string, text: string): Promise<boolean> {
  const trimmed = text.trim();

  // Atendente já tem cliente vinculado → ponte ativa
  const clientKey = clientKeyByAtt(tenantId, attJid);
  if (clientKey) {
    const state = getState(tenantId, clientKey);
    if (!state || state.step !== "in_chat") { unlinkAtt(tenantId, attJid); return false; }

    if (EXIT_CMD.test(trimmed)) {
      await doExit(tenantId, sock, clientKey, "attendant");
      return true;
    }
    await send(sock, state.remoteJid, `💬 *${attName}*: ${trimmed}`);
    if (state.conversationId) await saveMsg(state.conversationId, "attendant", attJid, trimmed);
    touch(tenantId, clientKey);
    return true;
  }

  // Atendente responde ACEITAR / RECUSAR
  if (ACCEPT_CMD.test(trimmed) || REFUSE_CMD.test(trimmed)) {
    const waiting = findWaiting(tenantId);
    if (!waiting) return false;
    const state = getState(tenantId, waiting);
    if (!state || state.step !== "waiting") return false;

    if (REFUSE_CMD.test(trimmed)) {
      const sectors = await loadSectors(tenantId);
      setState(tenantId, waiting, { ...state, step: "menu", attendantJid: undefined });
      await send(sock, state.remoteJid, `😔 O setor *${state.sectorName}* está *ocupado* no momento.\n\nDeseja escolher outro setor? Veja as opções:`);
      await send(sock, state.remoteJid, msgMenu(sectors));
      if (state.conversationId) await closeConv(state.conversationId, "attendant_refused");
      await send(sock, attJid, `ℹ️ Você recusou o atendimento de *${state.name}*.`);
      return true;
    }

    // ACEITAR
    linkAtt(tenantId, attJid, waiting);
    setState(tenantId, waiting, { ...state, step: "in_chat", attendantJid: attJid });
    await (prisma as any).wppConversation.update({ where: { id: state.conversationId }, data: { status: "active", attendantPhone: jidToPhone(attJid) } }).catch(() => {});
    if (state.conversationId) await saveMsg(state.conversationId, "bot", undefined, `Atendente ${attName} (${attJid}) aceitou.`);

    await send(sock, state.remoteJid, `🎉 *${attName}* aceitou seu atendimento!\n\nPode enviar sua mensagem normalmente.\n_Digite *&SAIR* ou *0* para encerrar._`);
    await send(sock, attJid, `✅ Você está atendendo *${state.name}*.\n💬 Assunto: _${state.subject}_\n\n_Digite *&SAIR* para encerrar._`);
    return true;
  }

  return false;
}

/** Busca clientKey em estado "waiting" cujo setor tem este atendente cadastrado */
function findWaiting(tenantId: string): string | undefined {
  const map = clientStates.get(tenantId);
  if (!map) return undefined;
  for (const [clientKey, state] of map.entries()) {
    if (state.step === "waiting") return clientKey;
  }
  return undefined;
}

// ── Encerrar ──────────────────────────────────────────────────────────────────

async function doExit(tenantId: string, sock: any, clientKey: string, by: "client" | "attendant" | "system") {
  const state = getState(tenantId, clientKey);
  if (!state) return;

  if (state.conversationId) {
    await closeConv(state.conversationId, by);
    await saveMsg(state.conversationId, "bot", undefined, `Conversa encerrada por ${by}.`);
  }
  if (state.attendantJid && state.step === "in_chat") {
    unlinkAtt(tenantId, state.attendantJid);
    if (by === "client") {
      await send(sock, state.attendantJid, `ℹ️ *${state.name || clientKey}* encerrou o atendimento.`);
    }
  }
  clearState(tenantId, clientKey);
  await send(sock, state.remoteJid, `✅ Atendimento encerrado. Obrigado por entrar em contato! 😊\n\nQualquer hora que precisar é só mandar mensagem.`);
}

// ── Inicializar sessão Baileys ────────────────────────────────────────────────

export async function initSession(tenantId: string): Promise<void> {
  const existing = sessions.get(tenantId);
  if (existing && existing.status === "connected") return;
  if (existing?.sock) { try { existing.sock.end(); } catch {} sessions.delete(tenantId); }

  let makeWASocket: any, useMultiFileAuthState: any, DisconnectReason: any;
  try {
    const baileys = await import("@whiskeysockets/baileys");
    makeWASocket = (baileys as any).makeWASocket || baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    if (!makeWASocket || !useMultiFileAuthState) throw new Error("Baileys exports not found");
  } catch (e: any) {
    console.error("[Baileys] Não instalado:", e?.message);
    await updateDb(tenantId, "disconnected", null, null);
    return;
  }

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

      // Chave normalizada (apenas dígitos do JID, sem domínio)
      const clientKey = normalizeForKey(remoteJid);
      const pushName: string = msg.pushName || clientKey;

      if (tenantId !== "system") continue;

      console.log(`[Bot] ${clientKey} (${pushName}): ${text}`);

      try {
        // Tenta como atendente primeiro (tem cliente vinculado ou digitou ACEITAR/RECUSAR)
        const handled = await handleAttendant(tenantId, sock, remoteJid, pushName, text);
        if (!handled) {
          await handleClient(tenantId, sock, remoteJid, clientKey, text);
        }
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
  sessions.delete(tenantId);
  clientStates.delete(tenantId);
  attJidToClient.delete(tenantId);
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
