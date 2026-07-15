const CACHE = 'drone-bench-v1';
const ASSETS = [
  'index.html',
  'css/style.css',
  'js/study-data.js',
  'js/timer.js',
  'js/app.js',
  'js/dashboard.js',
  'js/ai-chat.js',
  'js/training.js',
  'js/quiz-data.js',
  'js/quiz.js',
  'manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
