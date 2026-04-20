import {
  PIXI,
  C,
  BOAT_RADIUS,
  MOB_SPAWN_RING,
  LIGHTHOUSE_WIDTH,
  scaleToWidth,
} from './config.js';
import S from './state.js';

export function buildLighthouse(parent) {
  S.lighthouseContainer = new PIXI.Container();
  S.lighthouseContainer.position.set(S.lhX, S.lhY);

  S.lighthouseSprite = new PIXI.Sprite(S.textures.lighthouse);
  S.lighthouseSprite.anchor.set(0.5, 0.75);
  scaleToWidth(S.lighthouseSprite, LIGHTHOUSE_WIDTH);
  S.lighthouseContainer.addChild(S.lighthouseSprite);

  parent.addChild(S.lighthouseContainer);
}

export function buildGlow() {
  const SIZE = 40;

  const geometry = new PIXI.Geometry()
    .addAttribute(
      'aPosition',
      new PIXI.Buffer(new Float32Array([
        -SIZE,-SIZE,  SIZE,-SIZE,  SIZE,SIZE,  -SIZE,SIZE
      ])),
      2
    )
    .addAttribute(
      'aUV',
      new PIXI.Buffer(new Float32Array([
        0,0,  1,0,  1,1,  0,1
      ])),
      2
    )
    .addIndex([0,1,2, 0,2,3]);

  const shader = PIXI.Shader.from(
    `
    precision mediump float;
    attribute vec2 aPosition;
    attribute vec2 aUV;
    uniform mat3 translationMatrix;
    uniform mat3 projectionMatrix;
    varying vec2 vUV;

    void main() {
      vUV = aUV;
      vec3 pos = projectionMatrix * translationMatrix * vec3(aPosition, 1.0);
      gl_Position = vec4(pos.xy, 0.0, 1.0);
    }
    `,
    `
    precision mediump float;
    varying vec2 vUV;
    uniform vec3 color;

    void main() {
      vec2 uv = vUV * 2.0 - 1.0;
      float d = length(uv);

      float glow = exp(-4.0 * d * d);

      if (glow < 0.01) discard;

      glow = pow(glow, 1.2);

      float a = glow * 0.35;

      gl_FragColor = vec4(color * a * 1.2, a);
    }
    `,
    {
      color: PIXI.utils.hex2rgb(C.lhLight)
    }
  );

  const mesh = new PIXI.Mesh(geometry, shader);
  mesh.blendMode = PIXI.BLEND_MODES.SCREEN;
  mesh.position.set(0, S.BEAM_ORIGIN_OFFSET_Y);

  S.lhGlow = mesh;
  S.lighthouseContainer.addChild(mesh);
}

export function isInBeam(x, y) {
  const dx = x - S.lhX;
  const dy = y - (S.lhY + S.BEAM_ORIGIN_OFFSET_Y);
  let angle = Math.atan2(dy, dx);
  let diff = angle - S.beamAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < S.BEAM_HALF_ANGLE;
}

export function checkRockCollision(x, y) {
  for (const rock of S.rockColliders) {
    const dist = Math.hypot(x - rock.x, y - rock.y);
    if (dist < rock.radius + BOAT_RADIUS) return true;
  }
  return false;
}

export function spawnOnRing() {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: S.lhX + Math.cos(angle) * MOB_SPAWN_RING,
    y: S.lhY + Math.sin(angle) * MOB_SPAWN_RING,
  };
}
