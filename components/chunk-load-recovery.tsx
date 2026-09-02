"use client";

import { useEffect } from "react";
import { isChunkLoadError } from "@/lib/chunk-load-error";

const LAST_RECOVERY_KEY = "last-chunk-recovery";
const RECOVERY_QUERY = "__app_refresh";
const RECOVERY_INTERVAL_MS = 60_000;

function reloadWithFreshHtml() {
  const now = Date.now();

  try {
    const lastRecovery = Number(window.sessionStorage.getItem(LAST_RECOVERY_KEY) || 0);
    if (now - lastRecovery < RECOVERY_INTERVAL_MS) return;
    window.sessionStorage.setItem(LAST_RECOVERY_KEY, String(now));
  } catch {
    // O recarregamento continua mesmo se o navegador bloquear sessionStorage.
  }

  const url = new URL(window.location.href);
  url.searchParams.set(RECOVERY_QUERY, String(now));
  window.location.replace(url.toString());
}

export function ChunkLoadRecovery() {
  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has(RECOVERY_QUERY)) {
      currentUrl.searchParams.delete(RECOVERY_QUERY);
      window.history.replaceState(window.history.state, "", currentUrl.toString());
    }

    const handleError = (event: ErrorEvent) => {
      const target = event.target;
      const failedChunkScript = target instanceof HTMLScriptElement
        && target.src.includes("/_next/static/chunks/");

      if (failedChunkScript || isChunkLoadError(event.error || event.message)) {
        reloadWithFreshHtml();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) reloadWithFreshHtml();
    };

    window.addEventListener("error", handleError, true);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => {
      window.removeEventListener("error", handleError, true);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
