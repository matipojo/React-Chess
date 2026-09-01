import { boardToFen, startingLearnBoard } from "../utils/board-setup";
import {
  contentLesson,
  contentQuiz,
  fenAfterTeaching,
  lastTeachingSlideIndex,
  projectLessonSession,
} from "./lessonDocument";
import { SavedLesson } from "./types";

function italian(): SavedLesson {
  const start = boardToFen(startingLearnBoard());
  return {
    id: "custom:lesson-1",
    kind: "custom",
    title: "Italian Opening",
    body: "A healthy start.",
    savedAt: 1,
    number: 1,
    recap: { paragraphs: ["Occupy the center."] },
    steps: [
      {
        title: "Center",
        body: "",
        what: "Play e2:e4.",
        why: "Take space.",
        fen: start,
        quiz: {
          question: "Click e4",
          type: "click-square",
          correct: ["e4"],
          answered: true,
          timedOut: true,
        },
        highlights: [
          { square: "e4", kind: "key" },
          { square: "e5", kind: "wrong" },
        ],
      },
      {
        title: "Knight",
        body: "",
        what: "Play g1:f3.",
        why: "Attack e5.",
        fen: start,
      },
    ],
    activeStep: 2,
    ply: 9,
  };
}

describe("lesson document vs session", () => {
  it("strips playhead and live quiz results from catalog content", () => {
    const content = contentLesson(italian());
    expect("activeStep" in content).toBe(false);
    expect(content.ply).toBeUndefined();
    expect(content.quiz).toBeUndefined();
    expect(content.highlights).toBeUndefined();
    expect(contentQuiz(italian().steps![0].quiz)).toEqual({
      question: "Click e4",
      type: "click-square",
      correct: ["e4"],
      hint: undefined,
    });
    expect(content.steps?.[0].highlights).toEqual([
      { square: "e4", kind: "key" },
      { square: "e5", kind: "wrong" },
    ]);
  });

  it("projects a learner session that starts at the goal and keeps piece progress", () => {
    const start = boardToFen(startingLearnBoard());
    const slides = projectLessonSession(italian(), start);
    expect(slides.map((slide) => slide.coach?.phase)).toEqual([
      "goal",
      "step",
      "step",
      "recap",
    ]);
    expect(slides[0].fen.split(" ")[0]).toBe(start.split(" ")[0]);
    expect(slides[1].fen.split(" ")[0]).toBe(start.split(" ")[0]);
    expect(slides[2].fen).not.toBe(slides[1].fen);
    expect(slides[2].fen.includes("4P")).toBe(true);
    expect(slides[1].quiz?.answered).toBeUndefined();
    expect(lastTeachingSlideIndex(slides)).toBe(2);
    expect(fenAfterTeaching(italian(), start)).toBe(slides[slides.length - 1].fen);
  });

  it("uses the starting fen for the next step when the lesson has only a goal", () => {
    const start = boardToFen(startingLearnBoard());
    const lesson: SavedLesson = {
      id: "custom:lesson-2",
      kind: "custom",
      title: "Only a goal",
      body: "We will learn the Italian.",
      savedAt: 1,
      number: 2,
      steps: [],
    };
    expect(fenAfterTeaching(lesson, start).split(" ")[0]).toBe(start.split(" ")[0]);
  });

  it("keeps riddle steps as riddles when projecting a session", () => {
    const start = boardToFen(startingLearnBoard());
    const lesson: SavedLesson = {
      id: "custom:lesson-3",
      kind: "custom",
      title: "Knight forks",
      body: "Find hanging royals.",
      savedAt: 1,
      number: 3,
      steps: [
        {
          title: "Find the fork",
          body: "",
          kind: "riddle",
          quiz: {
            question: "Click the fork square.",
            type: "click-square",
            correct: ["c7"],
          },
          fen: start,
        },
      ],
    };
    const content = contentLesson(lesson);
    expect(content.steps?.[0].kind).toBe("riddle");
    const slides = projectLessonSession(lesson, start);
    expect(slides.map((slide) => slide.coach?.phase)).toEqual(["goal", "riddle"]);
    expect(slides[1].quiz?.question).toBe("Click the fork square.");
    expect(slides[1].coach?.what).toBeUndefined();
    expect(lastTeachingSlideIndex(slides)).toBe(1);
  });
});
