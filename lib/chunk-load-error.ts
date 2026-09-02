export function isChunkLoadError(value: unknown): boolean {
  if (!value) return false;

  const error = value as { name?: unknown; message?: unknown };
  const text = [error.name, error.message, typeof value === "string" ? value : ""]
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .toLowerCase();

  return (
    text.includes("chunkloaderror") ||
    /loading (css )?chunk \d+ failed/.test(text) ||
    text.includes("failed to fetch dynamically imported module")
  );
}
