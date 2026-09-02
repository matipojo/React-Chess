import { useEffect, useRef } from "react";
import { Figure } from "../geometry/types";
import { COACH_GAN_RULE, TRIANGLE_WAIT_TURN_RULE } from "../geometry/notation";
import { missingQuizTargets } from "../geometry/hitTest";
import { CoachState, QuizResult, QuizState } from "../lessons/types";
import { parseLessonStepType, parseSummaryDraft } from "../lessons/lessonCopy";
import { normalizeCoachCopy } from "../lessons/coachParagraphs";
import {
  buildGiveMeAHintPrompt,
  buildHowToAskTheUserPrompt,
  CHAT_BUTTON_TEXT,
  HINT_BUTTON_LABEL,
  readBoardChatAccent,
} from "../lessons/howToAskTheUser";
import { parseBackgroundToolArgs, preparePageBackground } from "../utils/pageBackground";
import { registerModelContextTools, ToolResponse } from "./registerModelContextTools";

export const TRIANGLE_TOOL_NAMES = [
  "get-figure-state",
  "apply-gan",
  "set-figure",
  "move-point",
  "rotate-figure",
  "mark-figure",
  "measure-figure",
  "list-lessons",
  "create-lesson",
  "add-lesson-step",
  "set-lesson-recap",
  "set-coach",
  "clear-lesson",
  "ask-quiz",
  "set-page-background",
  "how_to_offer_a_hint",
  "how_to_ask_the_user",
] as const;

type TriangleLessonActions = {
  createLesson: (args: { title: string; paragraphs?: string[] }) => {
    success: boolean;
    message: string;
    lesson: number;
    title: string;
    screen: "goal";
  };
  addLessonStep: (args: {
    lesson?: number;
    title: string;
    why?: string;
    what?: string;
    type?: string;
    paragraphs?: string[];
    moves?: string[];
    question?: string;
    correct?: string[];
    hint?: string;
    quizType?: QuizState["type"];
    signal?: AbortSignal;
  }) => Promise<{
    success: boolean;
    message: string;
    lesson: number;
    step: number;
    totalSteps: number;
    screen: "step" | "riddle";
    nextTools: string[];
    recapWritten: boolean;
    recapExpected: boolean;
    quiz?: { correct: boolean; square: string; timedOut?: boolean };
  }>;
  applyLessonRecap: (args: { lesson?: number; title?: string; paragraphs: string[] }) => {
    success: boolean;
    message: string;
    lesson: number;
  };
  setCoach: (coach: CoachState) => { lesson: number; step: number; totalSteps: number };
  askQuiz: (quiz: QuizState, options?: { signal?: AbortSignal }) => Promise<QuizResult>;
  listLessons: () => unknown;
  clearLesson: () => void;
};

type TriangleActions = {
  getFigure: () => Figure;
  applyGan: (gan: string) => Promise<{ success: boolean; message: string }>;
  setFigure: (args: { tfn?: string; template?: string }) => {
    success: boolean;
    message: string;
    data?: unknown;
  };
  movePoint: (
    name: string,
    position: { x: number; y: number },
    options?: { animate?: boolean }
  ) => Promise<{ success: boolean; message: string }> | { success: boolean; message: string };
  rotateFigure: (around: string, deg: number, target?: string) => Promise<{ success: boolean; message: string }>;
  markFigure: (gan: string) => Promise<{ success: boolean; message: string }>;
  measure: (id: string) => unknown;
  summary: () => unknown;
  lessons: TriangleLessonActions;
  setPageBackground: (cssUrl: string | null) => { persisted: boolean };
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item) => typeof item === "string") as string[];
}

function asPositiveInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value);
    if (parsed > 0) {
      return parsed;
    }
  }
  return undefined;
}

function quizClickToolResponse(
  result: QuizResult,
  extra?: Record<string, unknown>
): ToolResponse {
  const data = extra ? { ...extra, ...result } : result;
  if (result.timedOut) {
    return {
      success: false,
      message:
        "Time ran out. The coach panel and figure already teach the correct object(s). Explain why that answer is right, then call how_to_ask_the_user.",
      data,
    };
  }
  if (!result.correct) {
    return {
      success: false,
      message: result.square
        ? `Clicked ${result.square}. The coach panel and figure already teach the correct object(s). Explain why that answer is right, then call how_to_ask_the_user.`
        : "Quiz cancelled.",
      data,
    };
  }
  return {
    success: true,
    message: `Correct: ${result.square}. The coach already showed Correct! Do not mark the answer on the figure.`,
    data,
  };
}

export function useTriangleModelContextTools(actions: TriangleActions) {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  useEffect(() => {
    const tools = [
      {
        name: "get-figure-state",
        description:
          "Retrieves the current triangle figure: points, segments, triangles, circles, marks, and measures.",
        inputSchema: { type: "object", properties: {} },
        execute: async (): Promise<ToolResponse> => {
          const summary = actionsRef.current.summary();
          return { success: true, message: "Figure state retrieved", data: summary };
        },
      },
      {
        name: "apply-gan",
        description:
          "Execute one GAN construction on the triangle figure and animate it with the cursor. Examples: △ABC, h(C,AB), m(A,BC), g(△ABC), b(A), circ(ABC), inc(ABC), mark(90,C), fit(△ABC ≅ △DEF), rot(A,90,△ABC), move(C,1,2). Semicolons run a sequence. " +
          COACH_GAN_RULE,
        inputSchema: {
          type: "object",
          properties: {
            gan: {
              type: "string",
              description: 'GAN command, e.g. "h(C,AB)" or "△ABC; mark(90,C)"',
            },
          },
          required: ["gan"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const gan = String(params.gan || "").trim();
          if (!gan) {
            return { success: false, message: "Provide a GAN string.", data: null };
          }
          const result = await actionsRef.current.applyGan(gan);
          return {
            success: result.success,
            message: result.message,
            data: actionsRef.current.summary(),
          };
        },
      },
      {
        name: "set-figure",
        description:
          "Load a triangle figure from a template (scalene, two-triangles, right-at-C, isosceles-AB=AC, 30-60-90, equilateral, ssa-ambiguous) or a TFN string. If a Goal is open with no steps yet, this figure is stored on the lesson and restored later.",
        inputSchema: {
          type: "object",
          properties: {
            template: { type: "string", description: "Named template, e.g. right-at-C" },
            tfn: {
              type: "string",
              description: "TFN snapshot from serialize, e.g. A(0,0) B(4,0) C(0,3) △ABC",
            },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const result = actionsRef.current.setFigure({
            template: typeof params.template === "string" ? params.template : undefined,
            tfn: typeof params.tfn === "string" ? params.tfn : undefined,
          });
          return { success: result.success, message: result.message, data: result.data || null };
        },
      },
      {
        name: "move-point",
        description:
          "Move a free point on the triangle figure and animate the cursor to the new location. Constrained points follow.",
        inputSchema: {
          type: "object",
          properties: {
            point: { type: "string", description: "Point name, e.g. C" },
            x: { type: "number" },
            y: { type: "number" },
          },
          required: ["point", "x", "y"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const point = String(params.point || "").trim();
          const result = await Promise.resolve(
            actionsRef.current.movePoint(point, {
              x: Number(params.x),
              y: Number(params.y),
            })
          );
          return {
            success: result.success,
            message: result.message,
            data: actionsRef.current.summary(),
          };
        },
      },
      {
        name: "rotate-figure",
        description:
          "Rotate named points or a triangle about a point by degrees (CCW positive) and animate it. Example: around A, deg 90, target △ABC.",
        inputSchema: {
          type: "object",
          properties: {
            around: { type: "string" },
            deg: { type: "number" },
            target: { type: "string", description: "△ABC or ABC or a point name" },
          },
          required: ["around", "deg"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const result = await actionsRef.current.rotateFigure(
            String(params.around || ""),
            Number(params.deg),
            typeof params.target === "string" ? params.target : undefined
          );
          return {
            success: result.success,
            message: result.message,
            data: actionsRef.current.summary(),
          };
        },
      },
      {
        name: "mark-figure",
        description:
          "Mark the figure with GAN: mark(90,C), mark(=,AB,AC), mark(∠,BAC,EDF), mark(||,MN,BC), lab(AB=5), highlight(H).",
        inputSchema: {
          type: "object",
          properties: {
            gan: { type: "string" },
          },
          required: ["gan"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const result = await actionsRef.current.markFigure(String(params.gan || ""));
          return {
            success: result.success,
            message: result.message,
            data: actionsRef.current.summary(),
          };
        },
      },
      {
        name: "measure-figure",
        description: "Read a measure without drawing: AB, ∠A, △ABC, R, AB:DE.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string", description: "GAN object to measure" },
          },
          required: ["id"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const measured = actionsRef.current.measure(String(params.id || ""));
          return {
            success: Boolean(measured),
            message: measured ? "Measured" : "Could not measure that object",
            data: measured,
          };
        },
      },
      {
        name: "list-lessons",
        description:
          "Lists saved triangle catalog lessons and figure templates. create-lesson then add-lesson-step. Riddle: add-lesson-step type riddle. " +
          COACH_GAN_RULE,
        inputSchema: { type: "object", properties: {} },
        execute: async (): Promise<ToolResponse> => ({
          success: true,
          message: "Available triangle lessons",
          data: actionsRef.current.lessons.listLessons(),
        }),
      },
      {
        name: "create-lesson",
        description:
          "Create a new triangle catalog lesson. Goal copy only. Stores the current figure (every triangle and mark) with the Goal so it is restored when the student reopens the lesson. If the Goal names triangles such as △ABC and △DEF, they are placed on the canvas. Next: add-lesson-step. GAN tokens stay Latin (△ABC, h(C,AB)). " +
          COACH_GAN_RULE,
        inputSchema: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: 'Lesson topic, e.g. "Altitude to the hypotenuse".',
            },
            paragraphs: {
              type: "array",
              items: { type: "string" },
              description: "Optional intro. Use GAN for any figure objects.",
            },
          },
          required: ["title"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const title = String(params.title || "").trim();
          if (!title) {
            return { success: false, message: "Provide a lesson title.", data: null };
          }
          const result = actionsRef.current.lessons.createLesson({
            title,
            paragraphs: asStringArray(params.paragraphs),
          });
          return {
            success: result.success,
            message: result.message,
            data: {
              lesson: result.lesson,
              title: result.title,
              screen: result.screen,
              nextTools: ["add-lesson-step"],
            },
          };
        },
      },
      {
        name: "add-lesson-step",
        description:
          "Add ONE catalog item: a teaching Step or a Riddle. Writes the saved lesson only. Do not change the live figure or jump the student to the last step while you are still generating. Fast teaching steps: why first, then the construction; student taps Play when they reach that slide. type riddle stores the puzzle. The student solves it when they open that slide (do not wait here, do not jump there). A one-step lesson or riddle has no recap and no Back/Next. State the task only, never how to solve. Before a riddle, call how_to_offer_a_hint. After two or more teaching steps, the student sees Generating... on Next until you add-lesson-step or set-lesson-recap. Same lesson number. Never create-lesson again for the same topic. " +
          COACH_GAN_RULE,
        inputSchema: {
          type: "object",
          properties: {
            lesson: { type: "number", description: "Catalog number from create-lesson." },
            type: {
              type: "string",
              enum: ["step", "riddle"],
              description: "step = teaching beat (title, why, what). riddle = puzzle: question + correct GAN objects.",
            },
            title: { type: "string", description: "Beat heading, not the lesson title." },
            why: { type: "string", description: "Teaching steps: situation and goal before the construction. Omit for riddles." },
            what: {
              type: "string",
              description: "Teaching steps: GAN construction such as h(C,AB). Omit for riddles.",
            },
            paragraphs: {
              type: "array",
              items: { type: "string" },
              description: "Optional extra detail for teaching steps. Do not spoil a riddle here.",
            },
            moves: {
              type: "array",
              items: { type: "string" },
              description: 'Optional GAN commands for Play buttons, e.g. ["h(C,AB)"].',
            },
            question: {
              type: "string",
              description: "Required for type riddle. Puzzle prompt. Task only, no spoiler. " + COACH_GAN_RULE,
            },
            correct: {
              type: "array",
              items: { type: "string" },
              description: 'Required for type riddle. Acceptable GAN objects such as ["H", "G", "∠C"]. G is the centroid of △ABC even if that intersection is unlabeled.',
            },
            hint: {
              type: "string",
              description:
                "Optional private nudge for type riddle, used only after they tap " +
                HINT_BUTTON_LABEL +
                " in chat. Never put this in question. Not shown on the triangle page. " +
                COACH_GAN_RULE,
            },
            quizType: {
              type: "string",
              enum: ["click-square", "click-piece", "choose-move"],
              description: "How the student answers a riddle. Default click-square (click a figure object).",
            },
          },
          required: ["lesson"],
        },
        execute: async (
          params: Record<string, unknown>,
          options?: { signal?: AbortSignal }
        ): Promise<ToolResponse> => {
          const type = parseLessonStepType(params.type);
          const correct = asStringArray(params.correct);
          const result = await actionsRef.current.lessons.addLessonStep({
            lesson: asPositiveInt(params.lesson),
            title: String(params.title || ""),
            why: typeof params.why === "string" ? params.why : "",
            what: typeof params.what === "string" ? params.what : "",
            type,
            paragraphs: asStringArray(params.paragraphs),
            moves: asStringArray(params.moves),
            question: typeof params.question === "string" ? params.question : undefined,
            correct,
            hint: typeof params.hint === "string" ? params.hint : undefined,
            quizType: (params.quizType as QuizState["type"]) || "click-square",
            signal: options?.signal,
          });
          if (result.quiz) {
            return quizClickToolResponse(result.quiz, {
              lesson: result.lesson,
              step: result.step,
              totalSteps: result.totalSteps,
              screen: result.screen,
              recapWritten: result.recapWritten,
              recapExpected: result.recapExpected,
              nextTools: result.nextTools,
            });
          }
          return {
            success: result.success,
            message: result.message,
            data: {
              lesson: result.lesson,
              step: result.step,
              totalSteps: result.totalSteps,
              screen: result.screen,
              recapWritten: result.recapWritten,
              recapExpected: result.recapExpected,
              nextTools: result.nextTools,
            },
          };
        },
      },
      {
        name: "set-lesson-recap",
        description:
          "Write or replace the Recap screen after the last teaching step. Skip this for one-step lessons or a riddle. Those have no recap. Then how_to_ask_the_user. " +
          COACH_GAN_RULE +
          " " +
          TRIANGLE_WAIT_TURN_RULE,
        inputSchema: {
          type: "object",
          properties: {
            lesson: { type: "number", description: "Catalog lesson number." },
            title: { type: "string", description: "Optional recap heading. Default Recap." },
            paragraphs: {
              type: "array",
              items: { type: "string" },
              description: "Takeaway after the beats so far.",
            },
            body: { type: "string", description: "Fallback if you cannot send paragraphs." },
          },
          required: ["lesson", "paragraphs"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const summary = parseSummaryDraft(
            Array.isArray(params.paragraphs)
              ? { title: params.title, paragraphs: params.paragraphs }
              : params.body || params
          );
          if (!summary) {
            return {
              success: false,
              message: "Provide recap paragraphs (or body) for set-lesson-recap.",
              data: null,
            };
          }
          const result = actionsRef.current.lessons.applyLessonRecap({
            lesson: asPositiveInt(params.lesson),
            title: summary.title || (typeof params.title === "string" ? params.title : undefined),
            paragraphs: summary.paragraphs,
          });
          return {
            success: result.success,
            message: result.message,
            data: { lesson: result.lesson, screen: "recap" },
          };
        },
      },
      {
        name: "set-coach",
        description:
          "Update the currently visible coach text only. Does not write the catalog. Prefer create-lesson, add-lesson-step, and set-lesson-recap. " +
          COACH_GAN_RULE,
        inputSchema: {
          type: "object",
          properties: {
            lesson: { type: "number", description: "Catalog lesson number." },
            title: { type: "string", description: "Beat heading, not the whole lesson topic." },
            what: { type: "string", description: "What happens now. Constructions must be GAN such as h(C,AB)." },
            why: { type: "string", description: "Why this belongs here." },
            paragraphs: {
              type: "array",
              items: { type: "string" },
              description: "Optional extra paragraphs after what/why. " + COACH_GAN_RULE,
            },
            body: { type: "string", description: "Fallback only if you cannot send paragraphs." },
            step: { type: "number", description: "1-based teaching step index. Omit to append." },
            totalSteps: { type: "number" },
          },
          required: ["title", "lesson"],
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const what = typeof params.what === "string" ? params.what.trim() : "";
          const why = typeof params.why === "string" ? params.why.trim() : "";
          const extra = asStringArray(params.paragraphs);
          const copy = normalizeCoachCopy({
            body: typeof params.body === "string" ? params.body : "",
            paragraphs: extra.length ? extra : what || why ? [] : asStringArray(params.paragraphs),
          });
          const result = actionsRef.current.lessons.setCoach({
            title: String(params.title || ""),
            body: copy.body,
            paragraphs: copy.paragraphs,
            what: what || undefined,
            why: why || undefined,
            lesson: asPositiveInt(params.lesson),
            step: asPositiveInt(params.step),
            totalSteps: asPositiveInt(params.totalSteps),
          });
          return {
            success: true,
            message: `Coach panel updated. Lesson ${result.lesson}, step ${result.step} of ${result.totalSteps}. Prefer add-lesson-step then set-lesson-recap.`,
            data: result,
          };
        },
      },
      {
        name: "clear-lesson",
        description: "Clear coach text, highlights, and any pending quiz.",
        inputSchema: { type: "object", properties: {} },
        execute: async (): Promise<ToolResponse> => {
          actionsRef.current.lessons.clearLesson();
          return { success: true, message: "Lesson overlay cleared", data: null };
        },
      },
      {
        name: "ask-quiz",
        description:
          "Prefer add-lesson-step with type riddle so the puzzle is stored on the catalog lesson. Use this tool only for a one-off quiz that is not a lesson step. Show a puzzle question in the coach panel and start a 30-second timer. Wait for a figure click. The question must state the task only. Before this tool, call how_to_offer_a_hint. " +
          COACH_GAN_RULE,
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "Puzzle prompt shown to the student. Task only, no spoiler. " + COACH_GAN_RULE,
            },
            type: {
              type: "string",
              enum: ["click-square", "click-piece", "choose-move"],
            },
            correct: {
              type: "array",
              items: { type: "string" },
              description: 'Acceptable GAN objects such as ["H", "G", "∠C"]',
            },
            hint: {
              type: "string",
              description:
                "Optional private nudge to use only after they tap " +
                HINT_BUTTON_LABEL +
                " in chat. Never put this in question. Not shown on the triangle page. " +
                COACH_GAN_RULE,
            },
          },
          required: ["question", "correct"],
        },
        execute: async (
          params: Record<string, unknown>,
          options?: { signal?: AbortSignal }
        ): Promise<ToolResponse> => {
          const correct = asStringArray(params.correct);
          if (!correct.length) {
            return { success: false, message: "Provide at least one correct GAN object", data: null };
          }
          const missing = missingQuizTargets(actionsRef.current.getFigure(), correct);
          if (missing.length) {
            return {
              success: false,
              message: `${missing.join(", ")} ${
                missing.length === 1 ? "is" : "are"
              } not on the figure. Construct and label ${
                missing.length === 1 ? "it" : "them"
              } first (centroid: g(△ABC)).`,
              data: null,
            };
          }
          const result = await actionsRef.current.lessons.askQuiz(
            {
              question: String(params.question || ""),
              type: (params.type as QuizState["type"]) || "click-square",
              correct,
              hint: typeof params.hint === "string" ? params.hint : undefined,
            },
            options
          );
          return quizClickToolResponse(result);
        },
      },
      {
        name: "set-page-background",
        description:
          "Saves a custom page background for the currently selected board theme only (Classic or Purple). WebMCP tool arguments are JSON only. Pass the picture as a data URL or raw base64 in `image`, or an http(s) `url`. Use clear: true to remove the image for the current theme only.",
        inputSchema: {
          type: "object",
          properties: {
            image: { type: "string" },
            mimeType: { type: "string" },
            url: { type: "string" },
            clear: { type: "boolean" },
          },
        },
        execute: async (params: Record<string, unknown>): Promise<ToolResponse> => {
          const theme =
            document.querySelector("[data-board-theme]")?.getAttribute("data-board-theme") || null;
          const args = parseBackgroundToolArgs(params);
          if (args.clear) {
            actionsRef.current.setPageBackground(null);
            return {
              success: true,
              message: theme
                ? `Custom page background cleared for the ${theme} theme.`
                : "Custom page background cleared for the current theme.",
              data: { cleared: true, theme },
            };
          }
          const prepared = await preparePageBackground(params);
          if (!prepared.ok) {
            return { success: false, message: prepared.message, data: null };
          }
          const { persisted } = actionsRef.current.setPageBackground(prepared.cssUrl);
          return {
            success: true,
            message: persisted
              ? `Page background saved for the ${theme || "current"} theme.`
              : `Page background applied for the ${theme || "current"} theme this session, but it was too large to save in the browser.`,
            data: { kind: prepared.kind, mimeType: prepared.mimeType || null, persisted, theme },
          };
        },
      },
      {
        name: "how_to_offer_a_hint",
        description:
          "Returns instructions for offering an opt-in Give me a hint visualization button in this chat. Takes no arguments. Call this instead of how_to_ask_the_user while the student is solving, before add-lesson-step type riddle (or ask-quiz for a one-off).",
        inputSchema: { type: "object", properties: {} },
        execute: async (): Promise<ToolResponse> => {
          const accent = readBoardChatAccent();
          const prompt = buildGiveMeAHintPrompt(accent, CHAT_BUTTON_TEXT, "triangle");
          return {
            success: true,
            message: prompt,
            data: { accent, text: CHAT_BUTTON_TEXT, label: HINT_BUTTON_LABEL },
          };
        },
      },
      {
        name: "how_to_ask_the_user",
        description:
          "Returns instructions for asking the student in this chat with clickable visualization buttons, not a numbered list and not on the triangle page. Takes no arguments. Call this whenever you need them to choose what happens next, then follow the returned prompt exactly and stop. " +
          TRIANGLE_WAIT_TURN_RULE,
        inputSchema: { type: "object", properties: {} },
        execute: async (): Promise<ToolResponse> => {
          const accent = readBoardChatAccent();
          const prompt = buildHowToAskTheUserPrompt(accent, CHAT_BUTTON_TEXT, "triangle");
          return {
            success: true,
            message: prompt,
            data: { accent, text: CHAT_BUTTON_TEXT },
          };
        },
      },
    ];

    return registerModelContextTools(tools, [
      "ask-quiz",
      "add-lesson-step",
      "apply-gan",
      "rotate-figure",
      "mark-figure",
    ]);
  }, []);
}
