/* ===== sw.js —— 离线缓存（PWA） =====
   策略：安装时预缓存全部课程资源；运行时"缓存优先 + 后台更新"。
   更新内容后请修改下面的 VERSION 号，用户下次打开即会自动更新。 */
const VERSION = 'v1.2.0';
const CACHE = 'naonaoyu-math-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/store.js',
  './js/grade.js',
  './js/anim.js',
  './js/quiz.js',
  './js/app.js',
  './js/data/catalog.js',
  './js/data/g1.js',
  './js/data/g2.js',
  './js/data/g3.js',
  './js/data/g4.js',
  './js/data/g5.js',
  './js/data/g6.js',
  './js/data/g1b.js', './js/data/g1c.js',
  './js/data/g2b.js', './js/data/g2c.js',
  './js/data/g3b.js', './js/data/g3c.js',
  './js/data/g4b.js', './js/data/g4c.js',
  './js/data/g5b.js', './js/data/g5c.js',
  './js/data/g6b.js', './js/data/g6c.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.all(ASSETS.map(url =>
        cache.add(new Request(url, { cache: 'reload' })).catch(() => null)
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 页面导航：网络优先，失败回退缓存 */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* 静态资源：缓存优先 */
  event.respondWith(
    caches.match(req).then(hit => {
      if (hit) {
        fetch(req).then(res => {
          if (res && res.status === 200) caches.open(CACHE).then(c => c.put(req, res)).catch(() => {});
        }).catch(() => {});
        return hit;
      }
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match('./index.html'));
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});
