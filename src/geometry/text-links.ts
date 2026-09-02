import { allObjectIds } from "./figure";
import { ganIdsForCommand, isPlayableGan, parseGanCommand } from "./gan";
import { Figure, GanRefPart, GanTextPart } from "./types";

const SKIP = /^(SAS|ASA|SSS|SSA|AAA|HL|AA|RHS)$/;

const GAN_REF = new RegExp(
  [
    "fit\\([^)]+\\)",
    "mark\\([^)]+\\)",
    "lab\\([^)]+\\)",
    "move\\([^)]+\\)",
    "rot\\([^)]+\\)",
    "circ\\([^)]+\\)",
    "inc\\([^)]+\\)",
    "mid\\([^)]+\\)",
    "par\\([^)]+\\)",
    "perp\\([^)]+\\)",
    "pb\\([^)]+\\)",
    "sq\\([^)]+\\)",
    "h\\([A-Z],[A-Z]{2}\\)",
    "m\\([A-Z],[A-Z]{2}\\)",
    "b\\(∠?[A-Z]{1,3}\\)",
    "triangle\\([A-Z]{3}\\)",
    "tri\\([A-Z]{3}\\)",
    "△[A-Z]{3}\\s*[≅~]\\s*△[A-Z]{3}",
    "△[A-Z]{3}",
    "∠[A-Z]{3}",
    "∠[A-Z]",
    "[A-Z]\\s*=\\s*mid\\([A-Z]{2}\\)",
    "[A-Z]\\([+-]?\\d+(?:\\.\\d+)?,\\s*[+-]?\\d+(?:\\.\\d+)?\\)",
    "[A-Z]{2}\\s*(?:∩|\\|\\||⊥)\\s*[A-Z]{2}",
    "[A-Z]{2}",
  ].join("|"),
  "g"
);

function isAsciiWordChar(ch: string | undefined): boolean {
  return !!ch && /[A-Za-z0-9]/.test(ch);
}

function unique(ids: string[]): string[] {
  const out: string[] = [];
  ids.forEach((id) => {
    if (id && out.indexOf(id) < 0) {
      out.push(id);
    }
  });
  return out;
}

export function parseGanRef(raw: string): { ids: string[]; playable: boolean; command: string } {
  const compact = raw.replace(/\s/g, "");
  const playable = isPlayableGan(compact) || isPlayableGan(raw.trim());
  const ids = ganIdsForCommand(compact);
  if (ids.length) {
    return { ids, playable, command: compact };
  }
  if (/^[A-Z]{2}$/.test(compact) && !SKIP.test(compact)) {
    return { ids: [compact, compact[0], compact[1]], playable: false, command: compact };
  }
  if (/^[A-Z]$/.test(compact)) {
    return { ids: [compact], playable: false, command: compact };
  }
  return { ids: [compact], playable, command: compact };
}

export function tokenizeGanText(text: string, knownIds: string[] = []): GanTextPart[] {
  if (!text) {
    return [];
  }
  const parts: GanTextPart[] = [];
  const pattern = new RegExp(GAN_REF.source, "g");
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index;
    const value = match[0];
    const end = start + value.length;
    const before = text[start - 1];
    const after = text[end];
    if (isAsciiWordChar(before) || isAsciiWordChar(after)) {
      continue;
    }
    if (/^[A-Z]{2}$/.test(value) && SKIP.test(value)) {
      continue;
    }
    if (/^[A-Z]$/.test(value) && knownIds.indexOf(value) < 0) {
      continue;
    }
    if (start > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, start) });
    }
    const parsed = parseGanRef(value);
    parts.push({
      type: "ref",
      value,
      ids: parsed.ids,
      playable: parsed.playable,
      command: parsed.command,
    });
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }
  return parts;
}

export function extractPlayableGan(text: string): string[] {
  const found: string[] = [];
  tokenizeGanText(text).forEach((part) => {
    if (part.type !== "ref" || !part.playable) {
      return;
    }
    if (found.indexOf(part.command) < 0) {
      found.push(part.command);
    }
  });
  return found;
}

export function peekIdsFromRef(ref: GanRefPart, figure?: Figure): string[] {
  if (!figure) {
    return ref.ids;
  }
  const known = allObjectIds(figure);
  return unique(
    ref.ids.filter((id) => {
      return known.some((item) => item.replace(/\s/g, "") === id.replace(/\s/g, ""));
    }).length
      ? ref.ids.filter((id) => known.indexOf(id) >= 0 || known.indexOf(id.replace("△", "")) >= 0)
      : ref.ids
  );
}

export { parseGanCommand };
