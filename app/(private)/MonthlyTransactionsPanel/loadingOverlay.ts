export const LOADING_FADE_MS = 500;
export type OverlaySnapshot = { present: boolean; visible: boolean };
type OverlayClock = {
  frame: (callback: () => void) => number;
  cancelFrame: (id: number) => void;
  delay: (callback: () => void, ms: number) => ReturnType<typeof setTimeout>;
  cancelDelay: (id: ReturnType<typeof setTimeout>) => void;
};

export function createLoadingOverlay(clock: OverlayClock) {
  let snapshot: OverlaySnapshot = { present: false, visible: false };
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  const update = (next: OverlaySnapshot) => {
    snapshot = next;
    listeners.forEach((listener) => listener());
  };
  const cancel = () => {
    if (frame !== undefined) clock.cancelFrame(frame);
    if (timer !== undefined) clock.cancelDelay(timer);
    frame = undefined;
    timer = undefined;
  };
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => snapshot,
    setLoading(loading: boolean, reducedMotion = false) {
      cancel();
      if (reducedMotion) {
        update({ present: loading, visible: loading });
        return;
      }
      if (loading) {
        if (snapshot.present) {
          update({ present: true, visible: true });
          return;
        }
        update({ present: true, visible: false });
        // Two frames let the initial transparent overlay paint before fading in.
        frame = clock.frame(() => {
          frame = clock.frame(() => {
            frame = undefined;
            update({ present: true, visible: true });
          });
        });
      } else if (snapshot.present) {
        update({ present: true, visible: false });
        timer = clock.delay(() => {
          timer = undefined;
          update({ present: false, visible: false });
        }, LOADING_FADE_MS);
      }
    },
    dispose() {
      cancel();
      listeners.clear();
    }
  };
}
