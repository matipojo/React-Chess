import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./Chessboard.css";
import Tile from "../Tile/Tile";
import {
  VERTICAL_AXIS,
  HORIZONTAL_AXIS,
} from "../../Constants";
import { Piece, Position } from "../../models";
import SimpleHandAnimation, { SimpleHandAnimationRef } from "./HandAnimation/SimpleHandAnimation";
import { BoardArrow, BoardHighlight } from "../../lessons/types";
import { chessNotationToCoordinates, coordinatesToNotation } from "../../utils/chess-notation-utils";
import { logLessonDebug } from "../../lessons/debugLog";
import { compactPaintDetail, paintFingerprint } from "../../lessons/debugSnapshot";

export type ChessboardHandle = {
  animateMove: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => void;
};

interface Props {
  playMove: (piece: Piece, position: Position) => boolean;
  pieces: Piece[];
  highlights?: BoardHighlight[];
  peekSquares?: string[];
  arrows?: BoardArrow[];
  interaction?: "play" | "quiz";
  locked?: boolean;
  onSquareClick?: (square: string) => void;
}

const Chessboard = React.forwardRef<ChessboardHandle, Props>(function Chessboard({
  playMove,
  pieces,
  highlights,
  peekSquares,
  arrows,
  interaction,
  locked,
  onSquareClick,
}, ref) {
  const [isDragging, setIsDragging] = useState(false);
  const [grabPosition, setGrabPosition] = useState<Position>(new Position(-1, -1));
  const chessboardRef = useRef<HTMLDivElement>(null);
  const dragPreviewRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const grabPositionRef = useRef(grabPosition);
  const piecesRef = useRef(pieces);
  grabPositionRef.current = grabPosition;
  piecesRef.current = pieces;
  const simpleHandAnimationRef = useRef<SimpleHandAnimationRef>(null);
  const pendingAnimationCallbackRef = useRef<(() => void) | null>(null);
  const lastPaintFingerprintRef = useRef("");

  useLayoutEffect(() => {
    const boardEl = chessboardRef.current;
    if (!boardEl || !arrows || arrows.length === 0) {
      lastPaintFingerprintRef.current = "";
      return;
    }
    const fingerprint = paintFingerprint(arrows);
    if (!fingerprint || fingerprint === lastPaintFingerprintRef.current) {
      return;
    }
    lastPaintFingerprintRef.current = fingerprint;
    const wrap = boardEl.parentElement;
    const svg = wrap?.querySelector("svg.board-arrows") as SVGSVGElement | null;
    const boardRect = boardEl.getBoundingClientRect();
    const svgRect = svg ? svg.getBoundingClientRect() : null;
    logLessonDebug("visual", "arrows-painted", compactPaintDetail({
      arrows,
      tileSizePx: boardRect.width / 8,
      boardOffsetVsSvg: svgRect
        ? {
            dx: boardRect.left - svgRect.left,
            dy: boardRect.top - svgRect.top,
            dw: boardRect.width - svgRect.width,
            dh: boardRect.height - svgRect.height,
          }
        : null,
    }));
  }, [arrows]);

  const handleAnimationComplete = () => {
    const callback = pendingAnimationCallbackRef.current;
    pendingAnimationCallbackRef.current = null;
    callback?.();
  };

  React.useImperativeHandle(ref, () => ({
    animateMove: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => {
      if (simpleHandAnimationRef.current) {
        pendingAnimationCallbackRef.current = onComplete ?? null;
        setTimeout(() => {
          simpleHandAnimationRef.current?.playMove(from, to, team);
        }, 100);
      } else {
        onComplete?.();
      }
    },
  }));

  function tileSize(chessboard: HTMLDivElement) {
    return chessboard.getBoundingClientRect().width / 8;
  }

  function setDraggedPiecePosition(
    clientX: number,
    clientY: number,
    chessboard: HTMLDivElement
  ) {
    const preview = dragPreviewRef.current;
    if (!preview) {
      return;
    }
    const origin = (chessboard.parentElement ?? chessboard).getBoundingClientRect();
    const halfTile = tileSize(chessboard) / 2;
    preview.style.left = `${clientX - origin.left - halfTile}px`;
    preview.style.top = `${clientY - origin.top - halfTile}px`;
  }

  useLayoutEffect(() => {
    const chessboard = chessboardRef.current;
    if (isDragging && chessboard) {
      setDraggedPiecePosition(pointerRef.current.x, pointerRef.current.y, chessboard);
    }
  }, [isDragging]);

  function squareFromPointer(clientX: number, clientY: number, chessboard: HTMLDivElement): Position | null {
    const rect = chessboard.getBoundingClientRect();
    const size = rect.width / 8;
    if (size <= 0) {
      return null;
    }
    const x = Math.floor((clientX - rect.left) / size);
    const y = 7 - Math.floor((clientY - rect.top) / size);
    if (x < 0 || x > 7 || y < 0 || y > 7) {
      return null;
    }
    return new Position(x, y);
  }

  function squareFromEvent(e: React.MouseEvent): Position | null {
    const chessboard = chessboardRef.current;
    if (!chessboard) {
      return null;
    }
    return squareFromPointer(e.clientX, e.clientY, chessboard);
  }

  function grabPiece(e: React.MouseEvent) {
    if (locked || interaction === "quiz") {
      return;
    }
    const element = e.target as HTMLElement;
    const chessboard = chessboardRef.current;
    if (element.classList.contains("chess-piece") && chessboard) {
      const square = squareFromPointer(e.clientX, e.clientY, chessboard);
      if (!square) {
        return;
      }
      e.preventDefault();
      pointerRef.current = { x: e.clientX, y: e.clientY };
      grabPositionRef.current = square;
      isDraggingRef.current = true;
      setGrabPosition(square);
      setIsDragging(true);
    }
  }

  function moveDraggedPiece(clientX: number, clientY: number) {
    const chessboard = chessboardRef.current;
    if (!isDraggingRef.current || !chessboard) {
      return;
    }
    pointerRef.current = { x: clientX, y: clientY };
    setDraggedPiecePosition(clientX, clientY, chessboard);
  }

  function dropPiece(clientX: number, clientY: number) {
    const chessboard = chessboardRef.current;
    if (!isDraggingRef.current || !chessboard) {
      return;
    }
    isDraggingRef.current = false;
    setIsDragging(false);
    const dropped = squareFromPointer(clientX, clientY, chessboard);
    const x = dropped ? dropped.x : -1;
    const y = dropped ? dropped.y : -1;
    const currentPiece = piecesRef.current.find((p) =>
      p.samePosition(grabPositionRef.current)
    );
    if (currentPiece) {
      playMove(currentPiece.clone(), new Position(x, y));
    }
  }

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const onMove = (e: MouseEvent) => moveDraggedPiece(e.clientX, e.clientY);
    const onUp = (e: MouseEvent) => dropPiece(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging]);

  function handleClick(e: React.MouseEvent) {
    if (interaction !== "quiz") {
      return;
    }
    const square = squareFromEvent(e);
    if (!square || !onSquareClick) {
      return;
    }
    onSquareClick(coordinatesToNotation(square.x, square.y));
  }

  let board = [];
  const highlightMap: { [square: string]: string } = {};
  if (highlights) {
    for (let h = 0; h < highlights.length; h++) {
      highlightMap[highlights[h].square.toLowerCase()] = highlights[h].kind;
    }
  }
  const peekSet: { [square: string]: boolean } = {};
  if (peekSquares) {
    for (let p = 0; p < peekSquares.length; p++) {
      peekSet[peekSquares[p].toLowerCase()] = true;
    }
  }

  const draggedPiece = isDragging ? pieces.find((p) => p.samePosition(grabPosition)) : undefined;

  for (let j = VERTICAL_AXIS.length - 1; j >= 0; j--) {
    for (let i = 0; i < HORIZONTAL_AXIS.length; i++) {
      const number = j + i + 2;
      const piece = pieces.find((p) =>
        p.samePosition(new Position(i, j))
      );
      const isDragSource = isDragging && grabPosition.samePosition(new Position(i, j));
      let image = piece && !isDragSource ? piece.image : undefined;

      let highlight = draggedPiece?.possibleMoves ?
      draggedPiece.possibleMoves.some(p => p.samePosition(new Position(i, j))) : false;
      const squareName = coordinatesToNotation(i, j);
      const mark = highlightMap[squareName];

      board.push(
        <Tile
          key={`${j},${i}`}
          image={image}
          pieceColor={piece ? (piece.team === "w" ? "white" : "black") : undefined}
          number={number}
          highlight={highlight}
          highlightKind={mark}
          peek={!!peekSet[squareName]}
        />
      );
    }
  }

  const arrowElements = (arrows || []).map((arrow, index) => {
    try {
      const from = chessNotationToCoordinates(arrow.from.toLowerCase());
      const to = chessNotationToCoordinates(arrow.to.toLowerCase());
      const x1 = from.x + 0.5;
      const y1 = 7.5 - from.y;
      const x2 = to.x + 0.5;
      const y2 = 7.5 - to.y;
      return (
        <line
          key={`${arrow.from}-${arrow.to}-${index}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={arrow.color || "#ffc107"}
          strokeWidth={0.08}
          markerEnd="url(#lesson-arrowhead)"
          opacity={0.9}
        />
      );
    } catch {
      return null;
    }
  });

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          <div className="chessboard-axis-rank">
            {VERTICAL_AXIS.slice().reverse().map((rank) => (
              <span key={rank}>
                {rank}
              </span>
            ))}
          </div>
          <div className="chessboard-wrap">
            <div
              onMouseDown={(e) => grabPiece(e)}
              onClick={handleClick}
              id="chessboard"
              ref={chessboardRef}
            >
              {board}
            </div>
            {arrowElements.length > 0 && (
              <svg className="board-arrows" viewBox="0 0 8 8">
                <defs>
                  <marker
                    id="lesson-arrowhead"
                    markerWidth="5"
                    markerHeight="5"
                    refX="4"
                    refY="2.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 5 2.5, 0 5" fill="#29b6f6" />
                  </marker>
                </defs>
                {arrowElements}
              </svg>
            )}
            {draggedPiece && (
              <div
                ref={dragPreviewRef}
                className={[
                  "chess-piece",
                  "chess-piece-drag-preview",
                  draggedPiece.team === "w" ? "chess-piece-white" : "chess-piece-black",
                ].join(" ")}
                style={{ backgroundImage: `url(${draggedPiece.image})` }}
              />
            )}
          </div>
        </div>
        <div className="chessboard-axis-file">
          {HORIZONTAL_AXIS.map((file) => (
            <span key={file}>
              {file}
            </span>
          ))}
        </div>
      </div>
      <SimpleHandAnimation
        ref={simpleHandAnimationRef}
        chessboardRef={chessboardRef}
        onAnimationComplete={handleAnimationComplete}
      />
    </>
  );
});

export default Chessboard;
