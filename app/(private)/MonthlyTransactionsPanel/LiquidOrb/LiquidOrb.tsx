"use client";

import { useEffect, useRef, useState } from "react";
import type { OrbRenderer } from "./runtime";
import type { OrbState } from "./uniforms";

export function LiquidOrb({ state }: { state: OrbState }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<OrbRenderer | null>(null);
  const stateRef = useRef(state);
  const [gpuReady, setGpuReady] = useState(false);
  useEffect(() => {
    stateRef.current = state;
    rendererRef.current?.setState(state);
  }, [state]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const controller = new AbortController();
    import("./runtime")
      .then(({ createOrbRenderer }) =>
        createOrbRenderer(canvas, controller.signal, () => setGpuReady(false))
      )
      .then((renderer) => {
        if (controller.signal.aborted) {
          renderer?.destroy();
          return;
        }
        rendererRef.current = renderer;
        renderer?.setState(stateRef.current);
        setGpuReady(Boolean(renderer));
      })
      .catch(() => {
        if (!controller.signal.aborted) setGpuReady(false);
      });
    return () => {
      controller.abort();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);
  return (
    <div className="relative size-40" aria-hidden="true">
      {!gpuReady && <div className="liquid-orb-fallback absolute inset-0" />}
      <canvas ref={canvasRef} className="absolute inset-0 block size-full" />
    </div>
  );
}
