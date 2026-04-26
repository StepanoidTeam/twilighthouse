// ===== Sound Helpers =====
import S from './state.js';

const AudioContextCtor =
  globalThis.AudioContext || globalThis.webkitAudioContext || null;
const AMBIENT_SILENT_THRESHOLD = 0.0001;
const MUSIC_PLAYLIST = [
  'music/1-techno-salt.mp3',
  'music/2-twilight-house.mp3',
  'music/3-silent-MARK-light.mp3',
];
const BOOT_AUDIO_ASSETS = Array.from(
  new Set([
    'audio/button-click.mp3',
    'audio/menu-select.mp3',
    'audio/book.mp3',
    'audio/fail-1.mp3',
    'audio/ocean-sea-soft-waves.mp3',
    'audio/crash/horror-bone-crack.mp3',
    'audio/crash/rubble-crash.mp3',
    'audio/crash/small-rock-break.mp3',
    'audio/crash/wooden-ship-break.mp3',
    'audio/cop/police-intro-siren.mp3',
    'audio/cop/police-siren-one-loop.mp3',
    'audio/cop/radio-thats-correct.mp3',
    'audio/cop/radio-turn.mp3',
    'audio/boat/submarine_sonar-1.mp3',
    'audio/boat/submarine_sonar-2.mp3',
    'audio/boat/submarine_sonar-3.mp3',
    ...MUSIC_PLAYLIST,
  ]),
);

let audioContext = null;
const audioBufferCache = new Map();
let audioUnlockPromise = null;
let musicTrackIndex = 0;
let ambientUnlockBound = false;
let visibilityPauseBound = false;
let musicWasPlayingBeforeHide = false;
let wavesWasPlayingBeforeHide = false;

const CRASH_VOLUME = 0.25;
const CRASH_SOUNDS = [
  'audio/crash/horror-bone-crack.mp3',
  'audio/crash/rubble-crash.mp3',
  'audio/crash/small-rock-break.mp3',
  'audio/crash/wooden-ship-break.mp3',
];
const COP_SOUNDS = [
  'audio/cop/police-intro-siren.mp3',
  'audio/cop/police-siren-one-loop.mp3',
  'audio/cop/radio-thats-correct.mp3',
  'audio/cop/radio-turn.mp3',
];
const BOAT_SONAR_SOUNDS = [
  'audio/boat/submarine_sonar-1.mp3',
  'audio/boat/submarine_sonar-2.mp3',
  'audio/boat/submarine_sonar-3.mp3',
];
const SHORT_SFX_PATHS = [
  'audio/button-click.mp3',
  'audio/menu-select.mp3',
  'audio/book.mp3',
  'audio/fail-1.mp3',
  ...CRASH_SOUNDS,
  ...COP_SOUNDS,
  ...BOAT_SONAR_SOUNDS,
];
const COP_VOLUME = 0.06;
const BOAT_SONAR_VOLUME = 0.3;
const WAVES_VOLUME = 0.1;
const MUSIC_VOLUME = 0.15;

function clampVolume(value) {
  return Math.max(0, Math.min(1, value));
}

function ensureAudioContext() {
  if (!AudioContextCtor) return null;
  if (!audioContext) {
    audioContext = new AudioContextCtor();
  }
  return audioContext;
}

async function unlockAudioContext() {
  const context = ensureAudioContext();
  if (!context) return false;
  if (context.state === 'running') return true;
  if (audioUnlockPromise) return audioUnlockPromise;

  audioUnlockPromise = (async () => {
    try {
      await context.resume();

      const buffer = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.start(0);
      source.stop(0);
      source.disconnect();

      return context.state === 'running';
    } catch (_) {
      return false;
    } finally {
      audioUnlockPromise = null;
    }
  })();

  return audioUnlockPromise;
}

async function loadAudioBuffer(path) {
  const existing = audioBufferCache.get(path);
  if (existing) return existing;

  const pending = fetch(path)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${path}`);
      }
      return response.arrayBuffer();
    })
    .then(async (buffer) => {
      const context = ensureAudioContext();
      if (!context) {
        throw new Error('Web Audio API is not supported');
      }
      return context.decodeAudioData(buffer.slice(0));
    })
    .catch((error) => {
      audioBufferCache.delete(path);
      throw error;
    });

  audioBufferCache.set(path, pending);
  return pending;
}

class AmbientAudioTrack {
  constructor({ path, loop = false, onEnded = null } = {}) {
    this.path = path;
    this.loop = loop;
    this.onEnded = onEnded;
    this.buffer = null;
    this.sourceNode = null;
    this.gainNode = null;
    this.offset = 0;
    this.startedAt = 0;
    this.currentVolume = 1;
    this.loadingPromise = null;
    this.destroyed = false;
  }

  get paused() {
    return !this.sourceNode;
  }

  get src() {
    return this.path;
  }

  get currentTime() {
    const context = ensureAudioContext();
    if (!context || !this.sourceNode) return this.offset;
    return Math.max(0, context.currentTime - this.startedAt);
  }

  set currentTime(value) {
    this.offset = Math.max(0, Number(value) || 0);
    if (this.sourceNode) {
      this.restartFromOffset();
    }
  }

  async ensureReady() {
    if (this.buffer) return this.buffer;
    if (!this.loadingPromise) {
      this.loadingPromise = loadAudioBuffer(this.path).then((buffer) => {
        this.buffer = buffer;
        return buffer;
      });
    }
    return this.loadingPromise;
  }

  ensureGainNode() {
    const context = ensureAudioContext();
    if (!context) return null;
    if (!this.gainNode) {
      this.gainNode = context.createGain();
      this.gainNode.gain.value = this.currentVolume;
      this.gainNode.connect(context.destination);
    }
    return this.gainNode;
  }

  normalizeOffset() {
    if (!this.buffer) return this.offset;
    if (this.buffer.duration <= 0) return 0;
    if (this.loop) {
      this.offset %= this.buffer.duration;
      if (this.offset < 0) this.offset += this.buffer.duration;
      return this.offset;
    }
    this.offset = Math.min(this.offset, this.buffer.duration);
    return this.offset;
  }

  async play() {
    if (this.destroyed) return false;
    const context = ensureAudioContext();
    if (!context) return false;
    await context.resume().catch(() => {});
    await this.ensureReady();
    const gainNode = this.ensureGainNode();
    if (!gainNode || !this.buffer) return false;
    if (this.currentVolume <= AMBIENT_SILENT_THRESHOLD) return false;
    if (this.sourceNode) return true;

    this.normalizeOffset();
    if (
      !this.loop &&
      this.buffer.duration > 0 &&
      this.offset >= this.buffer.duration
    ) {
      this.offset = 0;
    }

    const startOffset =
      this.buffer.duration > 0
        ? Math.min(this.offset, Math.max(0, this.buffer.duration - 0.001))
        : 0;

    const source = context.createBufferSource();
    source.buffer = this.buffer;
    source.loop = this.loop;
    source.connect(gainNode);
    source.onended = () => {
      if (this.sourceNode !== source) return;
      this.sourceNode = null;
      this.startedAt = 0;
      this.offset = 0;
      if (!this.loop && typeof this.onEnded === 'function') {
        this.onEnded();
      }
    };

    this.sourceNode = source;
    this.startedAt = context.currentTime - startOffset;
    this.offset = startOffset;
    source.start(0, startOffset);
    return true;
  }

  pause() {
    if (!this.sourceNode) return;
    const source = this.sourceNode;
    this.offset = this.currentTime;
    source.onended = null;
    source.stop();
    source.disconnect();
    this.sourceNode = null;
    this.startedAt = 0;
    this.normalizeOffset();
  }

  stop({ resetPlayback = false } = {}) {
    this.pause();
    if (resetPlayback) {
      this.offset = 0;
    }
  }

  setVolume(volume) {
    const nextVolume = clampVolume(volume);
    this.currentVolume = nextVolume;
    const gainNode = this.ensureGainNode();
    if (gainNode) {
      gainNode.gain.value = nextVolume;
    }
    return nextVolume;
  }

  async setSource(path, { resetPlayback = false } = {}) {
    if (!path) return;
    const wasPlaying = !this.paused;
    if (this.sourceNode) {
      this.pause();
    }
    this.path = path;
    this.buffer = null;
    this.loadingPromise = null;
    if (resetPlayback) {
      this.offset = 0;
    }
    await this.ensureReady();
    if (wasPlaying && this.currentVolume > AMBIENT_SILENT_THRESHOLD) {
      await this.play();
    }
  }

  async restartFromOffset() {
    if (this.paused) return;
    this.pause();
    await this.play();
  }
}

function createAmbientAudioTrack(options) {
  return new AmbientAudioTrack(options);
}

function preloadAudioAsset(path) {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;
    const timeoutId = window.setTimeout(handleDone, 4000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      audio.removeEventListener('canplaythrough', handleReady);
      audio.removeEventListener('loadeddata', handleReady);
      audio.removeEventListener('error', handleDone);
    }

    function handleDone() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    function handleReady() {
      handleDone();
    }

    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', handleReady, { once: true });
    audio.addEventListener('loadeddata', handleReady, { once: true });
    audio.addEventListener('error', handleDone, { once: true });
    audio.src = path;
    audio.load();
  });
}

function initializeAmbientAudio() {
  if (!S.wavesSound) {
    const wavesAudio = createAmbientAudioTrack({
      path: 'audio/ocean-sea-soft-waves.mp3',
      loop: true,
    });
    wavesAudio.setVolume(
      WAVES_VOLUME * (S.sfxVolume != null ? S.sfxVolume : 0.5),
    );
    S.wavesSound = wavesAudio;
  }

  if (!S.musicSound) {
    const musicAudio = createAmbientAudioTrack({
      path: MUSIC_PLAYLIST[0],
      onEnded: async () => {
        musicTrackIndex = (musicTrackIndex + 1) % MUSIC_PLAYLIST.length;
        await musicAudio.setSource(MUSIC_PLAYLIST[musicTrackIndex], {
          resetPlayback: true,
        });
        if (getMusicVolume(MUSIC_VOLUME) > AMBIENT_SILENT_THRESHOLD) {
          await musicAudio.play();
          console.log('🎵 Music track:', MUSIC_PLAYLIST[musicTrackIndex]);
        }
      },
    });
    musicAudio.setVolume(
      MUSIC_VOLUME * (S.musicVolume != null ? S.musicVolume : 0.5),
    );
    S.musicSound = musicAudio;
  }
}

function playClickSound() {
  playSound('audio/button-click.mp3', 0.2);
}

function playFailSound() {
  if (S.musicSound && !S.musicSound.paused) {
    S.musicSound.pause();
    playSound('audio/fail-1.mp3', 0.1, {
      onEnded: () => {
        if (S.musicSound) {
          void S.musicSound.play();
        }
      },
    });
    return;
  }

  playSound('audio/fail-1.mp3', 0.1);
}

function stopWavesSound({ resetPlayback = false } = {}) {
  if (S.wavesSound) {
    S.wavesSound.stop({ resetPlayback });
  }
}

function startWavesSound({ restartPlayback = false } = {}) {
  initializeAmbientAudio();
  if (S.wavesSound) {
    if (restartPlayback) S.wavesSound.currentTime = 0;
    void syncLoopingAudio(S.wavesSound, getSfxVolume(WAVES_VOLUME));
  }
}

async function startMenuMusic({ restartPlayback = false } = {}) {
  initializeAmbientAudio();
  if (S.musicSound) {
    if (restartPlayback) {
      musicTrackIndex = 0;
      if (S.musicSound.src !== MUSIC_PLAYLIST[0]) {
        await S.musicSound.setSource(MUSIC_PLAYLIST[0], {
          resetPlayback: true,
        });
      }
      S.musicSound.currentTime = 0;
    }
    if (
      (await syncLoopingAudio(S.musicSound, getMusicVolume(MUSIC_VOLUME))) >
      AMBIENT_SILENT_THRESHOLD
    ) {
      console.log('🎵 Music track:', MUSIC_PLAYLIST[musicTrackIndex]);
    }
  }
}

function bindAmbientAudioVisibilityPause() {
  if (visibilityPauseBound) return;
  if (typeof document === 'undefined') return;
  visibilityPauseBound = true;

  const onVisibilityChange = () => {
    if (document.hidden) {
      // Запоминаем состояние перед скрытием, чтобы не возобновлять
      // звуки, которые сам игрок выключил или которые стояли на game-over.
      musicWasPlayingBeforeHide = !!(S.musicSound && !S.musicSound.paused);
      wavesWasPlayingBeforeHide = !!(S.wavesSound && !S.wavesSound.paused);
      if (S.musicSound && !S.musicSound.paused) {
        S.musicSound.pause();
      }
      if (S.wavesSound && !S.wavesSound.paused) {
        S.wavesSound.pause();
      }
      // Останавливаем все короткие SFX, привязанные к AudioContext.
      const ctx = audioContext;
      if (ctx && ctx.state === 'running') {
        void ctx.suspend().catch(() => {});
      }
    } else {
      const ctx = audioContext;
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      if (musicWasPlayingBeforeHide) {
        musicWasPlayingBeforeHide = false;
        if (S.musicSound && getMusicVolume(MUSIC_VOLUME) > AMBIENT_SILENT_THRESHOLD) {
          void S.musicSound.play();
        }
      }
      if (wavesWasPlayingBeforeHide) {
        wavesWasPlayingBeforeHide = false;
        if (S.wavesSound && getSfxVolume(WAVES_VOLUME) > AMBIENT_SILENT_THRESHOLD) {
          void S.wavesSound.play();
        }
      }
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
}

function bindAmbientAudioUnlock() {
  if (ambientUnlockBound) return;
  ambientUnlockBound = true;

  const unlock = () => {
    void unlockAudioContext().then((unlocked) => {
      if (!unlocked) return;
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('keydown', unlock, true);
      if (!S.gameOver) {
        startWavesSound();
        void startMenuMusic();
      }
    });
  };

  document.addEventListener('pointerdown', unlock, true);
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('keydown', unlock, true);
}

function playHtmlAudioFallback(file, volume, { onEnded } = {}) {
  const snd = new Audio(file);
  syncAudioVolume(snd, volume);
  if (typeof onEnded === 'function') {
    snd.addEventListener('ended', onEnded, { once: true });
  }
  snd.play().catch(() => {});
  return snd;
}

function syncAudioVolume(audio, volume) {
  if (!audio) return 0;
  const nextVolume = clampVolume(volume);
  if (typeof audio.setVolume === 'function') {
    return audio.setVolume(nextVolume);
  }
  audio.volume = nextVolume;
  audio.muted = nextVolume <= 0.0001;
  return nextVolume;
}

async function syncLoopingAudio(audio, volume) {
  if (!audio) return 0;

  const nextVolume = syncAudioVolume(audio, volume);
  if (nextVolume <= AMBIENT_SILENT_THRESHOLD) {
    audio.pause();
    return nextVolume;
  }

  if (audio.paused) {
    await audio.play().catch(() => {});
  }

  return nextVolume;
}

function getSfxVolume(baseVolume = 1) {
  const master = S.sfxVolume != null ? S.sfxVolume : 1;
  return clampVolume(baseVolume * master);
}

function getMusicVolume(baseVolume = 1) {
  const master = S.musicVolume != null ? S.musicVolume : 1;
  return clampVolume(baseVolume * master);
}

async function primeAmbientAudioBuffers(paths) {
  if (!AudioContextCtor) return;
  await Promise.all(
    paths.map((path) => loadAudioBuffer(path).catch(() => null)),
  );
}

async function primeBootAmbientAudio() {
  // Прогреваем Web Audio буферы и для амбиента, и для всех one-shot SFX.
  // Иначе первое воспроизведение конкретного сэмпла идёт через
  // fetch + decodeAudioData прямо в момент события (например, удар
  // кракена об лодку), и звук попросту не успевает заиграть.
  await primeAmbientAudioBuffers([
    'audio/ocean-sea-soft-waves.mp3',
    ...MUSIC_PLAYLIST,
    ...SHORT_SFX_PATHS,
  ]);
}

async function preloadBootAudioAssets({
  loaded = 0,
  total = BOOT_AUDIO_ASSETS.length,
  onProgress = null,
} = {}) {
  let nextLoaded = loaded;

  for (const path of BOOT_AUDIO_ASSETS) {
    if (typeof onProgress === 'function') {
      onProgress(nextLoaded, total, { kind: 'audio', path });
    }
    await preloadAudioAsset(path);
    nextLoaded += 1;
    if (typeof onProgress === 'function') {
      onProgress(nextLoaded, total, { kind: 'audio', path });
    }
  }

  return nextLoaded;
}

function playSound(file, volume = 0.2, { onEnded } = {}) {
  const effectiveVolume = getSfxVolume(volume);
  if (effectiveVolume <= AMBIENT_SILENT_THRESHOLD) return null;

  const context = ensureAudioContext();
  if (!context) {
    return playHtmlAudioFallback(file, effectiveVolume, { onEnded });
  }

  void (async () => {
    await context.resume().catch(() => {});
    const buffer = await loadAudioBuffer(file).catch(() => null);
    if (!buffer) {
      playHtmlAudioFallback(file, effectiveVolume, { onEnded });
      return;
    }

    const gainNode = context.createGain();
    gainNode.gain.value = effectiveVolume;
    gainNode.connect(context.destination);

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    source.onended = () => {
      source.disconnect();
      gainNode.disconnect();
      if (typeof onEnded === 'function') onEnded();
    };
    source.start(0);
  })();

  return true;
}

function playRandomSound(files, volume = 0.2) {
  playSound(files[Math.floor(Math.random() * files.length)], volume);
}

export {
  MUSIC_PLAYLIST,
  BOOT_AUDIO_ASSETS,
  CRASH_VOLUME,
  CRASH_SOUNDS,
  COP_VOLUME,
  BOAT_SONAR_VOLUME,
  WAVES_VOLUME,
  MUSIC_VOLUME,
  preloadAudioAsset,
  preloadBootAudioAssets,
  createAmbientAudioTrack,
  initializeAmbientAudio,
  primeBootAmbientAudio,
  playClickSound,
  playFailSound,
  bindAmbientAudioUnlock,
  bindAmbientAudioVisibilityPause,
  stopWavesSound,
  startWavesSound,
  startMenuMusic,
  unlockAudioContext,
  syncAudioVolume,
  syncLoopingAudio,
  getSfxVolume,
  getMusicVolume,
  primeAmbientAudioBuffers,
  playSound,
  playRandomSound,
};
