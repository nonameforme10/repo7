(function () {
  "use strict";

  const CHECK_URL = "/__caretrack_health";
  const ONLINE_INTERVAL_MS = 60000;
  const OFFLINE_INTERVAL_MS = 10000;
  const CHECK_TIMEOUT_MS = 3500;
  const THEME_STORAGE_KEY = "caretrack-theme";
  const THEMES = new Set(["light", "dark"]);
  const scriptUrl = document.currentScript?.src || `${window.location.origin}/assets/js/caretrack-runtime.js`;
  const SW_URL = "/sw.js";
  const logoUrl = new URL("../img/logo.png", scriptUrl).href;
  const themeIcons = {
    light: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>',
    dark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8z"/></svg>',
  };

  const runtime = {
    status: {
      online: navigator.onLine,
      viaServiceWorker: false,
      serviceWorkerReady: false,
      lastCheckedAt: 0,
    },
    theme: {
      get current() {
        return getCurrentTheme();
      },
      set: setTheme,
      toggle: toggleTheme,
    },
    checkConnection,
    registerServiceWorker,
  };

  window.CareTrackRuntime = runtime;

  let checkTimer = 0;
  let activeCheck = null;
  let checkSequence = 0;
  let overlayReady = false;
  let overlayObserver = null;
  let themeObserver = null;

  const styles = `
    html.caretrack-offline-lock,
    body.caretrack-offline-lock {
      overflow: hidden !important;
    }

    #caretrack-offline-screen,
    #caretrack-offline-screen * {
      box-sizing: border-box;
    }

    #caretrack-offline-screen {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: grid;
      place-items: center;
      padding: 24px;
      color: #f8fafc;
      background: rgba(3, 7, 18, 0.86);
      backdrop-filter: blur(18px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 180ms ease;
    }

    #caretrack-offline-screen.visible {
      opacity: 1;
      pointer-events: auto;
    }

    #caretrack-offline-screen[hidden] {
      display: none !important;
    }

    .caretrack-offline-card {
      width: min(420px, 100%);
      padding: 24px;
      border: 1px solid rgba(148, 163, 184, 0.18);
      border-radius: 12px;
      background: rgba(12, 20, 42, 0.94);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
      text-align: center;
    }

    .caretrack-offline-logo {
      width: 156px;
      height: 58px;
      object-fit: contain;
      object-position: center;
      display: block;
      margin: 0 auto 14px;
      border-radius: 8px;
    }

    .caretrack-offline-card h2 {
      margin: 0 0 8px;
      font-size: 22px;
      letter-spacing: 0;
    }

    .caretrack-offline-card p {
      margin: 0 0 18px;
      color: #cbd5e1;
      line-height: 1.55;
      font-size: 14px;
    }

    .caretrack-offline-card button {
      min-height: 42px;
      padding: 0 16px;
      border: 0;
      border-radius: 10px;
      color: #ffffff;
      background: linear-gradient(135deg, #06b6d4, #14b8a6);
      font: 700 14px Inter, ui-sans-serif, system-ui, sans-serif;
      cursor: pointer;
    }

    @media print {
      #caretrack-offline-screen {
        display: none !important;
      }
    }
  `;

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(`caretrack:${name}`, { detail }));
  }

  function storedTheme() {
    try {
      const theme = window.localStorage?.getItem(THEME_STORAGE_KEY);
      return THEMES.has(theme) ? theme : "";
    } catch (_error) {
      return "";
    }
  }

  function systemTheme() {
    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
  }

  function preferredTheme() {
    return storedTheme() || systemTheme();
  }

  function getCurrentTheme() {
    const theme = document.documentElement.dataset.theme;
    return THEMES.has(theme) ? theme : preferredTheme();
  }

  function updateThemeToggles() {
    const theme = getCurrentTheme();
    const nextTheme = theme === "dark" ? "light" : "dark";
    document.querySelectorAll("[data-caretrack-theme-toggle]").forEach((button) => {
      if (button.getAttribute("data-theme-state") !== theme) {
        button.innerHTML = themeIcons[theme];
        button.setAttribute("data-theme-state", theme);
      }
      button.title = `Switch to ${nextTheme} mode`;
      button.setAttribute("aria-label", `Switch to ${nextTheme} mode`);
    });
  }

  function applyTheme(theme, options = {}) {
    const nextTheme = THEMES.has(theme) ? theme : preferredTheme();
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme;

    if (options.persist) {
      try {
        window.localStorage?.setItem(THEME_STORAGE_KEY, nextTheme);
      } catch (_error) {
        // Theme still applies for the current page if storage is unavailable.
      }
    }

    updateThemeToggles();
    emit("theme", { theme: nextTheme });
    return nextTheme;
  }

  function setTheme(theme) {
    return applyTheme(theme, { persist: true });
  }

  function toggleTheme() {
    return setTheme(getCurrentTheme() === "dark" ? "light" : "dark");
  }

  function createThemeToggle() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.setAttribute("data-caretrack-theme-toggle", "true");
    button.addEventListener("click", toggleTheme);
    updateThemeToggles();
    return button;
  }

  function themeToggleTarget() {
    return document.querySelector(".topbar-actions")
      || document.querySelector(".public-nav")
      || document.querySelector(".auth-card");
  }

  function mountThemeToggle() {
    const existing = document.querySelector("[data-caretrack-theme-toggle]");
    if (existing) {
      updateThemeToggles();
      return existing;
    }

    const target = themeToggleTarget();
    if (!target) return null;

    const button = createThemeToggle();
    if (target.classList.contains("topbar-actions") && target.lastElementChild) {
      target.insertBefore(button, target.lastElementChild);
    } else if (target.classList.contains("auth-card") && target.firstElementChild) {
      target.insertBefore(button, target.firstElementChild);
    } else {
      target.appendChild(button);
    }
    updateThemeToggles();
    return button;
  }

  function watchThemeToggleTarget() {
    if (themeObserver || !("MutationObserver" in window)) return;
    themeObserver = new MutationObserver(() => {
      mountThemeToggle();
    });
    themeObserver.observe(document.body, { childList: true, subtree: true });
  }

  function initTheme() {
    applyTheme(preferredTheme());
    mountThemeToggle();
    watchThemeToggleTarget();

    window.matchMedia?.("(prefers-color-scheme: dark)")?.addEventListener?.("change", () => {
      if (!storedTheme()) applyTheme(systemTheme());
    });
  }

  function ensureOverlay() {
    const existingOverlay = document.getElementById("caretrack-offline-screen");
    const existingStyles = document.getElementById("caretrack-runtime-styles");
    if (overlayReady && existingOverlay && existingStyles) return existingOverlay;
    overlayReady = true;

    if (!existingStyles) {
      const style = document.createElement("style");
      style.id = "caretrack-runtime-styles";
      style.textContent = styles;
      document.head.appendChild(style);
    }

    if (existingOverlay) return existingOverlay;

    const nextOverlay = document.createElement("div");
    nextOverlay.id = "caretrack-offline-screen";
    nextOverlay.hidden = true;
    nextOverlay.setAttribute("aria-hidden", "true");
    nextOverlay.innerHTML = `
      <section class="caretrack-offline-card" role="dialog" aria-modal="true" aria-label="Connection status">
        <img class="caretrack-offline-logo" src="${logoUrl}" width="156" height="58" alt="CareTrack">
        <h2>Connection Lost</h2>
        <p>CareTrack cannot reach the network right now. Saved app files stay available while the connection is restored.</p>
        <button id="caretrack-retry-connection" type="button">Try Again</button>
      </section>
    `;
    document.body.appendChild(nextOverlay);
    nextOverlay.querySelector("#caretrack-retry-connection")?.addEventListener("click", () => {
      checkConnection({ force: true });
    });
    return nextOverlay;
  }

  function watchOverlayDuringOffline() {
    if (overlayObserver || !("MutationObserver" in window)) return;
    overlayObserver = new MutationObserver(() => {
      if (runtime.status.online !== false) return;
      if (!document.getElementById("caretrack-offline-screen")) {
        applyOfflineUi(true);
      }
    });
    overlayObserver.observe(document.body, { childList: true });
  }

  function stopWatchingOverlay() {
    overlayObserver?.disconnect();
    overlayObserver = null;
  }

  function applyOfflineUi(offline) {
    if (offline) ensureOverlay();

    const overlay = document.getElementById("caretrack-offline-screen");
    if (overlay) {
      overlay.hidden = !offline;
      overlay.classList.toggle("visible", offline);
      overlay.setAttribute("aria-hidden", offline ? "false" : "true");
    }
    document.documentElement.classList.toggle("caretrack-offline-lock", offline);
    document.body.classList.toggle("caretrack-offline-lock", offline);
    document.documentElement.dataset.caretrackConnection = offline ? "offline" : "online";

    if (offline) {
      watchOverlayDuringOffline();
    } else {
      stopWatchingOverlay();
    }
  }

  function setConnectionStatus(nextStatus) {
    runtime.status = {
      ...runtime.status,
      ...nextStatus,
      lastCheckedAt: Date.now(),
    };

    const offline = runtime.status.online === false;
    applyOfflineUi(offline);

    emit("connection", runtime.status);
  }

  function scheduleNextCheck() {
    window.clearTimeout(checkTimer);
    checkTimer = window.setTimeout(() => {
      checkConnection();
    }, runtime.status.online ? ONLINE_INTERVAL_MS : OFFLINE_INTERVAL_MS);
  }

  function waitForController(timeoutMs = 2500) {
    if (navigator.serviceWorker?.controller) return Promise.resolve(true);
    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        navigator.serviceWorker?.removeEventListener("controllerchange", onControllerChange);
        resolve(!!navigator.serviceWorker?.controller);
      }, timeoutMs);

      function onControllerChange() {
        window.clearTimeout(timeout);
        resolve(true);
      }

      navigator.serviceWorker?.addEventListener("controllerchange", onControllerChange, { once: true });
    });
  }

  async function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || window.location.protocol === "file:") {
      emit("service-worker", { ready: false, reason: "unsupported" });
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register(SW_URL, { scope: "/" });
      await navigator.serviceWorker.ready;
      await waitForController();
      runtime.status.serviceWorkerReady = !!registration.active;
      emit("service-worker", {
        ready: runtime.status.serviceWorkerReady,
        controlled: !!navigator.serviceWorker.controller,
        scriptURL: registration.active?.scriptURL || "",
      });
      return registration;
    } catch (error) {
      runtime.status.serviceWorkerReady = false;
      emit("service-worker", { ready: false, reason: error.message });
      return null;
    }
  }

  function withTimeout(ms) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), ms);
    return {
      signal: controller.signal,
      done: () => window.clearTimeout(timer),
    };
  }

  async function fetchHealthThroughServiceWorker() {
    const timeout = withTimeout(CHECK_TIMEOUT_MS);
    try {
      const response = await fetch(`${CHECK_URL}?ts=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "X-CareTrack-Connectivity": "1" },
        signal: timeout.signal,
      });
      return {
        online: response.ok,
        status: response.status,
        viaServiceWorker: response.headers.get("X-CareTrack-SW") === "1",
      };
    } finally {
      timeout.done();
    }
  }

  async function fetchDirectFallback() {
    const timeout = withTimeout(CHECK_TIMEOUT_MS);
    try {
      const response = await fetch(`/?ct_direct=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
        signal: timeout.signal,
      });
      return response.ok;
    } finally {
      timeout.done();
    }
  }

  async function checkConnection(options = {}) {
    if (activeCheck && !options.force) return activeCheck;
    const runId = ++checkSequence;
    window.clearTimeout(checkTimer);

    function commitStatus(nextStatus) {
      if (runId === checkSequence) {
        setConnectionStatus(nextStatus);
      }
      return runtime.status;
    }

    activeCheck = (async () => {
      if (!navigator.onLine) {
        return commitStatus({ online: false, viaServiceWorker: !!navigator.serviceWorker?.controller });
      }

      try {
        const health = await fetchHealthThroughServiceWorker();
        if (health.viaServiceWorker) {
          return commitStatus({
            online: health.online,
            viaServiceWorker: health.viaServiceWorker,
            healthStatus: health.status,
          });
        }

        const directOnline = await fetchDirectFallback();
        return commitStatus({
          online: directOnline,
          viaServiceWorker: false,
          healthStatus: health.status,
        });
      } catch (error) {
        try {
          const directOnline = await fetchDirectFallback();
          return commitStatus({
            online: directOnline,
            viaServiceWorker: false,
            healthStatus: 0,
            error: error.message,
          });
        } catch (fallbackError) {
          return commitStatus({
            online: false,
            viaServiceWorker: !!navigator.serviceWorker?.controller,
            healthStatus: 0,
            error: fallbackError.message || error.message,
          });
        }
      }
    })().finally(() => {
      if (runId === checkSequence) {
        activeCheck = null;
        scheduleNextCheck();
      }
    });

    return activeCheck;
  }

  async function init() {
    initTheme();

    window.addEventListener("online", () => checkConnection({ force: true }));
    window.addEventListener("offline", () => {
      checkSequence += 1;
      activeCheck = null;
      window.clearTimeout(checkTimer);
      setConnectionStatus({ online: false, viaServiceWorker: !!navigator.serviceWorker?.controller });
      scheduleNextCheck();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) checkConnection({ force: true });
    });

    await registerServiceWorker();
    await checkConnection({ force: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
