const CACHE_NAME = 'smart-pos-v1';
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './db.js',
    './pos.js',
    './products.js',
    './sales.js',
    './dashboard.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap',
    'https://unpkg.com/@zxing/library@latest',
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(res => res || fetch(e.request))
    );
});
