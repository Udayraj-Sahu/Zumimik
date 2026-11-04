export const CLOCK_TICK_COUNT = 6;
export const CLOCK_MOVE_DURATION_MS = 180;
export const CLOCK_PAUSE_DURATION_MS = 450;
export const CLOCK_CYCLE_DURATION_MS =
  (CLOCK_MOVE_DURATION_MS + CLOCK_PAUSE_DURATION_MS) * CLOCK_TICK_COUNT;

const CENTER = { x: 250, y: 300 };
const SECTOR_RADIUS = 198;
const START_ANGLE = 196;
const TWELVE_O_CLOCK_ANGLE = 270;

function pointAtAngle(angle: number, radius: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: CENTER.x + radius * Math.cos(radians),
    y: CENTER.y + radius * Math.sin(radians),
  };
}

function formatCoordinate(value: number) {
  return Number(value.toFixed(3)).toString();
}

export function getFight1ClockFrame(progress: number) {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const angle = START_ANGLE + (TWELVE_O_CLOCK_ANGLE - START_ANGLE) * boundedProgress;
  const sectorStart = pointAtAngle(START_ANGLE, SECTOR_RADIUS);
  const sectorEnd = pointAtAngle(angle, SECTOR_RADIUS);
  const wedgePath = [
    `M${CENTER.x} ${CENTER.y}`,
    `L${formatCoordinate(sectorStart.x)} ${formatCoordinate(sectorStart.y)}`,
    `A${SECTOR_RADIUS} ${SECTOR_RADIUS} 0 0 1 ${formatCoordinate(sectorEnd.x)} ${formatCoordinate(sectorEnd.y)}`,
    "Z",
  ].join(" ");

  return {
    angle,
    handRotation: angle - 180,
    wedgePath,
  };
}

export function getFight1ProgressAt(elapsedMs: number) {
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed >= CLOCK_CYCLE_DURATION_MS) return 1;

  const tickDuration = CLOCK_MOVE_DURATION_MS + CLOCK_PAUSE_DURATION_MS;
  const tickIndex = Math.floor(elapsed / tickDuration);
  const timeInTick = elapsed - tickIndex * tickDuration;
  const movementProgress = Math.min(1, timeInTick / CLOCK_MOVE_DURATION_MS);
  const easedMovement = 1 - (1 - movementProgress) ** 3;

  return (tickIndex + easedMovement) / CLOCK_TICK_COUNT;
}
