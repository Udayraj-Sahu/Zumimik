import { useCallback } from "react";
import { useSettingsStore } from "@/stores/settings-store";
import {
  hapticComplete,
  hapticCorrect,
  hapticDuel,
  hapticTap,
  hapticWrong,
  playComplete,
  playCorrect,
  playCountdown,
  playDuelLose,
  playDuelWin,
  playTap,
  playWrong,
} from "@/lib/platform";

export function useFeedback() {
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);

  const correct = useCallback(() => {
    if (soundEnabled) playCorrect();
    if (hapticEnabled) hapticCorrect();
  }, [soundEnabled, hapticEnabled]);

  const wrong = useCallback(() => {
    if (soundEnabled) playWrong();
    if (hapticEnabled) hapticWrong();
  }, [soundEnabled, hapticEnabled]);

  const complete = useCallback(() => {
    if (soundEnabled) playComplete();
    if (hapticEnabled) hapticComplete();
  }, [soundEnabled, hapticEnabled]);

  const tap = useCallback(() => {
    if (soundEnabled) playTap();
    if (hapticEnabled) hapticTap();
  }, [soundEnabled, hapticEnabled]);

  const countdown = useCallback(() => {
    if (soundEnabled) playCountdown();
    if (hapticEnabled) hapticTap();
  }, [soundEnabled, hapticEnabled]);

  const duelResult = useCallback((won: boolean) => {
    if (soundEnabled) (won ? playDuelWin() : playDuelLose());
    if (hapticEnabled) hapticDuel();
  }, [soundEnabled, hapticEnabled]);

  return { correct, wrong, complete, tap, countdown, duelResult };
}
