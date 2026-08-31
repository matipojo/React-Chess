const HEBREW = /[\u0590-\u05FF\uFB1D-\uFB4F]/g;
const ARABIC =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;

export type TextDirection = "ltr" | "rtl";
export type RtlLang = "he" | "ar";

function countMatches(text: string, pattern: RegExp): number {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export function detectTextDirection(text: string): {
  dir: TextDirection;
  lang?: RtlLang;
} {
  const hebrew = countMatches(text, HEBREW);
  const arabic = countMatches(text, ARABIC);
  if (hebrew === 0 && arabic === 0) {
    return { dir: "ltr" };
  }
  if (arabic > hebrew) {
    return { dir: "rtl", lang: "ar" };
  }
  return { dir: "rtl", lang: "he" };
}
