import { useEffect, useRef, useState } from "react";
import { TRIANGLE_EXAMPLE_PROMPTS } from "../../geometry/notation";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { useTriangleLessons } from "../../hooks/useTriangleLessons";
import { useTriangleModelContextTools } from "../../hooks/useTriangleModelContextTools";
import { shouldShowLessonNav } from "../../lessons/lessonCopy";
import { ALTITUDE_DEMO, parseTriangleDemo } from "../../lessons/triangleDemo";
import { whenDemoShouldStart } from "../../utils/demoStart";
import AppHeader from "../AppHeader/AppHeader";
import GeometryCanvas, { GeometryCanvasHandle } from "../GeometryCanvas/GeometryCanvas";
import LessonCoach from "../LessonCoach/LessonCoach";
import "../Referee/Referee.css";

export default function TriangleSurface() {
  const { setCustomBackground } = useBoardTheme();
  const [peekIds, setPeekIds] = useState<string[]>([]);
  const canvasRef = useRef<GeometryCanvasHandle>(null);
  const triangles = useTriangleLessons({
    playPointer: (animation, onComplete) => {
      try {
        if (canvasRef.current) {
          canvasRef.current.playAnimation(animation, onComplete);
          return;
        }
      } catch {
        // Fall through so the GAN still commits.
      }
      onComplete();
    },
    cancelPointer: () => canvasRef.current?.cancelAnimation(),
  });
  const trianglesRef = useRef(triangles);
  trianglesRef.current = triangles;

  useTriangleModelContextTools({
    getFigure: triangles.getFigure,
    applyGan: triangles.applyGan,
    setFigure: triangles.setFigure,
    movePoint: triangles.movePoint,
    rotateFigure: triangles.rotateFigure,
    markFigure: triangles.markFigure,
    measure: triangles.measure,
    summary: triangles.summary,
    lessons: {
      createLesson: triangles.createLesson,
      addLessonStep: triangles.addLessonStep,
      applyLessonRecap: triangles.applyLessonRecap,
      setCoach: triangles.setCoach,
      askQuiz: triangles.askQuiz,
      listLessons: triangles.listLessons,
      clearLesson: triangles.clearLesson,
    },
    setPageBackground: (cssUrl: string | null) => ({
      persisted: setCustomBackground(cssUrl),
    }),
  });

  useEffect(() => {
    const demo = parseTriangleDemo(window.location.search);
    if (!demo) {
      return;
    }
    if (demo === "altitude") {
      trianglesRef.current.setFigure({ template: ALTITUDE_DEMO.template });
      trianglesRef.current.createLesson({
        title: ALTITUDE_DEMO.title,
        paragraphs: ALTITUDE_DEMO.paragraphs,
      });
      void trianglesRef.current.addLessonStep({
        title: ALTITUDE_DEMO.stepTitle,
        why: ALTITUDE_DEMO.why,
        what: ALTITUDE_DEMO.gan,
        moves: [ALTITUDE_DEMO.gan],
      });
    }
    let waitCanvas = 0;
    const play = () => {
      if (!canvasRef.current) {
        waitCanvas = window.setTimeout(play, 50);
        return;
      }
      if (demo === "pointer") {
        void trianglesRef.current.movePoint("C", { x: 1.55, y: -0.2 });
        return;
      }
      void trianglesRef.current.applyGan(ALTITUDE_DEMO.gan);
    };
    const stopWait = whenDemoShouldStart(play, { topLevelDelayMs: 500 });
    return () => {
      stopWait();
      if (waitCanvas) {
        window.clearTimeout(waitCanvas);
      }
    };
    // Open a shared demo link the same way chess uses ?piece= / ?showme=.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lessonOpen = Boolean(triangles.coach || triangles.quiz);
  const quizPending = Boolean(triangles.quiz && !triangles.quiz.answered);
  const generatingNext = Boolean(triangles.awaitingContinuation);
  const canStep = !triangles.animating && !quizPending;
  const stepCount = Math.max(
    triangles.historyLength,
    triangles.coach?.totalSteps || 0,
    triangles.teachingCount || 0
  );
  const showStepNav = shouldShowLessonNav({
    expectsRecap: triangles.expectsRecap,
    generatingNext,
    hasLineMoves: false,
    isShowme: false,
    stepCount,
  });
  const canBack = canStep && triangles.canStepBack;
  const canFirst = canBack;
  const canNext = canStep && !generatingNext && triangles.canStepForward;
  const canLast = canNext;

  return (
    <>
      <AppHeader
        area="triangles"
        lessons={triangles.userLessons}
        onOpenLesson={triangles.openSavedLesson}
        onRemoveLesson={triangles.deleteSavedLesson}
      />
      <div id="app">
        <div className="referee referee-learn">
          <div className="referee-board">
            <GeometryCanvas
              ref={canvasRef}
              figure={triangles.figure}
              peekIds={peekIds}
              locked={triangles.animating}
              quiz={Boolean(triangles.quiz && !triangles.quiz.answered)}
              animation={triangles.animation}
              onPointMove={(name, position) => {
                void triangles.movePoint(name, position, { animate: false });
              }}
              onObjectClick={
                triangles.quiz && !triangles.quiz.answered
                  ? triangles.onObjectClick
                  : undefined
              }
            />
          </div>
          <LessonCoach
            coach={triangles.coach}
            quizQuestion={triangles.quiz ? triangles.quiz.question : undefined}
            quizFeedback={triangles.quizFeedback}
            quizSecondsLeft={triangles.quizSecondsLeft}
            onHoverSquares={setPeekIds}
            onBack={showStepNav ? triangles.stepBack : undefined}
            onNext={showStepNav ? triangles.stepNext : undefined}
            onFirst={showStepNav ? triangles.stepFirst : undefined}
            onLast={showStepNav ? triangles.stepLast : undefined}
            onReset={showStepNav ? triangles.stepFirst : undefined}
            onFinish={lessonOpen ? triangles.endLesson : undefined}
            canBack={canBack}
            canNext={canNext}
            canFirst={canFirst}
            canLast={canLast}
            canReset={canFirst}
            nextGenerating={generatingNext}
            playMoves={triangles.coachPlayMoves}
            onPlayMove={(notation) => {
              void triangles.playCoachMove(notation);
            }}
            playBusy={triangles.animating}
            historyIndex={triangles.historyIndex}
            historyLength={triangles.historyLength}
            linkMode="triangles"
            knownIds={triangles.knownIds}
            examplePrompts={TRIANGLE_EXAMPLE_PROMPTS}
            whatLabel="Do"
          />
        </div>
      </div>
    </>
  );
}
