import { useEffect, useState } from "react";

/**
 * PWA helpers: service-worker registration and the "Install app" prompt.
 *
 * Browsers fire `beforeinstallprompt` once, early — often before any React
 * component has mounted — so it is captured at module load (`initPwa()` is
 * called from main.jsx) and handed to whoever asks later.
 */
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIosSafari() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

export function initPwa() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    notify();
  });

  // Production only — a service worker in `vite dev` serves stale files and confuses HMR.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* installability is a nicety; never break the app over it */
      });
    });
  }
}

/** `{ canInstall, install, iosHint }` for an "Install app" menu item. */
export function useInstallApp() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  const installed = typeof window !== "undefined" && isStandalone();
  return {
    canInstall: !installed && deferredPrompt !== null,
    // iOS has no install prompt API — the user adds it from the Share sheet.
    iosHint: !installed && typeof window !== "undefined" && isIosSafari(),
    async install() {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => {});
      deferredPrompt = null;
      notify();
    },
  };
}
