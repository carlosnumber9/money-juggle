export type TabBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
};
export type PointerPosition = { x: number; y: number };

export function tabMagnification(
  bounds: TabBounds,
  pointer: PointerPosition | null,
  enabled: boolean
): number {
  if (!enabled || !pointer || bounds.width <= 0 || bounds.height <= 0) return 1;
  const x =
    (pointer.x - bounds.left - bounds.width / 2) / (bounds.width / 2 + 16);
  const y =
    (pointer.y - bounds.top - bounds.height / 2) / (bounds.height / 2 + 16);
  const distance = Math.hypot(x, y);
  return distance >= 1
    ? 1
    : 1 + (0.18 * (1 + Math.cos(Math.PI * distance))) / 2;
}

export function smoothTabScale(
  current: number,
  target: number,
  elapsed: number
): number {
  const next =
    current + (target - current) * (1 - Math.exp(-Math.max(0, elapsed) / 60));
  return Math.abs(next - target) < 0.0001 ? target : next;
}
