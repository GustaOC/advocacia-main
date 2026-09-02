export const PETITION_STEP_DATA_PREFIX = "__PETITION_STEP_DATA__:";

export type PetitionStepAttachment = {
  name: string;
  url: string;
  type: string;
  size: number;
};

export type PetitionStepData = {
  observations: string;
  attachments: PetitionStepAttachment[];
};

export function parsePetitionStepData(notes?: string | null): PetitionStepData {
  if (!notes) return { observations: "", attachments: [] };

  if (notes.startsWith(PETITION_STEP_DATA_PREFIX)) {
    try {
      const parsed = JSON.parse(notes.slice(PETITION_STEP_DATA_PREFIX.length));
      return {
        observations: typeof parsed.observations === "string" ? parsed.observations : "",
        attachments: Array.isArray(parsed.attachments) ? parsed.attachments : [],
      };
    } catch {
      return { observations: "", attachments: [] };
    }
  }

  return { observations: notes, attachments: [] };
}

export function serializePetitionStepData(data: PetitionStepData): string {
  if (!data.observations.trim() && data.attachments.length === 0) return "";
  return PETITION_STEP_DATA_PREFIX + JSON.stringify({
    observations: data.observations.trim(),
    attachments: data.attachments,
  });
}
