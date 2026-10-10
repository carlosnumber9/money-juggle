import "server-only";
import type {
  InitialLoadPhase,
  InitialLoadReporter,
  ProgressStatus
} from "@/definitions";

// Each render owns its milestones. No user or progress state is shared between requests.
export function createInitialLoadProgress() {
  const resolvers = new Map<
    InitialLoadPhase,
    (status: ProgressStatus) => void
  >();
  const phases = ["session", "data", "prepared"] as const;
  const milestones = Object.fromEntries(
    phases.map((phase) => [
      phase,
      new Promise<ProgressStatus>((resolve) => resolvers.set(phase, resolve))
    ])
  ) as Record<InitialLoadPhase, Promise<ProgressStatus>>;
  const report: InitialLoadReporter = (phase, status) => {
    resolvers.get(phase)?.(status);
    resolvers.delete(phase);
  };
  return {
    milestones,
    report,
    fail: () => phases.forEach((phase) => report(phase, "error"))
  };
}
