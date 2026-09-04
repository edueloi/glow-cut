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
