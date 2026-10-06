import { afterEach, describe, expect, it, vi } from "vitest";
import { createOrbRenderer } from "./runtime";

afterEach(() => vi.unstubAllGlobals());
describe("orb resource lifecycle", () => {
  it("falls back when WebGPU is unavailable", async () => {
    vi.stubGlobal("navigator", {});
    expect(
      await createOrbRenderer(
        {} as HTMLCanvasElement,
        new AbortController().signal,
        vi.fn()
      )
    ).toBeNull();
  });
  it("does not retain a device after initialization is cancelled", async () => {
    const controller = new AbortController();
    const device = { destroy: vi.fn() };
    vi.stubGlobal("navigator", {
      gpu: {
        requestAdapter: async () => ({
          requestDevice: async () => {
            controller.abort();
            return device;
          }
        })
      }
    });
    const canvas = { getContext: () => ({}) } as unknown as HTMLCanvasElement;
    expect(
      await createOrbRenderer(canvas, controller.signal, vi.fn())
    ).toBeNull();
    expect(device.destroy).toHaveBeenCalledOnce();
  });
  it("releases resources and reports shader failure", async () => {
    const device = {
      destroy: vi.fn(),
      lost: new Promise(() => {}),
      addEventListener: vi.fn(),
      createShaderModule: () => ({
        getCompilationInfo: async () => ({ messages: [{ type: "error" }] })
      })
    };
    const context = { configure: vi.fn(), unconfigure: vi.fn() };
    vi.stubGlobal("navigator", {
      gpu: {
        requestAdapter: async () => ({ requestDevice: async () => device }),
        getPreferredCanvasFormat: () => "rgba8unorm"
      }
    });
    vi.stubGlobal("window", {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("document", { removeEventListener: vi.fn() });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const failure = vi.fn();
    const canvas = {
      getContext: () => context
    } as unknown as HTMLCanvasElement;
    expect(
      await createOrbRenderer(canvas, new AbortController().signal, failure)
    ).toBeNull();
    expect(context.unconfigure).toHaveBeenCalledOnce();
    expect(device.destroy).toHaveBeenCalledOnce();
    expect(failure).toHaveBeenCalledOnce();
  });
  it("pauses hidden frames and falls back after device loss", async () => {
    let loseDevice!: () => void;
    const lost = new Promise<void>((resolve) => {
      loseDevice = resolve;
    });
    const buffer = { destroy: vi.fn() };
    const pass = {
      setPipeline: vi.fn(),
      setBindGroup: vi.fn(),
      draw: vi.fn(),
      end: vi.fn()
    };
    const device = {
      destroy: vi.fn(),
      lost,
      addEventListener: vi.fn(),
      createShaderModule: () => ({
        getCompilationInfo: async () => ({ messages: [] })
      }),
      createRenderPipelineAsync: async () => ({
        getBindGroupLayout: () => ({})
      }),
      createBuffer: () => buffer,
      createBindGroup: () => ({}),
      createCommandEncoder: () => ({
        beginRenderPass: () => pass,
        finish: () => ({})
      }),
      queue: { writeBuffer: vi.fn(), submit: vi.fn() }
    };
    const context = {
      configure: vi.fn(),
      unconfigure: vi.fn(),
      getCurrentTexture: () => ({ createView: () => ({}) })
    };
    const document = new EventTarget() as EventTarget & { hidden: boolean };
    document.hidden = false;
    vi.stubGlobal("document", document);
    vi.stubGlobal("window", {
      devicePixelRatio: 3,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("navigator", {
      gpu: {
        requestAdapter: async () => ({ requestDevice: async () => device }),
        getPreferredCanvasFormat: () => "rgba8unorm"
      }
    });
    vi.stubGlobal("GPUBufferUsage", { UNIFORM: 1, COPY_DST: 2 });
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.fn((callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const canvas = {
      clientWidth: 160,
      clientHeight: 160,
      width: 0,
      height: 0,
      getContext: () => context
    } as unknown as HTMLCanvasElement;
    const failure = vi.fn();
    const controller = new AbortController();
    const renderer = await createOrbRenderer(
      canvas,
      controller.signal,
      failure
    );
    frames[0](100);
    expect(canvas.width).toBe(320);
    expect(pass.draw).toHaveBeenCalledWith(3);
    const count = requestFrame.mock.calls.length;
    document.hidden = true;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(requestFrame).toHaveBeenCalledTimes(count);
    document.hidden = false;
    document.dispatchEvent(new Event("visibilitychange"));
    expect(requestFrame).toHaveBeenCalledTimes(count + 1);
    loseDevice();
    await Promise.resolve();
    expect(failure).toHaveBeenCalledOnce();
    expect(buffer.destroy).toHaveBeenCalledOnce();
    expect(context.unconfigure).toHaveBeenCalledOnce();
    expect(device.destroy).toHaveBeenCalledOnce();
    renderer?.destroy();
    controller.abort();
    expect(device.destroy).toHaveBeenCalledOnce();
  });
});
