"use client";

import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { InitialLoadPhase, ProgressStatus } from "@/definitions";
import { LoadingSteps } from "@/components/LoadingSteps";
import { buildInitialLoadRows } from "./loadingProgress";

type Checkpoint = InitialLoadPhase | "layout" | "mounted";
const InitialLoadContext = createContext<{
  ready: boolean;
  report: (phase: Checkpoint, status: ProgressStatus) => void;
} | null>(null);

export function InitialLoadProvider({ children }: { children: ReactNode }) {
  const [states, setStates] = useState<
    Partial<Record<Checkpoint, ProgressStatus>>
  >({});
  const [expanded, setExpanded] = useState(true);
  const params = useSearchParams();
  const pathname = usePathname();
  const ready =
    pathname !== "/" ||
    (states.layout === "completed" && states.mounted === "completed");
  const report = useCallback((phase: Checkpoint, status: ProgressStatus) => {
    setStates((current) =>
      current[phase] === status ||
      (current.mounted === "completed" && current.layout === "completed")
        ? current
        : { ...current, [phase]: status }
    );
  }, []);
  return (
    <InitialLoadContext.Provider value={{ ready, report }}>
      {!ready && (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 py-12">
          <Image
            src="/assets/brand/money-juggle-logo.png"
            alt="Money Juggle"
            width={80}
            height={82}
            priority
          />
          <LoadingSteps
            label="Cargando tus cuentas"
            rows={buildInitialLoadRows(states, params.get("tab"))}
            busy
            expanded={expanded}
            onToggle={() => setExpanded((value) => !value)}
          />
        </div>
      )}
      <div hidden={!ready}>{children}</div>
    </InitialLoadContext.Provider>
  );
}

export function InitialLoadCheckpoint({
  phase,
  status = "completed"
}: {
  phase: Checkpoint;
  status?: ProgressStatus;
}) {
  const context = useContext(InitialLoadContext);
  const report = context?.report;
  useEffect(() => {
    report?.(phase, status);
  }, [report, phase, status]);
  return null;
}

export function useInitialLoadReady() {
  return useContext(InitialLoadContext)?.ready ?? true;
}
