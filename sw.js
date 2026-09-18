// ES-PTE service worker. Bump VERSION after uploading new files.
const VERSION = "espte-v1";
const SHELL = ["./","./index.html","./app.js","./bank-speaking.js","./bank-writing-reading.js","./bank-listening.js","./manifest.json","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(()=>self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x=>x!==VERSION).map(x=>caches.delete(x)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e => {
  if(e.request.method !== "GET") return;
  if(e.request.mode === "navigate"){
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(VERSION).then(x=>x.put("./index.html", c)); return r; }).catch(()=>caches.match("./index.html")));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
    if(r.ok){ const c = r.clone(); caches.open(VERSION).then(x=>x.put(e.request, c)); }
    return r;
  }).catch(()=>hit)));
});
