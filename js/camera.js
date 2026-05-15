import { CAM_EASE, CAM_BEAM_OFFSET, MOB_SPAWN_RING } from './config.js';
import S from './state.js';

function getBeamFollowOffsetLimit() {
  const s = S.worldScale || 1;
  const halfW = Math.max(0, S.gameW) / 2;

  // Ограничиваем только горизонтальный вынос кадра:
  // при луче строго влево/вправо граница MOB_SPAWN_RING остаётся у края экрана,
  // а на диагоналях кламп ослабляется.
  const edgePeekWorld = 8 / s;
  const horizontalRoom = Math.max(
    0,
    MOB_SPAWN_RING - halfW / s + edgePeekWorld,
  );

  const cosAbs = Math.abs(Math.cos(S.beamAngle));
  if (cosAbs < 1e-4) return CAM_BEAM_OFFSET;
  return horizontalRoom / cosAbs;
}

function computeCameraTarget() {
  // worldContainer может быть отмасштабирован (зум-аут на узких экранах).
  // Сдвиг worldContainer'а в физических пикселях: `gameW/2 - scale * lhX`.
  // Смещение по направлению луча тоже масштабируем, иначе на мобиле
  // CAM_BEAM_OFFSET утащит маяк далеко от центра.
  // Дополнительно ограничиваем горизонтальный вынос кадра:
  // при луче влево/вправо не уходим за границу MOB_SPAWN_RING.
  const s = S.worldScale || 1;
  const followOffset = Math.min(CAM_BEAM_OFFSET, getBeamFollowOffsetLimit());
  return {
    x: S.gameW / 2 - s * S.lhX - Math.cos(S.beamAngle) * followOffset * s,
    y: S.gameH / 2 - s * S.lhY - Math.sin(S.beamAngle) * followOffset * s,
  };
}

// Мгновенно телепортируем камеру в целевую позицию (без ease).
// Нужно на ресайзе — gameLoop может не крутиться (меню / game over),
// и без снапа маяк остаётся в старых мировых координатах за экраном.
export function snapCamera() {
  const t = computeCameraTarget();
  S.camX = t.x;
  S.camY = t.y;
  if (S.worldContainer) S.worldContainer.position.set(S.camX, S.camY);
}

export function updateCamera(delta) {
  const target = computeCameraTarget();
  S.camX += (target.x - S.camX) * CAM_EASE * delta;
  S.camY += (target.y - S.camY) * CAM_EASE * delta;

  // Camera shake
  let shakeOffsetX = 0,
    shakeOffsetY = 0;
  if (S.shakeTime > 0) {
    S.shakeTime -= delta / 60;
    const power =
      S.shakeIntensity * (S.shakeTime > 0 ? Math.max(0, S.shakeTime) : 0);
    shakeOffsetX = (Math.random() - 0.5) * 2 * power;
    shakeOffsetY = (Math.random() - 0.5) * 2 * power;
    if (S.shakeTime <= 0) {
      S.shakeTime = 0;
      S.shakeIntensity = 0;
    }
  }
  S.worldContainer.position.set(S.camX + shakeOffsetX, S.camY + shakeOffsetY);
}
