import type { PluginListenerHandle } from "@capacitor/core";

/**
 * Speech capture with two backends:
 *
 * - native, via @capacitor-community/speech-recognition, which is the only
 *   thing that works inside the Android WebView;
 * - web, via the browser's own SpeechRecognition, so the bar is usable and
 *   testable in a normal browser rather than only after a native build.
 *
 * Everything resolves rather than rejects: a missing mic, a denied permission
 * or an unsupported platform are expected states on a shipped build, and the
 * UI needs a sentence about them rather than an exception.
 */

export type VoiceCaptureHandlers = {
  /** Fires while the user is still talking, for live transcript text. */
  onPartial?: (text: string) => void;
  /** Fires once when recognition settles, with the best available text. */
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
};

export type VoiceSession = {
  stop: () => Promise<void>;
};

export const VOICE_LANGUAGE = "en-US";

const message = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/* ── Web backend ── */

type WebAlternative = { transcript: string; isFinal: boolean };
type WebResult = ArrayLike<WebAlternative> & { isFinal: boolean };
type WebRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<WebResult> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};
type WebRecognitionCtor = new () => WebRecognition;

const webCtor = (): WebRecognitionCtor | null => {
  if (typeof window === "undefined") return null;
  const scope = window as unknown as Record<string, unknown>;
  const ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  return typeof ctor === "function" ? (ctor as WebRecognitionCtor) : null;
};

const WEB_ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access is needed to dictate your routine.",
  "service-not-allowed": "Microphone access is needed to dictate your routine.",
  "no-speech": "Didn't hear anything. Try again.",
  "audio-capture": "Couldn't find a microphone on this device.",
  network: "Speech recognition needs a network connection.",
};

function startWebCapture(handlers: VoiceCaptureHandlers): VoiceSession | null {
  const Ctor = webCtor();
  if (!Ctor) {
    handlers.onError?.("Speech recognition isn't available in this browser.");
    return null;
  }

  const recognition = new Ctor();
  let latest = "";
  let settled = false;

  const finish = (text: string) => {
    if (settled) return;
    settled = true;
    handlers.onFinal(text.trim());
  };
  const abort = (text: string) => {
    if (settled) return;
    settled = true;
    handlers.onError?.(text);
  };

  recognition.lang = VOICE_LANGUAGE;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const alternative = event.results[i]?.[0];
      if (!alternative) continue;
      latest = alternative.transcript ?? "";
      if (alternative.isFinal) {
        finish(latest);
        return;
      }
      handlers.onPartial?.(latest);
    }
  };
  recognition.onerror = (event) => abort(WEB_ERRORS[event.error ?? ""] ?? "Voice input failed. Try again.");
  recognition.onend = () => finish(latest);

  try {
    recognition.start();
  } catch (error) {
    abort(message(error, "Couldn't start listening. Try again."));
    return null;
  }

  return {
    stop: async () => {
      try {
        recognition.stop();
      } catch {
        /* already stopped */
      }
    },
  };
}

/* ── Native backend ── */

async function startNativeCapture(handlers: VoiceCaptureHandlers): Promise<VoiceSession | null> {
  const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
  const fail = (text: string): null => {
    handlers.onError?.(text);
    return null;
  };

  try {
    const { available } = await SpeechRecognition.available();
    if (!available) return fail("Speech recognition isn't available on this device.");
  } catch (error) {
    return fail(message(error, "Speech recognition isn't available on this device."));
  }

  try {
    const current = await SpeechRecognition.checkPermissions();
    const granted =
      current.speechRecognition === "granted" ||
      (await SpeechRecognition.requestPermissions()).speechRecognition === "granted";
    if (!granted) return fail("Microphone access is needed to dictate your routine.");
  } catch (error) {
    return fail(message(error, "Microphone access is needed to dictate your routine."));
  }

  let latest = "";
  let settled = false;
  const handles: PluginListenerHandle[] = [];

  const cleanup = async () => {
    await Promise.all(handles.map((h) => h.remove().catch(() => undefined)));
    handles.length = 0;
  };

  const finish = async (text: string) => {
    if (settled) return;
    settled = true;
    await cleanup();
    handlers.onFinal(text.trim());
  };

  const abort = async (text: string) => {
    if (settled) return;
    settled = true;
    await cleanup();
    handlers.onError?.(text);
  };

  try {
    handles.push(
      await SpeechRecognition.addListener("partialResults", ({ matches }) => {
        const text = matches?.[0] ?? "";
        if (!text) return;
        latest = text;
        handlers.onPartial?.(text);
      }),
    );

    // With partialResults the start() promise returns immediately and the
    // recognizer ends the session itself, so the final text is the last partial.
    handles.push(
      await SpeechRecognition.addListener("listeningState", async ({ status }) => {
        if (status === "stopped") await finish(latest);
      }),
    );

    const result = await SpeechRecognition.start({
      language: VOICE_LANGUAGE,
      maxResults: 1,
      partialResults: true,
      // partialResults does not fire while the Android recognizer popup is up.
      popup: false,
      prompt: "Describe your study routine",
    });

    // Some platforms still resolve with a final match instead of emitting
    // partials, so honour that path too.
    const immediate = result?.matches?.[0];
    if (immediate && !latest) await finish(immediate);
  } catch (error) {
    await abort(message(error, "Couldn't start listening. Try again."));
    return null;
  }

  return {
    stop: async () => {
      try {
        await SpeechRecognition.stop();
      } catch {
        await abort("Couldn't stop listening cleanly.");
        return;
      }
      await finish(latest);
    },
  };
}

/* ── Public API ── */

/** Whether a mic could work at all here. The UI uses this to decide whether
 *  to offer voice input in the first place. */
export async function isVoiceSupported(): Promise<boolean> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return webCtor() !== null;
  try {
    const { SpeechRecognition } = await import("@capacitor-community/speech-recognition");
    const { available } = await SpeechRecognition.available();
    return available;
  } catch {
    return false;
  }
}

export async function startVoiceCapture(handlers: VoiceCaptureHandlers): Promise<VoiceSession | null> {
  const { Capacitor } = await import("@capacitor/core");
  if (!Capacitor.isNativePlatform()) return startWebCapture(handlers);
  return startNativeCapture(handlers);
}