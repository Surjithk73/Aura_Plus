self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open('my-cache').then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/manifest.json',
                '/icon-192x192.png',
                '/icon-512x512.png',
                '/static/js/bundle.js', // Adjust this path based on your build
                '/static/css/main.css'   // Adjust this path based on your build
            ]);
        })
    );
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker activating.');
});

self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});