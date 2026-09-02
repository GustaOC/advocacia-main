import { describe, expect, it } from "vitest";
import { isChunkLoadError } from "./chunk-load-error";

describe("isChunkLoadError", () => {
  it("reconhece falha de chunk do webpack", () => {
    expect(isChunkLoadError(new Error("Loading chunk 8458 failed."))).toBe(true);
    expect(isChunkLoadError({ name: "ChunkLoadError", message: "arquivo não encontrado" })).toBe(true);
  });

  it("não trata erros comuns como versão desatualizada", () => {
    expect(isChunkLoadError(new Error("Falha ao salvar publicação"))).toBe(false);
  });
});
