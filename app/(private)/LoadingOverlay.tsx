"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode
} from "react";
import { cn } from "@/lib/utils";
import { LiquidOrb } from "./MonthlyTransactionsPanel/LiquidOrb/LiquidOrb";
import { createLoadingOverlay } from "./MonthlyTransactionsPanel/loadingOverlay";

export function LoadingOverlay({
  loading,
  label,
  loadingLabel,
  className,
  children
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const [overlay] = useState(() =>
    createLoadingOverlay({
      frame: (callback) => requestAnimationFrame(callback),
      cancelFrame: (id) => cancelAnimationFrame(id),
      delay: (callback, ms) => setTimeout(callback, ms),
      cancelDelay: (id) => clearTimeout(id)
    })
  );
  const snapshot = useSyncExternalStore(
    overlay.subscribe,
    overlay.getSnapshot,
    overlay.getSnapshot
  );
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(320);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => overlay.setLoading(loading, media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [loading, overlay]);
  useEffect(() => () => overlay.dispose(), [overlay]);
  useEffect(() => {
    const content = contentRef.current;
    if (!content || loading) return;
    const observer = new ResizeObserver(([entry]) =>
      setHeight(Math.max(320, entry.contentRect.height))
    );
    observer.observe(content);
    return () => observer.disconnect();
  }, [loading]);
  return (
    <div
      className={cn("relative isolate min-h-80", className)}
      style={loading ? { minHeight: height } : undefined}
      aria-busy={loading}
      aria-label={label}
    >
      <div
        ref={contentRef}
        className={loading ? "invisible" : undefined}
        inert={loading}
      >
        {children}
      </div>
      {snapshot.present && (
        <div
          className="absolute inset-0 z-20 rounded-lg bg-card transition-opacity duration-500 ease-in-out motion-reduce:transition-none"
          style={{ opacity: snapshot.visible ? 1 : 0 }}
          role="status"
          aria-label={loadingLabel}
          aria-hidden={!loading}
        >
          <div className="sticky top-[calc(50dvh-5rem)] mx-auto grid h-40 w-40 place-items-center">
            <LiquidOrb state={loading ? "thinking" : "idle"} />
          </div>
        </div>
      )}
    </div>
  );
}
