const { test, expect } = require("@playwright/test");

const adminPages = [
  "admin/admin.html",
  "admin/doctors.html",
  "admin/patients.html",
  "admin/diagnoses.html",
  "admin/reports.html",
  "admin/schedules.html",
  "admin/users.html",
  "admin/settings.html",
  "admin/audit-logs.html",
  "admin/doctor-form.html",
  "admin/doctor-detail.html",
  "admin/patient-form.html",
  "admin/patient-profile.html",
  "admin/patient-report.html",
  "admin/diagnosis-form.html",
];

async function waitForRuntime(page) {
  await page.waitForFunction(() => window.CareTrackRuntime?.status);
}

async function serviceWorkerInfo(page) {
  return page.evaluate(async () => {
    if (!("serviceWorker" in navigator)) {
      return { supported: false, ready: false, controlled: false, scriptURL: "" };
    }

    const registration = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 3000);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          clearTimeout(timer);
          resolve();
        }, { once: true });
      });
    }

    return {
      supported: true,
      ready: !!registration.active,
      controlled: !!navigator.serviceWorker.controller,
      scriptURL: registration.active?.scriptURL || "",
    };
  });
}

async function ensureServiceWorkerControlled(page) {
  let info = await serviceWorkerInfo(page);
  if (!info.controlled) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForRuntime(page);
    info = await serviceWorkerInfo(page);
  }
  return info;
}

test("reorganized static assets are served", async ({ request }) => {
  const paths = [
    "/assets/css/caretrack.css",
    "/assets/js/caretrack-runtime.js",
    "/assets/js/caretrack-app.js",
    "/assets/js/caretrack-auth.js",
    "/assets/js/firebase-config.js",
    "/assets/img/logo.png",
    "/sw.js",
  ];

  for (const path of paths) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
  }
});

test("public page uses the real logo and registers sw.js", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".public-nav img.ct-logo-image")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Secure Medical Records Management/i })).toBeVisible();
  await waitForRuntime(page);

  const sw = await ensureServiceWorkerControlled(page);
  expect(sw.supported).toBe(true);
  expect(sw.ready).toBe(true);
  expect(sw.controlled).toBe(true);
  expect(sw.scriptURL).toContain("/sw.js");

  const health = await page.evaluate(async () => {
    await window.CareTrackRuntime.checkConnection({ force: true });
    const response = await fetch("/__caretrack_health?test=public", {
      cache: "no-store",
      headers: { "X-CareTrack-Connectivity": "1" },
    });
    return {
      status: response.status,
      via: response.headers.get("X-CareTrack-SW"),
      runtime: window.CareTrackRuntime.status,
    };
  });

  expect(health.status).toBe(200);
  expect(health.via).toBe("1");
  expect(health.runtime.online).toBe(true);
  expect(health.runtime.viaServiceWorker).toBe(true);
});

test("connectivity overlay is driven through the service worker", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await waitForRuntime(page);
  const sw = await ensureServiceWorkerControlled(page);
  expect(sw.controlled).toBe(true);

  await context.setOffline(true);
  const offlineStatus = await page.evaluate(() => window.CareTrackRuntime.checkConnection({ force: true }));
  expect(offlineStatus.online).toBe(false);
  await expect(page.locator("#caretrack-offline-screen.visible")).toBeVisible();

  await context.setOffline(false);
  const onlineStatus = await page.evaluate(() => window.CareTrackRuntime.checkConnection({ force: true }));
  expect(onlineStatus.online).toBe(true);
  await expect(page.locator("#caretrack-offline-screen")).toBeHidden();
});

test("auth page loads without the old loader path", async ({ page }) => {
  await page.goto("/auth/index.html", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".auth-card img.ct-logo-image")).toBeVisible();
  await expect(page.locator("#loginForm")).toBeVisible();
  await waitForRuntime(page);

  const runtime = await page.evaluate(() => ({
    hasRuntime: !!window.CareTrackRuntime,
    hasOldOfflineScreen: !!document.querySelector("#offline-screen"),
  }));
  expect(runtime.hasRuntime).toBe(true);
  expect(runtime.hasOldOfflineScreen).toBe(false);
});

test("protected admin pages redirect unauthenticated staff to login", async ({ page }) => {
  for (const path of adminPages) {
    await page.goto(`/${path}`, { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/auth\/index\.html\?next=/, { timeout: 20000 });
    await expect(page.locator("#loginForm")).toBeVisible();
    await expect(page.locator(".loading-screen")).toHaveCount(0);
  }
});

test("access denied page renders without requiring a session", async ({ page }) => {
  await page.goto("/admin/access-denied.html", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible();
  await expect(page.locator("#loginForm")).toHaveCount(0);
});
