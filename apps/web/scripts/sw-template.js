/* eslint-disable */
// Service worker template. scripts/generate-sw.mjs fills in the placeholders
// after `next build` and writes out/sw.js. Do not edit out/sw.js by hand.

const VERSION = "__VERSION__";
const SHELL_CACHE = `shell-${VERSION}`;
const STATIC_CACHE = `static-${VERSION}`;
const QURAN_CACHE = "quran-__DATA_VERSION__";
const PAGES = __PAGES__; // HTML routes of the static export
const STATIC_ASSETS = __STATIC_ASSETS__; // hashed /_next/static files and icons
const QURAN_FILES = __QURAN_FILES__; // /quran/NNN.json

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then((cache) => cache.addAll(PAGES)),
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS)),
    ]),
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, STATIC_CACHE, QURAN_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

// Download every surah for offline reading, a few at a time, skipping files
// already cached. Safe to call repeatedly (the page asks on every load, so an
// interrupted download resumes).
async function fillQuranCache() {
  const cache = await caches.open(QURAN_CACHE);
  const queue = [...QURAN_FILES];
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      if (!(await cache.match(file))) await cache.add(file).catch(() => undefined);
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  // waitUntil keeps the worker alive until the download finishes.
  if (event.data === "CACHE_QURAN") event.waitUntil(fillQuranCache());
});

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(SHELL_CACHE)).put(request, response.clone());
    return response;
  } catch (error) {
    const url = new URL(request.url);
    return (
      (await caches.match(request, { ignoreSearch: true })) ||
      (await caches.match(url.pathname.replace(/\/$/, "") || "/", { ignoreSearch: true })) ||
      (await caches.match("/")) ||
      Response.error()
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Only same-origin: never cache the grading API or reciter audio.
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (url.pathname.startsWith("/quran/")) {
    event.respondWith(cacheFirst(request, QURAN_CACHE));
  }
  // Everything else (RSC prefetch payloads, icons) goes to the network as usual.
});
