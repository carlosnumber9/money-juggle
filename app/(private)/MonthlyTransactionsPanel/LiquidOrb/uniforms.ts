export type OrbState = "thinking" | "idle";

const shared = [
  1, 1, 0, 0.98, 0.72, 0.36, 3.2, 0.5, 2.2, 0.12, 0.28, 0.24, 0.18, 0.18, 2, 9,
  0.095, 0, 0, 0, 0.44, 0, 2, 0.42, 0.77, 0.23, 65, 0, 0, 1, 0.22, 0.25, 0.72,
  5, 0.42, 1.25, 0.55, 0.3, 1.2, 0.7
];
const thinkingColors = [
  [255, 216, 107],
  [130, 244, 255],
  [255, 123, 213],
  [142, 108, 255],
  [255, 255, 255]
];
const idleColors = [
  [181, 166, 116],
  [94, 135, 148],
  [154, 100, 138],
  [99, 91, 138],
  [182, 196, 210]
];

export function createOrbUniforms(state: OrbState): Float32Array<ArrayBuffer> {
  const values = new Float32Array(136);
  values.set(shared);
  if (state === "idle") {
    values[3] = 0.246;
    values[5] = 0.3384;
    values[6] = 1.664;
    values[7] = 0.24;
    values[8] = 1.98;
    values[14] = 1.36;
  }
  const colors = state === "thinking" ? thinkingColors : idleColors;
  colors.forEach((color, index) =>
    values.set(
      [...color.map((component) => component / 255), 1],
      40 + index * 4
    )
  );
  return values;
}

function srgbToLinear(value: number) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}
function linearToSrgb(value: number) {
  return value <= 0.0031308
    ? value * 12.92
    : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function interpolateOrbUniforms(
  from: Float32Array,
  target: Float32Array,
  progress: number,
  output: Float32Array
) {
  for (let index = 3; index < output.length; index++) {
    const a = from[index],
      b = target[index];
    output[index] =
      index >= 40 && (index - 40) % 4 < 3
        ? linearToSrgb(
            srgbToLinear(a) + (srgbToLinear(b) - srgbToLinear(a)) * progress
          )
        : a + (b - a) * progress;
  }
}
