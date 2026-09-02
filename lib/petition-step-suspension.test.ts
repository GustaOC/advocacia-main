import { describe, expect, it } from "vitest";
import {
  getVisiblePetitionStepNotes,
  isPetitionStepSuspended,
  parsePetitionStepSuspension,
  serializePetitionStepSuspension,
} from "./petition-step-suspension";

describe("petition step suspension", () => {
  it("preserves the original notes while the deadline is suspended", () => {
    const stored = serializePetitionStepSuspension({
      suspendedAt: "2026-09-02T10:00:00.000Z",
      suspendedBy: "user-1",
      originalNotes: "Observação anterior",
    });
    expect(isPetitionStepSuspended(stored)).toBe(true);
    expect(getVisiblePetitionStepNotes(stored)).toBe("Observação anterior");
  });

  it("marks a resumed step as active and retains the restart date", () => {
    const stored = serializePetitionStepSuspension({
      suspendedAt: "2026-09-02T10:00:00.000Z",
      suspendedBy: "user-1",
      resumedAt: "2026-09-05T14:00:00.000Z",
      resumedBy: "user-2",
      originalNotes: null,
    });
    expect(isPetitionStepSuspended(stored)).toBe(false);
    expect(parsePetitionStepSuspension(stored)?.resumedAt).toBe("2026-09-05T14:00:00.000Z");
  });

  it("keeps ordinary notes compatible", () => {
    expect(parsePetitionStepSuspension("Texto comum")).toBeNull();
    expect(getVisiblePetitionStepNotes("Texto comum")).toBe("Texto comum");
  });
});
