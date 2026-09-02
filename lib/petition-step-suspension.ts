export const PETITION_STEP_SUSPENSION_PREFIX = "__PETITION_STEP_SUSPENSION__:";

export interface PetitionStepSuspension {
  suspendedAt: string;
  suspendedBy: string;
  resumedAt?: string;
  resumedBy?: string;
  originalNotes: string | null;
}

export function parsePetitionStepSuspension(notes?: string | null): PetitionStepSuspension | null {
  if (!notes?.startsWith(PETITION_STEP_SUSPENSION_PREFIX)) return null;
  try {
    const parsed = JSON.parse(notes.slice(PETITION_STEP_SUSPENSION_PREFIX.length));
    if (
      typeof parsed.suspendedAt !== "string" ||
      typeof parsed.suspendedBy !== "string" ||
      (parsed.resumedAt !== undefined && typeof parsed.resumedAt !== "string")
    ) {
      return null;
    }
    return {
      suspendedAt: parsed.suspendedAt,
      suspendedBy: parsed.suspendedBy,
      resumedAt: parsed.resumedAt,
      resumedBy: parsed.resumedBy,
      originalNotes: typeof parsed.originalNotes === "string" ? parsed.originalNotes : null,
    };
  } catch {
    return null;
  }
}

export function serializePetitionStepSuspension(data: PetitionStepSuspension) {
  return PETITION_STEP_SUSPENSION_PREFIX + JSON.stringify(data);
}

export function getVisiblePetitionStepNotes(notes?: string | null) {
  return parsePetitionStepSuspension(notes)?.originalNotes ?? notes ?? null;
}

export function isPetitionStepSuspended(notes?: string | null) {
  const suspension = parsePetitionStepSuspension(notes);
  return Boolean(suspension && !suspension.resumedAt);
}
