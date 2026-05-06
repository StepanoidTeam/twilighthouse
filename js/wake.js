import {
  WAKE_MAX,
  WAKE_SPAWN_BACK,
  WAKE_EMIT_DIST_MIN,
  WAKE_EMIT_DIST_MAX,
  WAKE_SIDE_JITTER,
  WAKE_ALONG_JITTER,
  WAKE_ALONG_SCALE_MIN,
  WAKE_ALONG_SCALE_MAX,
} from './config.js';

function nextEmitGap() {
  return (
    WAKE_EMIT_DIST_MIN +
    Math.random() * (WAKE_EMIT_DIST_MAX - WAKE_EMIT_DIST_MIN)
  );
}

export function createWakeEmitterState() {
  return { debt: 0, gap: nextEmitGap() };
}

/**
 * fx,fy — unit forward (movement direction). prev→curr is this frame's travel
 * segment; samples scatter along it when multiple wakes spawn in one tick.
 */
export function tickWakeEmitter(
  em,
  wake,
  prevX,
  prevY,
  currX,
  currY,
  fx,
  fy,
  stepLen,
) {
  em.debt += stepLen;
  while (em.debt >= em.gap) {
    em.debt -= em.gap;
    em.gap = nextEmitGap();
    const u = Math.random();
    const bx = prevX + (currX - prevX) * u;
    const by = prevY + (currY - prevY) * u;
    const scale =
      WAKE_ALONG_SCALE_MIN +
      Math.random() * (WAKE_ALONG_SCALE_MAX - WAKE_ALONG_SCALE_MIN);
    const along =
      WAKE_SPAWN_BACK * scale + (Math.random() - 0.5) * WAKE_ALONG_JITTER;
    const side = (Math.random() - 0.5) * 2 * WAKE_SIDE_JITTER;
    const lx = -fy;
    const ly = fx;
    const x = bx - fx * along + lx * side;
    const y = by - fy * along + ly * side;
    const rMul = 0.68 + Math.random() * 0.72;
    const alphaMul = 0.65 + Math.random() * 0.55;
    wake.unshift({ x, y, age: 0, rMul, alphaMul });
    if (wake.length > WAKE_MAX) wake.pop();
  }
}
