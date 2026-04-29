/**
 * baileys-manager.ts
 *
 * Gerenciador central de sessões Baileys (multi-tenant).
 * Cada tenant tem sua própria conexão WebSocket com o WhatsApp.
 * Auth é salvo em disco: wpp-sessions/<tenantId>/creds.json + keys/
 *
 * Bot Central (tenantId = "system"):
 *  - Menu interativo com setores cadastrados pelo super-admin
 *  - Fila de espera por setor
 *  - Encaminhamento para atendente com notificação
 *  - Comando &SAIR encerra a conversa a qualquer momento
 *  - Retorno ao menu principal com "0" ou "menu"
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

// Estado em memória de quem está aguardando menu ou em qual etapa está
// key = clientPhone, value = estado da conversa em memória
interface BotState {
  step: "menu" | "in_sector" | "waiting_attendant";
  sectorId?: string;
  conversationId?: string;
  lastMenuAt?: number; // timestamp para evitar loop infinito
}

const sessions = new Map<string, ActiveSession>();
// Estados do bot por tenant: Map<tenantId, Map<clientPhone, BotState>>
const botStates = new Map<string, Map<string, BotState>>();

const SESSIONS_DIR = path.join(process.cwd(), "wpp-sessions");
const EXIT_COMMAND = "&SAIR";
const MENU_COMMAND_RE = /^(0|menu|inicio|início|voltar)$/i;

// ── Helpers ───────────────────────────────────────────────────────────────────

function sessionDir(tenantId: string) {
  return path.join(SESSIONS_DIR, tenantId);
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizePhone(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  const clean = digits.split(":")[0].replace(/@.*/, "");
  if (clean.startsWith("55") && clean.length === 15) {
    return clean.slice(0, 13);
  }
  return clean;
}

function phoneToJid(phone: string): string {
  const digits = String(phone).replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `${num}@s.whatsapp.net`;
}

function saudacao(): string {
  const h = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false });
  const n = parseInt(h);
  if (n >= 5 && n < 12) return "Bom dia";
  if (n >= 12 && n < 18) return "Boa tarde";
  return "Boa noite";
}

async function qrToDataUrl(qrText: string): Promise<string | null> {
  try {
    const QRCode = await import("qrcode");
    return await QRCode.default.toDataURL(qrText, { width: 300, margin: 2 });
  } catch (e) {
    console.warn("[Baileys] qrcode package not available:", e);
    return null;
  }
}

function makeLogger(): any {
  const noop = () => {};
  const logger: any = { level: "silent", trace: noop, debug: noop, info: noop, warn: noop, error: noop };
  logger.child = () => makeLogger();
  return logger;
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
  } catch (e) {
    console.warn("[Baileys] updateDb error:", e);
  }
}

function getBotState(tenantId: string, phone: string): BotState | undefined {
  return botStates.get(tenantId)?.get(phone);
}

function setBotState(tenantId: string, phone: string, state: BotState) {
  if (!botStates.has(tenantId)) botStates.set(tenantId, new Map());
  botStates.get(tenantId)!.set(phone, state);
}

function clearBotState(tenantId: string, phone: string) {
  botStates.get(tenantId)?.delete(phone);
}

async function sendText(sock: any, jid: string, text: string) {
  try {
    const delay = Math.floor(Math.random() * (3000 - 1200 + 1)) + 1200;
    await new Promise(r => setTimeout(r, delay));
    await sock.sendMessage(jid, { text });
  } catch (e) {
    console.warn("[Bot] sendText error:", e);
  }
}

// ── Lógica do Bot Central ─────────────────────────────────────────────────────

async function loadSectors(tenantId: string): Promise<any[]> {
  try {
    return await (prisma as any).wppBotSector.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
  } catch {
    return [];
  }
}

function buildMenuText(sectors: any[]): string {
  const saud = saudacao();
  let menu = `${saud}! 😊 Bem-vindo(a) ao nosso atendimento via WhatsApp.\n\n`;
  menu += `Como posso te ajudar hoje? Responda com o *número* da opção desejada:\n\n`;
  for (const s of sectors) {
    menu += `*${s.menuKey}* — ${s.name}${s.description ? `\n   _${s.description}_` : ""}\n`;
  }
  menu += `\n*0* — 🏠 Voltar ao menu principal\n`;
  menu += `\n_Digite *${EXIT_COMMAND}* a qualquer momento para encerrar o atendimento._`;
  return menu;
}

async function handleBotMessage(tenantId: string, sock: any, remoteJid: string, clientPhone: string, text: string, clientName: string | undefined) {
  const trimmed = text.trim();

  // Comando de saída universal
  if (trimmed.toUpperCase() === EXIT_COMMAND) {
    await handleExit(tenantId, sock, remoteJid, clientPhone, "client");
    return;
  }

  const state = getBotState(tenantId, clientPhone);

  // Sem estado = nova conversa → exibe menu
  if (!state || state.step === "menu") {
    const sectors = await loadSectors(tenantId);
    if (sectors.length === 0) {
      await sendText(sock, remoteJid, `${saudacao()}! Nosso atendimento via bot ainda está sendo configurado. Por favor, tente novamente em breve. 😊`);
      return;
    }
    setBotState(tenantId, clientPhone, { step: "menu", lastMenuAt: Date.now() });
    await sendText(sock, remoteJid, buildMenuText(sectors));
    return;
  }

  // No menu → processar escolha
  if (state.step === "menu" as string) {
    if (MENU_COMMAND_RE.test(trimmed)) {
      clearBotState(tenantId, clientPhone);
      const sectors = await loadSectors(tenantId);
      await sendText(sock, remoteJid, buildMenuText(sectors));
      return;
    }
    const sectors = await loadSectors(tenantId);
    const chosen = sectors.find(s => s.menuKey === trimmed);
    if (!chosen) {
      await sendText(sock, remoteJid, `❓ Opção não reconhecida. Por favor, responda com o *número* correspondente ou *0* para o menu principal.`);
      return;
    }
    await enterSector(tenantId, sock, remoteJid, clientPhone, clientName, chosen, "");
    return;
  }

  // Aguardando atendente → guarda mensagem na conversa
  if (state.step === "waiting_attendant" || state.step === "in_sector") {
    if (MENU_COMMAND_RE.test(trimmed)) {
      // Fecha conversa atual e volta ao menu
      if (state.conversationId) {
        await closeConversation(state.conversationId, "client");
      }
      clearBotState(tenantId, clientPhone);
      const sectors = await loadSectors(tenantId);
      await sendText(sock, remoteJid, buildMenuText(sectors));
      return;
    }

    // Salva mensagem no histórico
    if (state.conversationId) {
      await saveMessage(state.conversationId, "client", clientPhone, trimmed);
    }

    if (state.step === "waiting_attendant") {
      await sendText(sock, remoteJid, `⏳ Sua mensagem foi registrada. Aguarde, um atendente irá responder em breve!\n\n_Digite *${EXIT_COMMAND}* para cancelar ou *0* para voltar ao menu._`);
    }
    return;
  }
}

async function enterSector(
  tenantId: string, sock: any, remoteJid: string,
  clientPhone: string, clientName: string | undefined,
  sector: any, firstMsg: string
) {
  // Verifica se já tem conversa ativa
  const existing = await (prisma as any).wppConversation.findFirst({
    where: { tenantId, clientPhone, status: { in: ["waiting", "active"] } },
  }).catch(() => null);

  if (existing) {
    await sendText(sock, remoteJid, `ℹ️ Você já possui um atendimento em andamento no setor *${sector.name}*.\n\nAguarde o retorno do atendente ou digite *${EXIT_COMMAND}* para encerrar.`);
    setBotState(tenantId, clientPhone, { step: "waiting_attendant", sectorId: sector.id, conversationId: existing.id });
    return;
  }

  // Cria conversa na fila
  const conv = await (prisma as any).wppConversation.create({
    data: {
      tenantId,
      sectorId: sector.id,
      clientPhone,
      clientName: clientName || null,
      status: "waiting",
      firstMessage: firstMsg || null,
    },
  });

  if (firstMsg) {
    await saveMessage(conv.id, "client", clientPhone, firstMsg);
  }

  setBotState(tenantId, clientPhone, { step: "waiting_attendant", sectorId: sector.id, conversationId: conv.id });

  await sendText(sock, remoteJid,
    `✅ Você foi encaminhado para o setor *${sector.name}*!\n\n` +
    `Um atendente irá te responder em breve. Pode enviar sua mensagem agora:\n\n` +
    `_Digite *${EXIT_COMMAND}* para encerrar ou *0* para voltar ao menu._`
  );

  // Notifica atendentes do setor
  const attendants: string[] = JSON.parse(sector.attendants || "[]");
  for (const attPhone of attendants) {
    const attJid = phoneToJid(attPhone);
    const msgForAtt =
      `🔔 *Nova fila de atendimento — ${sector.name}*\n\n` +
      `👤 Cliente: *${clientName || clientPhone}*\n` +
      `📱 Número: *${clientPhone}*\n` +
      `💬 Mensagem: _${firstMsg || "(sem mensagem inicial)"}_ \n\n` +
      `Para *aceitar* e responder ao cliente, simplesmente envie uma mensagem.\n` +
      `O sistema irá notificá-lo quando estiver em atendimento.\n\n` +
      `_Para sinalizar o encerramento, o atendente deve enviar: *${EXIT_COMMAND}*_`;
    try { await sock.sendMessage(attJid, { text: msgForAtt }); } catch {}
  }
}

async function handleAttendantMessage(tenantId: string, sock: any, attendantPhone: string, text: string) {
  const trimmed = text.trim();

  // Verifica se é atendente com conversa ativa
  const conv = await (prisma as any).wppConversation.findFirst({
    where: {
      tenantId,
      attendantPhone,
      status: "active",
    },
    include: { sector: true },
  }).catch(() => null);

  if (!conv) {
    // Verifica se está na fila esperando aceitação
    const waiting = await (prisma as any).wppConversation.findFirst({
      where: { tenantId, status: "waiting", sector: { attendants: { contains: attendantPhone } } },
      include: { sector: true },
      orderBy: { createdAt: "asc" },
    }).catch(() => null);

    if (waiting) {
      // Atendente aceita o próximo da fila
      await (prisma as any).wppConversation.update({
        where: { id: waiting.id },
        data: { attendantPhone, status: "active" },
      });

      const state = getBotState(tenantId, waiting.clientPhone);
      if (state) setBotState(tenantId, waiting.clientPhone, { ...state, step: "in_sector" });

      const clientJid = phoneToJid(waiting.clientPhone);
      await sendText(sock, clientJid,
        `🎉 Um atendente do setor *${waiting.sector?.name}* aceitou seu atendimento!\n\nPode enviar suas mensagens normalmente.\n_Para encerrar, o atendente ou você podem digitar *${EXIT_COMMAND}*._`
      );
      await saveMessage(waiting.id, "bot", undefined, `Atendente ${attendantPhone} aceitou o atendimento.`);

      if (trimmed.toUpperCase() !== EXIT_COMMAND) {
        // Encaminha a primeira mensagem do atendente ao cliente
        await sendText(sock, clientJid, text);
        await saveMessage(waiting.id, "attendant", attendantPhone, text);
      }
      return true;
    }
    return false;
  }

  // Atendente em conversa ativa
  if (trimmed.toUpperCase() === EXIT_COMMAND) {
    await handleExit(tenantId, sock, phoneToJid(conv.clientPhone), conv.clientPhone, "attendant", conv);
    return true;
  }

  // Encaminha mensagem ao cliente
  const clientJid = phoneToJid(conv.clientPhone);
  await sendText(sock, clientJid, text);
  await saveMessage(conv.id, "attendant", attendantPhone, text);
  return true;
}

async function handleExit(tenantId: string, sock: any, remoteJid: string, clientPhone: string, closedBy: "client" | "attendant" | "system", conv?: any) {
  const activeConv = conv || await (prisma as any).wppConversation.findFirst({
    where: { tenantId, clientPhone, status: { in: ["waiting", "active"] } },
    include: { sector: true },
  }).catch(() => null);

  if (activeConv) {
    await closeConversation(activeConv.id, closedBy);
    await saveMessage(activeConv.id, "bot", undefined, `Conversa encerrada por ${closedBy === "client" ? "cliente" : closedBy === "attendant" ? "atendente" : "sistema"}.`);

    // Notifica o cliente
    await sendText(sock, remoteJid,
      `✅ Seu atendimento foi encerrado. Obrigado por entrar em contato!\n\nSe precisar de mais ajuda, é só mandar uma mensagem. 😊`
    );

    // Notifica atendente se encerrado pelo cliente
    if (closedBy === "client" && activeConv.attendantPhone) {
      const attJid = phoneToJid(activeConv.attendantPhone);
      try {
        await sock.sendMessage(attJid, {
          text: `ℹ️ O cliente *${activeConv.clientPhone}* encerrou o atendimento no setor *${activeConv.sector?.name || ""}*.`,
        });
      } catch {}
    }

    // Notifica cliente se encerrado pelo atendente
    if (closedBy === "attendant" && activeConv.clientPhone) {
      await saveMessage(activeConv.id, "bot", undefined, `Atendente encerrou a conversa.`);
    }
  } else {
    await sendText(sock, remoteJid, `✅ Atendimento encerrado. Até logo! 😊`);
  }

  clearBotState(tenantId, clientPhone);
}

async function closeConversation(conversationId: string, closedBy: string) {
  await (prisma as any).wppConversation.update({
    where: { id: conversationId },
    data: { status: "closed", closedBy, closedAt: new Date() },
  }).catch(() => {});
}

async function saveMessage(conversationId: string, fromRole: string, fromPhone: string | undefined, body: string) {
  await (prisma as any).wppConversationMessage.create({
    data: { conversationId, fromRole, fromPhone: fromPhone || null, body },
  }).catch(() => {});
}

async function isAttendant(tenantId: string, phone: string): Promise<boolean> {
  try {
    const sector = await (prisma as any).wppBotSector.findFirst({
      where: { tenantId, isActive: true, attendants: { contains: phone } },
    });
    return !!sector;
  } catch {
    return false;
  }
}

// ── Inicializar sessão ────────────────────────────────────────────────────────

export async function initSession(tenantId: string): Promise<void> {
  const existing = sessions.get(tenantId);
  if (existing && existing.status === "connected") return;

  if (existing?.sock) {
    try { existing.sock.end(); } catch {}
    sessions.delete(tenantId);
  }

  let makeWASocket: any, useMultiFileAuthState: any, DisconnectReason: any;
  try {
    console.log(`[Baileys][${tenantId}] Importando @whiskeysockets/baileys...`);
    const baileys = await import("@whiskeysockets/baileys");
    makeWASocket = (baileys as any).makeWASocket || baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    if (!makeWASocket) throw new Error("makeWASocket not found");
    if (!useMultiFileAuthState) throw new Error("useMultiFileAuthState not found");
  } catch (e: any) {
    console.error("[Baileys] Não instalado ou incompatível:", e?.message);
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
    sock: null,
    status: "connecting",
    phone: null,
    qrDataUrl: null,
    qrRaw: null,
    listeners: existing?.listeners ?? new Set(),
  };
  sessions.set(tenantId, session);

  const sock = makeWASocket({
    version: waVersion,
    auth: state,
    browser: ["Chrome (Linux)", "", ""],
    printQRInTerminal: false,
    syncFullHistory: false,
    markOnlineOnConnect: false,
    connectTimeoutMs: 60_000,
    retryRequestDelayMs: 2000,
    logger: makeLogger(),
  });

  session.sock = sock;

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.qrRaw = qr;
      session.status = "qr_pending";
      session.qrDataUrl = await qrToDataUrl(qr);
      await updateDb(tenantId, "qr_pending", null, session.qrDataUrl);
      broadcast(tenantId);
    }

    if (connection === "open") {
      session.status = "connected";
      const jid = sock.user?.id || "";
      session.phone = normalizePhone(jid);
      session.qrDataUrl = null;
      session.qrRaw = null;
      await updateDb(tenantId, "connected", session.phone, null);
      broadcast(tenantId);
      console.log(`[Baileys][${tenantId}] Conectado como ${session.phone}`);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as any)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;

      session.status = "disconnected";
      session.qrDataUrl = null;
      session.phone = null;
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

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!text) continue;

      const clientPhone = normalizePhone(remoteJid);
      const clientName = (msg.pushName as string | undefined) || undefined;

      console.log(`[Bot][${tenantId}] MSG de ${clientPhone}: ${text}`);

      // Para o bot central (system), processar lógica de fila/menu
      if (tenantId === "system") {
        // Verifica se quem mandou é atendente com conversa ativa
        const att = await isAttendant(tenantId, clientPhone);
        if (att) {
          const handled = await handleAttendantMessage(tenantId, sock, clientPhone, text).catch(() => false);
          if (handled) continue;
        }
        // Trata como cliente
        await handleBotMessage(tenantId, sock, remoteJid, clientPhone, text, clientName).catch(e => {
          console.error(`[Bot][${tenantId}] Erro ao processar mensagem:`, e);
        });
      }
      // Para outros tenants, apenas log (sem bot central ativo)
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
  if (s?.sock) {
    try { await s.sock.logout(); } catch {}
    try { s.sock.end(); } catch {}
  }
  sessions.delete(tenantId);
  botStates.delete(tenantId);
  try { fs.rmSync(sessionDir(tenantId), { recursive: true, force: true }); } catch {}
  await updateDb(tenantId, "disconnected", null, null);
}

const sendingLocks = new Map<string, Promise<void>>();

export async function sendMessage(tenantId: string, phone: string, text: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (!s || s.status !== "connected" || !s.sock) {
    console.warn(`[Baileys][${tenantId}] Sessão não conectada — mensagem descartada para ${phone}`);
    return;
  }

  const previous = sendingLocks.get(tenantId) || Promise.resolve();
  const current = previous.then(async () => {
    const digits = String(phone).replace(/\D/g, "");
    const num = digits.startsWith("55") ? digits : `55${digits}`;
    const jid = `${num}@s.whatsapp.net`;
    try {
      const delay = Math.floor(Math.random() * (4000 - 1500 + 1)) + 1500;
      await new Promise(r => setTimeout(r, delay));
      await s.sock.sendMessage(jid, { text });
      console.log(`[Baileys][${tenantId}] Mensagem enviada para ${num}`);
    } catch (e) {
      console.warn(`[Baileys][${tenantId}] sendMessage error for ${num}:`, e);
    }
  });

  sendingLocks.set(tenantId, current);
  current.finally(() => { if (sendingLocks.get(tenantId) === current) sendingLocks.delete(tenantId); });
  return current;
}

export function getQrCode(tenantId: string): string | null {
  return sessions.get(tenantId)?.qrDataUrl ?? null;
}

export async function restoreAllSessions(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
    const full = path.join(SESSIONS_DIR, d);
    const creds = path.join(full, "creds.json");
    return fs.statSync(full).isDirectory() && fs.existsSync(creds);
  });

  console.log(`[Baileys] Restaurando ${dirs.length} sessão(ões)...`);
  for (const tenantId of dirs) {
    try { await initSession(tenantId); } catch (e) {
      console.warn(`[Baileys] Erro ao restaurar sessão ${tenantId}:`, e);
    }
  }

  try {
    const instances: any[] = await (prisma as any).wppInstance.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true },
    });
    for (const inst of instances) {
      const fixed = normalizePhone(inst.phone);
      if (fixed !== inst.phone) {
        await (prisma as any).wppInstance.update({ where: { id: inst.id }, data: { phone: fixed } });
      }
    }
  } catch {}
}
