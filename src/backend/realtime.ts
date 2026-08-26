import type { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { verifyToken } from "./middleware/auth";
import { prisma } from "./prisma";

let io: SocketIOServer | null = null;

export function initRealtime(httpServer: HttpServer, corsOrigins: string[]): void {
  io = new SocketIOServer(httpServer, {
    cors: { origin: corsOrigins },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error("unauthorized"));

    const payload = verifyToken(token);
    if (!payload) return next(new Error("unauthorized"));

    if (payload.tenantId && (payload.type === "admin" || payload.type === "professional")) {
      try {
        const tenant = await (prisma as any).tenant.findUnique({
          where: { id: payload.tenantId },
          select: { isActive: true, blockedAt: true },
        });
        if (tenant && tenant.blockedAt && !tenant.isActive) return next(new Error("blocked"));
      } catch {
        // Se a checagem falhar, deixa conectar — não é uma verificação de segurança crítica aqui.
      }
    }

    (socket as any).auth = payload;
    next();
  });

  io.on("connection", (socket) => {
    const auth = (socket as any).auth;
    if (auth?.tenantId) socket.join(`tenant:${auth.tenantId}`);
    if (auth?.type === "superadmin") socket.join("superadmin");
  });
}

export function emitToTenant(tenantId: string, event: string, payload?: unknown): void {
  io?.to(`tenant:${tenantId}`).emit(event, payload);
}

export function emitToSuperAdmins(event: string, payload?: unknown): void {
  io?.to("superadmin").emit(event, payload);
}
