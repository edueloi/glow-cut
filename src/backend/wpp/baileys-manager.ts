/**
 * baileys-manager.ts
 *
 * Gerenciador central de sessões Baileys (multi-tenant).
 * Cada tenant tem sua própria conexão WebSocket com o WhatsApp.
 * Auth é salvo em disco: wpp-sessions/<tenantId>/creds.json + keys/
 *
 * Requerimentos: Node >= 18, @whiskeysockets/baileys, qrcode
 *
 * IMPORTANTE: Este módulo usa import() dinâmico para não quebrar
 * builds/compilações em ambientes sem Baileys instalado.
 */

import path from "path";
import fs from "fs";
import { prisma } from "../prisma";

// ── Tipos locais ──────────────────────────────────────────────────────────────

export type WppStatus = "not_configured" | "disconnected" | "qr_pending" | "connecting" | "connected";

export interface SessionInfo {
  tenantId: string;
  status: WppStatus;
  phone: string | null;
  qrDataUrl: string | null;
}

// ── Map de sessões ativas ─────────────────────────────────────────────────────

interface ActiveSession {
  sock: any;                    // WASocket do Baileys
  status: WppStatus;
  phone: string | null;
  qrDataUrl: string | null;
  qrRaw: string | null;
  listeners: Set<(info: SessionInfo) => void>;
}

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
  const digits = String(raw || "").replace(/\D/g, "");
  // Remove sufixo :X@s.whatsapp.net
  const clean = digits.split(":")[0].replace(/@.*/, "");
  // Normaliza números brasileiros para 13 dígitos: 55 + DDD(2) + 9(1) + número(8)
  // Baileys às vezes retorna 15 dígitos para BR (formato legado com sufixo de roteamento)
  // Ex: 551599289742537 (15) → 5515992897425 (13) — remove os últimos 2 dígitos
  if (clean.startsWith("55") && clean.length === 15) {
    return clean.slice(0, 13);
  }
  return clean;
}

async function qrToDataUrl(qrText: string): Promise<string | null> {
  try {
    // Import dinâmico para não quebrar TypeScript sem o pacote
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
  const info: SessionInfo = {
    tenantId,
    status: s.status,
    phone: s.phone,
    qrDataUrl: s.qrDataUrl,
  };
  s.listeners.forEach(fn => { try { fn(info); } catch {} });
}

async function updateDb(tenantId: string, status: WppStatus, phone: string | null, qrCode: string | null) {
  try {
    await (prisma as any).wppInstance.updateMany({
      where: { tenantId },
      data: {
        status,
        phone,
        isActive: status === "connected",
        qrCode: status === "connected" ? null : qrCode,
      },
    });
  } catch (e) {
    console.warn("[Baileys] updateDb error:", e);
  }
}

// ── Inicializar / Reconectar uma sessão ───────────────────────────────────────

export async function initSession(tenantId: string): Promise<void> {
  // Se já existe sessão conectada, não recria
  const existing = sessions.get(tenantId);
  if (existing && existing.status === "connected") return;

  // Fecha sessão anterior se existir
  if (existing?.sock) {
    try { existing.sock.end(); } catch {}
    sessions.delete(tenantId);
  }

  let makeWASocket: any, useMultiFileAuthState: any, DisconnectReason: any;
  try {
    console.log(`[Baileys][${tenantId}] Importando @whiskeysockets/baileys...`);
    const baileys = await import("@whiskeysockets/baileys");
    console.log(`[Baileys][${tenantId}] Exports disponíveis:`, Object.keys(baileys).join(", "));
    makeWASocket = (baileys as any).makeWASocket || baileys.default;
    useMultiFileAuthState = baileys.useMultiFileAuthState;
    DisconnectReason = baileys.DisconnectReason;
    if (!makeWASocket) throw new Error("makeWASocket not found in baileys exports");
    if (!useMultiFileAuthState) throw new Error("useMultiFileAuthState not found in baileys exports");
    console.log(`[Baileys][${tenantId}] Baileys importado OK`);
  } catch (e: any) {
    console.error("[Baileys] Não instalado ou incompatível:", e?.message, e?.stack);
    // Atualiza status no BD e retorna sem travar
    await updateDb(tenantId, "disconnected", null, null);
    return;
  }

  const dir = sessionDir(tenantId);
  ensureDir(dir);

  const { state, saveCreds } = await useMultiFileAuthState(dir);

  // Busca versão atual do WA Web (evita 405 por versão desatualizada)
  let waVersion: [number, number, number] = [2, 3000, 1015901307];
  try {
    const { fetchLatestBaileysVersion } = await import("@whiskeysockets/baileys");
    const { version } = await fetchLatestBaileysVersion();
    waVersion = version;
    console.log(`[Baileys][${tenantId}] WA version: ${version.join(".")}`);
  } catch (e) {
    console.warn(`[Baileys][${tenantId}] Não conseguiu buscar versão WA, usando fallback`);
  }

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

  // ── Eventos de conexão ────────────────────────────────────────────────────
  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.qrRaw = qr;
      session.status = "qr_pending";
      session.qrDataUrl = await qrToDataUrl(qr);
      await updateDb(tenantId, "qr_pending", null, session.qrDataUrl);
      broadcast(tenantId);
      console.log(`[Baileys][${tenantId}] QR Code gerado`);
    }

    if (connection === "open") {
      session.status = "connected";
      const jid = sock.user?.id || "";
      session.phone = normalizePhone(jid);
      session.qrDataUrl = null;
      session.qrRaw = null;
      await updateDb(tenantId, "connected", session.phone, null);
      broadcast(tenantId);
      console.log(`[Baileys][${tenantId}] Conectado como ${session.phone} (JID: ${jid})`);
    }

    if (connection === "close") {
      const reason = (lastDisconnect?.error as any)?.output?.statusCode;
      const loggedOut = reason === DisconnectReason.loggedOut;
      console.log(`[Baileys][${tenantId}] Desconectado — reason=${reason} loggedOut=${loggedOut}`);

      session.status = "disconnected";
      session.qrDataUrl = null;
      session.phone = null;
      await updateDb(tenantId, "disconnected", null, null);
      broadcast(tenantId);

      if (loggedOut) {
        // Remove credenciais salvas (logout forçado)
        try { fs.rmSync(sessionDir(tenantId), { recursive: true, force: true }); } catch {}
        sessions.delete(tenantId);
      } else {
        // Reconecta após 5s (erro de rede, timeout, etc.)
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
      if (!remoteJid || remoteJid.includes("@g.us")) continue; // ignora grupos

      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || "";
      if (!text) continue;

      console.log(`[Baileys][${tenantId}] MENSAGEM RECEBIDA de ${remoteJid}: ${text}`);

      try {
        const resposta = `🤖 [BOT do Sistema Ativo] Recebi sua mensagem: "${text}"\n\nIsso é apenas um teste de conexão para confirmar que o bot está ligado e retornando as mensagens corretamente.`;
        await sock.sendMessage(remoteJid, { text: resposta }, { quoted: msg });
        console.log(`[Baileys][${tenantId}] Mensagem de teste RESPONDIDA para ${remoteJid} com sucesso!`);
      } catch (e) {
        console.error(`[Baileys][${tenantId}] Erro ao responder teste:`, e);
      }
    }
  });
}

// ── API pública ───────────────────────────────────────────────────────────────

/** Retorna o status atual de uma sessão (em memória, sem chamar o servidor WA) */
export function getSessionInfo(tenantId: string): SessionInfo {
  const s = sessions.get(tenantId);
  return {
    tenantId,
    status: s?.status ?? "disconnected",
    phone: s?.phone ?? null,
    qrDataUrl: s?.qrDataUrl ?? null,
  };
}

/** Registra um listener para receber atualizações de status em tempo real */
export function onSessionUpdate(tenantId: string, fn: (info: SessionInfo) => void): () => void {
  let s = sessions.get(tenantId);
  if (!s) {
    s = { sock: null, status: "disconnected", phone: null, qrDataUrl: null, qrRaw: null, listeners: new Set() };
    sessions.set(tenantId, s);
  }
  s.listeners.add(fn);
  return () => s!.listeners.delete(fn);
}

/** Inicia conexão (gera QR se não autenticado, reconecta se já tem creds) */
export async function connectSession(tenantId: string): Promise<SessionInfo> {
  await initSession(tenantId);
  // Espera até 3s por um QR ou conexão
  await new Promise<void>(resolve => {
    const timeout = setTimeout(resolve, 3000);
    onSessionUpdate(tenantId, () => { clearTimeout(timeout); resolve(); });
  });
  return getSessionInfo(tenantId);
}

/** Desconecta e apaga credenciais */
export async function disconnectSession(tenantId: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (s?.sock) {
    try { await s.sock.logout(); } catch {}
    try { s.sock.end(); } catch {}
  }
  sessions.delete(tenantId);
  try { fs.rmSync(sessionDir(tenantId), { recursive: true, force: true }); } catch {}
  await updateDb(tenantId, "disconnected", null, null);
}

// Fila simples para evitar disparos simultâneos na mesma sessão
const sendingLocks = new Map<string, Promise<void>>();

/** Envia mensagem de texto para um número com delay anti-spam */
export async function sendMessage(tenantId: string, phone: string, text: string): Promise<void> {
  const s = sessions.get(tenantId);
  if (!s || s.status !== "connected" || !s.sock) {
    console.warn(`[Baileys][${tenantId}] Sessão não conectada — mensagem descartada para ${phone}`);
    return;
  }

  // Pega a promessa da mensagem anterior ou inicia uma nova
  const previous = sendingLocks.get(tenantId) || Promise.resolve();
  
  const current = previous.then(async () => {
    const digits = String(phone).replace(/\D/g, "");
    const num = digits.startsWith("55") ? digits : `55${digits}`;
    const jid = `${num}@s.whatsapp.net`;

    try {
      // Delay aleatório entre 1.5s e 4s para evitar detecção de bot (anti-spam)
      const delay = Math.floor(Math.random() * (4000 - 1500 + 1)) + 1500;
      await new Promise(r => setTimeout(r, delay));

      await s.sock.sendMessage(jid, { text });
      console.log(`[Baileys][${tenantId}] Mensagem enviada para ${num}`);
    } catch (e) {
      console.warn(`[Baileys][${tenantId}] sendMessage error for ${num}:`, e);
    }
  });

  // Salva a nova "cauda" da fila
  sendingLocks.set(tenantId, current);
  
  // Limpa a memória após o envio
  current.finally(() => {
    if (sendingLocks.get(tenantId) === current) {
      sendingLocks.delete(tenantId);
    }
  });

  return current;
}

/** Retorna QR code atual (data URL) se em estado qr_pending */
export function getQrCode(tenantId: string): string | null {
  return sessions.get(tenantId)?.qrDataUrl ?? null;
}

/** Restaura todas as sessões que tinham credenciais salvas ao iniciar o servidor */
export async function restoreAllSessions(): Promise<void> {
  if (!fs.existsSync(SESSIONS_DIR)) return;

  const dirs = fs.readdirSync(SESSIONS_DIR).filter(d => {
    const full = path.join(SESSIONS_DIR, d);
    const creds = path.join(full, "creds.json");
    return fs.statSync(full).isDirectory() && fs.existsSync(creds);
  });

  console.log(`[Baileys] Restaurando ${dirs.length} sessão(ões) salvas...`);
  for (const tenantId of dirs) {
    try {
      await initSession(tenantId);
    } catch (e) {
      console.warn(`[Baileys] Erro ao restaurar sessão ${tenantId}:`, e);
    }
  }

  // Corrige phones mal formatados no banco (ex: 15 dígitos BR → 13)
  try {
    const instances: any[] = await (prisma as any).wppInstance.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true },
    });
    for (const inst of instances) {
      const fixed = normalizePhone(inst.phone);
      if (fixed !== inst.phone) {
        await (prisma as any).wppInstance.update({ where: { id: inst.id }, data: { phone: fixed } });
        console.log(`[Baileys] Phone corrigido: ${inst.phone} → ${fixed}`);
      }
    }
  } catch (e) {
    console.warn("[Baileys] Erro ao corrigir phones:", e);
  }
}
