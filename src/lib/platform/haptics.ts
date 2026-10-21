function vibrate(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
}

export function hapticCorrect() {
  vibrate(10);
}

export function hapticWrong() {
  vibrate([15, 30, 15]);
}

export function hapticComplete() {
  vibrate([10, 30, 10, 30, 10]);
}

export function hapticTap() {
  vibrate(5);
}

export function hapticDuel() {
  vibrate([20, 50, 20, 50, 50]);
}
