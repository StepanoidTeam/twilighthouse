import { CAM_EASE, CAM_BEAM_OFFSET } from './config.js';
import S from './state.js';

export function updateCamera(delta) {
  const targetCamX =
    S.gameW / 2 - S.lhX - Math.cos(S.beamAngle) * CAM_BEAM_OFFSET;
  const targetCamY =
    S.gameH / 2 - S.lhY - Math.sin(S.beamAngle) * CAM_BEAM_OFFSET;
  S.camX += (targetCamX - S.camX) * CAM_EASE * delta;
  S.camY += (targetCamY - S.camY) * CAM_EASE * delta;

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
