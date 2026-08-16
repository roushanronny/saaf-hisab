"use client";

import { useEffect, useState } from "react";
import { useUI } from "@/components/Providers";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function InstallBanner() {
  const { t } = useUI();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [showHow, setShowHow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInstalled(isStandalone());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function installNow() {
    if (!deferred || busy) return;
    setBusy(true);
    try {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
    } finally {
      setBusy(false);
    }
  }

  if (installed) {
    return (
      <div className="install-banner install-banner--done">
        <strong>{t.installInstalled}</strong>
      </div>
    );
  }

  const steps =
    platform === "ios"
      ? { title: t.installIosTitle, body: t.installIosSteps }
      : platform === "android"
        ? { title: t.installAndroidTitle, body: t.installAndroidSteps }
        : { title: t.installDesktopTitle, body: t.installDesktopSteps };

  return (
    <div className="install-banner">
      <div className="install-banner__main">
        <strong>{t.installApp}</strong>
        <p className="install-banner__hint">{t.installHint}</p>
        {(showHow || !deferred) && (
          <div className="install-steps">
            <div className="install-steps__title">{steps.title}</div>
            <p>{steps.body}</p>
          </div>
        )}
      </div>
      <div className="install-banner__actions">
        {deferred ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={busy}
            onClick={installNow}
          >
            {t.installReady}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setShowHow((v) => !v)}
        >
          {t.installHow}
        </button>
      </div>
    </div>
  );
}
