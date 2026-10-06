// The supplied Liquid Orb's style 9 (Siri band), with unused flow programs,
// glass, palettes, audio and particle pipelines removed. Uniform offsets keep
// the source layout; the loading and idle colors remain unchanged.
export const liquidOrbShader = /* wgsl */ `
struct Uniforms { values: array<vec4<f32>, 34>, };
@group(0) @binding(0) var<uniform> u: Uniforms;

fn band(q: vec2<f32>, drift: f32, phase: f32, amplitude: f32,
        mainY: f32, envelope: f32, softness: f32) -> vec2<f32> {
  let y = amplitude * envelope * sin(q.x + drift + phase);
  let distance = abs(q.y - y);
  let line = 0.018 / (sqrt(distance * distance + softness * softness) + 0.026);
  let bandDistance = max(0.0, max(q.y - max(mainY, y), min(mainY, y) - q.y));
  return vec2<f32>(line, 0.018 / (bandDistance + 0.075));
}

fn fluid(p: vec2<f32>, t: f32) -> vec3<f32> {
  let zoom = u.values[1].y;
  let warp = u.values[1].z;
  let ridge = u.values[1].w;
  let shade = u.values[2].y;
  let colorA = u.values[10].rgb;
  let colorB = u.values[11].rgb;
  let colorC = u.values[12].rgb;
  let colorD = u.values[13].rgb;
  let highlight = u.values[14].rgb;
  let q = p / (0.74 + zoom * 0.34);
  let envelopeBase = cos(1.57079633 * min(abs(0.9 * q.x), 1.0));
  let envelope = envelopeBase * envelopeBase;
  let low = 0.5 + 0.5 * cos(t * 0.37);
  let mid = 0.5 + 0.5 * sin(t * 0.51 + 1.2);
  let high = 0.5 + 0.5 * cos(t * 0.73 + 2.1);
  let drift = t * 2.4;
  let amplitude = 0.25 + ridge * 0.075 + low * 0.018;
  let bandAmplitude = amplitude + mid * 0.025 + high * 0.018;
  let mainY = amplitude * envelope * sin(q.x * 1.1 + drift);
  let separation = 1.85 + warp * 0.2 + mid * 0.28;
  let softness = 0.035 + (1.0 - ridge) * 0.018 + mid * 0.006;
  let b0 = band(q, drift, -separation, bandAmplitude, mainY, envelope, softness);
  let b1 = band(q, drift, -separation * 0.34, bandAmplitude, mainY, envelope, softness);
  let b2 = band(q, drift, separation * 0.34, bandAmplitude, mainY, envelope, softness);
  let b3 = band(q, drift, separation, bandAmplitude, mainY, envelope, softness);
  let w = vec4<f32>(b0.x + b0.y, b1.x + b1.y, b2.x + b2.y, b3.x + b3.y);
  let dominant = w * w;
  let spectral = (colorA * dominant.x + colorC * dominant.y + colorB * dominant.z + colorD * dominant.w)
                 / max(dot(dominant, vec4<f32>(1.0)), 0.0001);
  let energy = (1.0 - exp(-dot(w, vec4<f32>(1.0)) * 0.58)) * envelope;
  let distance = abs(q.y - mainY);
  let core = exp(-distance * distance / 0.0028) * envelope;
  var color = spectral * energy * 1.14 + highlight * core * (0.18 + 0.1 * low);
  color *= smoothstep(0.08, 0.25, energy + core * 0.12);
  color /= vec3<f32>(1.0) + color * 0.18;
  color *= 1.0 - shade * 0.34 * smoothstep(-0.1, 1.2, dot(p, vec2<f32>(0.45, -0.62)));
  color *= 1.0 - shade * 0.22 * smoothstep(0.72, 1.08, length(p));
  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}
struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, };
@vertex fn vs_main(@builtin(vertex_index) i: u32) -> VOut {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var out: VOut;
  out.pos = vec4<f32>(p[i], 0.0, 1.0);
  let uv01 = (p[i] + vec2<f32>(1.0)) * 0.5;
  out.uv = vec2<f32>(uv01.x, 1.0 - uv01.y);
  return out;
}
@fragment fn fs_main(in: VOut) -> @location(0) vec4<f32> {
  let size = u.values[0].xy;
  let fc = vec2<f32>(in.uv.x, 1.0 - in.uv.y) * size;
  let uv = (2.0 * fc - size) / max(min(size.x, size.y), 1.0);
  let radius = max(u.values[1].x, 0.05);
  let edgeDelta = u.values[4].x - 0.005;
  if (length(uv) > radius * (1.01 + edgeDelta)) { return vec4<f32>(0.0); }
  let p = uv / radius;
  let pd = length(p);
  let clearFa = 1.0 - smoothstep(0.995, 1.04, pd);
  var color = vec3<f32>(0.0);
  if (clearFa > 0.0) { color = fluid(p, u.values[0].z * u.values[0].w); }
  let lum = dot(color, vec3<f32>(0.213, 0.715, 0.072));
  color = clamp(vec3<f32>(lum) + (color - vec3<f32>(lum)) * 1.22, vec3<f32>(0.0), vec3<f32>(1.0));
  color *= smoothstep(0.025, 0.16, max(color.r, max(color.g, color.b)));
  let ballA = 1.0 - smoothstep(0.99 - edgeDelta, 1.01 + edgeDelta, pd);
  color = clamp(color * max(u.values[3].z, 0.0), vec3<f32>(0.0), vec3<f32>(1.0)) * ballA;
  let q = (2.0 * fc - size) / size;
  let feather = 2.0 / max(min(size.x, size.y), 1.0);
  let fitStart = min(mix(radius, 1.0, 0.5), 1.0 - feather);
  let fit = 1.0 - smoothstep(fitStart, 1.0, max(abs(q.x), abs(q.y)));
  return vec4<f32>(color * fit, max(color.r, max(color.g, color.b)) * fit);
}
`;
