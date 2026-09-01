import { CoachPlayMove } from "../../lessons/stepPlay";

export function uncoveredMoveText(
  what: string | undefined,
  playMoves?: CoachPlayMove[]
): string {
  if (!playMoves || playMoves.length === 0) {
    return "";
  }
  const lower = (what || "").toLowerCase();
  const missing = playMoves.filter((move) => {
    const dest = move.notation.split(":")[1];
    return (
      lower.indexOf(move.notation.toLowerCase()) < 0 &&
      (!dest || lower.indexOf(dest.toLowerCase()) < 0)
    );
  });
  return missing.map((move) => move.notation).join(" ");
}
