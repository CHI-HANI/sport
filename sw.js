// مصحف رمضان - Service Worker
const CACHE_NAME = 'ramadan-v1';
const ASSETS = ['./index.html', './manifest.json'];

// ===== INSTALL =====
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ===== ACTIVATE =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ===== FETCH (offline support) =====
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => caches.match('./index.html')))
  );
});

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'مصحف رمضان 🌙', {
      body: data.body || 'لا تنسَ تسجيل يومك!',
      icon: './icon-192.png',
      badge: './icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      tag: 'ramadan-reminder',
      renotify: true,
      actions: [
        { action: 'open', title: 'فتح التطبيق' },
        { action: 'dismiss', title: 'إغلاق' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow('./index.html'));
  }
});

// ===== SCHEDULED LOCAL NOTIFICATION =====
// يستقبل رسالة من التطبيق لجدولة الإشعار
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATION') {
    const { hour, minute } = e.data;
    scheduleDaily(hour, minute);
  }
});

// جدولة إشعار يومي بدون push server
let notifTimer = null;
function scheduleDaily(hour, minute) {
  if (notifTimer) clearTimeout(notifTimer);
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  notifTimer = setTimeout(() => {
    self.registration.showNotification('مصحف رمضان 🌙', {
      body: 'هل سجّلت يومك اليوم؟ لا تنسَ الصلوات والأحزاب والتراويح 📿',
      icon: './icon-192.png',
      badge: './icon-192.png',
      dir: 'rtl',
      lang: 'ar',
      vibrate: [200, 100, 200],
      tag: 'ramadan-daily',
      renotify: true,
      actions: [
        { action: 'open', title: '📖 سجّل الآن' },
        { action: 'dismiss', title: 'لاحقاً' }
      ]
    });
    scheduleDaily(hour, minute); // جدولة اليوم التالي
  }, delay);
}
