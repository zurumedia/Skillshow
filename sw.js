const V = 'skillshow-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './skillshow-192.png', './skillshow-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    const fresh = fetch(r).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); }
      return res;
    });
    const slow = new Promise(res => setTimeout(() => res(null), 2500));
    e.respondWith(
      Promise.race([fresh, slow])
        .then(res => res || caches.match(r).then(m => m || fresh))
        .catch(() => caches.match(r).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  if (u.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      const copy = res.clone(); caches.open(V).then(c => c.put(r, copy)); return res;
    })));
  }
});

/* ---- Phone notifications ---- */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      /* App is open and on screen: no buzz needed, the app already shows it */
      if (list.some(c => c.visibilityState === 'visible')) return;
      return self.registration.showNotification(d.title || 'Skillshow', {
        body: d.body || '',
        icon: d.icon || './skillshow-192.png',
        badge: './skillshow-192.png',
        tag: d.tag || undefined,
        renotify: !!d.tag,
        vibrate: [80, 40, 80],
        data: { go: d.go || '' }
      });
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const go = (e.notification.data && e.notification.data.go) || '';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.indexOf(self.location.origin) === 0) {
          c.postMessage({ type: 'ss-open', go });
          return c.focus();
        }
      }
      return self.clients.openWindow('./' + (go ? '?go=' + encodeURIComponent(go) : ''));
    })
  );
});
