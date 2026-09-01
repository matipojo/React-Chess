import { dist } from "./math";
import { circleGeometry, oppositeVertex, pointVec, segmentKey, triangleAtVertex } from "./figure";
import { Figure, Vec } from "./types";

export type HitKind = "point" | "segment" | "angle" | "triangle" | "circle";

export type FigureHit = {
  id: string;
  kind: HitKind;
  distance: number;
};

function worldDist(a: Vec, b: Vec): number {
  return dist(a, b);
}

function distToSegment(p: Vec, a: Vec, b: Vec): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const len2 = abx * abx + aby * aby;
  if (len2 < 1e-8) {
    return worldDist(p, a);
  }
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
  t = Math.max(0, Math.min(1, t));
  return worldDist(p, { x: a.x + abx * t, y: a.y + aby * t });
}

export function hitTestFigure(figure: Figure, world: Vec, threshold = 0.28): FigureHit | null {
  const hits: FigureHit[] = [];
  Object.keys(figure.points).forEach((name) => {
    const p = figure.points[name];
    const d = worldDist(world, p);
    if (d <= threshold) {
      hits.push({ id: name, kind: "point", distance: d });
    }
  });
  figure.strokes.forEach((s) => {
    const a = pointVec(figure, s.a);
    const b = pointVec(figure, s.b);
    if (!a || !b) {
      return;
    }
    const d = distToSegment(world, a, b);
    if (d <= threshold * 0.7) {
      hits.push({ id: s.a + s.b, kind: "segment", distance: d + 0.05 });
    }
  });
  figure.triangles.forEach((t) => {
    t.forEach((vertex) => {
      const opp = oppositeVertex(t, vertex);
      if (!opp) {
        return;
      }
      const v = figure.points[vertex];
      if (worldDist(world, v) < threshold * 1.4) {
        hits.push({ id: "∠" + vertex, kind: "angle", distance: worldDist(world, v) + 0.08 });
        hits.push({
          id: "∠" + opp[0] + vertex + opp[1],
          kind: "angle",
          distance: worldDist(world, v) + 0.09,
        });
      }
    });
    hits.push({ id: "△" + t.join(""), kind: "triangle", distance: 0.4 });
  });
  figure.circles.forEach((c) => {
    const geo = circleGeometry(figure, c);
    if (!geo) {
      return;
    }
    const d = Math.abs(worldDist(world, geo.center) - geo.radius);
    if (d <= threshold) {
      hits.push({ id: c.id, kind: "circle", distance: d + 0.04 });
    }
  });
  hits.sort((a, b) => a.distance - b.distance);
  return hits[0] || null;
}

export function normalizeGanId(value: string): string {
  return value.trim().replace(/\s/g, "");
}

export type ParsedAngleId = {
  vertex: string;
  left?: string;
  right?: string;
};

export function parseAngleId(id: string): ParsedAngleId | null {
  const n = normalizeGanId(id);
  if (!n.startsWith("∠")) {
    return null;
  }
  const rest = n.slice(1);
  if (/^[A-Z]$/.test(rest)) {
    return { vertex: rest };
  }
  if (/^[A-Z]{3}$/.test(rest)) {
    return { vertex: rest[1], left: rest[0], right: rest[2] };
  }
  return null;
}

export function sameAngleId(a: string, b: string): boolean {
  const pa = parseAngleId(a);
  const pb = parseAngleId(b);
  if (!pa || !pb || pa.vertex !== pb.vertex) {
    return false;
  }
  if (!pa.left || !pa.right || !pb.left || !pb.right) {
    return true;
  }
  return (
    (pa.left === pb.left && pa.right === pb.right) ||
    (pa.left === pb.right && pa.right === pb.left)
  );
}

function isSegmentId(id: string): boolean {
  return /^[A-Z]{2}$/.test(id);
}

export function ganAnswerIsCorrect(correct: string[], clicked: string): boolean {
  const dest = normalizeGanId(clicked);
  for (let i = 0; i < correct.length; i++) {
    const token = normalizeGanId(correct[i]);
    if (!token) {
      continue;
    }
    if (token === dest) {
      return true;
    }
    if (sameAngleId(token, dest)) {
      return true;
    }
    const tokenAngle = parseAngleId(token);
    const destAngle = parseAngleId(dest);
    if (tokenAngle && dest === tokenAngle.vertex) {
      return true;
    }
    if (destAngle && token === destAngle.vertex) {
      return true;
    }
    if (isSegmentId(token) && isSegmentId(dest) && segmentKey(token[0], token[1]) === segmentKey(dest[0], dest[1])) {
      return true;
    }
    if (token.replace("△", "").split("").sort().join("") === dest.replace("△", "").split("").sort().join("") && (token.indexOf("△") >= 0 || dest.indexOf("△") >= 0)) {
      return true;
    }
  }
  return false;
}

export function idsMatchHighlight(id: string, highlights: string[]): boolean {
  const needle = normalizeGanId(id);
  return highlights.some((item) => {
    const h = normalizeGanId(item);
    if (h === needle) {
      return true;
    }
    if (sameAngleId(h, needle)) {
      return true;
    }
    if (isSegmentId(h) && isSegmentId(needle) && segmentKey(h[0], h[1]) === segmentKey(needle[0], needle[1])) {
      return true;
    }
    return h.replace("△", "") === needle.replace("△", "") && (h.indexOf("△") >= 0 || needle.indexOf("△") >= 0);
  });
}

export function angleHighlightIds(vertex: string, left: string, right: string): string[] {
  return ["∠" + vertex, "∠" + left + vertex + right, "∠" + right + vertex + left];
}

export function isAngleHighlighted(
  vertex: string,
  left: string,
  right: string,
  highlights: string[]
): boolean {
  return angleHighlightIds(vertex, left, right).some((id) => idsMatchHighlight(id, highlights));
}

export { triangleAtVertex };
