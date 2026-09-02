import { roundCoord } from "./math";
import {
  addTriangle,
  cloneFigure,
  emptyFigure,
  ensurePoint,
  resolveFigure,
} from "./figure";
import { applyGan } from "./gan";
import { Figure } from "./types";

export function serializeTfn(figure: Figure): string {
  const parts: string[] = [];
  Object.keys(figure.points)
    .sort()
    .forEach((name) => {
      const p = figure.points[name];
      if (p.free) {
        parts.push(`${name}(${roundCoord(p.x)},${roundCoord(p.y)})`);
      }
    });
  figure.triangles.forEach((t) => {
    parts.push("△" + t.join(""));
  });
  Object.keys(figure.points)
    .sort()
    .forEach((name) => {
      const p = figure.points[name];
      if (!p.constraint) {
        return;
      }
      if (p.constraint.kind === "mid") {
        parts.push(`${name}=mid(${p.constraint.a}${p.constraint.b})`);
      } else if (p.constraint.kind === "foot") {
        parts.push(
          `h(${p.constraint.from},${p.constraint.ontoA}${p.constraint.ontoB})`
        );
      } else if (p.constraint.kind === "bisect") {
        parts.push(`b(${p.constraint.vertex})`);
      } else if (p.constraint.kind === "intersect") {
        parts.push(
          `${name}=${p.constraint.a1}${p.constraint.a2}∩${p.constraint.b1}${p.constraint.b2}`
        );
      }
    });
  figure.circles.forEach((c) => parts.push(c.id));
  figure.rights.forEach((r) => parts.push(`mark(90,${r.vertex})`));
  figure.equalGroups.forEach((g) => {
    parts.push("mark(=," + g.segments.join(",") + ")");
  });
  figure.angleEqualGroups.forEach((g) => {
    parts.push("mark(∠," + g.angles.join(",") + ")");
  });
  figure.parallels.forEach((g) => {
    parts.push("mark(||," + g.segments.join(",") + ")");
  });
  figure.lengthLabels.forEach((l) => parts.push(`lab(${l.segment}=${l.text})`));
  figure.angleLabels.forEach((l) => parts.push(`lab(∠${l.angle}=${l.text})`));
  if (figure.showAxes) {
    parts.push("axes(on)");
  }
  return parts.join(" ");
}

export function parseTfn(tfn: string): Figure {
  const trimmed = (tfn || "").trim();
  if (!trimmed) {
    return emptyFigure();
  }
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  let figure = emptyFigure();
  tokens.forEach((token) => {
    const point = token.match(/^([A-Z])\(([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)\)$/);
    if (point) {
      ensurePoint(figure, point[1], { x: Number(point[2]), y: Number(point[3]) });
      return;
    }
    const tri = token.match(/^△([A-Z]{3})$/);
    if (tri) {
      const a = tri[1][0];
      const b = tri[1][1];
      const c = tri[1][2];
      ensurePoint(figure, a, figure.points[a] || { x: -2, y: -1 });
      ensurePoint(figure, b, figure.points[b] || { x: 2, y: -1 });
      ensurePoint(figure, c, figure.points[c] || { x: 0, y: 2 });
      addTriangle(figure, a, b, c);
      return;
    }
    const result = applyGan(figure, token);
    if (!result.error) {
      figure = result.figure;
    }
  });
  return resolveFigure(figure);
}

export function figureFromTfn(tfn?: string): Figure {
  return parseTfn(tfn || "");
}

export function withApplied(figure: Figure, applied: string[]): Figure {
  const next = cloneFigure(figure);
  next.applied = [...applied];
  return next;
}
