import { describe, expect, it } from "vitest";
import { parsePetitionStepData, serializePetitionStepData } from "./petition-step-data";

describe("petition step data", () => {
  it("mantém compatibilidade com observações antigas", () => {
    expect(parsePetitionStepData("Observação antiga")).toEqual({
      observations: "Observação antiga",
      attachments: [],
    });
  });

  it("separa observações e anexos", () => {
    const data = {
      observations: "Documento conferido",
      attachments: [{ name: "peticao.pdf", url: "https://example.com/peticao.pdf", type: "application/pdf", size: 123 }],
    };
    expect(parsePetitionStepData(serializePetitionStepData(data))).toEqual(data);
  });
});
