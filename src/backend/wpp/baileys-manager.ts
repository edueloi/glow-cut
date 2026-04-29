/**
 * baileys-manager.ts — Bot Central de Atendimento
 *
 * Fluxo do cliente:
 *  1. Manda qualquer msg → bot pede o nome
 *  2. Bot pede o assunto
 *  3. Bot exibe menu de setores
 *  4. Cliente escolhe setor → bot notifica atendente: "Aceitar / Recusar"
 *  5a. Atendente aceita → bot vira ponte bidirecional (msgs chegam como nome do atendente)
 *  5b. Atendente recusa → cliente recebe aviso de setor ocupado, volta ao menu
 *  6. &SAIR ou 0 encerra a conversa a qualquer momento
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

// Etapas do cliente no fluxo do bot
type ClientStep =
  | "ask_name"       // aguardando nome
  | "ask_subject"    // aguardando assunto
  | "menu"           // exibindo menu de setores
  | "waiting"        // aguardando atendente aceitar/recusar
  | "in_chat";       // em atendimento ativo (ponte bidirecional)

interface ClientState {
  step: ClientStep;
  name?: string;
  subject?: string;
  sectorId?: string;
  sectorName?: string;
  attendantPhone?: string;
  conversationId?: string;
  lastActivity: number; // timestamp ms — para timeout de inatividade
}

// Map<tenantId, Map<clientPhone, ClientState>>
const clientStates = new Map<string, Map<string, ClientState>>();
// Map<tenantId, Map<attendantPhone, clientPhone>> — para ponte reversa
const attendantToClient = new Map<string, Map<string, string>>();

const INACTIVITY_MS = 30 * 60 * 1000; // 30 minutos
const EXIT_CMD = /^&sair$/i;
const BACK_CMD = /^(0|menu|inicio|início|voltar|cancelar)$/i;
const ACCEPT_CMD = /^(aceitar|1)$/i;
const REFUSE_CMD = /^(recusar|2)$/i;

// Limpeza de sessões inativas a cada 5 minutos
setInterval(() => cleanInactiveSessions(), 5 * 60 * 1000);

const sessions = new Map<string, ActiveSession>();
const SESSIONS_DIR = path.join(process.cwd(), "wpp-sessions");

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionDir(tenantId: string) {
  return path.join(SESSIONS_DIR, tenantId);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizePhone(raw: string): string {
  // Remove tudo que não é dígito, remove sufixo :X e @domínio
  let digits = String(raw || "").replace(/\D/g, "");
  digits = digits.split(":")[0];
  // Números BR de 15 dígitos: 55 + DDD(2) + 9(1) + 8 = 13 → corta para 13
  if (digits.startsWith("55") && digits.length === 15) return digits.slice(0, 13);
  return digits;
}

function phoneToJid(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");
  // Garante DDI 55 para números brasileiros (10 ou 11 dígitos sem DDI)
  let num = digits;
  if (!num.startsWith("55") && (num.length === 10 || num.length === 11)) {
    num = `55${num}`;
  }
  return `${num}@s.whatsapp.net`;
}

// Extrai phone limpo do remoteJid do Baileys (que pode vir como "5511...@s.whatsapp.net" ou "283...@s.whatsapp.net")
function jidToPhone(jid: string): string {
  const raw = jid.replace(/@.*/, "").replace(/:[0-9]+$/, "");
  return normalizePhone(raw);
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

function getClientState(tenantId: string, phone: string): ClientState | undefined {
  return clientStates.get(tenantId)?.get(phone);
}

function setClientState(tenantId: string, phone: string, state: ClientState) {
  if (!clientStates.has(tenantId)) clientStates.set(tenantId, new Map());
  clientStates.get(tenantId)!.set(phone, { ...state, lastActivity: Date.now() });
}

function clearClientState(tenantId: string, phone: string) {
  const state = clientStates.get(tenantId)?.get(phone);
  if (state?.attendantPhone) {
    attendantToClient.get(tenantId)?.delete(state.attendantPhone);
  }
  clientStates.get(tenantId)?.delete(phone);
}

function touchActivity(tenantId: string, phone: string) {
  const s = clientStates.get(tenantId)?.get(phone);
  if (s) s.lastActivity = Date.now();
}

function getClientByAttendant(tenantId: string, attendantPhone: string): string | undefined {
  return attendantToClient.get(tenantId)?.get(attendantPhone);
}

function linkAttendant(tenantId: string, attendantPhone: string, clientPhone: string) {
  if (!attendantToClient.has(tenantId)) attendantToClient.set(tenantId, new Map());
  attendantToClient.get(tenantId)!.set(attendantPhone, clientPhone);
}

function unlinkAttendant(tenantId: string, attendantPhone: string) {
  attendantToClient.get(tenantId)?.delete(attendantPhone);
}

async function cleanInactiveSessions() {
  const now = Date.now();
  for (const [tenantId, map] of clientStates.entries()) {
    const sock = sessions.get(tenantId)?.sock;
    for (const [phone, state] of map.entries()) {
      if (now - state.lastActivity > INACTIVITY_MS) {
        console.log(`[Bot][${tenantId}] Sessão expirada por inatividade: ${phone}`);
        if (sock) {
          try {
            await sock.sendMessage(phoneToJid(phone), {
              text: `⏰ Sua conversa foi encerrada por *inatividade* (30 minutos sem resposta).\n\nSe precisar de ajuda, é só mandar uma mensagem. 😊`,
            });
          } catch {}
          // Avisa atendente se estava em chat
          if (state.attendantPhone && state.step === "in_chat") {
            try {
              await sock.sendMessage(phoneToJid(state.attendantPhone), {
                text: `ℹ️ A conversa com *${state.name || phone}* foi encerrada por inatividade.`,
              });
            } catch {}
          }
        }
        if (state.conversationId) {
          await closeConv(state.conversationId, "system").catch(() => {});
        }
        clearClientState(tenantId, phone);
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

async function createConv(tenantId: string, sectorId: string, clientPhone: string, clientName: string, subject: string): Promise<string> {
  const conv = await (prisma as any).wppConversation.create({
    data: { tenantId, sectorId, clientPhone, clientName, status: "waiting", firstMessage: subject },
  });
  await saveMsg(conv.id, "bot", undefined, `Conversa iniciada. Cliente: ${clientName}, Assunto: ${subject}`);
  return conv.id;
}

async function closeConv(conversationId: string, closedBy: string) {
  await (prisma as any).wppConversation.update({
    where: { id: conversationId },
    data: { status: "closed", closedBy, closedAt: new Date() },
  }).catch(() => {});
}

async function saveMsg(conversationId: string, fromRole: string, fromPhone: string | undefined, body: string) {
  await (prisma as any).wppConversationMessage.create({
    data: { conversationId, fromRole, fromPhone: fromPhone || null, body },
  }).catch(() => {});
}

// ── Envio com delay anti-spam ─────────────────────────────────────────────────

const sendQueue = new Map<string, Promise<void>>();

async function send(sock: any, jid: string, text: string) {
  const key = jid;
  const prev = sendQueue.get(key) || Promise.resolve();
  const next = prev.then(async () => {
    try {
      const delay = 800 + Math.random() * 1200;
      await new Promise(r => setTimeout(r, delay));
      await sock.sendMessage(jid, { text });
    } catch (e) {
      console.warn(`[Bot] send error to ${jid}:`, e);
    }
  });
  sendQueue.set(key, next);
  next.finally(() => { if (sendQueue.get(key) === next) sendQueue.delete(key); });
  return next;
}

// ── Mensagens do bot ──────────────────────────────────────────────────────────

function msgBemVindo(): string {
  return (
    `${saudacao()}! 😊\n\n` +
    `Bem-vindo(a) ao atendimento *Agendelle*.\n\n` +
    `Para começar, por favor me diga seu *nome completo*:`
  );
}

function msgPedeAssunto(): string {
  return `Obrigado! Agora me conte *sobre o que você gostaria de falar*?\n_(Descreva brevemente seu assunto)_`;
}

function msgMenu(sectors: any[]): string {
  let txt = `Certo! Para qual setor deseja ser encaminhado?\n\n`;
  for (const s of sectors) {
    txt += `*${s.menuKey}* — ${s.name}`;
    if (s.description) txt += `\n   _${s.description}_`;
    txt += `\n`;
  }
  txt += `\n*0* — ❌ Cancelar\n`;
  txt += `\n_Digite *&SAIR* a qualquer momento para encerrar._`;
  return txt;
}

function msgAguardando(sectorName: string): string {
  return (
    `✅ Encaminhando você para o setor *${sectorName}*...\n\n` +
    `⏳ Aguarde, um atendente irá responder em breve.\n\n` +
    `_Digite *&SAIR* ou *0* para cancelar._`
  );
}

function msgSetorOcupado(sectorName: string): string {
  return (
    `😔 O setor *${sectorName}* está *ocupado* no momento.\n\n` +
    `Por favor, tente novamente mais tarde ou escolha outro setor.\n\n` +
    `Deseja ver o menu novamente? Digite *menu*.`
  );
}

function msgAceito(attendantName: string): string {
  return (
    `🎉 *${attendantName}* aceitou seu atendimento!\n\n` +
    `Pode enviar sua mensagem normalmente.\n` +
    `_Digite *&SAIR* ou *0* para encerrar a conversa._`
  );
}

function msgEncerradoCliente(): string {
  return `✅ Atendimento encerrado. Obrigado por entrar em contato! 😊\n\nSe precisar de mais ajuda, é só mandar uma mensagem.`;
}

function msgEncerradoAtendente(clientName: string): string {
  return `ℹ️ Você encerrou o atendimento com *${clientName}*.`;
}

function msgNotifAtendente(name: string, subject: string, clientPhone: string, sectorName: string): string {
  return (
    `🔔 *Nova solicitação — ${sectorName}*\n\n` +
    `👤 Cliente: *${name}*\n` +
    `📱 Número: *${clientPhone}*\n` +
    `💬 Assunto: _${subject}_\n\n` +
    `Responda *ACEITAR* para iniciar o atendimento\n` +
    `Responda *RECUSAR* se não puder atender agora`
  );
}

// ── Fluxo principal do cliente ────────────────────────────────────────────────

async function handleClient(tenantId: string, sock: any, clientPhone: string, text: string) {
  const trimmed = text.trim();
  const jid = phoneToJid(clientPhone);
  const state = getClientState(tenantId, clientPhone);

  // Comando de saída universal
  if (EXIT_CMD.test(trimmed)) {
    await doExit(tenantId, sock, clientPhone, "client");
    return;
  }

  // Sem estado → início do fluxo
  if (!state) {
    setClientState(tenantId, clientPhone, { step: "ask_name", lastActivity: Date.now() });
    await send(sock, jid, msgBemVindo());
    return;
  }

  touchActivity(tenantId, clientPhone);

  // ── Pedindo nome ──────────────────────────────────────────────────────────
  if (state.step === "ask_name") {
    if (trimmed.length < 2) {
      await send(sock, jid, `Por favor, informe seu *nome completo* para continuar:`);
      return;
    }
    setClientState(tenantId, clientPhone, { ...state, step: "ask_subject", name: trimmed });
    await send(sock, jid, msgPedeAssunto());
    return;
  }

  // ── Pedindo assunto ───────────────────────────────────────────────────────
  if (state.step === "ask_subject") {
    if (trimmed.length < 3) {
      await send(sock, jid, `Por favor, descreva melhor o assunto:`);
      return;
    }
    const sectors = await loadSectors(tenantId);
    if (sectors.length === 0) {
      await send(sock, jid, `😔 Nossos setores de atendimento ainda estão sendo configurados. Tente novamente mais tarde!`);
      clearClientState(tenantId, clientPhone);
      return;
    }
    setClientState(tenantId, clientPhone, { ...state, step: "menu", subject: trimmed });
    await send(sock, jid, msgMenu(sectors));
    return;
  }

  // ── Menu de setores ───────────────────────────────────────────────────────
  if (state.step === "menu") {
    if (BACK_CMD.test(trimmed)) {
      await doExit(tenantId, sock, clientPhone, "client");
      return;
    }
    const sectors = await loadSectors(tenantId);
    const chosen = sectors.find(s => s.menuKey === trimmed);
    if (!chosen) {
      await send(sock, jid, `❓ Opção inválida. Responda com o *número* do setor desejado ou *0* para cancelar.`);
      return;
    }
    await forwardToSector(tenantId, sock, clientPhone, state, chosen);
    return;
  }

  // ── Aguardando atendente ──────────────────────────────────────────────────
  if (state.step === "waiting") {
    if (BACK_CMD.test(trimmed)) {
      await doExit(tenantId, sock, clientPhone, "client");
      return;
    }
    await send(sock, jid, `⏳ Você já está na fila. Aguarde um atendente.\n_Digite *&SAIR* ou *0* para cancelar._`);
    return;
  }

  // ── Em atendimento (ponte cliente → atendente) ────────────────────────────
  if (state.step === "in_chat") {
    if (BACK_CMD.test(trimmed)) {
      await doExit(tenantId, sock, clientPhone, "client");
      return;
    }
    if (state.attendantPhone) {
      await send(sock, phoneToJid(state.attendantPhone), `💬 *${state.name}*: ${trimmed}`);
      if (state.conversationId) await saveMsg(state.conversationId, "client", clientPhone, trimmed);
    }
    return;
  }
}

async function forwardToSector(tenantId: string, sock: any, clientPhone: string, state: ClientState, sector: any) {
  const jid = phoneToJid(clientPhone);
  const attendants: string[] = JSON.parse(sector.attendants || "[]");

  if (attendants.length === 0) {
    await send(sock, jid, msgSetorOcupado(sector.name));
    // Volta ao menu
    const sectors = await loadSectors(tenantId);
    setClientState(tenantId, clientPhone, { ...state, step: "menu" });
    await send(sock, jid, msgMenu(sectors));
    return;
  }

  const convId = await createConv(tenantId, sector.id, clientPhone, state.name!, state.subject!);
  setClientState(tenantId, clientPhone, {
    ...state,
    step: "waiting",
    sectorId: sector.id,
    sectorName: sector.name,
    conversationId: convId,
  });

  await send(sock, jid, msgAguardando(sector.name));

  // Notifica todos os atendentes do setor
  for (const attPhone of attendants) {
    try {
      await sock.sendMessage(phoneToJid(attPhone), {
        text: msgNotifAtendente(state.name!, state.subject!, clientPhone, sector.name),
      });
    } catch {}
  }
}

// ── Fluxo do atendente ────────────────────────────────────────────────────────

async function handleAttendant(tenantId: string, sock: any, attPhone: string, attName: string, text: string): Promise<boolean> {
  const trimmed = text.trim();

  // Verifica se este atendente tem cliente vinculado (em atendimento ativo)
  const clientPhone = getClientByAttendant(tenantId, attPhone);

  if (clientPhone) {
    const state = getClientState(tenantId, clientPhone);
    if (!state || state.step !== "in_chat") {
      unlinkAttendant(tenantId, attPhone);
      return false;
    }

    // Atendente encerra
    if (EXIT_CMD.test(trimmed)) {
      await doExit(tenantId, sock, clientPhone, "attendant");
      return true;
    }

    // Atendente manda mensagem → encaminha ao cliente como nome do atendente
    await send(sock, phoneToJid(clientPhone), `💬 *${attName}*: ${trimmed}`);
    if (state.conversationId) await saveMsg(state.conversationId, "attendant", attPhone, trimmed);
    touchActivity(tenantId, clientPhone);
    return true;
  }

  // Atendente responde ACEITAR / RECUSAR para algum cliente em fila
  if (ACCEPT_CMD.test(trimmed) || REFUSE_CMD.test(trimmed)) {
    // Busca conversa na fila deste atendente
    const waiting = await findWaitingForAttendant(tenantId, attPhone);
    if (!waiting) return false;

    const clientState = getClientState(tenantId, waiting.clientPhone);
    if (!clientState || clientState.step !== "waiting") return false;

    if (REFUSE_CMD.test(trimmed)) {
      // Recusa → avisa cliente e limpa
      await send(sock, phoneToJid(waiting.clientPhone), msgSetorOcupado(clientState.sectorName || ""));
      // Volta ao menu
      const sectors = await loadSectors(tenantId);
      setClientState(tenantId, waiting.clientPhone, { ...clientState, step: "menu", attendantPhone: undefined });
      await send(sock, phoneToJid(waiting.clientPhone), msgMenu(sectors));
      await closeConv(clientState.conversationId!, "attendant_refused");
      await (prisma as any).wppConversation.update({ where: { id: clientState.conversationId }, data: { status: "closed", closedBy: "attendant_refused" } }).catch(() => {});
      await send(sock, phoneToJid(attPhone), `ℹ️ Você recusou o atendimento de *${clientState.name}*.`);
      return true;
    }

    // Aceita → liga ponte bidirecional
    linkAttendant(tenantId, attPhone, waiting.clientPhone);
    setClientState(tenantId, waiting.clientPhone, { ...clientState, step: "in_chat", attendantPhone: attPhone });

    await (prisma as any).wppConversation.update({
      where: { id: clientState.conversationId },
      data: { status: "active", attendantPhone: attPhone },
    }).catch(() => {});

    await saveMsg(clientState.conversationId!, "bot", undefined, `Atendente ${attPhone} (${attName}) aceitou.`);

    await send(sock, phoneToJid(waiting.clientPhone), msgAceito(attName));
    await send(sock, phoneToJid(attPhone), `✅ Você está atendendo *${clientState.name}*.\n💬 Assunto: _${clientState.subject}_\n\n_Digite *&SAIR* para encerrar._`);
    return true;
  }

  return false;
}

async function findWaitingForAttendant(tenantId: string, attPhone: string): Promise<{ clientPhone: string; convId: string } | null> {
  // Varre estados em memória procurando cliente em "waiting" cujo setor inclui este atendente
  const map = clientStates.get(tenantId);
  if (!map) return null;

  for (const [clientPhone, state] of map.entries()) {
    if (state.step !== "waiting" || !state.sectorId) continue;
    try {
      const sector = await (prisma as any).wppBotSector.findUnique({ where: { id: state.sectorId } });
      if (!sector) continue;
      const attendants: string[] = JSON.parse(sector.attendants || "[]");
      if (attendants.includes(attPhone)) {
        return { clientPhone, convId: state.conversationId! };
      }
    } catch {}
  }
  return null;
}

// ── Encerrar conversa ─────────────────────────────────────────────────────────

async function doExit(tenantId: string, sock: any, clientPhone: string, closedBy: "client" | "attendant" | "system") {
  const state = getClientState(tenantId, clientPhone);
  const clientJid = phoneToJid(clientPhone);

  if (state?.conversationId) {
    await closeConv(state.conversationId, closedBy);
    await saveMsg(state.conversationId, "bot", undefined, `Conversa encerrada por ${closedBy}.`);
  }

  if (state?.attendantPhone && state.step === "in_chat") {
    const attJid = phoneToJid(state.attendantPhone);
    unlinkAttendant(tenantId, state.attendantPhone);
    if (closedBy === "client") {
      await send(sock, attJid, msgEncerradoAtendente(state.name || clientPhone));
    }
  }

  clearClientState(tenantId, clientPhone);
  await send(sock, clientJid, msgEncerradoCliente());
}

// ── Inicializar sessão Baileys ────────────────────────────────────────────────

export async function initSession(tenantId: string): Promise<void> {
  const existing = sessions.get(tenantId);
  if (existing && existing.status === "connected") return;

  if (existing?.sock) {
    try { existing.sock.end(); } catch {}
    sessions.delete(tenantId);
  }

  let makeWASocket: any, useMultiFileAuthState: any, DisconnectReason: any;
  try {
    const baileys = await import("@whiskeysockets/baileys");
    makeWASocket = (baileys as any).makeWASocket || baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    if (!makeWASocket) throw new Error("makeWASocket not found");
    if (!useMultiFileAuthState) throw new Error("useMultiFileAuthState not found");
  } catch (e: any) {
    console.error("[Baileys] Não instalado:", e?.message);
    await updateDb(tenantId, "disconnected", null, null);
    return;
  }

  const dir = sessionDir(tenantId);
  ensureDir(dir);
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  let waVersion: [number, number, number] = [2, 3000, 1015901307];
  try {
    const { fetchLatestBaileysVersion } = await import("@whiskeysockets/baileys");
    const { version } = await fetchLatestBaileysVersion();
    waVersion = version;
  } catch {}

  const session: ActiveSession = {
    sock: null, status: "connecting", phone: null,
    qrDataUrl: null, qrRaw: null,
    listeners: existing?.listeners ?? new Set(),
  };
  sessions.set(tenantId, session);

  const sock = makeWASocket({
    version: waVersion, auth: state,
    browser: ["Chrome (Linux)", "", ""],
    printQRInTerminal: false, syncFullHistory: false,
    markOnlineOnConnect: false, connectTimeoutMs: 60_000,
    retryRequestDelayMs: 2000, logger: makeLogger(),
  });
  session.sock = sock;

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      session.qrRaw = qr; session.status = "qr_pending";
      session.qrDataUrl = await qrToDataUrl(qr);
      await updateDb(tenantId, "qr_pending", null, session.qrDataUrl);
      broadcast(tenantId);
    }
    if (connection === "open") {
      session.status = "connected";
      session.phone = normalizePhone(sock.user?.id || "");
      session.qrDataUrl = null; session.qrRaw = null;
      await updateDb(tenantId, "connected", session.phone, null);
      broadcast(tenantId);
      console.log(`[Baileys][${tenantId}] Conectado como ${session.phone}`);
    }
    if (connection === "close") {
      const reason = (lastDisconnect?.error as any)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      session.status = "disconnected"; session.qrDataUrl = null; session.phone = null;
      await updateDb(tenantId, "disconnected", null, null);
      broadcast(tenantId);
      if (loggedOut) {
        try { fs.rmSync(sessionDir(tenantId), { recursive: true, force: true }); } catch {}
        sessions.delete(tenantId);
      } else {
        setTimeout(() => initSession(tenantId), 5000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async (m: any) => {
    if (m.type !== "notify") return;
    for (const msg of m.messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us")) continue;

      const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").trim();
      if (!text) continue;

      const phone = jidToPhone(remoteJid);
      const pushName: string = msg.pushName || phone;

      // Só processa bot para o tenant "system"
      if (tenantId !== "system") continue;

      console.log(`[Bot] ${phone} (${pushName}): ${text}`);

      try {
        // Tenta tratar como atendente primeiro
        const handled = await handleAttendant(tenantId, sock, phone, pushName, text);
        if (!handled) {
          // Trata como cliente
          await handleClient(tenantId, sock, phone, text);
        }
      } catch (e) {
        console.error(`[Bot] Erro ao processar msg de ${phone}:`, e);
      }
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
  if (!s) {
    s = { sock: null, status: "disconnected", phone: null, qrDataUrl: null, qrRaw: null, listeners: new Set() };
    sessions.set(tenantId, s);
  }
  s.listeners.add(fn);
  return () => s!.listeners.delete(fn);
}

export async function connectSession(tenantId: string): Promise<SessionInfo> {
  await initSession(tenantId);
  await new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, 3000);
    onSessionUpdate(tenantId, () => { clearTimeout(timeout); resolve(); });
  });
  return getSessionInfo(tenantId);
}

export async function disconnectSession(tenantId: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (s?.sock) { try { await s.sock.logout(); } catch {} try { s.sock.end(); } catch {} }
  sessions.delete(tenantId);
  clientStates.delete(tenantId);
  attendantToClient.delete(tenantId);
  try { fs.rmSync(sessionDir(tenantId), { recursive: true, force: true }); } catch {}
  await updateDb(tenantId, "disconnected", null, null);
}

const sendingLocks = new Map<string, Promise<void>>();

export async function sendMessage(tenantId: string, phone: string, text: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (!s || s.status !== "connected" || !s.sock) return;
  const prev = sendingLocks.get(tenantId) || Promise.resolve();
  const curr = prev.then(async () => {
    const digits = String(phone).replace(/\D/g, "");
    const num = digits.startsWith("55") ? digits : `55${digits}`;
    try {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2500));
      await s.sock.sendMessage(`${num}@s.whatsapp.net`, { text });
    } catch (e) { console.warn(`[Baileys] sendMessage error for ${num}:`, e); }
  });
  sendingLocks.set(tenantId, curr);
  curr.finally(() => { if (sendingLocks.get(tenantId) === curr) sendingLocks.delete(tenantId); });
  return curr;
}

export function getQrCode(tenantId: string): string | null {
  return sessions.get(tenantId)?.qrDataUrl ?? null;
}

export async function restoreAllSessions(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;
  const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
    const full = path.join(SESSIONS_DIR, d);
    return fs.statSync(full).isDirectory() && fs.existsSync(path.join(full, "creds.json"));
  });
  console.log(`[Baileys] Restaurando ${dirs.length} sessão(ões)...`);
  for (const tid of dirs) {
    try { await initSession(tid); } catch (e) { console.warn(`[Baileys] Erro ao restaurar ${tid}:`, e); }
  }
  try {
    const instances: any[] = await (prisma as any).wppInstance.findMany({ where: { phone: { not: null } }, select: { id: true, phone: true } });
    for (const inst of instances) {
      const fixed = normalizePhone(inst.phone);
      if (fixed !== inst.phone) await (prisma as any).wppInstance.update({ where: { id: inst.id }, data: { phone: fixed } });
    }
  } catch {}
}
