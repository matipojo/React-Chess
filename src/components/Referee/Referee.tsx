import { useCallback, useEffect, useRef, useState } from "react";
import { initialBoard } from "../../Constants";
import { Piece, Position } from "../../models";
import { Board } from "../../models/Board";
import {
  bishopMove,
  kingMove,
  knightMove,
  pawnMove,
  queenMove,
  rookMove,
} from "../../referee/rules";
import { PieceType, TeamType } from "../../Types";
import Chessboard, { ChessboardHandle } from "../Chessboard/Chessboard";
import BoardUndoBar from "../BoardUndoBar/BoardUndoBar";
import LessonCoach from "../LessonCoach/LessonCoach";
import LessonCatalogMenu from "../LessonCatalogMenu/LessonCatalogMenu";
import { Howl } from "howler";
import { useModelContextTools, LearningArea } from "../../hooks/useModelContextTools";
import { useChessLessons } from "../../hooks/useChessLessons";
import { useTriangleLessons } from "../../hooks/useTriangleLessons";
import GeometryCanvas from "../GeometryCanvas/GeometryCanvas";
import { TRIANGLE_EXAMPLE_PROMPTS } from "../../geometry/notation";
import LessonDebugConsole from "../LessonDebugConsole/LessonDebugConsole";
import { logLessonDebug } from "../../lessons/debugLog";
import { shouldShowLessonNav } from "../../lessons/lessonCopy";
import { coordinatesToNotation } from "../../utils/chess-notation-utils";
import { ChessRefPart, peekSquaresFromRef } from "../../utils/chess-text-links";
import { useBoardTheme } from "../../hooks/useBoardTheme";
import "./Referee.css";

const moveSound = new Howl({
  src: [`${process.env.PUBLIC_URL}/sounds/move-self.mp3`],
});

const captureSound = new Howl({
  src: [`${process.env.PUBLIC_URL}/sounds/capture.mp3`],
});

const checkmateSound = new Howl({
  src: [`${process.env.PUBLIC_URL}/sounds/move-check.mp3`],
});

export default function Referee() {
  const { setCustomBackground } = useBoardTheme();
  const [board, setBoard] = useState<Board>(initialBoard.clone());
  const [promotionPawn, setPromotionPawn] = useState<Piece>();
  const [peekSquares, setPeekSquares] = useState<string[]>([]);
  const [area, setArea] = useState<LearningArea>(() => {
    if (typeof window === "undefined") {
      return "chess";
    }
    return new URLSearchParams(window.location.search).get("area") === "triangles"
      ? "triangles"
      : "chess";
  });
  const areaRef = useRef(area);
  areaRef.current = area;
  const modalRef = useRef<HTMLDivElement>(null);
  const checkmateModalRef = useRef<HTMLDivElement>(null);
  const chessboardHandleRef = useRef<ChessboardHandle>(null);
  const boardRef = useRef<Board>(board);
  boardRef.current = board;

  const hideCheckmate = useCallback(() => {
    checkmateModalRef.current?.classList.add("hidden");
  }, []);

  const playMoveSync = useCallback((from: Position, to: Position): boolean => {
    const clonedBoard = boardRef.current.clone();
    const success = clonedBoard.tryPlayMove(from, to, {
      ignoreTurn: clonedBoard.learnMode,
    });
    if (!success) {
      return false;
    }

    boardRef.current = clonedBoard;
    setBoard(clonedBoard);
    moveSound.play();

    if (clonedBoard.winningTeam !== undefined && !clonedBoard.learnMode) {
      checkmateModalRef.current?.classList.remove("hidden");
      checkmateSound.play();
    }

    const moved = clonedBoard.pieces.find((piece) => piece.samePosition(to));
    if (moved && moved.isPawn) {
      const promotionRow = moved.team === TeamType.OUR ? 7 : 0;
      if (to.y === promotionRow) {
        modalRef.current?.classList.remove("hidden");
        setPromotionPawn(moved.clone());
      }
    }

    return true;
  }, []);

  function isValidMove(
    initialPosition: Position,
    desiredPosition: Position,
    type: PieceType,
    team: TeamType
  ) {
    let validMove = false;
    switch (type) {
      case PieceType.PAWN:
        validMove = pawnMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.KNIGHT:
        validMove = knightMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.BISHOP:
        validMove = bishopMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.ROOK:
        validMove = rookMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.QUEEN:
        validMove = queenMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
        break;
      case PieceType.KING:
        validMove = kingMove(
          initialPosition,
          desiredPosition,
          team,
          board.pieces
        );
    }

    return validMove;
  }

  const promotePawnAction = useCallback((pieceType: PieceType) => {
    if (promotionPawn === undefined) {
      return;
    }

    setBoard(() => {
      const clonedBoard = boardRef.current.clone();
      clonedBoard.pieces = clonedBoard.pieces.reduce((results, piece) => {
        if (piece.samePiecePosition(promotionPawn)) {
          results.push(
            new Piece(piece.position.clone(), pieceType, piece.team, true)
          );
        } else {
          results.push(piece);
        }
        return results;
      }, [] as Piece[]);

      clonedBoard.calculateAllMoves();
      boardRef.current = clonedBoard;
      return clonedBoard;
    });

    modalRef.current?.classList.add("hidden");
  }, [promotionPawn]);

  function promotionTeamType() {
    return promotionPawn?.team === TeamType.OUR ? "w" : "b";
  }

  const restartGameAction = useCallback(() => {
    checkmateModalRef.current?.classList.add("hidden");
    const next = initialBoard.clone();
    next.learnMode = boardRef.current.learnMode;
    next.calculateAllMoves();
    boardRef.current = next;
    setBoard(next);
  }, []);

  const animateMove = useCallback((from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => {
    logLessonDebug("visual", "animate-move", {
      from: coordinatesToNotation(from.x, from.y),
      to: coordinatesToNotation(to.x, to.y),
      team,
    });
    chessboardHandleRef.current?.animateMove(from, to, team, onComplete);
  }, []);

  const lessons = useChessLessons({
    boardRef,
    setBoard,
    playMoveSync,
    animateMove,
    hideCheckmate,
  });
  const triangles = useTriangleLessons();

  const setLearningArea = useCallback((next: LearningArea) => {
    setArea(next);
    if (typeof window === "undefined") {
      return;
    }
    const url = new URL(window.location.href);
    if (next === "triangles") {
      url.searchParams.set("area", "triangles");
    } else {
      url.searchParams.delete("area");
    }
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, []);

  function playMove(playedPiece: Piece, destination: Position): boolean {
    const from = coordinatesToNotation(playedPiece.position.x, playedPiece.position.y);
    const to = coordinatesToNotation(destination.x, destination.y);
    const success = playMoveSync(playedPiece.position, destination);
    logLessonDebug("user-move", "drop", {
      piece: playedPiece.type,
      team: playedPiece.team,
      from,
      to,
      success,
      learnMode: lessons.learnMode,
    });
    if (success && lessons.learnMode) {
      lessons.recordLearnMove();
    }
    return success;
  }

  function restartGame() {
    restartGameAction();
    lessons.clearAnnotations();
  }

  useModelContextTools({
    getBoard: () => boardRef.current,
    playMove,
    restartGame,
    promotePawn: promotePawnAction,
    animateMove,
    lessons,
    setPageBackground: (cssUrl: string | null) => ({
      persisted: setCustomBackground(cssUrl),
    }),
    getArea: () => areaRef.current,
    setArea: setLearningArea,
    triangles: {
      getFigure: triangles.getFigure,
      applyGan: triangles.applyGan,
      setFigure: triangles.setFigure,
      movePoint: triangles.movePoint,
      rotateFigure: triangles.rotateFigure,
      markFigure: triangles.markFigure,
      measure: triangles.measure,
      summary: triangles.summary,
      createLesson: triangles.createLesson,
      addLessonStep: triangles.addLessonStep,
      addLessonSteps: triangles.addLessonSteps,
      applyLessonRecap: triangles.applyLessonRecap,
      setCoach: triangles.setCoach,
      askQuiz: triangles.askQuiz,
      listLessons: triangles.listLessons,
      clearLesson: triangles.clearLesson,
    },
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piece = params.get("piece");
    const game = params.get("game");
    lessons.enterLearnMode();
    const areaParam = params.get("area");
    if (areaParam === "triangles") {
      setLearningArea("triangles");
    }
    if (piece) {
      try {
        lessons.demonstratePiece(piece);
      } catch {
        // ignore invalid demo links
      }
    } else if (game) {
      lessons.loadGame(game);
    }
    // Run once so a shared lesson link can open without WebMCP.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const peekArrows =
    peekSquares.length >= 2
      ? peekSquares.slice(0, -1).map((from) => ({
          from,
          to: peekSquares[peekSquares.length - 1],
          color: "#81d4fa",
        }))
      : [];

  const resolvePeekSquares = useCallback(
    (ref: ChessRefPart) => {
      return peekSquaresFromRef(
        ref,
        board.pieces.map((piece) => ({
          type: piece.type,
          square: coordinatesToNotation(piece.position.x, piece.position.y),
          destinations: (piece.possibleMoves || []).map((move) =>
            coordinatesToNotation(move.x, move.y)
          ),
        }))
      );
    },
    [board]
  );

  const isTriangles = area === "triangles";
  const loaded = lessons.loadedLine.current;
  const lessonOpen = isTriangles
    ? Boolean(triangles.coach || triangles.quiz)
    : Boolean(lessons.coach || lessons.quiz || lessons.wait);
  const waitingOnUser = Boolean(lessons.wait && !lessons.wait.timedOut);
  const generatingNext = isTriangles
    ? Boolean(triangles.awaitingContinuation)
    : Boolean(lessons.awaitingContinuation && !waitingOnUser);
  const quizPending = isTriangles
    ? Boolean(triangles.quiz && !triangles.quiz.answered)
    : Boolean(lessons.quiz && !lessons.quiz.answered);
  const canStep = isTriangles
    ? !triangles.animating && !quizPending
    : !lessons.animating && !quizPending;
  const showStepNav = shouldShowLessonNav({
    expectsRecap: isTriangles ? triangles.expectsRecap : lessons.expectsRecap,
    generatingNext,
    hasLineMoves: Boolean(!isTriangles && loaded && loaded.moves.length > 0),
  });
  const historyIndex = isTriangles ? triangles.historyIndex : lessons.historyIndex;
  const historyLength = isTriangles ? triangles.historyLength : lessons.historyLength;
  const canBack = canStep && !waitingOnUser && historyIndex > 0;
  const canFirst = canBack;
  const canNext =
    canStep &&
    !generatingNext &&
    (historyIndex < historyLength - 1 ||
      (!isTriangles && !!loaded && loaded.ply < loaded.moves.length) ||
      waitingOnUser);
  const canLast =
    canStep &&
    !waitingOnUser &&
    !generatingNext &&
    (historyIndex < historyLength - 1 ||
      (!isTriangles && !!loaded && loaded.ply < loaded.moves.length));

  return (
    <>
      <header className="app-header">
        <div className="app-header-nav">
          <h1 className="app-header-title">Generative Learning</h1>
          <div className="area-switch" role="tablist" aria-label="Learning area">
            <button
              type="button"
              role="tab"
              aria-selected={!isTriangles}
              className={!isTriangles ? "area-switch-tab is-active" : "area-switch-tab"}
              onClick={() => setLearningArea("chess")}
            >
              Chess
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isTriangles}
              className={isTriangles ? "area-switch-tab is-active" : "area-switch-tab"}
              onClick={() => setLearningArea("triangles")}
            >
              Triangles
            </button>
          </div>
          <a className="app-header-link" href="#/about">
            About
          </a>
        </div>
        <div className="app-header-actions">
          <LessonCatalogMenu
            lessons={isTriangles ? triangles.userLessons : lessons.userLessons}
            onOpen={(id) => {
              if (isTriangles) {
                triangles.openSavedLesson(id);
              } else {
                lessons.openSavedLesson(id);
              }
            }}
            onRemove={isTriangles ? triangles.deleteSavedLesson : lessons.deleteSavedLesson}
          />
          <LessonDebugConsole />
        </div>
      </header>
      <div id="app">
        <div className="referee referee-learn">
          <div className="referee-board">
            <div className="modal hidden" ref={modalRef}>
              <div className="modal-body">
                <img
                  onClick={() => promotePawnAction(PieceType.ROOK)}
                  src={`${process.env.PUBLIC_URL}/assets/images/rook_${promotionTeamType()}.png`}
                />
                <img
                  onClick={() => promotePawnAction(PieceType.BISHOP)}
                  src={`${process.env.PUBLIC_URL}/assets/images/bishop_${promotionTeamType()}.png`}
                />
                <img
                  onClick={() => promotePawnAction(PieceType.KNIGHT)}
                  src={`${process.env.PUBLIC_URL}/assets/images/knight_${promotionTeamType()}.png`}
                />
                <img
                  onClick={() => promotePawnAction(PieceType.QUEEN)}
                  src={`${process.env.PUBLIC_URL}/assets/images/queen_${promotionTeamType()}.png`}
                />
              </div>
            </div>
            <div className="modal hidden" ref={checkmateModalRef}>
              <div className="modal-body">
                <div className="checkmate-body">
                  <span>
                    The winning team is{" "}
                    {board.winningTeam === TeamType.OUR ? "white" : "black"}!
                  </span>
                  <button onClick={restartGame}>Play again</button>
                </div>
              </div>
            </div>
            {isTriangles ? (
              <GeometryCanvas
                figure={triangles.figure}
                peekIds={peekSquares}
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
            ) : (
              <Chessboard
                ref={chessboardHandleRef}
                playMove={playMove}
                pieces={board.pieces}
                highlights={lessons.highlights}
                peekSquares={peekSquares}
                arrows={[...lessons.arrows, ...peekArrows]}
                interaction={lessons.quiz && !lessons.quiz.answered ? "quiz" : "play"}
                locked={lessons.animating}
                onSquareClick={lessons.onSquareClick}
              />
            )}
            {!isTriangles && (
              <BoardUndoBar
                canUndo={lessons.canUndoLearnMove}
                canRedo={lessons.canRedoLearnMove}
                onUndo={lessons.undoLearnMove}
                onRedo={lessons.redoLearnMove}
              />
            )}
          </div>
          <LessonCoach
              coach={isTriangles ? triangles.coach : lessons.coach}
              quizQuestion={
                isTriangles
                  ? triangles.quiz
                    ? triangles.quiz.question
                    : undefined
                  : lessons.quiz
                    ? lessons.quiz.question
                    : undefined
              }
              quizFeedback={isTriangles ? triangles.quizFeedback : lessons.quizFeedback}
              quizSecondsLeft={isTriangles ? triangles.quizSecondsLeft : lessons.quizSecondsLeft}
              waitPrompt={!isTriangles && lessons.wait ? lessons.wait.prompt : undefined}
              waitChoices={!isTriangles && lessons.wait ? lessons.wait.choices : undefined}
              waitTimedOut={Boolean(!isTriangles && lessons.wait?.timedOut)}
              onWaitChoice={lessons.onWaitChoice}
              onHoverSquares={setPeekSquares}
              resolvePeekSquares={resolvePeekSquares}
              onBack={showStepNav ? (isTriangles ? triangles.stepBack : lessons.stepBack) : undefined}
              onNext={showStepNav ? (isTriangles ? triangles.stepNext : lessons.stepNext) : undefined}
              onFirst={showStepNav ? (isTriangles ? triangles.stepFirst : lessons.stepFirst) : undefined}
              onLast={showStepNav ? (isTriangles ? triangles.stepLast : lessons.stepLast) : undefined}
              onReset={showStepNav ? (isTriangles ? triangles.stepFirst : lessons.stepFirst) : undefined}
              onFinish={lessonOpen ? (isTriangles ? triangles.endLesson : lessons.endLesson) : undefined}
              canBack={canBack}
              canNext={canNext}
              canFirst={canFirst}
              canLast={canLast}
              canReset={canFirst}
              nextGenerating={generatingNext}
              playMoves={isTriangles ? triangles.coachPlayMoves : lessons.coachPlayMoves}
              onPlayMove={(notation) => {
                if (isTriangles) {
                  void triangles.playCoachMove(notation);
                } else {
                  void lessons.playCoachMove(notation);
                }
              }}
              playBusy={isTriangles ? triangles.animating : lessons.animating}
              historyIndex={historyIndex}
              historyLength={historyLength}
              linkMode={isTriangles ? "triangles" : "chess"}
              knownIds={isTriangles ? triangles.knownIds : undefined}
              examplePrompts={isTriangles ? TRIANGLE_EXAMPLE_PROMPTS : undefined}
              whatLabel={isTriangles ? "Do" : "Move"}
            />
        </div>
      </div>
    </>
  );
}
