import { pointVec, segmentKey } from "./figure";
import { nearlySame } from "./math";
import { Figure, FigureAnimation, StrokeDef, Vec } from "./types";

function strokeId(stroke: StrokeDef): string {
  return segmentKey(stroke.a, stroke.b);
}

function extraStrokes(source: Figure, dest: Figure): StrokeDef[] {
  const destIds: { [id: string]: boolean } = {};
  dest.strokes.forEach((stroke) => {
    destIds[strokeId(stroke)] = true;
  });
  return source.strokes.filter((stroke) => !destIds[strokeId(stroke)]);
}

function drawEnds(figure: Figure, stroke: StrokeDef): { from: Vec; to: Vec } | null {
  const from = pointVec(figure, stroke.a);
  const to = pointVec(figure, stroke.b);
  if (!from || !to) {
    return null;
  }
  return { from, to };
}

function polarDeg(point: Vec, origin: Vec): number {
  return (Math.atan2(point.y - origin.y, point.x - origin.x) * 180) / Math.PI;
}

function wrappedDelta(from: number, to: number): number {
  let delta = to - from;
  while (delta > 180) {
    delta -= 360;
  }
  while (delta < -180) {
    delta += 360;
  }
  return delta;
}

function rotateTransition(from: Figure, to: Figure): FigureAnimation | undefined {
  const names = Object.keys(from.points).filter((name) => to.points[name]);
  const moved = names.filter((name) => {
    const prev = from.points[name];
    const next = to.points[name];
    return prev.free && next.free && (prev.x !== next.x || prev.y !== next.y);
  });
  if (moved.length < 2) {
    return undefined;
  }
  const aroundName = names.find((name) => {
    const prev = from.points[name];
    const next = to.points[name];
    return nearlySame(prev, next, 0.02);
  });
  if (!aroundName) {
    return undefined;
  }
  const around = from.points[aroundName];
  const first = from.points[moved[0]];
  const deg = wrappedDelta(polarDeg(first, around), polarDeg(to.points[moved[0]], around));
  if (Math.abs(deg) < 0.5) {
    return undefined;
  }
  for (let i = 1; i < moved.length; i++) {
    const name = moved[i];
    const expected = wrappedDelta(
      polarDeg(from.points[name], around),
      polarDeg(to.points[name], around)
    );
    if (Math.abs(expected - deg) > 2) {
      return undefined;
    }
  }
  return {
    type: "rotate",
    around: { x: around.x, y: around.y },
    aroundName,
    names: moved,
    deg,
  };
}

export function strokeMatchesDraw(a: Vec, b: Vec, from: Vec, to: Vec): boolean {
  return (
    (nearlySame(a, from, 0.04) && nearlySame(b, to, 0.04)) ||
    (nearlySame(a, to, 0.04) && nearlySame(b, from, 0.04))
  );
}

/**
 * Animation that takes the currently displayed `from` figure to `to`.
 * A removed construction stroke is returned as a reverse draw so it can be undrawn.
 */
export function figureTransitionAnimation(from: Figure, to: Figure): FigureAnimation | undefined {
  const names = Object.keys(from.points);
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const prev = from.points[name];
    const next = to.points[name];
    if (prev && next && prev.free && (prev.x !== next.x || prev.y !== next.y)) {
      const rotate = rotateTransition(from, to);
      if (rotate) {
        return rotate;
      }
      return {
        type: "move",
        name,
        from: { x: prev.x, y: prev.y },
        to: { x: next.x, y: next.y },
      };
    }
  }

  const added = extraStrokes(to, from);
  if (added.length === 1) {
    const ends = drawEnds(to, added[0]);
    if (ends) {
      return { type: "draw", from: ends.from, to: ends.to };
    }
  }

  const removed = extraStrokes(from, to);
  if (removed.length === 1) {
    const ends = drawEnds(from, removed[0]);
    if (ends) {
      return { type: "draw", from: ends.from, to: ends.to, reverse: true };
    }
  }

  return rotateTransition(from, to);
}

export function drawProgressPoint(from: Vec, to: Vec, t: number): Vec {
  const u = Math.max(0, Math.min(1, t));
  return {
    x: from.x + (to.x - from.x) * u,
    y: from.y + (to.y - from.y) * u,
  };
}

export function remainingDrawEnd(
  animation: Extract<FigureAnimation, { type: "draw" }>,
  t: number
): Vec {
  const progress = animation.reverse ? 1 - t : t;
  return drawProgressPoint(animation.from, animation.to, progress);
}
