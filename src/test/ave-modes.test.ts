import { describe, expect, it } from "vitest";
import { MODES, splitTime, fullPrompt } from "@/lib/ave-modes";

describe("AVE rules", () => {
  it("splits total minutes evenly across the five timed phases", () => {
    expect(splitTime(30)).toEqual([0, 360, 360, 360, 360, 360]);
  });
  it("enforces a 5 minute minimum", () => {
    expect(splitTime(2)).toEqual([0, 60, 60, 60, 60, 60]);
  });
  it("every mode has six phases and each prompt asks for a SCORE line", () => {
    for (const m of MODES) {
      expect(m.phases).toHaveLength(6);
      m.phases.forEach((p) => expect(fullPrompt(p)).toContain("SCORE: X/5"));
    }
  });
});
