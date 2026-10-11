// Offline support: the app shell is cached on install; fonts and the PDF reader are cached the first time they load.
const VERSION = 'savings-tracker-v4';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];
// On a weak signal, wait this long for a fresh page before opening the saved copy.
const PAGE_WAIT = 4000;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // The page itself: try the network first so updates arrive. Fall back to the saved copy when offline,
  // or after PAGE_WAIT on a slow connection (the fresh copy is still saved for next time).
  // Only good responses are saved, so an error page never replaces the app.
  if (req.mode === 'navigate') {
    const net = fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); return caches.open(VERSION).then(c => c.put('./index.html', copy)).then(() => res); }
      return res;
    });
    e.waitUntil(net.catch(() => {}));
    e.respondWith(new Promise(resolve => {
      let done = false;
      const finish = res => { if (!done && res) { done = true; resolve(res); } };
      const saved = () => caches.match('./index.html');
      const timer = setTimeout(() => saved().then(finish), PAGE_WAIT);
      net.then(res => { clearTimeout(timer); if (res.ok) finish(res); else saved().then(hit => finish(hit || res)); })
        .catch(() => { clearTimeout(timer); saved().then(hit => finish(hit || Response.error())); });
    }));
    return;
  }
  // Only the app's own files, fonts and the PDF reader are cached; anything else (like exchange rates) always goes to the network.
  const url = new URL(req.url);
  const cacheable = url.origin === location.origin || /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(url.hostname);
  if (!cacheable) return;
  // Cacheable files: cache first.
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
