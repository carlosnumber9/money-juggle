"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { BANK_AUTHORIZATION_STARTED_EVENT } from "./bankAuthorizationWindow";

const REFRESH_DEBOUNCE_MS = 500;

export function BankConnectionResume({
  hasLinkingConnection
}: {
  hasLinkingConnection: boolean;
}) {
  const router = useRouter();
  const shouldRefreshRef = useRef(hasLinkingConnection);

  useEffect(() => {
    shouldRefreshRef.current = hasLinkingConnection;
  }, [hasLinkingConnection]);

  useEffect(() => {
    let lastRefreshAt = 0;

    const refresh = () => {
      if (!shouldRefreshRef.current) {
        return;
      }

      const now = Date.now();

      if (now - lastRefreshAt < REFRESH_DEBOUNCE_MS) {
        return;
      }

      lastRefreshAt = now;
      shouldRefreshRef.current = hasLinkingConnection;
      router.refresh();
    };
    const watchAuthorization = () => {
      shouldRefreshRef.current = true;
    };
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    window.addEventListener(
      BANK_AUTHORIZATION_STARTED_EVENT,
      watchAuthorization
    );
    document.addEventListener("visibilitychange", refreshWhenVisible);
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);

    return () => {
      window.removeEventListener(
        BANK_AUTHORIZATION_STARTED_EVENT,
        watchAuthorization
      );
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
    };
  }, [hasLinkingConnection, router]);

  return null;
}
