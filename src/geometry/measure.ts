import { angleDeg, dist, triangleArea } from "./math";
import { circleGeometry, oppositeVertex, pointVec, triangleAtVertex } from "./figure";
import { Figure } from "./types";

export type MeasureResult = {
  id: string;
  kind: "length" | "angle" | "area" | "radius" | "ratio";
  value: number;
  unit: string;
};

function roundMeasure(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function measureFigure(figure: Figure, id: string): MeasureResult | null {
  const token = id.trim().replace(/\s/g, "");
  const seg = token.match(/^([A-Z]{2})$/);
  if (seg) {
    const a = pointVec(figure, seg[1][0]);
    const b = pointVec(figure, seg[1][1]);
    if (!a || !b) {
      return null;
    }
    return { id: token, kind: "length", value: roundMeasure(dist(a, b)), unit: "length" };
  }
  const ang = token.match(/^∠([A-Z])$/) || token.match(/^angle\(([A-Z])\)$/i);
  if (ang) {
    const tri = triangleAtVertex(figure, ang[1]);
    const opp = tri ? oppositeVertex(tri, ang[1]) : null;
    if (!tri || !opp) {
      return null;
    }
    const value = angleDeg(figure.points[opp[0]], figure.points[ang[1]], figure.points[opp[1]]);
    return { id: token, kind: "angle", value: roundMeasure(value), unit: "deg" };
  }
  const ang3 = token.match(/^∠([A-Z]{3})$/);
  if (ang3) {
    const left = pointVec(figure, ang3[1][0]);
    const vertex = pointVec(figure, ang3[1][1]);
    const right = pointVec(figure, ang3[1][2]);
    if (!left || !vertex || !right) {
      return null;
    }
    return {
      id: token,
      kind: "angle",
      value: roundMeasure(angleDeg(left, vertex, right)),
      unit: "deg",
    };
  }
  const tri = token.match(/^△([A-Z]{3})$/) || token.match(/^S$/);
  if (tri) {
    const names = tri[1] ? tri[1].split("") : ["A", "B", "C"];
    const a = pointVec(figure, names[0]);
    const b = pointVec(figure, names[1]);
    const c = pointVec(figure, names[2]);
    if (!a || !b || !c) {
      return null;
    }
    return { id: token, kind: "area", value: roundMeasure(triangleArea(a, b, c)), unit: "area" };
  }
  if (token === "R" || /^circ\([A-Z]{3}\)$/.test(token)) {
    const circle = figure.circles.find((c) => c.kind === "circum") || figure.circles[0];
    if (!circle) {
      return null;
    }
    const geo = circleGeometry(figure, circle);
    if (!geo) {
      return null;
    }
    return { id: token, kind: "radius", value: roundMeasure(geo.radius), unit: "length" };
  }
  const ratio = token.match(/^([A-Z]{2}):([A-Z]{2})$/);
  if (ratio) {
    const a = measureFigure(figure, ratio[1]);
    const b = measureFigure(figure, ratio[2]);
    if (!a || !b || !b.value) {
      return null;
    }
    return { id: token, kind: "ratio", value: roundMeasure(a.value / b.value), unit: "ratio" };
  }
  return null;
}

export function figureSummary(figure: Figure): Record<string, unknown> {
  const points = Object.keys(figure.points).map((name) => ({
    name,
    x: Math.round(figure.points[name].x * 1000) / 1000,
    y: Math.round(figure.points[name].y * 1000) / 1000,
    free: figure.points[name].free,
  }));
  const triangles = figure.triangles.map((t) => "△" + t.join(""));
  const measures: MeasureResult[] = [];
  figure.triangles.forEach((t) => {
    const area = measureFigure(figure, "△" + t.join(""));
    if (area) {
      measures.push(area);
    }
    t.forEach((vertex, i) => {
      const next = t[(i + 1) % 3];
      const len = measureFigure(figure, vertex + next);
      if (len) {
        measures.push(len);
      }
      const ang = measureFigure(figure, "∠" + vertex);
      if (ang) {
        measures.push(ang);
      }
    });
  });
  return {
    points,
    triangles,
    strokes: figure.strokes.map((s) => s.a + s.b),
    circles: figure.circles.map((c) => c.id),
    rights: figure.rights.map((r) => r.vertex),
    highlights: figure.highlights,
    showAxes: figure.showAxes,
    measures,
  };
}
