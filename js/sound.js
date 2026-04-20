// ===== Sound Helpers =====
import S from './state.js';

const CRASH_VOLUME = 0.03;
const CRASH_SOUNDS = [
  'audio/crash/horror-bone-crack.mp3',
  'audio/crash/rubble-crash.mp3',
  'audio/crash/small-rock-break.mp3',
  'audio/crash/wooden-ship-break.mp3',
];
const COP_VOLUME = 0.03;
const BOAT_SONAR_VOLUME = 0.15;

function playSound(file, volume = 0.2) {
  const snd = new Audio(file);
  const master = S.sfxVolume != null ? S.sfxVolume : 1;
  snd.volume = Math.max(0, Math.min(1, volume * master));
  snd.play().catch(() => {});
}

function playRandomSound(files, volume = 0.2) {
  playSound(files[Math.floor(Math.random() * files.length)], volume);
}

export {
  CRASH_VOLUME,
  CRASH_SOUNDS,
  COP_VOLUME,
  BOAT_SONAR_VOLUME,
  playSound,
  playRandomSound,
};
