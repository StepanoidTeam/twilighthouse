// ===== Tutorial videos =====
// Препоалживаем видео туториала в boot-loader, чтобы карусель открывалась
// мгновенно без буферизации.
// Скачиваем как blob и держим object URL — это работает даже когда сервер
// отдаёт `Cache-Control: no-cache` (см. `http-server -c-1`).

export const TUTORIAL_STEPS = [
  { id: 'mermaids', video: 'tutorial-vids/mermaid.mp4' },
  { id: 'smugglers', video: 'tutorial-vids/smugglers.mp4' },
  { id: 'cops', video: 'tutorial-vids/cops.mp4' },
  { id: 'kraken', video: 'tutorial-vids/kraken.mp4' },
];

export const TUTORIAL_VIDEO_ASSETS = TUTORIAL_STEPS.map((step) => step.video);

const objectUrlByPath = new Map();

export function getTutorialVideoSrc(path) {
  return objectUrlByPath.get(path) || path;
}

export async function preloadTutorialVideos({
  loaded = 0,
  total = 0,
  onProgress = null,
} = {}) {
  let current = loaded;
  for (const path of TUTORIAL_VIDEO_ASSETS) {
    if (onProgress) onProgress(current, total, { kind: 'video', path });

    try {
      if (!objectUrlByPath.has(path)) {
        const res = await fetch(path, { cache: 'force-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        objectUrlByPath.set(path, url);
      }
    } catch (err) {
      // Не падаем на бут-лоадере из-за видео — туториал просто
      // подгрузит ролик по обычному URL при показе.
      console.warn('[tutorial-videos] preload failed', path, err);
    }

    current += 1;
    if (onProgress) onProgress(current, total, { kind: 'video', path });
  }
  return current;
}
