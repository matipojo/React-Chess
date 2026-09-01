import React, { useEffect, useRef } from "react";
import closedHand from "../../assets/cursors/closedhand.svg";
import openHand from "../../assets/cursors/openhand.svg";
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

function setHandSprite(hand: HTMLDivElement, grabbing: boolean) {
  hand.className = grabbing ? "simple-hand-animation grabbing" : "simple-hand-animation";
  const img = hand.querySelector("img");
  if (img) {
    img.src = grabbing ? closedHand : openHand;
    img.alt = grabbing ? "grabbing hand" : "open hand";
  }
}

const PointerHandAnimation = React.forwardRef<PointerHandHandle, Props>(
  function PointerHandAnimation({ onAnimationComplete }, ref) {
    const handElementRef = useRef<HTMLDivElement | null>(null);
    const timersRef = useRef<number[]>([]);
    const lastRestRef = useRef<ScreenPoint | null>(null);
    const progressRef = useRef<(t: number) => void>();
    const pendingCompleteRef = useRef<(() => void) | null>(null);
    const onAnimationCompleteRef = useRef(onAnimationComplete);
    onAnimationCompleteRef.current = onAnimationComplete;

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

    const settle = () => {
      const done = pendingCompleteRef.current;
      pendingCompleteRef.current = null;
      progressRef.current = undefined;
      if (!done) {
        return;
      }
      done();
      onAnimationCompleteRef.current?.();
    };

    const stopVisuals = () => {
      clearTimers();
      cleanupVisuals();
    };

    const cancel = () => {
      stopVisuals();
      lastRestRef.current = null;
      settle();
    };

    const playDrag = (
      from: ScreenPoint,
      to: ScreenPoint,
      options?: { grab?: boolean; onProgress?: (t: number) => void; onComplete?: () => void }
    ) => {
      if (timersRef.current.length > 0 || handElementRef.current || pendingCompleteRef.current) {
        stopVisuals();
        settle();
      }

      const grab = options?.grab !== false;
      progressRef.current = options?.onProgress;
      pendingCompleteRef.current = options?.onComplete || null;
      const start = lastRestRef.current || { x: 0, y: window.innerHeight || 800 };

      const hand = document.createElement("div");
      hand.className = "simple-hand-animation";
      hand.setAttribute("data-pointer-hand", "true");
      hand.style.position = "fixed";
      hand.style.transform = "translate(-50%, -50%)";
      hand.style.zIndex = "10000";
      hand.style.pointerEvents = "none";
      hand.style.transition = `left ${HAND_APPROACH_MS}ms ${SMOOTH_EASING}, top ${HAND_APPROACH_MS}ms ${SMOOTH_EASING}`;
      setHandPosition(hand, start);

      const img = document.createElement("img");
      img.src = openHand;
      img.alt = "open hand";
      img.draggable = false;
      hand.appendChild(img);

      document.body.appendChild(hand);
      handElementRef.current = hand;

      schedule(() => {
        setHandPosition(hand, from);

        schedule(() => {
          if (grab) {
            setHandSprite(hand, true);
          }
          hand.style.transition = `left ${HAND_DRAG_MS}ms ease-in-out, top ${HAND_DRAG_MS}ms ease-in-out`;
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
            stopVisuals();
            settle();
          }, HAND_DRAG_MS);
        }, HAND_APPROACH_MS);
      }, HAND_START_DELAY_MS);
    };

    const playDragRef = useRef(playDrag);
    const cancelRef = useRef(cancel);
    playDragRef.current = playDrag;
    cancelRef.current = cancel;

    React.useImperativeHandle(
      ref,
      () => ({
        playDrag: (from, to, options) => playDragRef.current(from, to, options),
        cancel: () => cancelRef.current(),
      }),
      []
    );

    useEffect(() => {
      return () => {
        cancelRef.current();
      };
    }, []);

    return null;
  }
);

export default PointerHandAnimation;
