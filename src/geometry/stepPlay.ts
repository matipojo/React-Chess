import { cloneFigure } from "./figure";
import { applyGan, commandSatisfied, isPlayableGan } from "./gan";
import { extractPlayableGan } from "./text-links";
import { parseTfn, serializeTfn } from "./tfn";
import { Figure } from "./types";

export type GanPlayStatus = "ready" | "done" | "blocked";

export type CoachPlayGan = {
  notation: string;
  status: GanPlayStatus;
};

export function resolveStepGan(what?: string, listed?: string[]): string[] {
  if (listed && listed.length) {
    return listed.filter(Boolean);
  }
  return extractPlayableGan(what || "");
}

export function coachPlayGan(args: {
  figure: Figure;
  commands: string[];
}): CoachPlayGan[] {
  const unique: string[] = [];
  args.commands.forEach((item) => {
    const key = item.trim();
    if (key && unique.indexOf(key) < 0 && isPlayableGan(key)) {
      unique.push(key);
    }
  });
  let previousDone = true;
  return unique.map((notation) => {
    const done = commandSatisfied(args.figure, notation);
    if (done) {
      return { notation, status: "done" as GanPlayStatus };
    }
    if (previousDone) {
      previousDone = false;
      return { notation, status: "ready" as GanPlayStatus };
    }
    previousDone = false;
    return { notation, status: "blocked" as GanPlayStatus };
  });
}

export function matchPlayGan(
  playMoves: CoachPlayGan[] | undefined,
  command: string
): CoachPlayGan | undefined {
  if (!playMoves || !playMoves.length) {
    return undefined;
  }
  const compact = command.replace(/\s/g, "");
  return playMoves.find((item) => item.notation.replace(/\s/g, "") === compact);
}

export function applyGanList(figure: Figure, commands: string[]): Figure {
  let current = cloneFigure(figure);
  commands.forEach((cmd) => {
    const result = applyGan(current, cmd);
    if (!result.error) {
      current = result.figure;
    }
  });
  return current;
}

export function tfnAfterCommands(tfn: string, commands: string[]): string {
  return serializeTfn(applyGanList(parseTfn(tfn), commands));
}
