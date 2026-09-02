import {
  add,
  angleBisectorDirection,
  circumcenter,
  dist,
  footOfPerpendicular,
  incenter,
  lineIntersection,
  midpoint,
  rotateAround,
  scale,
  vec,
} from "./math";
import {
  CircleDef,
  Figure,
  PointConstraint,
  PointDef,
  StrokeDef,
  Vec,
} from "./types";

export const DEFAULT_TRIANGLE = {
  A: vec(-2.2, -1.35),
  B: vec(2.45, -1.35),
  C: vec(-0.35, 1.85),
};

export function emptyFigure(): Figure {
  return {
    points: {},
    strokes: [],
    triangles: [],
    circles: [],
    equalGroups: [],
    angleEqualGroups: [],
    rights: [],
    parallels: [],
    lengthLabels: [],
    angleLabels: [],
    areaLabels: [],
    highlights: [],
    showAxes: false,
    applied: [],
  };
}

export function cloneFigure(figure: Figure): Figure {
  const points: Record<string, PointDef> = {};
  Object.keys(figure.points).forEach((name) => {
    const p = figure.points[name];
    points[name] = {
      name: p.name,
      x: p.x,
      y: p.y,
      free: p.free,
      constraint: p.constraint ? { ...p.constraint } : undefined,
    };
  });
  return {
    points,
    strokes: figure.strokes.map((s) => ({ ...s })),
    triangles: figure.triangles.map((t) => [...t]),
    circles: figure.circles.map((c) => ({ ...c })),
    equalGroups: figure.equalGroups.map((g) => ({
      tick: g.tick,
      segments: [...g.segments],
    })),
    angleEqualGroups: figure.angleEqualGroups.map((g) => ({
      arcs: g.arcs,
      angles: [...g.angles],
    })),
    rights: figure.rights.map((r) => ({ ...r })),
    parallels: figure.parallels.map((g) => ({ segments: [...g.segments] })),
    lengthLabels: figure.lengthLabels.map((l) => ({ ...l })),
    angleLabels: figure.angleLabels.map((l) => ({ ...l })),
    areaLabels: figure.areaLabels.map((l) => ({ ...l })),
    highlights: [...figure.highlights],
    ghost: figure.ghost
      ? {
          points: Object.keys(figure.ghost.points).reduce((acc, name) => {
            acc[name] = { ...figure.ghost!.points[name] };
            return acc;
          }, {} as Record<string, Vec>),
          strokes: figure.ghost.strokes.map((s) => ({ ...s })),
        }
      : undefined,
    showAxes: figure.showAxes,
    applied: [...figure.applied],
  };
}

export function pointVec(figure: Figure, name: string): Vec | null {
  const p = figure.points[name];
  return p ? { x: p.x, y: p.y } : null;
}

export function segmentKey(a: string, b: string): string {
  return a < b ? a + b : b + a;
}

export function displaySegment(a: string, b: string): string {
  return a + b;
}

export function angleKey(left: string, vertex: string, right: string): string {
  return left + vertex + right;
}

export function triangleKey(a: string, b: string, c: string): string {
  return "△" + a + b + c;
}

export function hasStroke(figure: Figure, a: string, b: string): boolean {
  const key = segmentKey(a, b);
  return figure.strokes.some((s) => segmentKey(s.a, s.b) === key);
}

export function addStroke(
  figure: Figure,
  a: string,
  b: string,
  extra?: Partial<StrokeDef>
): void {
  if (hasStroke(figure, a, b) && extra?.kind !== "line" && extra?.kind !== "ray") {
    return;
  }
  if (!hasStroke(figure, a, b)) {
    figure.strokes.push({
      a,
      b,
      kind: extra?.kind || "segment",
      dashed: extra?.dashed,
      construction: extra?.construction,
    });
  }
}

export function hasTriangle(figure: Figure, a: string, b: string, c: string): boolean {
  const want = [a, b, c].sort().join("");
  return figure.triangles.some((t) => [...t].sort().join("") === want);
}

export function addTriangle(figure: Figure, a: string, b: string, c: string): void {
  if (hasTriangle(figure, a, b, c)) {
    return;
  }
  figure.triangles.push([a, b, c]);
  addStroke(figure, a, b);
  addStroke(figure, b, c);
  addStroke(figure, c, a);
}

export function ensurePoint(
  figure: Figure,
  name: string,
  position: Vec,
  extra?: { free?: boolean; constraint?: PointConstraint }
): PointDef {
  const existing = figure.points[name];
  if (existing) {
    if (extra?.constraint) {
      existing.constraint = extra.constraint;
      existing.free = false;
    }
    if (existing.free && extra?.free !== false && !extra?.constraint) {
      existing.x = position.x;
      existing.y = position.y;
    }
    return existing;
  }
  const point: PointDef = {
    name,
    x: position.x,
    y: position.y,
    free: extra?.constraint ? false : extra?.free !== false,
    constraint: extra?.constraint,
  };
  figure.points[name] = point;
  return point;
}

export function nextPointName(figure: Figure, preferred: string[]): string {
  for (let i = 0; i < preferred.length; i++) {
    if (!figure.points[preferred[i]]) {
      return preferred[i];
    }
  }
  const letters = "HMFGDEIJKLNOPQRSTUVWXYZ";
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    if (!figure.points[letter]) {
      return letter;
    }
  }
  let n = 1;
  while (figure.points["P" + n]) {
    n += 1;
  }
  return "P" + n;
}

export function oppositeVertex(triangle: string[], vertex: string): [string, string] | null {
  const rest = triangle.filter((name) => name !== vertex);
  return rest.length === 2 ? [rest[0], rest[1]] : null;
}

export function triangleContaining(figure: Figure, names: string[]): string[] | null {
  for (let i = 0; i < figure.triangles.length; i++) {
    const tri = figure.triangles[i];
    if (names.every((name) => tri.indexOf(name) >= 0)) {
      return tri;
    }
  }
  return null;
}

export function triangleAtVertex(figure: Figure, vertex: string): string[] | null {
  const hits = figure.triangles.filter((t) => t.indexOf(vertex) >= 0);
  return hits[0] || null;
}

function constraintPosition(figure: Figure, constraint: PointConstraint): Vec | null {
  if (constraint.kind === "mid") {
    const a = figure.points[constraint.a];
    const b = figure.points[constraint.b];
    if (!a || !b) {
      return null;
    }
    return midpoint(a, b);
  }
  if (constraint.kind === "foot") {
    const from = figure.points[constraint.from];
    const a = figure.points[constraint.ontoA];
    const b = figure.points[constraint.ontoB];
    if (!from || !a || !b) {
      return null;
    }
    return footOfPerpendicular(from, a, b);
  }
  if (constraint.kind === "intersect") {
    const a1 = figure.points[constraint.a1];
    const a2 = figure.points[constraint.a2];
    const b1 = figure.points[constraint.b1];
    const b2 = figure.points[constraint.b2];
    if (!a1 || !a2 || !b1 || !b2) {
      return null;
    }
    return lineIntersection(a1, a2, b1, b2);
  }
  const vertex = figure.points[constraint.vertex];
  const left = figure.points[constraint.left];
  const right = figure.points[constraint.right];
  if (!vertex || !left || !right) {
    return null;
  }
  const dir = angleBisectorDirection(left, vertex, right);
  const far = add(vertex, scale(dir, Math.max(dist(vertex, left), dist(vertex, right)) * 2));
  return lineIntersection(vertex, far, left, right);
}

export function resolveFigure(figure: Figure): Figure {
  for (let pass = 0; pass < 8; pass++) {
    Object.keys(figure.points).forEach((name) => {
      const point = figure.points[name];
      if (!point.constraint) {
        return;
      }
      const next = constraintPosition(figure, point.constraint);
      if (next) {
        point.x = next.x;
        point.y = next.y;
      }
    });
  }
  return figure;
}

export function moveFreePoint(figure: Figure, name: string, position: Vec): Figure {
  const next = cloneFigure(figure);
  const point = next.points[name];
  if (!point || !point.free) {
    return next;
  }
  point.x = position.x;
  point.y = position.y;
  return resolveFigure(next);
}

export function rotateNamed(
  figure: Figure,
  around: string,
  deg: number,
  names: string[]
): Figure {
  const next = cloneFigure(figure);
  const origin = next.points[around];
  if (!origin) {
    return next;
  }
  names.forEach((name) => {
    const point = next.points[name];
    if (!point || !point.free) {
      return;
    }
    const rotated = rotateAround(point, origin, deg);
    point.x = rotated.x;
    point.y = rotated.y;
  });
  return resolveFigure(next);
}

export function circleGeometry(
  figure: Figure,
  circle: CircleDef
): { center: Vec; radius: number } | null {
  if (circle.kind === "circum" && circle.a && circle.b && circle.c) {
    const a = figure.points[circle.a];
    const b = figure.points[circle.b];
    const c = figure.points[circle.c];
    if (!a || !b || !c) {
      return null;
    }
    const center = circumcenter(a, b, c);
    if (!center) {
      return null;
    }
    return { center, radius: dist(center, a) };
  }
  if (circle.kind === "in" && circle.a && circle.b && circle.c) {
    const a = figure.points[circle.a];
    const b = figure.points[circle.b];
    const c = figure.points[circle.c];
    if (!a || !b || !c) {
      return null;
    }
    const center = incenter(a, b, c);
    const foot = footOfPerpendicular(center, a, b);
    return { center, radius: dist(center, foot) };
  }
  if (circle.center && circle.through) {
    const center = figure.points[circle.center];
    const through = figure.points[circle.through];
    if (!center || !through) {
      return null;
    }
    return { center, radius: dist(center, through) };
  }
  return null;
}

export function figuresEqual(a: Figure, b: Figure): boolean {
  const namesA = Object.keys(a.points).sort();
  const namesB = Object.keys(b.points).sort();
  if (namesA.join() !== namesB.join()) {
    return false;
  }
  for (let i = 0; i < namesA.length; i++) {
    const pa = a.points[namesA[i]];
    const pb = b.points[namesA[i]];
    if (Math.abs(pa.x - pb.x) > 0.02 || Math.abs(pa.y - pb.y) > 0.02) {
      return false;
    }
  }
  if (a.strokes.length !== b.strokes.length) {
    return false;
  }
  if (a.triangles.length !== b.triangles.length) {
    return false;
  }
  if (a.circles.length !== b.circles.length) {
    return false;
  }
  if (a.rights.length !== b.rights.length) {
    return false;
  }
  return true;
}

export function allObjectIds(figure: Figure): string[] {
  const ids: string[] = [];
  Object.keys(figure.points).forEach((name) => ids.push(name));
  figure.strokes.forEach((s) => {
    ids.push(displaySegment(s.a, s.b));
    ids.push(segmentKey(s.a, s.b));
  });
  figure.triangles.forEach((t) => {
    ids.push(triangleKey(t[0], t[1], t[2]));
    t.forEach((vertex) => {
      const opp = oppositeVertex(t, vertex);
      if (opp) {
        ids.push("∠" + vertex);
        ids.push("∠" + opp[0] + vertex + opp[1]);
      }
    });
  });
  figure.circles.forEach((c) => ids.push(c.id));
  return ids;
}

export function defaultScalene(): Figure {
  const figure = emptyFigure();
  ensurePoint(figure, "A", DEFAULT_TRIANGLE.A);
  ensurePoint(figure, "B", DEFAULT_TRIANGLE.B);
  ensurePoint(figure, "C", DEFAULT_TRIANGLE.C);
  addTriangle(figure, "A", "B", "C");
  return figure;
}
