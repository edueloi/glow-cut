import { io, type Socket } from "socket.io-client";
import { getToken } from "@/src/lib/api";

let socket: Socket | null = null;

/** Conecta (uma única vez) o socket autenticado — same-origin, sem precisar de URL. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ auth: { token: getToken() } });
    // O processo do servidor reinicia a cada deploy — quando o socket reconecta depois de
    // cair, é sinal de que subiu uma versão nova. Recarrega a página pra pegar o bundle
    // atualizado sem precisar o usuário dar F5.
    socket.io.on("reconnect", () => {
      window.location.reload();
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
