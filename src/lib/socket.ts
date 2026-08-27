import { io, type Socket } from "socket.io-client";
import { getToken } from "@/src/lib/api";

let socket: Socket | null = null;

export const UPDATE_AVAILABLE_EVENT = "agendelle:update-available";

/** Conecta (uma única vez) o socket autenticado — same-origin, sem precisar de URL. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io({ auth: { token: getToken() } });
    // O processo do servidor reinicia a cada deploy — quando o socket reconecta depois de
    // cair, é sinal de que subiu uma versão nova. NÃO recarrega a página sozinho aqui: se o
    // usuário estiver no meio de um formulário (ex: criando um agendamento), um reload force
    // perderia tudo que ele digitou. Só avisa — quem decide a hora de atualizar é o usuário
    // (ver o banner em App.tsx que escuta esse evento).
    socket.io.on("reconnect", () => {
      window.dispatchEvent(new Event(UPDATE_AVAILABLE_EVENT));
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
