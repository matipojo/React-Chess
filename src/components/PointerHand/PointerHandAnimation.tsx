import React, { useEffect, useRef } from "react";
import "./PointerHandAnimation.css";

export const HAND_APPROACH_MS = 1000;
export const HAND_DRAG_MS = 1000;
export const HAND_START_DELAY_MS = 100;
const SMOOTH_EASING = "cubic-bezier(0.25, 0.46, 0.45, 0.94)";
const HAND_OFFSET_Y = 30;

export type ScreenPoint = { x: number; y: number };

export type PointerHandHandle = {
  playDrag: (
    from: ScreenPoint,
    to: ScreenPoint,
    options?: { grab?: boolean; onProgress?: (t: number) => void; onComplete?: () => void }
  ) => void;
  cancel: () => void;
};

type Props = {
  onAnimationComplete?: () => void;
};

function setHandPosition(hand: HTMLDivElement, point: ScreenPoint) {
  hand.style.left = `${point.x}px`;
  hand.style.top = `${point.y - HAND_OFFSET_Y}px`;
}

const PointerHandAnimation = React.forwardRef<PointerHandHandle, Props>(
  function PointerHandAnimation({ onAnimationComplete }, ref) {
    const handElementRef = useRef<HTMLDivElement | null>(null);
    const timersRef = useRef<number[]>([]);
    const lastRestRef = useRef<ScreenPoint | null>(null);
    const progressRef = useRef<(t: number) => void>();

    const clearTimers = () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };

    const schedule = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timersRef.current = timersRef.current.filter((item) => item !== id);
        fn();
      }, ms);
      timersRef.current.push(id);
    };

    const cleanupVisuals = () => {
      if (handElementRef.current?.parentNode) {
        handElementRef.current.remove();
      }
      handElementRef.current = null;
    };

    const cancel = () => {
      clearTimers();
      cleanupVisuals();
      lastRestRef.current = null;
      progressRef.current = undefined;
    };

    const playDrag = (
      from: ScreenPoint,
      to: ScreenPoint,
      options?: { grab?: boolean; onProgress?: (t: number) => void; onComplete?: () => void }
    ) => {
      if (timersRef.current.length > 0 || handElementRef.current) {
        cancel();
      }

      const grab = options?.grab !== false;
      progressRef.current = options?.onProgress;
      const start = lastRestRef.current || { x: 0, y: window.innerHeight || 800 };

      const hand = document.createElement("div");
      hand.className = "pointer-hand-animation";
      hand.setAttribute("data-pointer-hand", "true");
      hand.style.position = "fixed";
      hand.style.transform = "translate(-50%, -50%)";
      hand.style.zIndex = "1001";
      hand.style.pointerEvents = "none";
      hand.style.transition = `all ${HAND_APPROACH_MS}ms ${SMOOTH_EASING}`;
      setHandPosition(hand, start);
      document.body.appendChild(hand);
      handElementRef.current = hand;

      schedule(() => {
        setHandPosition(hand, from);

        schedule(() => {
          if (grab) {
            hand.className = "pointer-hand-animation grabbing";
          }
          hand.style.transition = `all ${HAND_DRAG_MS}ms ease-in-out`;
          setHandPosition(hand, to);

          const steps = 20;
          for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            schedule(() => {
              progressRef.current?.(t);
            }, (HAND_DRAG_MS * i) / steps);
          }

          schedule(() => {
            progressRef.current?.(1);
            lastRestRef.current = to;
            cleanupVisuals();
            progressRef.current = undefined;
            options?.onComplete?.();
            onAnimationComplete?.();
          }, HAND_DRAG_MS);
        }, HAND_APPROACH_MS);
      }, HAND_START_DELAY_MS);
    };

    React.useImperativeHandle(ref, () => ({
      playDrag,
      cancel,
    }));

    useEffect(() => {
      return () => {
        clearTimers();
        cleanupVisuals();
      };
    }, []);

    return null;
  }
);

export default PointerHandAnimation;
