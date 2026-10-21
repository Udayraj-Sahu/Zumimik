import { createAudioContext } from "@/lib/platform";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!ctx) ctx = createAudioContext();
  if (ctx && ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime);
  osc.stop(c.currentTime + duration);
}

export function playCorrect() {
  playTone(523, 0.12, "sine", 0.12);
  setTimeout(() => playTone(659, 0.12, "sine", 0.12), 80);
}

export function playWrong() {
  playTone(200, 0.2, "square", 0.1);
  setTimeout(() => playTone(180, 0.25, "square", 0.1), 100);
}

export function playComplete() {
  const notes = [523, 659, 784, 1047];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.2, "sine", 0.12), i * 100);
  });
}

export function playTap() {
  playTone(800, 0.05, "sine", 0.06);
}

export function playCountdown() {
  playTone(880, 0.06, "sine", 0.08);
}

export function playDuelWin() {
  const notes = [784, 988, 1175, 1319, 1568];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.25, "triangle", 0.1), i * 120);
  });
}

export function playDuelLose() {
  const notes = [400, 370, 340, 300];
  notes.forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, "sawtooth", 0.06), i * 150);
  });
}
