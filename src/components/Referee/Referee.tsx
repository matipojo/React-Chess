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
import { useModelContextTools } from "../../hooks/useModelContextTools";
import { useChessLessons } from "../../hooks/useChessLessons";
import LessonDebugConsole from "../LessonDebugConsole/LessonDebugConsole";
import { logLessonDebug } from "../../lessons/debugLog";
import { shouldShowLessonNav } from "../../lessons/lessonCopy";
import { getFamousGame } from "../../lessons/catalog";
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
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piece = params.get("piece");
    const game = params.get("game");
    const showme = params.get("showme");
    lessons.enterLearnMode();
    if (piece) {
      try {
        lessons.demonstratePiece(piece);
      } catch {
        // ignore invalid demo links
      }
    } else if (showme) {
      const famous = getFamousGame(showme);
      if (famous) {
        lessons.createLesson({
          type: "showme",
          title: famous.name,
          paragraphs: [famous.hook],
          moves: famous.moves,
        });
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

  const loaded = lessons.loadedLine.current;
  const lessonOpen = Boolean(lessons.coach || lessons.quiz || lessons.wait);
  const waitingOnUser = Boolean(lessons.wait && !lessons.wait.timedOut);
  const generatingNext = Boolean(lessons.awaitingContinuation && !waitingOnUser);
  const quizPending = Boolean(lessons.quiz && !lessons.quiz.answered);
  const canStep = !lessons.animating && !quizPending;
  const showStepNav = shouldShowLessonNav({
    expectsRecap: lessons.expectsRecap,
    generatingNext,
    hasLineMoves: Boolean(loaded && loaded.moves.length > 0),
    isShowme: lessons.coach?.phase === "showme",
  });
  const canBack = canStep && !waitingOnUser && lessons.historyIndex > 0;
  const canFirst = canBack;
  const canNext =
    canStep &&
    !generatingNext &&
    (lessons.historyIndex < lessons.historyLength - 1 ||
      (!!loaded && loaded.ply < loaded.moves.length) ||
      waitingOnUser);
  const canLast =
    canStep &&
    !waitingOnUser &&
    !generatingNext &&
    (lessons.historyIndex < lessons.historyLength - 1 ||
      (!!loaded && loaded.ply < loaded.moves.length));

  return (
    <>
      <header className="app-header">
        <h1 className="app-header-title">Generative Learning</h1>
        <div className="app-header-actions">
          <LessonCatalogMenu
            lessons={lessons.userLessons}
            onOpen={(id) => {
              lessons.openSavedLesson(id);
            }}
            onRemove={lessons.deleteSavedLesson}
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
            <BoardUndoBar
              canUndo={lessons.canUndoLearnMove}
              canRedo={lessons.canRedoLearnMove}
              onUndo={lessons.undoLearnMove}
              onRedo={lessons.redoLearnMove}
            />
          </div>
          <LessonCoach
              coach={lessons.coach}
              quizQuestion={lessons.quiz ? lessons.quiz.question : undefined}
              quizFeedback={lessons.quizFeedback}
              quizSecondsLeft={lessons.quizSecondsLeft}
              waitPrompt={lessons.wait ? lessons.wait.prompt : undefined}
              waitChoices={lessons.wait ? lessons.wait.choices : undefined}
              waitTimedOut={Boolean(lessons.wait?.timedOut)}
              onWaitChoice={lessons.onWaitChoice}
              onHoverSquares={setPeekSquares}
              resolvePeekSquares={resolvePeekSquares}
              onBack={showStepNav ? lessons.stepBack : undefined}
              onNext={showStepNav ? lessons.stepNext : undefined}
              onFirst={showStepNav ? lessons.stepFirst : undefined}
              onLast={showStepNav ? lessons.stepLast : undefined}
              onReset={showStepNav ? lessons.stepFirst : undefined}
              onFinish={lessonOpen ? lessons.endLesson : undefined}
              canBack={canBack}
              canNext={canNext}
              canFirst={canFirst}
              canLast={canLast}
              canReset={canFirst}
              nextGenerating={generatingNext}
              playMoves={lessons.coachPlayMoves}
              onPlayMove={(notation) => {
                void lessons.playCoachMove(notation);
              }}
              onPlayLine={
                lessons.coach?.phase === "showme"
                  ? () => {
                      void lessons.playShowMeLine();
                    }
                  : undefined
              }
              playBusy={lessons.animating}
              historyIndex={lessons.historyIndex}
              historyLength={lessons.historyLength}
            />
        </div>
      </div>
    </>
  );
}
