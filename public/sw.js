// Service worker minimal : condition nécessaire pour que le navigateur propose
// "Installer l'application" (PWA). Volontairement prudent : met en cache
// uniquement les fichiers statiques (icônes, polices, JS/CSS générés par
// Next.js), jamais les pages elles-mêmes — le contenu dépend de la session
// et de l'abonnement de l'élève, le mettre en cache risquerait de montrer du
// contenu périmé ou premium à la mauvaise personne. Les pages continuent
// donc de passer par le réseau normalement (pas de mode hors-ligne complet).
const CACHE_NAME = "amxamxam-static-v1";
const STATIC_PATH_RE = /\/_next\/static\/|\/icons\/|\.(?:png|jpg|jpeg|webp|svg|woff2?)$/;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !STATIC_PATH_RE.test(new URL(request.url).pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) cache.put(request, response.clone());
      return response;
    }),
  );
});
