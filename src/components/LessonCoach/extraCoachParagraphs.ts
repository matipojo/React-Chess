import { CoachState } from "../../lessons/types";
import { normalizeCoachCopy } from "../../lessons/coachParagraphs";

export function extraCoachParagraphs(coach: CoachState): string[] {
  if (coach.what || coach.why) {
    return (coach.paragraphs || []).map((part) => part.trim()).filter((part) => {
      return part && part !== coach.what && part !== coach.why;
    });
  }
  return normalizeCoachCopy({
    body: coach.body,
    paragraphs: coach.paragraphs,
  }).paragraphs;
}
