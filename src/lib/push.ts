// Helpers de Web Push compartilhados entre a página pública de agendamento (cliente,
// identificado por telefone) e o painel do profissional (autenticado, via apiFetch).

// VAPID public key vem em base64url — pushManager.subscribe exige um Uint8Array.
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getOrCreatePushSubscription(publicKey: string): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }
  return subscription;
}

// Notification.permission é por ORIGEM/domínio inteiro, não por conta/pessoa — um profissional
// que já usou a página pública de agendamento nesse mesmo navegador (ou vice-versa) já tem
// "granted" mesmo sem nunca ter se inscrito como profissional. Sem checar a subscription de
// verdade, o banner de opt-in nunca aparecia pra quem já tinha "granted" de outro fluxo.
export async function hasActivePushSubscription(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

// Beep de notificação sintetizado (2 tons curtos) — sem depender de nenhum arquivo de áudio.
// O som do sistema operacional (showNotification) é discreto demais pra quem já está de olho
// no painel; isso toca alto o suficiente pra chamar atenção mesmo com a aba em segundo plano
// (browsers não silenciam áudio de uma aba só por ela não estar em foco, só por autoplay sem
// interação prévia — mas o listener só é registrado depois que a página já carregou/teve algum
// clique do usuário no fluxo normal de uso, então não esbarra nessa restrição).
function playNotificationChime(): void {
  try {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) return;
    const ctx = new AudioContextCtor();
    const now = ctx.currentTime;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
    setTimeout(() => ctx.close().catch(() => {}), 700);
  } catch {
    // Ambientes sem Web Audio (raro) — falha silenciosa, o push/notificação do SO já cobre o aviso.
  }
}

// Ouve o aviso que o Service Worker manda pra TODAS as abas abertas quando uma push chega (ver
// sw.js) e toca o beep — funciona em qualquer tela do painel, não só numa página específica,
// porque o listener fica no nível do app (chamado uma vez no boot), não dentro de um componente
// de aba isolada. Retorna uma função de cleanup.
export function listenForPushSound(): () => void {
  if (!("serviceWorker" in navigator)) return () => {};
  const handler = (event: MessageEvent) => {
    if (event.data?.type === "push-received") playNotificationChime();
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
