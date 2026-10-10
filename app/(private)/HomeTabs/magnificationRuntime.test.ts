import { afterEach, expect, it, vi } from "vitest";
import { attachTabMagnification } from "./magnificationRuntime";

afterEach(() => vi.unstubAllGlobals());
function environment() {
  const windowTarget = new EventTarget();
  const fine = Object.assign(new EventTarget(), { matches: true });
  const reduced = Object.assign(new EventTarget(), { matches: false });
  const root = new EventTarget();
  const documentTarget = Object.assign(new EventTarget(), {
    documentElement: root,
    hidden: false
  });
  const frames = new Map<number, FrameRequestCallback>();
  let id = 0;
  const content = { style: { transform: "" } };
  const tab = {
    getBoundingClientRect: () => ({
      left: 100,
      top: 100,
      width: 44,
      height: 44
    }),
    querySelector: () => content
  };
  const list = { querySelectorAll: () => [tab] } as unknown as HTMLElement;
  vi.stubGlobal(
    "window",
    Object.assign(windowTarget, {
      matchMedia: (query: string) =>
        query.includes("reduced-motion") ? reduced : fine
    })
  );
  vi.stubGlobal("document", documentTarget);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (key: number) => frames.delete(key));
  const move = (pointerType = "mouse") =>
    windowTarget.dispatchEvent(
      Object.assign(new Event("pointermove"), {
        pointerType,
        clientX: 95,
        clientY: 122
      })
    );
  const tick = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(16));
  };
  return {
    list,
    content,
    frames,
    move,
    tick,
    windowTarget,
    root,
    fine,
    reduced
  };
}
it("responds outside the hit area, resets on touch and removes listeners", () => {
  const env = environment();
  const dispose = attachTabMagnification(env.list, false);
  env.move();
  env.tick();
  expect(env.content.style.transform).not.toBe("scale(1)");
  env.move("touch");
  expect(env.content.style.transform).toBe("scale(1)");
  expect(env.frames.size).toBe(0);
  dispose();
  env.move();
  expect(env.frames.size).toBe(0);
});
it("honors reduced motion, pointer capability and disabled navigation", () => {
  const env = environment();
  const dispose = attachTabMagnification(env.list, false);
  env.move();
  env.tick();
  env.reduced.matches = true;
  env.reduced.dispatchEvent(new Event("change"));
  expect(env.content.style.transform).toBe("scale(1)");
  env.move();
  expect(env.frames.size).toBe(0);
  env.reduced.matches = false;
  env.fine.matches = false;
  env.fine.dispatchEvent(new Event("change"));
  env.move();
  expect(env.frames.size).toBe(0);
  dispose();
  env.fine.matches = true;
  const disabled = attachTabMagnification(env.list, true);
  env.move();
  expect(env.frames.size).toBe(0);
  disabled();
});
it("resets when the cursor leaves the window", () => {
  const env = environment();
  const dispose = attachTabMagnification(env.list, false);
  env.move();
  env.tick();
  env.root.dispatchEvent(new Event("pointerleave"));
  expect(env.content.style.transform).toBe("scale(1)");
  expect(env.frames.size).toBe(0);
  dispose();
});
