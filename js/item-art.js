import { createEmojiImage } from './emoji-sprites.js';

export const ITEM_ART_BY_NAME = {
  extra_heart: 'sprites/items/lifebuoy2.png',
  quality_wick: 'sprites/items/canlde.png',
  fresnel_lens: 'sprites/items/lens.png',
  lamp_oil_crate: 'sprites/items/fuel.png',
  spare_generator: 'sprites/items/engine.png',
  fast_gear: 'sprites/items/cog.png',
  cold_lamp: 'sprites/items/lamp33.png',
  moonlight: 'sprites/items/night.png',
  guiding_signal: 'sprites/items/magnet.png',
  contraband_route: 'sprites/items/boat.png',
  alarm_bell: 'sprites/items/bell.png',
  phosphor_water: 'sprites/items/wave.png',

  better_oil: 'sprites/items/fuel.png',
  brighter_beam: 'sprites/items/lamp.png',
  slow_cops: 'sprites/items/police.png',
  beam_width: 'sprites/items/lens2.png',
  elastic_beam: 'sprites/items/spiral.png',
  siren_eye: 'sprites/items/eye.png',
  experienced_keeper: 'sprites/items/compass.png',
  occult_lamp: 'sprites/items/ghost.png',
  old_map: 'sprites/items/map.png',
  repair_lighthouse: 'sprites/items/cog.png',
};

export function createItemArt(name, fallbackEmoji) {
  const path = ITEM_ART_BY_NAME[name];
  if (!path) {
    return createEmojiImage(
      fallbackEmoji,
      'item-art-image item-art-image--emoji emoji-sprite',
    );
  }

  const img = document.createElement('img');
  img.className = 'item-art-image';
  img.src = path;
  img.alt = fallbackEmoji || name;
  img.draggable = false;
  img.loading = 'eager';
  img.decoding = 'async';
  return img;
}

export function setItemArtContent(element, name, fallbackEmoji) {
  if (!element) return;
  element.replaceChildren(createItemArt(name, fallbackEmoji));
}
