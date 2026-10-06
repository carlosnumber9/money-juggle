/// <reference types="@webgpu/types" />

import { liquidOrbShader } from "./shader";
import {
  createOrbUniforms,
  interpolateOrbUniforms,
  type OrbState
} from "./uniforms";

export type OrbRenderer = {
  setState: (state: OrbState) => void;
  destroy: () => void;
};

export async function createOrbRenderer(
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
  onFailure: () => void
): Promise<OrbRenderer | null> {
  if (!navigator.gpu || signal.aborted) return null;
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter || signal.aborted) return null;
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");
  if (!context || signal.aborted) {
    device.destroy();
    return null;
  }
  let destroyed = false;
  let frameId = 0;
  let buffer: GPUBuffer | undefined;
  const destroy = () => {
    if (destroyed) return;
    destroyed = true;
    cancelAnimationFrame(frameId);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    signal.removeEventListener("abort", destroy);
    window.removeEventListener("pagehide", destroy);
    context.unconfigure();
    buffer?.destroy();
    device.destroy();
  };
  const fail = () => {
    if (!destroyed) {
      destroy();
      onFailure();
    }
  };
  signal.addEventListener("abort", destroy, { once: true });
  window.addEventListener("pagehide", destroy, { once: true });
  device.lost.then(fail);
  device.addEventListener("uncapturederror", (event) => {
    event.preventDefault();
    fail();
  });
  let state: OrbState = "thinking";
  const values = createOrbUniforms(state);
  let from = values.slice();
  let target = values.slice();
  let startedAt = 0;
  let duration = 0;
  let lastAt: number | null = null;
  let phase = 0;
  function sample(now: number) {
    const raw =
      duration === 0
        ? 1
        : Math.min(1, Math.max(0, (now - startedAt) / duration));
    const progress =
      state === "thinking" ? 1 - (1 - raw) ** 3 : raw * raw * (3 - 2 * raw);
    interpolateOrbUniforms(from, target, progress, values);
  }
  function onVisibilityChange() {
    cancelAnimationFrame(frameId);
    lastAt = null;
    if (!document.hidden && !destroyed) frameId = requestAnimationFrame(frame);
  }
  let pipeline: GPURenderPipeline;
  let bindGroup: GPUBindGroup;
  function frame(now: number) {
    if (destroyed || document.hidden) return;
    if (lastAt !== null && now - lastAt < 1000 / 30) {
      frameId = requestAnimationFrame(frame);
      return;
    }
    try {
      sample(now);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      phase +=
        (lastAt === null ? 0 : Math.min(0.1, (now - lastAt) / 1000)) *
        values[3];
      lastAt = now;
      values[0] = canvas.width;
      values[1] = canvas.height;
      values[2] = phase / Math.max(values[3], 0.001);
      device.queue.writeBuffer(buffer!, 0, values);
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context!.getCurrentTexture().createView(),
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: "clear",
            storeOp: "store"
          }
        ]
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
      frameId = requestAnimationFrame(frame);
    } catch {
      fail();
    }
  }
  try {
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "premultiplied" });
    const shader = device.createShaderModule({ code: liquidOrbShader });
    const compilation = await shader.getCompilationInfo();
    if (signal.aborted || destroyed) {
      destroy();
      return null;
    }
    if (compilation.messages.some((message) => message.type === "error")) {
      fail();
      return null;
    }
    pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module: shader, entryPoint: "vs_main" },
      fragment: {
        module: shader,
        entryPoint: "fs_main",
        targets: [
          {
            format,
            blend: {
              color: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add"
              }
            }
          }
        ]
      },
      primitive: { topology: "triangle-list" }
    });
    if (signal.aborted || destroyed) {
      destroy();
      return null;
    }
    buffer = device.createBuffer({
      size: values.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
    bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer } }]
    });
    document.addEventListener("visibilitychange", onVisibilityChange);
    onVisibilityChange();
    return {
      destroy,
      setState(next) {
        if (destroyed || next === state) return;
        const now = performance.now();
        sample(now);
        from = values.slice();
        target = createOrbUniforms(next);
        state = next;
        startedAt = now;
        duration = next === "thinking" ? 180 : 650;
      }
    };
  } catch {
    fail();
    return null;
  }
}
