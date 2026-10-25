/* SkillShow PWA service worker
   Deliberately caches only the public app shell. It does NOT cache Supabase,
   API calls, messages, profiles, CVs, or authenticated responses.
*/
const CACHE_NAME = "skillshow-shell-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => Promise.resolve())
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith("skillshow-shell-") && key !== CACHE_NAME)
        .map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept non-GET requests, cross-origin requests, or Supabase/API calls.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Only use cache-first for known static app-shell files.
  const allowed = new Set([
    new URL("./", self.registration.scope).href,
    new URL("./index.html", self.registration.scope).href,
    new URL("./manifest.json", self.registration.scope).href,
    new URL("./icon-192.png", self.registration.scope).href,
    new URL("./icon-512.png", self.registration.scope).href
  ]);
  if (!allowed.has(url.href)) return;

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
