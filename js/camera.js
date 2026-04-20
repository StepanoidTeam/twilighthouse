import { CAM_EASE, CAM_BEAM_OFFSET } from './config.js';
import S from './state.js';

function computeCameraTarget() {
  // worldContainer может быть отмасштабирован (зум-аут на узких экранах).
  // Сдвиг worldContainer'а в физических пикселях: `gameW/2 - scale * lhX`.
  // Смещение по направлению луча тоже масштабируем, иначе на мобиле
  // CAM_BEAM_OFFSET утащит маяк далеко от центра.
  const s = S.worldScale || 1;
  return {
    x: S.gameW / 2 - s * S.lhX - Math.cos(S.beamAngle) * CAM_BEAM_OFFSET * s,
    y: S.gameH / 2 - s * S.lhY - Math.sin(S.beamAngle) * CAM_BEAM_OFFSET * s,
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
