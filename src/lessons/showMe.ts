import { getFamousGame } from "./catalog";
import { normalizeCoachCopy } from "./coachParagraphs";

export type ShowMeArgs = {
  title?: string;
  paragraphs?: string[];
  body?: string;
  moves?: string[];
  fen?: string;
  game?: string;
};

export type ShowMeResolved =
  | { ok: false; message: string }
  | {
      ok: true;
      title: string;
      body: string;
      paragraphs: string[];
      moves: string[];
      fen?: string;
      gameId?: string;
    };

/** One explanation + a live line. Famous-game ids fill title, hook, and moves. */
export function resolveShowMeRequest(args: ShowMeArgs): ShowMeResolved {
  const game = args.game ? getFamousGame(args.game) : undefined;
  if (args.game && !game) {
    return {
      ok: false,
      message: `Unknown game "${args.game}". Use list-lessons.`,
    };
  }

  const listed = (args.moves || []).map((item) => item.trim()).filter(Boolean);
  const moves = listed.length ? listed : game ? [...game.moves] : [];
  if (!moves.length) {
    return {
      ok: false,
      message:
        "Provide moves as from:to, or a famous game id, so the pieces can play live.",
    };
  }

  const extra = (args.paragraphs || []).map((item) => item.trim()).filter(Boolean);
  const copy = normalizeCoachCopy({
    body: args.body || "",
    paragraphs: extra.length ? extra : game ? [game.hook] : [],
  });
  if (!copy.body) {
    return {
      ok: false,
      message:
        "Provide one explanation of what the student is watching, or a famous game id.",
    };
  }

  const title = (args.title || (game ? game.name : "")).trim();
  if (!title) {
    return {
      ok: false,
      message: "Provide a title for what is being shown.",
    };
  }

  return {
    ok: true,
    title,
    body: copy.body,
    paragraphs: copy.paragraphs,
    moves,
    fen: args.fen && args.fen.trim() ? args.fen.trim() : undefined,
    gameId: game ? game.id : undefined,
  };
}
