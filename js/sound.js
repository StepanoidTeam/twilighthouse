// ===== Sound Helpers =====
import S from './state.js';

const AudioContextCtor =
  globalThis.AudioContext || globalThis.webkitAudioContext || null;
const AMBIENT_SILENT_THRESHOLD = 0.0001;
let audioContext = null;
const audioBufferCache = new Map();
let audioUnlockPromise = null;

const CRASH_VOLUME = 0.06;
const CRASH_SOUNDS = [
  'audio/crash/horror-bone-crack.mp3',
  'audio/crash/rubble-crash.mp3',
  'audio/crash/small-rock-break.mp3',
  'audio/crash/wooden-ship-break.mp3',
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
  CRASH_VOLUME,
  CRASH_SOUNDS,
  COP_VOLUME,
  BOAT_SONAR_VOLUME,
  WAVES_VOLUME,
  MUSIC_VOLUME,
  createAmbientAudioTrack,
  unlockAudioContext,
  syncAudioVolume,
  syncLoopingAudio,
  getSfxVolume,
  getMusicVolume,
  primeAmbientAudioBuffers,
  playSound,
  playRandomSound,
};
