/*
 * HRM Platform service worker.
 *
 * Makes the app installable and fast to open, and shows a friendly page when
 * offline. It deliberately caches ONLY static files the app ships with:
 *
 *   • /assets/*   hashed JS/CSS bundles  — cache-first (their names change per build)
 *   • icons, manifest, offline page      — stale-while-revalidate
 *   • page navigations                   — network-first, offline page on failure
 *
 * It NEVER touches API traffic: anything under /api/, any non-GET request, and
 * any other origin (a separately hosted API, fonts, Cloudinary) goes straight
 * to the network. HR data is private to an organization and a signed-in user;
 * keeping it out of every cache means nothing can outlive a sign-out or be
 * seen by the next person using the same device.
 *
 * Bump CACHE_VERSION to force every client to drop its old caches.
 */
const CACHE_VERSION = "v2";
const SHELL_CACHE = `hrm-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `hrm-assets-${CACHE_VERSION}`;
const SHELL_FILES = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png", "/logos/hrm.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, ASSET_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // other origins: network only
  if (url.pathname.startsWith("/api/")) return; // never cache API traffic
  if (url.pathname === "/sw.js") return;

  // Page loads: always try the network (so a new deploy is picked up), fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  // Hashed build output: immutable, so serve from cache and fill it on first use.
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(
      caches.open(ASSET_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const res = await fetch(request);
        if (res.ok) cache.put(request, res.clone());
        return res;
      }),
    );
    return;
  }

  // Other shipped statics (icons, manifest): serve fast, refresh in the background.
  if (SHELL_FILES.includes(url.pathname) || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/logos/")) {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const refresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || refresh;
      }),
    );
  }
});
