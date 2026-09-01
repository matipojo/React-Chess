import { useState } from "react";
import { TRIANGLE_EXAMPLE_PROMPTS } from "../../geometry/notation";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import { useTriangleLessons } from "../../hooks/useTriangleLessons";
import { useTriangleModelContextTools } from "../../hooks/useTriangleModelContextTools";
import { shouldShowLessonNav } from "../../lessons/lessonCopy";
import AppHeader from "../AppHeader/AppHeader";
import GeometryCanvas from "../GeometryCanvas/GeometryCanvas";
import LessonCoach from "../LessonCoach/LessonCoach";
import "../Referee/Referee.css";

export default function TriangleSurface() {
  const { setCustomBackground } = useBoardTheme();
  const [peekIds, setPeekIds] = useState<string[]>([]);
  const triangles = useTriangleLessons();

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
              figure={triangles.figure}
              peekIds={peekIds}
              locked={triangles.animating}
              quiz={Boolean(triangles.quiz && !triangles.quiz.answered)}
              animation={triangles.animation}
              onPointMove={(name, position) => {
                triangles.movePoint(name, position);
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
