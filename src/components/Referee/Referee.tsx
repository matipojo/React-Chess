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
import LessonCoach from "../LessonCoach/LessonCoach";
import { Howl } from "howler";
import { useModelContextTools } from "../../hooks/useModelContextTools";
import { useChessLessons } from "../../hooks/useChessLessons";
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
  const [board, setBoard] = useState<Board>(initialBoard.clone());
  const [promotionPawn, setPromotionPawn] = useState<Piece>();
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
    const success = playMoveSync(playedPiece.position, destination);
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
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const piece = params.get("piece");
    const game = params.get("game");
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

  const loaded = lessons.loadedLine.current;
  const canStep = !lessons.animating && !lessons.quiz;
  const showStepNav =
    lessons.historyLength > 1 || (!!loaded && loaded.moves.length > 0);
  const canBack = canStep && lessons.historyIndex > 0;
  const canNext =
    canStep &&
    (lessons.historyIndex < lessons.historyLength - 1 ||
      (!!loaded && loaded.ply < loaded.moves.length));

  return (
    <div className={`referee ${lessons.learnMode ? "referee-learn" : ""}`}>
      <div className="referee-board">
        <p className="referee-status">
          {lessons.learnMode ? "Learn mode" : `Total turns: ${board.totalTurns}`}
        </p>
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
          arrows={lessons.arrows}
          interaction={lessons.quiz ? "quiz" : "play"}
          locked={lessons.animating}
          onSquareClick={lessons.onSquareClick}
        />
      </div>
      {lessons.learnMode && (
        <LessonCoach
          coach={lessons.coach}
          quizQuestion={lessons.quiz ? lessons.quiz.question : undefined}
          quizHint={lessons.quiz ? lessons.quiz.hint : undefined}
          quizFeedback={lessons.quizFeedback}
          onBack={showStepNav ? lessons.stepBack : undefined}
          onNext={showStepNav ? lessons.stepNext : undefined}
          canBack={canBack}
          canNext={canNext}
        />
      )}
    </div>
  );
}
