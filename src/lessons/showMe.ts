import { normalizeCoachCopy } from "./coachParagraphs";

export type ShowMeLessonArgs = {
  title?: string;
  paragraphs?: string[];
  body?: string;
  moves?: string[];
  fen?: string;
};

export type ShowMeLessonResolved =
  | { ok: false; message: string }
  | {
      ok: true;
      title: string;
      body: string;
      paragraphs: string[];
      moves: string[];
      fen?: string;
    };

/** Fields for create-lesson type=showme. The agent passes these; nothing is inferred from chat wording. */
export function resolveShowMeLesson(args: ShowMeLessonArgs): ShowMeLessonResolved {
  const title = (args.title || "").trim();
  if (!title) {
    return {
      ok: false,
      message: "A showme lesson needs a title.",
    };
  }

  const moves = (args.moves || []).map((item) => item.trim()).filter(Boolean);
  if (!moves.length) {
    return {
      ok: false,
      message:
        "A showme lesson needs moves (from:to) for the Play button to run in order.",
    };
  }

  const copy = normalizeCoachCopy({
    body: args.body || "",
    paragraphs: args.paragraphs || [],
  });
  if (!copy.body) {
    return {
      ok: false,
      message: "A showme lesson needs one explanation of the line the student will watch.",
    };
  }

  return {
    ok: true,
    title,
    body: copy.body,
    paragraphs: copy.paragraphs,
    moves,
    fen: args.fen && args.fen.trim() ? args.fen.trim() : undefined,
  };
}
