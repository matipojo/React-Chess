import React, { useRef, useState } from "react";
import "./Chessboard.css";
import Tile from "../Tile/Tile";
import {
  VERTICAL_AXIS,
  HORIZONTAL_AXIS,
} from "../../Constants";
import { Piece, Position } from "../../models";
import SimpleHandAnimation, { SimpleHandAnimationRef } from "./HandAnimation/SimpleHandAnimation";

export type ChessboardHandle = {
  animateMove: (from: Position, to: Position, team: 'w' | 'b', onComplete?: () => void) => void;
};

interface Props {
  playMove: (piece: Piece, position: Position) => boolean;
  pieces: Piece[];
}

const Chessboard = React.forwardRef<ChessboardHandle, Props>(function Chessboard({playMove, pieces}, ref) {
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

  function grabPiece(e: React.MouseEvent) {
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

      //If x is smaller than minimum amount
      if (x < minX) {
        activePiece.style.left = `${minX}px`;
      }
      //If x is bigger than maximum amount
      else if (x > maxX) {
        activePiece.style.left = `${maxX}px`;
      }
      //If x is in the constraints
      else {
        activePiece.style.left = `${x}px`;
      }

      //If y is smaller than minimum amount
      if (y < minY) {
        activePiece.style.top = `${minY}px`;
      }
      //If y is bigger than maximum amount
      else if (y > maxY) {
        activePiece.style.top = `${maxY}px`;
      }
      //If y is in the constraints
      else {
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
          //RESETS THE PIECE POSITION
          activePiece.style.position = "relative";
          activePiece.style.removeProperty("top");
          activePiece.style.removeProperty("left");
        }
      }
      setActivePiece(null);
    }
  }

  let board = [];

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

      board.push(<Tile key={`${j},${i}`} image={image} number={number} highlight={highlight} />);
    }
  }

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
              id="chessboard"
              ref={chessboardRef}
            >
              {board}
            </div>
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
