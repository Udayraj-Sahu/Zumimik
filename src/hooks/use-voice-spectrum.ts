"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ── Tuning ── */

/** Bar count. The brief asks for 20–40; 28 reads as a continuous crest at phone
 *  widths while still leaving a visible gap between neighbouring bars. */
export const SPECTRUM_BARS = 28;

/** Voice carries its intelligibility below ~3.5kHz, so bins above that are pure
 *  hiss and would only add jitter to the crest. */
const VOICE_MAX_HZ = 3500;

const FFT_SIZE = 256;

/** Fast on the way up, slow on the way down — the asymmetry is what makes a
 *  spectrum read as fluid instead of strobing. */
const ATTACK = 0.55;
const RELEASE = 0.14;

/** Floor for the auto-gain divisor so a silent room cannot amplify noise into a
 *  full-height wave. */
const MIN_GAIN = 0.06;

const MAX_LEVEL = 1;

/** If nothing above this arrives shortly after the mic opens, the stream is
 *  permitted but dead — something else already owns the microphone. */
const SIGNAL_FLOOR = 0.06;
const SIGNAL_GRACE_MS = 900;

/** How long the crest takes to collapse once the mic is released. */
const COLLAPSE_MS = 280;

/* ── Pure maths (exported for tests) ── */

export type BandRange = readonly [start: number, end: number];

/**
 * Spreads `bars` bands across the spectrum logarithmically.
 *
 * A linear split would waste most bars on frequencies no voice ever occupies and
 * squash the whole vocal range into the first two. Log spacing gives each bar a
 * comparable slice of *perceptual* width, which is what makes the crest look even
 * instead of spiky at one end and dead at the other.
 */
export function buildBandRanges(options: {
  binCount: number;
  bars: number;
  fftSize: number;
  sampleRate: number;
  maxHz?: number;
}): BandRange[] {
  const { binCount, bars, fftSize, sampleRate, maxHz = VOICE_MAX_HZ } = options;
  if (bars <= 0 || binCount <= 0) return [];

  // Bin 0 is DC and carries no audio, so drop it.
  const firstBin = 1;
  const topBin = Math.max(
    firstBin + 1,
    Math.min(binCount, Math.ceil((maxHz * fftSize) / Math.max(sampleRate, 1))),
  );

  const ranges: BandRange[] = [];
  const logSpan = Math.log(topBin / firstBin);

  for (let i = 0; i < bars; i += 1) {
    const start = firstBin + Math.round(((topBin - firstBin) * Math.log(Math.pow(topBin / firstBin, i / bars))) / logSpan);
    const end = firstBin + Math.round(((topBin - firstBin) * Math.log(Math.pow(topBin / firstBin, (i + 1) / bars))) / logSpan);
    // A band always covers at least one bin, even when bars outnumber bins.
    ranges.push([start, Math.max(end, start + 1)]);
  }

  return ranges;
}

/** Anything indexable and writable: a plain array in tests, a Float32Array in the
 *  hot loop where per-band writes should stay cheap. */
type Levels = { readonly length: number; [index: number]: number };

/**
 * Advances `smoothed` toward `target` in place, per band, with asymmetric
 * attack/release.
 *
 * @returns the highest value written, so the caller can drive auto-gain from the
 *          same pass it already performs.
 */
export function smoothInto(
  target: Levels,
  smoothed: Levels,
  attack: number = ATTACK,
  release: number = RELEASE,
): number {
  let peak = 0;

  for (let i = 0; i < smoothed.length; i += 1) {
    const raw = target[i];
    // A NaN would stick to the band forever and write scaleY(NaN), which is not
    // a valid transform, so an unreadable bin reads as silence instead.
    const goal = Number.isFinite(raw) ? Math.min(1, Math.max(0, raw)) : 0;
    const rate = goal > smoothed[i] ? attack : release;
    const next = smoothed[i] + (goal - smoothed[i]) * rate;
    smoothed[i] = next;
    if (next > peak) peak = next;
  }

  return peak;
}

/* ── Hook ── */

export type SpectrumStatus = "idle" | "live" | "unavailable";

const mediaSupported = () =>
  typeof window !== "undefined" &&
  typeof window.AudioContext !== "undefined" &&
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia;

/**
 * Drives a bar spectrum from the live microphone signal.
 *
 * Amplitude is read on a rAF loop and written straight to each bar's `transform`,
 * bypassing React entirely — a state update per frame would re-render the bar 60
 * times a second. Bars only ever move via `scaleY`, so the compositor handles the
 * animation and nothing invalidates layout.
 *
 * Reports `unavailable` rather than throwing when the mic is missing, blocked or
 * refused, which includes the Android WebView case where the speech-recognition
 * plugin is already holding the microphone. Callers are expected to fall back to a
 * decorative wave so the control still looks alive.
 */
export function useVoiceSpectrum(active: boolean): {
  hostRef: (node: HTMLSpanElement | null) => void;
  status: SpectrumStatus;
} {
  const [status, setStatus] = useState<SpectrumStatus>("idle");

  /* Bars are read on mount and reused for every frame's write. */
  const barsRef = useRef<HTMLElement[]>([]);
  const hostRef = useCallback((node: HTMLSpanElement | null) => {
    barsRef.current = node ? (Array.from(node.children) as HTMLElement[]) : [];
  }, []);

  /* Distinguishes "the user stopped listening" (collapse, then idle) from "the
   * component went away" (release immediately). Declared first so its cleanup has
   * already run by the time the audio effect tears down during an unmount. */
  const aliveRef = useRef(true);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      setStatus("idle");
      return;
    }
    if (!mediaSupported()) {
      setStatus("unavailable");
      return;
    }

    const frequency = new Uint8Array(FFT_SIZE / 2);
    const raw = new Float32Array(SPECTRUM_BARS);
    const smoothed = new Float32Array(SPECTRUM_BARS);

    let context: AudioContext | null = null;
    let stream: MediaStream | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let bands: BandRange[] = [];
    let frame = 0;
    let cancelled = false;
    let peak = 0;
    let sawSignal = false;
    let settled = false;

    const startedAt = Date.now();

    const writeBars = (visible: number) => {
      const bars = barsRef.current;
      if (visible <= 0) {
        for (let i = 0; i < bars.length; i += 1) bars[i].style.transform = "scaleY(0.02)";
        return;
      }
      for (let i = 0; i < bars.length; i += 1) {
        bars[i].style.transform = `scaleY(${Math.max(0.02, (smoothed[i] ?? 0) * visible).toFixed(3)})`;
      }
    };

    const loop = () => {
      if (settled) return;
      frame = requestAnimationFrame(loop);
      if (!analyser || barsRef.current.length === 0) return;

      analyser.getByteFrequencyData(frequency);

      for (let i = 0; i < raw.length; i += 1) {
        const band = bands[i];
        if (!band) continue;
        let sum = 0;
        let count = 0;
        for (let bin = band[0]; bin < band[1] && bin < frequency.length; bin += 1) {
          sum += frequency[bin];
          count += 1;
        }
        raw[i] = count > 0 ? sum / count / 255 : 0;
      }

      const loudest = smoothInto(raw, smoothed);
      if (!sawSignal && loudest > SIGNAL_FLOOR) sawSignal = true;

      // Rolling peak with a slow decay, so quiet speech still reaches full height
      // and a single loud syllable does not slam the crest to the ceiling.
      peak = Math.max(peak * 0.97, loudest);
      const gain = 1 / Math.max(peak, MIN_GAIN);

      for (let i = 0; i < smoothed.length; i += 1) {
        smoothed[i] = Math.min(MAX_LEVEL, smoothed[i] * gain);
      }

      writeBars(1);

      /* A permitted-but-silent stream means something else already owns the mic
         (Android's speech recogniser holds it exclusively). Hand control back so
         the UI can degrade instead of showing a dead flat line — and drop the
         stream, or the OS recording indicator would stay lit for the whole
         session. */
      if (!sawSignal && Date.now() - startedAt > SIGNAL_GRACE_MS) {
        settled = true;
        release();
        if (aliveRef.current) setStatus("unavailable");
      }
    };

    const release = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      stream?.getTracks().forEach((track) => track.stop());
      try {
        source?.disconnect();
        analyser?.disconnect();
      } catch {
        /* nodes may already be detached */
      }
      if (context && context.state !== "closed") void context.close().catch(() => undefined);
      stream = null;
      source = null;
      analyser = null;
      context = null;
    };

    void (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            // Voice only: AGC and noise suppression would flatten the very
            // dynamics the spectrum exists to show.
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        if (cancelled || !aliveRef.current) {
          release();
          return;
        }

        const scope = window as unknown as { webkitAudioContext?: typeof AudioContext };
        const Ctor = window.AudioContext ?? scope.webkitAudioContext;
        if (!Ctor) throw new Error("Web Audio unavailable");

        context = new Ctor();
        // Autoplay policies can hand back a suspended context until a gesture.
        if (context.state === "suspended") await context.resume();

        analyser = context.createAnalyser();
        analyser.fftSize = FFT_SIZE;
        // Light smoothing in the analyser itself, on top of our own EMA.
        analyser.smoothingTimeConstant = 0.6;

        source = context.createMediaStreamSource(stream);
        source.connect(analyser);
        // Deliberately not connected to context.destination: monitoring the mic
        // through the speakers would feed back.

        bands = buildBandRanges({
          binCount: analyser.frequencyBinCount,
          bars: SPECTRUM_BARS,
          fftSize: analyser.fftSize,
          sampleRate: context.sampleRate,
        });

        if (aliveRef.current) setStatus("live");
        loop();
      } catch {
        release();
        if (aliveRef.current) setStatus("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      settled = true;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      release();

      /* Collapse rather than snap: ramp the bars to nothing over a short window
         after the mic is released. */
      if (aliveRef.current) {
        let elapsed = 0;
        const step = () => {
          elapsed += 1000 / 60;
          const visible = Math.max(0, 1 - elapsed / COLLAPSE_MS);
          writeBars(visible);
          if (visible > 0) requestAnimationFrame(step);
        };
        step();
      }
    };
  }, [active]);

  return { hostRef, status };
}