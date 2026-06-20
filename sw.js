/* 交易知识地图 - Service Worker v2.0 */
/* 更新策略：文档用网络优先，静态资源用缓存优先 */

const CACHE_NAME = 'trade-map-v2';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 安装阶段：预缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting(); // 立即激活新 SW
    })
  );
});

// 激活阶段：清理旧缓存 + 接管所有页面
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => {
          console.log('SW clearing old cache:', key);
          return caches.delete(key);
        })
      );
    }).then(() => {
      return self.clients.claim(); // 立即控制所有客户端
    })
  );
});

// 获取阶段
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  if (!event.request.url.startsWith('http')) return;

  const url = new URL(event.request.url);
  const isDocument = event.request.destination === 'document';

  if (isDocument) {
    // 策略：网络优先（保证看到最新内容），离线时回退缓存
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 网络成功：更新缓存 + 返回最新内容
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
          return response;
        })
        .catch(() => {
          // 离线：回退缓存版本
          return caches.match(event.request).then(cached => {
            return cached || caches.match('./index.html');
          });
        })
    );
  } else {
    // 策略：缓存优先（静态资源不变），未命中则网络请求
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(() => {
          return new Response('离线中', { status: 503 });
        });
      })
    );
  }
});
