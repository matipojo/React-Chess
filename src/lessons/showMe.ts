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

export type ShowMePlayback = "idle" | "playing" | "paused";

export type ShowMeControls = {
  primary: "play" | "pause" | null;
  stop: boolean;
  replay: boolean;
};

/** Primary coach button: pause while the line is running, otherwise play. */
export function showmePrimaryAction(
  playback: ShowMePlayback,
): "play" | "pause" {
  return playback === "playing" ? "pause" : "play";
}

export function showmeStopEnabled(playback: ShowMePlayback): boolean {
  return playback !== "idle";
}

/** Which playback buttons the coach should offer. */
export function showmeControls(
  playback: ShowMePlayback,
  ply: number,
  total: number,
): ShowMeControls {
  if (playback === "playing") {
    return { primary: "pause", stop: true, replay: true };
  }
  if (playback === "paused") {
    return { primary: "play", stop: true, replay: true };
  }
  if (total > 0 && ply >= total) {
    return { primary: null, stop: false, replay: true };
  }
  return { primary: "play", stop: false, replay: true };
}

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
        "A showme lesson needs moves (from:to) that auto-play on the board.",
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
