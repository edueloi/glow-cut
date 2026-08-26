import { io, type Socket } from "socket.io-client";
import { getToken } from "@/src/lib/api";

let socket: Socket | null = null;

/** Conecta (uma única vez) o socket autenticado — same-origin, sem precisar de URL. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ auth: { token: getToken() } });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
