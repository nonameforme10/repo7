"use strict";

const CACHE_VERSION = "caretrack-app-v2";
const HEALTH_PATH = "/__caretrack_health";
const PRECACHE_ASSETS = [
  "/",
  "/index.html",
  "/auth/index.html",
  "/admin/access-denied.html",
  "/admin/admin.html",
  "/admin/audit-logs.html",
  "/admin/diagnoses.html",
  "/admin/diagnosis-form.html",
  "/admin/doctor-detail.html",
  "/admin/doctor-form.html",
  "/admin/doctors.html",
  "/admin/patient-form.html",
  "/admin/patient-profile.html",
  "/admin/patient-report.html",
  "/admin/patients.html",
  "/admin/reports.html",
  "/admin/schedules.html",
  "/admin/settings.html",
  "/admin/users.html",
  "/assets/css/caretrack.css",
  "/assets/js/caretrack-app.js",
  "/assets/js/caretrack-auth.js",
  "/assets/js/caretrack-runtime.js",
  "/assets/js/firebase-config.js",
  "/assets/img/logo.png",
];

function isFirebaseHost(hostname) {
  return /(?:firebaseio|googleapis|gstatic)\.com$/i.test(hostname) || /firebasestorage\.app$/i.test(hostname);
}

function swJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-CareTrack-SW": "1",
    },
  });
}

async function handleHealthCheck() {
  const checkUrl = new URL("/", self.location.origin);
  checkUrl.searchParams.set("ct_network", Date.now().toString());

  try {
    const response = await fetch(new Request(checkUrl, {
      cache: "no-store",
      credentials: "same-origin",
    }));

    return swJson({
      online: response.ok,
      status: response.status,
      via: "service-worker",
    }, response.ok ? 200 : 503);
  } catch (error) {
    return swJson({
      online: false,
      status: 0,
      via: "service-worker",
      error: error.message,
    }, 503);
  }
}

async function putInCache(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE_VERSION);
  await cache.put(request, response);
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request)
    .then((response) => {
      putInCache(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => cached || Response.error());

  return cached || network;
}

async function networkFirst(request, fallbackUrl = "/index.html") {
  try {
    const response = await fetch(request);
    putInCache(request, response.clone()).catch(() => undefined);
    return response;
  } catch (_) {
    return caches.match(request).then(async (cached) => cached || await caches.match(fallbackUrl) || Response.error());
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (request.method !== "GET") return;

  if (sameOrigin && url.pathname === HEALTH_PATH) {
    event.respondWith(handleHealthCheck());
    return;
  }

  if (!sameOrigin) {
    if (isFirebaseHost(url.hostname)) return;
    event.respondWith(fetch(request));
    return;
  }

  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    const fallback = url.pathname.startsWith("/admin/")
      ? url.pathname
      : url.pathname.startsWith("/auth/")
        ? "/auth/index.html"
        : "/index.html";
    event.respondWith(networkFirst(request, fallback));
    return;
  }

  event.respondWith(networkFirst(request));
});
