"use client";

import { useEffect, useMemo, useState } from "react";
import { useUI } from "@/components/Providers";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|WhatsApp|Messenger|Twitter|LinkedInApp|Snapchat|Pinterest|wv\)|; wv\)/i.test(
    ua
  );
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

function chromeIntentUrl(path = "/install") {
  const host = typeof window !== "undefined" ? window.location.host : "saaf-hisab.vercel.app";
  return `intent://${host}${path}#Intent;scheme=https;package=com.android.chrome;end`;
}

export function InstallApp({ variant = "card" }: { variant?: "card" | "page" }) {
  const { t } = useUI();
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [inApp, setInApp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [swReady, setSwReady] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setInApp(isInAppBrowser());
    setInstalled(isStandalone());

    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        await navigator.serviceWorker.ready;
        if (!cancelled) setSwReady(Boolean(reg.active || reg.waiting || reg.installing));
      } catch {
        if (!cancelled) setSwReady(false);
      }
    })();

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
      cancelled = true;
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const steps = useMemo(() => {
    if (platform === "ios") {
      return [
        t.installStepOpenSafari,
        t.installStepShare,
        t.installStepAddHome,
        t.installStepConfirm,
      ];
    }
    if (platform === "android") {
      return [t.installStepOpenChrome, t.installStepMenu, t.installStepInstall];
    }
    return [t.installStepDesktop1, t.installStepDesktop2];
  }, [platform, t]);

  const installUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/install`
      : "https://saaf-hisab.vercel.app/install";

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

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(installUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt(t.installCopyLink, installUrl);
    }
  }

  function openInBrowser() {
    if (platform === "android") {
      window.location.href = chromeIntentUrl("/install");
      return;
    }
    // iOS / others: copy + instruct
    void copyLink();
  }

  if (installed) {
    return (
      <div className={`install-box install-box--done ${variant === "page" ? "install-box--page" : ""}`}>
        <strong>{t.installInstalled}</strong>
        <p>{t.installInstalledHint}</p>
      </div>
    );
  }

  return (
    <div className={`install-box ${variant === "page" ? "install-box--page" : ""}`}>
      <div className="install-box__head">
        <div className="install-box__badge">{t.installFreeBadge}</div>
        <h2 className="install-box__title">{t.installApp}</h2>
        <p className="install-box__hint">{t.installHint}</p>
      </div>

      {inApp && (
        <div className="install-alert">
          <strong>{t.installInAppTitle}</strong>
          <p>{t.installInAppBody}</p>
          <div className="install-box__actions">
            {platform === "android" ? (
              <a className="btn btn-accent" href={chromeIntentUrl("/install")}>
                {t.installOpenChrome}
              </a>
            ) : (
              <button type="button" className="btn btn-accent" onClick={openInBrowser}>
                {t.installCopyOpenSafari}
              </button>
            )}
            <button type="button" className="btn btn-ghost" onClick={copyLink}>
              {copied ? t.copied : t.installCopyLink}
            </button>
          </div>
        </div>
      )}

      {!inApp && (
        <div className="install-box__actions">
          {deferred ? (
            <button
              type="button"
              className="btn btn-accent"
              disabled={busy}
              onClick={installNow}
            >
              {busy ? t.loading : t.installReady}
            </button>
          ) : (
            <button type="button" className="btn btn-accent" onClick={copyLink}>
              {copied ? t.copied : t.installSaveHome}
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={copyLink}>
            {copied ? t.copied : t.installCopyLink}
          </button>
        </div>
      )}

      <ol className="install-guide">
        <li className="install-guide__label">
          {platform === "ios"
            ? t.installIosTitle
            : platform === "android"
              ? t.installAndroidTitle
              : t.installDesktopTitle}
        </li>
        {steps.map((step, i) => (
          <li key={i}>
            <span className="install-guide__num">{i + 1}</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>

      {variant === "page" && (
        <p className="install-box__meta">
          {swReady ? t.installSwOk : t.installSwWait}
        </p>
      )}
    </div>
  );
}
