import React, { useLayoutEffect, useRef, useState } from "react";
import "./Chessboard.css";
import Tile from "../Tile/Tile";
import {
  VERTICAL_AXIS,
  HORIZONTAL_AXIS,
  GRID_SIZE,
} from "../../Constants";
import { Piece, Position } from "../../models";
import SimpleHandAnimation, { SimpleHandAnimationRef } from "./HandAnimation/SimpleHandAnimation";
import { BoardArrow, BoardHighlight } from "../../lessons/types";
import { chessNotationToCoordinates, coordinatesToNotation } from "../../utils/chess-notation-utils";
import { logLessonDebug } from "../../lessons/debugLog";
import { arrowGeometry, rectSnapshot } from "../../lessons/debugSnapshot";

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
  const [activePiece, setActivePiece] = useState<HTMLElement | null>(null);
  const [grabPosition, setGrabPosition] = useState<Position>(new Position(-1, -1));
  const chessboardRef = useRef<HTMLDivElement>(null);
  const simpleHandAnimationRef = useRef<SimpleHandAnimationRef>(null);
  const pendingAnimationCallbackRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    const boardEl = chessboardRef.current;
    if (!boardEl || !arrows || arrows.length === 0) {
      return;
    }

    const logPaint = () => {
      const wrap = boardEl.parentElement;
      const svg = wrap?.querySelector("svg.board-arrows") as SVGSVGElement | null;
      const boardRect = boardEl.getBoundingClientRect();
      const svgRect = svg ? svg.getBoundingClientRect() : null;
      logLessonDebug("visual", "arrows-painted", {
        arrowCount: arrows.length,
        arrows: arrows.map((arrow) => arrowGeometry(arrow)),
        boardRect: rectSnapshot(boardEl),
        wrapRect: rectSnapshot(wrap),
        svgRect: rectSnapshot(svg),
        tileSizePx: boardRect.width / 8,
        cssTileSize: wrap ? getComputedStyle(wrap).getPropertyValue("--tile-size").trim() : "",
        gridSizeConstant: GRID_SIZE,
        viewBox: svg ? svg.getAttribute("viewBox") : "0 0 600 600",
        boardOffsetVsSvg: svgRect
          ? {
              dx: boardRect.left - svgRect.left,
              dy: boardRect.top - svgRect.top,
              dw: boardRect.width - svgRect.width,
              dh: boardRect.height - svgRect.height,
            }
          : null,
      });
    };

    logPaint();
  }, [arrows]);

  const handleAnimationComplete = () => {
    logLessonDebug("visual", "hand-animate-complete", {});
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

  function dragOriginRect(chessboard: HTMLDivElement) {
    const origin = chessboard.parentElement ?? chessboard;
    return origin.getBoundingClientRect();
  }

  function setDraggedPiecePosition(
    piece: HTMLElement,
    clientX: number,
    clientY: number,
    chessboard: HTMLDivElement
  ) {
    const origin = dragOriginRect(chessboard);
    const boardRect = chessboard.getBoundingClientRect();
    const halfTile = tileSize(chessboard) / 2;
    const minX = boardRect.left - origin.left - halfTile + 25;
    const minY = boardRect.top - origin.top - halfTile + 25;
    const maxX = boardRect.right - origin.left - halfTile - 25;
    const maxY = boardRect.bottom - origin.top - halfTile - 25;
    const x = Math.min(Math.max(clientX - origin.left - halfTile, minX), maxX);
    const y = Math.min(Math.max(clientY - origin.top - halfTile, minY), maxY);
    piece.style.position = "absolute";
    piece.style.zIndex = "10";
    piece.style.left = `${x}px`;
    piece.style.top = `${y}px`;
  }

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
      setGrabPosition(square);
      setDraggedPiecePosition(element, e.clientX, e.clientY, chessboard);
      setActivePiece(element);
    }
  }

  function movePiece(e: React.MouseEvent) {
    const chessboard = chessboardRef.current;
    if (activePiece && chessboard) {
      setDraggedPiecePosition(activePiece, e.clientX, e.clientY, chessboard);
    }
  }

  function dropPiece(e: React.MouseEvent) {
    const chessboard = chessboardRef.current;
    if (activePiece && chessboard) {
      const dropped = squareFromPointer(e.clientX, e.clientY, chessboard);
      const x = dropped ? dropped.x : -1;
      const y = dropped ? dropped.y : -1;

      const currentPiece = pieces.find((p) =>
        p.samePosition(grabPosition)
      );

      if (currentPiece) {
        var succes = playMove(currentPiece.clone(), new Position(x, y));

        if(!succes) {
          activePiece.style.removeProperty("position");
          activePiece.style.removeProperty("z-index");
          activePiece.style.removeProperty("top");
          activePiece.style.removeProperty("left");
        }
      }
      setActivePiece(null);
    }
  }

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

  for (let j = VERTICAL_AXIS.length - 1; j >= 0; j--) {
    for (let i = 0; i < HORIZONTAL_AXIS.length; i++) {
      const number = j + i + 2;
      const piece = pieces.find((p) =>
        p.samePosition(new Position(i, j))
      );
      let image = piece ? piece.image : undefined;

      let currentPiece = activePiece != null ? pieces.find(p => p.samePosition(grabPosition)) : undefined;
      let highlight = currentPiece?.possibleMoves ?
      currentPiece.possibleMoves.some(p => p.samePosition(new Position(i, j))) : false;
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
              onMouseMove={(e) => movePiece(e)}
              onMouseDown={(e) => grabPiece(e)}
              onMouseUp={(e) => dropPiece(e)}
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
