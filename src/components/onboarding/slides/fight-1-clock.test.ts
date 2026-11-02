import { describe, expect, it } from "vitest";
import {
  CLOCK_MOVE_DURATION_MS,
  CLOCK_PAUSE_DURATION_MS,
  CLOCK_TICK_COUNT,
  getFight1ClockFrame,
  getFight1ProgressAt,
} from "./fight-1-clock";

function getArcEndpointAngle(path: string) {
  const endpoint = path.match(/A198 198 0 0 1\s+(-?[\d.]+)\s+(-?[\d.]+)/);
  if (!endpoint) throw new Error(`No clock arc endpoint in path: ${path}`);

  const x = Number(endpoint[1]) - 250;
  const y = Number(endpoint[2]) - 300;
  return (Math.atan2(y, x) * 180) / Math.PI + 360;
}

describe("Fight 1 clock geometry", () => {
  it("starts with the hand and empty sector at the same starting angle", () => {
    const frame = getFight1ClockFrame(0);
    const sectorEndpointAngle = getArcEndpointAngle(frame.wedgePath);

    expect(frame.angle).toBeCloseTo(196);
    expect(frame.handRotation + 180).toBeCloseTo(frame.angle);
    expect(sectorEndpointAngle).toBeCloseTo(frame.angle);
  });

  it("keeps the red sector endpoint aligned to the hand at intermediate progress", () => {
    const frame = getFight1ClockFrame(0.5);

    expect(frame.angle).toBeCloseTo(233);
    expect(getArcEndpointAngle(frame.wedgePath)).toBeCloseTo(frame.angle);
  });

  it("reaches twelve with a full sector and no angle overshoot", () => {
    const frame = getFight1ClockFrame(1);

    expect(frame.angle).toBe(270);
    expect(frame.handRotation).toBe(90);
    expect(getArcEndpointAngle(frame.wedgePath)).toBeCloseTo(270);
  });

  it("moves in eased ticks separated by pauses and holds at the end", () => {
    const tickDuration = CLOCK_MOVE_DURATION_MS + CLOCK_PAUSE_DURATION_MS;
    const firstTick = 1 / CLOCK_TICK_COUNT;

    expect(getFight1ProgressAt(0)).toBe(0);
    expect(getFight1ProgressAt(CLOCK_MOVE_DURATION_MS / 2)).toBeGreaterThan(0);
    expect(getFight1ProgressAt(CLOCK_MOVE_DURATION_MS / 2)).toBeLessThan(firstTick);
    expect(getFight1ProgressAt(CLOCK_MOVE_DURATION_MS)).toBeCloseTo(firstTick);
    expect(getFight1ProgressAt(CLOCK_MOVE_DURATION_MS + 200)).toBeCloseTo(firstTick);
    expect(getFight1ProgressAt(tickDuration + CLOCK_MOVE_DURATION_MS / 2)).toBeGreaterThan(firstTick);
    expect(getFight1ProgressAt(tickDuration * CLOCK_TICK_COUNT + 1000)).toBe(1);
  });
});
