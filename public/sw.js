const CACHE = "agendelle-v1";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});

self.addEventListener("push", (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = {}; }
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || "Agendelle", {
        body: data.body || "",
        icon: data.icon || "/favicon-celular.png",
        badge: "/favicon-celular.png",
        tag: data.tag,
        data: { url: data.url || "/" },
      }),
      // Avisa TODAS as abas abertas desse escopo (independente de qual tela/rota o usuário
      // está vendo dentro do painel) pra tocar um som próprio — o som do sistema operacional
      // sozinho (showNotification) é discreto demais pra quem já está de olho no painel.
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
        clientList.forEach((client) => client.postMessage({ type: "push-received", payload: data }));
      }),
    ])
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const targetUrl = e.notification.data?.url || "/";
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
