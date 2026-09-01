/** Split a single coach body into paragraphs when the model did not send an array. */
export function splitCoachParagraphs(text: string): string[] {
  if (!text) {
    return [];
  }
  const expanded = text.replace(/\\n/g, "\n");
  const blocks = expanded.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  if (blocks.length > 1) {
    return blocks;
  }
  return expanded
    .split(/\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeCoachCopy(input: {
  body?: string;
  paragraphs?: string[];
}): { body: string; paragraphs: string[] } {
  const fromArray = (input.paragraphs || [])
    .map((part) => part.trim())
    .filter(Boolean);
  if (fromArray.length > 0) {
    return { paragraphs: fromArray, body: fromArray.join("\n\n") };
  }
  const paragraphs = splitCoachParagraphs(input.body || "");
  return { paragraphs, body: paragraphs.join("\n\n") };
}
