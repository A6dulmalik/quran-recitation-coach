"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Registers the service worker (production builds only) and offers a reload
 * when a new version is waiting, so assets never mix across versions.
 */
export function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        // An update finished installing while the page was closed.
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) setWaiting(worker);
          });
        });
      })
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => registration.active?.postMessage("CACHE_QURAN")) // offline Qur'an text
      .catch(() => {
        // Offline support is an enhancement; the app works without it.
      });

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
  }, []);

  if (!waiting) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 shadow-lg sm:bottom-6"
    >
      <span className="text-sm">A new version is available.</span>
      <Button size="sm" className="gap-1.5" onClick={() => waiting.postMessage("SKIP_WAITING")}>
        <RefreshCw className="size-3.5" /> Reload
      </Button>
    </div>
  );
}
