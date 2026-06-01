import { EMOJI_SPRITE_FILES, PIXI } from './config.js';

const EMOJI_TEXTURE_PREFIX = 'emoji:';
const EMOJI_TOKENS = Object.keys(EMOJI_SPRITE_FILES).sort(
  (a, b) => b.length - a.length,
);

export function getEmojiTextureKey(emoji) {
  return `${EMOJI_TEXTURE_PREFIX}${emoji}`;
}

export function getEmojiSpritePath(emoji) {
  return EMOJI_SPRITE_FILES[emoji] || null;
}

export function createEmojiImage(emoji, className = 'emoji-sprite') {
  const path = getEmojiSpritePath(emoji);
  if (!path) return document.createTextNode(emoji);

  const img = document.createElement('img');
  img.className = className;
  img.src = path;
  img.alt = emoji;
  img.draggable = false;
  img.loading = 'eager';
  img.decoding = 'async';
  return img;
}

export function getEmojiHtml(emoji, className = 'emoji-sprite') {
  const path = getEmojiSpritePath(emoji);
  if (!path) return emoji;
  return `<img class="${className}" src="${path}" alt="${emoji}" draggable="false">`;
}

export function setEmojiContent(element, emoji, className) {
  if (!element) return;
  element.replaceChildren(createEmojiImage(emoji, className));
}

export function setTextWithEmojiSprites(element, text) {
  if (!element) return;
  const nodes = splitEmojiText(String(text || '')).map((part) => {
    return part.type === 'emoji'
      ? createEmojiImage(part.value)
      : document.createTextNode(part.value);
  });
  element.replaceChildren(...nodes);
}

export function appendPriceNodes(parent, price) {
  parent.replaceChildren();
  for (const [index, [emoji, n]] of Object.entries(price).entries()) {
    if (index > 0) parent.appendChild(document.createTextNode('  '));

    const item = document.createElement('span');
    item.className = 'emoji-price-item';
    item.appendChild(createEmojiImage(emoji));
    item.appendChild(document.createTextNode(` x ${n}`));
    parent.appendChild(item);
  }
}

function readFontSize(style, fallback = 18) {
  const raw = style?.fontSize;
  if (typeof raw === 'number') return raw;
  const parsed = Number.parseFloat(String(raw || ''));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function findEmojiToken(text, index) {
  for (const emoji of EMOJI_TOKENS) {
    if (text.startsWith(emoji, index)) return emoji;
  }
  return null;
}

function splitEmojiText(text) {
  const parts = [];
  let buffer = '';
  for (let i = 0; i < text.length;) {
    const emoji = findEmojiToken(text, i);
    if (emoji) {
      if (buffer) {
        parts.push({ type: 'text', value: buffer });
        buffer = '';
      }
      parts.push({ type: 'emoji', value: emoji });
      i += emoji.length;
    } else {
      buffer += text[i];
      i += 1;
    }
  }
  if (buffer) parts.push({ type: 'text', value: buffer });
  return parts;
}

export function createPixiEmojiText(text, style, textures, options = {}) {
  const container = new PIXI.Container();
  const fontSize = readFontSize(style);
  const emojiSize = options.emojiSize || Math.round(fontSize * 1.25);
  const gap = options.gap ?? 2;
  let x = 0;
  let maxHeight = 0;

  for (const part of splitEmojiText(String(text || ''))) {
    let display;
    if (part.type === 'emoji') {
      const texture = textures?.[getEmojiTextureKey(part.value)];
      if (texture) {
        display = new PIXI.Sprite(texture);
        display.width = emojiSize;
        display.height = emojiSize;
      }
    }
    if (!display) display = new PIXI.Text(part.value, style);

    display.x = x;
    display.y = 0;
    container.addChild(display);
    x += display.width + gap;
    maxHeight = Math.max(maxHeight, display.height);
  }

  if (container.children.length > 0) x -= gap;
  for (const child of container.children) {
    child.y = (maxHeight - child.height) / 2;
  }

  container.contentWidth = Math.max(0, x);
  container.contentHeight = maxHeight;
  return container;
}
