"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Only show on mobile
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (!isMobile) return;

    // Check if previously dismissed
    const wasDismissed = localStorage.getItem("pwa-install-dismissed");
    if (wasDismissed) return;

    // Detect iOS
    const ua = navigator.userAgent;
    const isiOS = /iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream;
    setIsIOS(isiOS);

    if (isiOS) {
      // Show iOS instructions after a short delay
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex justify-center sm:bottom-6">
      <div className="card bg-base-200 w-full max-w-sm shadow-lg border border-base-300">
        <div className="card-body p-4">
          <div className="flex items-start justify-between">
            <h2 className="card-title text-sm">Install Catholic Wordle</h2>
            <button
              className="btn btn-ghost btn-xs btn-square"
              onClick={handleDismiss}
            >
              ✕
            </button>
          </div>
          {isIOS ? (
            <p className="text-xs opacity-70">
              Tap the share button <span className="inline-block translate-y-0.5">⎋</span> then &quot;Add to Home Screen&quot; to install.
            </p>
          ) : (
            <p className="text-xs opacity-70">
              Install this app on your device for quick access and offline play.
            </p>
          )}
          <div className="card-actions justify-end mt-1">
            {!isIOS && (
              <button className="btn btn-primary btn-sm" onClick={handleInstall}>
                Install
              </button>
            )}
            <button className="btn btn-ghost btn-sm" onClick={handleDismiss}>
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
