import React, { useRef, useEffect, useState } from 'react';
import { Position } from '../../../models/Position';
import './SimpleHandAnimation.css';

const HAND_APPROACH_DURATION = 1000; // 1 second for hand to reach piece from corner
const PIECE_MOVE_DURATION = 1000; // 1 seconds for piece movement
const ANIMATION_DELAY = 100; // Small delay before starting animation
const SMOOTH_EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'; // Smooth easing for hand approach

interface SimpleHandAnimationProps {
  chessboardRef: React.RefObject<HTMLDivElement>;
  onAnimationComplete?: () => void;
}

export interface SimpleHandAnimationRef {
  playMove: (from: Position, to: Position, team: 'w' | 'b') => void;
  isAnimating: boolean;
}

const SimpleHandAnimation = React.forwardRef<SimpleHandAnimationRef, SimpleHandAnimationProps>(
  ({ chessboardRef, onAnimationComplete }, ref) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const handElementRef = useRef<HTMLDivElement | null>(null);
    const pieceCloneElementRef = useRef<HTMLDivElement | null>(null);

    const convertPositionToPixels = (position: Position) => {
      if (!chessboardRef.current) return { x: 0, y: 0 };
      
      const chessboardRect = chessboardRef.current.getBoundingClientRect();
      const tile = chessboardRect.width / 8;
      const baseX = position.x * tile + tile / 2;
      const baseY = (7 - position.y) * tile + tile / 2;
      
      return { 
        x: chessboardRect.left + baseX, 
        y: chessboardRect.top + baseY 
      };
    };

    const animateMove = (from: Position, to: Position, team: 'w' | 'b') => {
      if (!chessboardRef.current) return;

      const chessboard = chessboardRef.current;
      const tileIndex = (7 - from.y) * 8 + from.x;
      const tiles = chessboard.querySelectorAll('.tile');
      const sourceTile = tiles[tileIndex] as HTMLElement;
      const originalPiece = sourceTile?.querySelector('.chess-piece') as HTMLElement;

      if (!originalPiece) return;

      const restoreOriginalPiece = () => {
        originalPiece.style.visibility = 'visible';
      };

      try {
        const fromPixels = convertPositionToPixels(from);
        const toPixels = convertPositionToPixels(to);

        // Bottom left corner of the screen
        const startPosition = { x: 0, y: window.innerHeight };

        // Keep original piece visible during hand approach, hide it when hand reaches piece

        // Create piece clone (initially hidden, will be shown when hand reaches it)
        const pieceClone = originalPiece.cloneNode(true) as HTMLDivElement;
        
        pieceClone.style.position = 'fixed';
        pieceClone.style.left = `${fromPixels.x}px`;
        pieceClone.style.top = `${fromPixels.y}px`;
        pieceClone.style.transform = 'translate(-50%, -50%)';
        pieceClone.style.zIndex = '1000';
        pieceClone.style.pointerEvents = 'none';
        pieceClone.style.transition = `all ${PIECE_MOVE_DURATION}ms ease-in-out`;
        pieceClone.style.visibility = 'hidden'; // Hide initially, show when hand reaches piece
        
        pieceClone.style.width = '100px';
        pieceClone.style.height = '100px';
        pieceClone.style.backgroundRepeat = 'no-repeat';
        pieceClone.style.backgroundPosition = 'center';
        pieceClone.style.backgroundSize = '100px';
        
        const computedStyle = window.getComputedStyle(originalPiece);
        if (computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none') {
          pieceClone.style.backgroundImage = computedStyle.backgroundImage;
        }
        
        document.body.appendChild(pieceClone);
        pieceCloneElementRef.current = pieceClone;

        // Create hand starting from bottom left corner
        const hand = document.createElement('div') as HTMLDivElement;
        hand.className = 'simple-hand-animation';
        hand.style.position = 'fixed';
        hand.style.left = `${startPosition.x}px`;
        hand.style.top = `${startPosition.y}px`;
        hand.style.transform = 'translate(-50%, -50%)';
        hand.style.zIndex = '1001';
        hand.style.pointerEvents = 'none';
        hand.style.transition = `all ${HAND_APPROACH_DURATION}ms ${SMOOTH_EASING}`;
        hand.style.visibility = 'visible';
        
        document.body.appendChild(hand);
        handElementRef.current = hand;

        setIsAnimating(true);

        // Phase 1: Hand moves from bottom left corner to piece position
        setTimeout(() => {
          hand.style.left = `${fromPixels.x}px`;
          hand.style.top = `${fromPixels.y - 30}px`;

          // Phase 2: After hand reaches piece, both hand and piece move to destination
          setTimeout(() => {
            // Hide original piece and show clone when hand reaches piece
            originalPiece.style.visibility = 'hidden';
            pieceClone.style.visibility = 'visible';
            hand.style.transition = `all ${PIECE_MOVE_DURATION}ms ease-in-out`;
            hand.className = 'simple-hand-animation grabbing';
            
            // Move both hand and piece to destination
            pieceClone.style.left = `${toPixels.x}px`;
            pieceClone.style.top = `${toPixels.y}px`;
            
            hand.style.left = `${toPixels.x}px`;
            hand.style.top = `${toPixels.y - 30}px`;

            // Cleanup after piece movement is complete
            setTimeout(() => {
              restoreOriginalPiece();
              
              if (pieceClone.parentNode) {
                pieceClone.remove();
              }
              if (hand.parentNode) {
                hand.remove();
              }
              
              handElementRef.current = null;
              pieceCloneElementRef.current = null;
              setIsAnimating(false);
              
              if (onAnimationComplete) {
                onAnimationComplete();
              }
            }, PIECE_MOVE_DURATION);
          }, HAND_APPROACH_DURATION);
        }, ANIMATION_DELAY);
      
      } catch (error) {
        // Ensure original piece is visible on error
        originalPiece.style.visibility = 'visible';
        setIsAnimating(false);
        handElementRef.current = null;
        pieceCloneElementRef.current = null;
      }
    };

    React.useImperativeHandle(ref, () => ({
      playMove: animateMove,
      isAnimating,
    }));

    useEffect(() => {
      return () => {
        if (handElementRef.current?.parentNode) {
          handElementRef.current.remove();
        }
        if (pieceCloneElementRef.current?.parentNode) {
          pieceCloneElementRef.current.remove();
        }
        
        handElementRef.current = null;
        pieceCloneElementRef.current = null;
        setIsAnimating(false);
      };
    }, []);

    return null;
  }
);

SimpleHandAnimation.displayName = 'SimpleHandAnimation';

export default SimpleHandAnimation;
