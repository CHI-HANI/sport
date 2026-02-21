// ============================================================
// رمضان فيت 4.0 — Service Worker
// Strategy: Cache-First (assets) + Network-First (fonts)
// ============================================================

const APP_CACHE  = 'fitpulse-app-v1';
const FONT_CACHE = 'fitpulse-fonts-v1';
const VERSION    = '5.0.0';

// Core files — must be cached at install time
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
];

// ---- Install: cache all core assets ----
self.addEventListener('install', e => {
  console.log(`[SW ${VERSION}] Installing...`);
  e.waitUntil(
    caches.open(APP_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => {
        console.log(`[SW ${VERSION}] Core assets cached ✓`);
        return self.skipWaiting();
      })
  );
});

// ---- Activate: delete old caches ----
self.addEventListener('activate', e => {
  console.log(`[SW ${VERSION}] Activating...`);
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys
        .filter(k => k !== APP_CACHE && k !== FONT_CACHE)
        .map(k => {
          console.log(`[SW] Deleting old cache: ${k}`);
          return caches.delete(k);
        })
    )).then(() => self.clients.claim())
  );
});

// ---- Fetch: smart routing ----
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Skip non-GET and chrome-extension
  if(e.request.method !== 'GET') return;
  if(url.protocol === 'chrome-extension:') return;

  // Google Fonts — Stale-While-Revalidate
  if(url.hostname.includes('fonts.googleapis.com') ||
     url.hostname.includes('fonts.gstatic.com')){
    e.respondWith(staleWhileRevalidate(e.request, FONT_CACHE));
    return;
  }

  // Core app assets — Cache-First
  if(url.origin === self.location.origin){
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // Everything else — Network with cache fallback
  e.respondWith(networkFirst(e.request));
});

// ---- Strategies ----

// Cache-First: serve from cache, background update
async function cacheFirst(req){
  const cached = await caches.match(req);
  if(cached){
    // Background update
    update(req, APP_CACHE);
    return cached;
  }
  return networkWithCacheSave(req, APP_CACHE);
}

// Network-First: try network, fall back to cache
async function networkFirst(req){
  try{
    const res = await fetch(req);
    if(res && res.ok){
      const cache = await caches.open(APP_CACHE);
      cache.put(req, res.clone());
    }
    return res;
  } catch(_){
    const cached = await caches.match(req);
    return cached || offlineFallback();
  }
}

// Stale-While-Revalidate: return cached immediately, update in background
async function staleWhileRevalidate(req, cacheName){
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req).then(res => {
    if(res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(()=>{});
  return cached || fetchPromise;
}

async function networkWithCacheSave(req, cacheName){
  try{
    const res = await fetch(req);
    if(res && res.ok){
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch(_){
    return offlineFallback();
  }
}

// Background cache update (don't wait)
function update(req, cacheName){
  fetch(req).then(res => {
    if(res && res.ok){
      caches.open(cacheName).then(c => c.put(req, res.clone()));
    }
  }).catch(()=>{});
}

// Offline fallback page
async function offlineFallback(){
  const cached = await caches.match('./index.html');
  if(cached) return cached;
  return new Response(
    `<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8">
    <title>FITPULSE PRO — غير متصل</title>
    <style>body{background:#07090F;color:#D4A843;font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}h1{font-size:3em}p{color:#6B6357}</style>
    </head><body><h1>⚡</h1><h2>FITPULSE PRO</h2><p>لا يوجد اتصال بالإنترنت</p><p>سيعمل التطبيق عند إعادة الاتصال</p></body></html>`,
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// ---- Listen for messages from app ----
self.addEventListener('message', e => {
  if(e.data === 'SKIP_WAITING') self.skipWaiting();
  if(e.data === 'GET_VERSION') e.source.postMessage({ type: 'VERSION', version: VERSION });
});
