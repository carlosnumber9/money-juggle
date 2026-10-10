import {
  smoothTabScale,
  tabMagnification,
  type PointerPosition,
  type TabBounds
} from "./magnification";

export function attachTabMagnification(list: HTMLElement, disabled: boolean) {
  const finePointer = window.matchMedia(
    "(any-hover: hover) and (any-pointer: fine)"
  );
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tabs = Array.from(
    list.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')
  );
  const contents = tabs.map((tab) =>
    tab.querySelector<HTMLElement>("[data-tab-content]")!
  );
  let bounds: TabBounds[] = [];
  let scales = tabs.map(() => 1);
  let pointer: PointerPosition | null = null;
  let frame: number | null = null;
  let previousTime: number | null = null;
  const enabled = () =>
    !disabled && finePointer.matches && !reducedMotion.matches;
  const measure = () => {
    bounds = tabs.map((tab) => {
      const rect = tab.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      };
    });
  };
  const reset = () => {
    pointer = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
    scales = tabs.map(() => 1);
    contents.forEach((content) => {
      content.style.transform = "scale(1)";
    });
  };
  const animate = (time: number) => {
    frame = null;
    if (!enabled()) {
      reset();
      return;
    }
    const elapsed =
      previousTime === null ? 16 : Math.min(64, time - previousTime);
    previousTime = time;
    let settled = true;
    scales = scales.map((scale, index) => {
      const target = tabMagnification(bounds[index], pointer, true);
      const next = smoothTabScale(scale, target, elapsed);
      contents[index].style.transform = `scale(${next})`;
      if (next !== target) settled = false;
      return next;
    });
    if (!settled) frame = requestAnimationFrame(animate);
    else previousTime = null;
  };
  const update = (event: PointerEvent) => {
    if (event.pointerType !== "mouse" || !enabled()) {
      reset();
      return;
    }
    pointer = { x: event.clientX, y: event.clientY };
    if (frame === null) frame = requestAnimationFrame(animate);
  };
  const refresh = () => {
    measure();
    if (!enabled()) reset();
  };
  const visibility = () => {
    if (document.hidden) reset();
  };
  const observer = new ResizeObserver(refresh);
  observer.observe(list);
  tabs.forEach((tab) => observer.observe(tab));
  measure();
  window.addEventListener("pointermove", update, { passive: true });
  window.addEventListener("pointerdown", update, { passive: true });
  window.addEventListener("pointercancel", reset);
  window.addEventListener("blur", reset);
  window.addEventListener("scroll", measure, {
    passive: true,
    capture: true
  });
  window.addEventListener("resize", refresh);
  document.documentElement.addEventListener("pointerleave", reset);
  document.addEventListener("visibilitychange", visibility);
  finePointer.addEventListener("change", refresh);
  reducedMotion.addEventListener("change", refresh);
  return () => {
    reset();
    observer.disconnect();
    window.removeEventListener("pointermove", update);
    window.removeEventListener("pointerdown", update);
    window.removeEventListener("pointercancel", reset);
    window.removeEventListener("blur", reset);
    window.removeEventListener("scroll", measure, true);
    window.removeEventListener("resize", refresh);
    document.documentElement.removeEventListener("pointerleave", reset);
    document.removeEventListener("visibilitychange", visibility);
    finePointer.removeEventListener("change", refresh);
    reducedMotion.removeEventListener("change", refresh);
  };
}
