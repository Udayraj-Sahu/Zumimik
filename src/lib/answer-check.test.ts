import { describe, expect, it } from "vitest";
import { checkPracticeAnswer, parseLearnerAnswer } from "./answer-check";

describe("backend practice answer checking", () => {
  it("accepts numbers, fractions, mixed fractions, and thousands separators", () => {
    expect(parseLearnerAnswer("1,200")).toBe(1200);
    expect(parseLearnerAnswer("9/2")).toBe(4.5);
    expect(parseLearnerAnswer("-2 1/2")).toBe(-2.5);
  });

  it("grades client-extract items with a relative tolerance", () => {
    expect(checkPracticeAnswer("42.00001", 42, "client_extract")).toBe("correct");
    expect(checkPracticeAnswer("41", 42, "client_extract")).toBe("incorrect");
  });

  it("defers server-checked items and rejects unparseable client answers", () => {
    expect(checkPracticeAnswer("42", null, "server_sympy")).toBe("deferred");
    expect(checkPracticeAnswer("not a number", 42, "client_extract")).toBe("unparsable");
  });
});
