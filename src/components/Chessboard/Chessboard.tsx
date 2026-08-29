import React, { useRef, useState } from "react";
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

export type ChessboardHandle = {
  animateMove: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => void;
};

interface Props {
  playMove: (piece: Piece, position: Position) => boolean;
  pieces: Piece[];
  highlights?: BoardHighlight[];
  arrows?: BoardArrow[];
  interaction?: "play" | "quiz";
  locked?: boolean;
  onSquareClick?: (square: string) => void;
}

const Chessboard = React.forwardRef<ChessboardHandle, Props>(function Chessboard({
  playMove,
  pieces,
  highlights,
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

      const halfTile = tileSize(chessboard) / 2;
      const x = e.clientX - halfTile;
      const y1 = e.clientY - halfTile;
      element.style.position = "absolute";
      element.style.left = `${x}px`;
      element.style.top = `${y1}px`;

      setActivePiece(element);
    }
  }

  function movePiece(e: React.MouseEvent) {
    const chessboard = chessboardRef.current;
    if (activePiece && chessboard) {
      const rect = chessboard.getBoundingClientRect();
      const halfTile = rect.width / 16;
      const minX = rect.left - halfTile + 25;
      const minY = rect.top - halfTile + 25;
      const maxX = rect.right - halfTile - 25;
      const maxY = rect.bottom - halfTile - 25;
      const x = e.clientX - halfTile;
      const y = e.clientY - halfTile;
      activePiece.style.position = "absolute";

      if (x < minX) {
        activePiece.style.left = `${minX}px`;
      } else if (x > maxX) {
        activePiece.style.left = `${maxX}px`;
      } else {
        activePiece.style.left = `${x}px`;
      }

      if (y < minY) {
        activePiece.style.top = `${minY}px`;
      } else if (y > maxY) {
        activePiece.style.top = `${maxY}px`;
      } else {
        activePiece.style.top = `${y}px`;
      }
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
          activePiece.style.position = "relative";
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
      const mark = highlightMap[coordinatesToNotation(i, j)];

      board.push(
        <Tile
          key={`${j},${i}`}
          image={image}
          number={number}
          highlight={highlight}
          highlightKind={mark}
        />
      );
    }
  }

  const arrowElements = (arrows || []).map((arrow, index) => {
    try {
      const from = chessNotationToCoordinates(arrow.from.toLowerCase());
      const to = chessNotationToCoordinates(arrow.to.toLowerCase());
      const x1 = from.x * GRID_SIZE + GRID_SIZE / 2;
      const y1 = (7 - from.y) * GRID_SIZE + GRID_SIZE / 2;
      const x2 = to.x * GRID_SIZE + GRID_SIZE / 2;
      const y2 = (7 - to.y) * GRID_SIZE + GRID_SIZE / 2;
      return (
        <line
          key={`${arrow.from}-${arrow.to}-${index}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={arrow.color || "#ffc107"}
          strokeWidth={6}
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
              <svg className="board-arrows" viewBox="0 0 600 600">
                <defs>
                  <marker
                    id="lesson-arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="6"
                    refY="3"
                    orient="auto"
                  >
                    <polygon points="0 0, 8 3, 0 6" fill="#ffc107" />
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
