/* 交易知识地图 - Service Worker v1.0 */

const CACHE_NAME = 'trade-map-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 安装阶段：预缓存核心资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// 激活阶段：清理旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 获取阶段：缓存优先策略（离线可用）
self.addEventListener('fetch', event => {
  // 只缓存 GET 请求
  if (event.request.method !== 'GET') return;

  // 不缓存非 http/https 请求（如 chrome-extension://）
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // 命中缓存直接返回（离线可用）
      if (cached) return cached;

      // 未命中则网络请求，成功后缓存
      return fetch(event.request).then(response => {
        // 只缓存有效响应
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(() => {
        // 网络不可用且缓存未命中时，返回离线页面
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
        return new Response('离线中', { status: 503 });
      });
    })
  );
});
