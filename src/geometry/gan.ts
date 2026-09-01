import {
  angleDeg,
  dist,
  footOfPerpendicular,
  rotateAround,
  sub,
  unit,
  vec,
} from "./math";
import {
  addStroke,
  addTriangle,
  cloneFigure,
  DEFAULT_TRIANGLE,
  ensurePoint,
  hasStroke,
  hasTriangle,
  nextPointName,
  oppositeVertex,
  resolveFigure,
  rotateNamed,
  segmentKey,
  triangleAtVertex,
  triangleContaining,
} from "./figure";
import { Figure, FigureAnimation, Vec } from "./types";

export type GanCommand =
  | { type: "triangle"; a: string; b: string; c: string }
  | { type: "point"; name: string; x?: number; y?: number }
  | { type: "segment"; a: string; b: string }
  | { type: "mid"; name?: string; a: string; b: string }
  | { type: "altitude"; from: string; ontoA: string; ontoB: string }
  | { type: "median"; from: string; ontoA: string; ontoB: string }
  | { type: "bisector"; vertex: string }
  | { type: "perp-bisector"; a: string; b: string }
  | { type: "parallel"; point: string; a: string; b: string }
  | { type: "perp"; point: string; a: string; b: string }
  | { type: "intersect"; name?: string; a1: string; a2: string; b1: string; b2: string }
  | { type: "circum"; a: string; b: string; c: string }
  | { type: "in"; a: string; b: string; c: string }
  | { type: "circle-center"; center: string; through: string }
  | { type: "rotate"; around: string; deg: number; names: string[] }
  | { type: "move"; name: string; x: number; y: number }
  | { type: "move-to"; name: string; dest: string }
  | { type: "fit"; from: [string, string, string]; to: [string, string, string]; similar: boolean }
  | { type: "mark-equal"; segs: string[] }
  | { type: "mark-angle"; angles: string[] }
  | { type: "mark-right"; vertex: string }
  | { type: "mark-parallel"; segs: string[] }
  | { type: "label-len"; seg: string; text: string }
  | { type: "label-ang"; angle: string; text: string }
  | { type: "label-area"; triangle: string; text: string }
  | { type: "square"; a: string; b: string }
  | { type: "highlight"; ids: string[] }
  | { type: "axes"; on: boolean };

const POINT = "([A-Z](?:'[A-Z]*)?|[A-Z]\\d+)";
const PT = POINT;

function compact(raw: string): string {
  return raw.replace(/\s+/g, "");
}

function parsePair(raw: string): [string, string] | null {
  const match = raw.match(new RegExp("^" + PT + PT + "$"));
  return match ? [match[1], match[2]] : null;
}

function parseTriple(raw: string): [string, string, string] | null {
  const match = raw.match(new RegExp("^" + PT + PT + PT + "$"));
  return match ? [match[1], match[2], match[3]] : null;
}

function splitArgs(inside: string): string[] {
  return inside.split(",").map((part) => part.trim()).filter(Boolean);
}

export function parseGanCommand(raw: string): GanCommand | null {
  const text = compact(raw);
  if (!text) {
    return null;
  }

  let m = text.match(/^triangle\(([A-Z]{3})\)$/i) || text.match(/^tri\(([A-Z]{3})\)$/i);
  if (m) {
    return { type: "triangle", a: m[1][0], b: m[1][1], c: m[1][2] };
  }
  m = text.match(/^△([A-Z]{3})$/);
  if (m) {
    return { type: "triangle", a: m[1][0], b: m[1][1], c: m[1][2] };
  }

  m = text.match(/^([A-Z])\(([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)\)$/);
  if (m) {
    return { type: "point", name: m[1], x: Number(m[2]), y: Number(m[3]) };
  }

  m = text.match(/^([A-Z])=mid\(([A-Z]{2})\)$/i);
  if (m) {
    return { type: "mid", name: m[1], a: m[2][0], b: m[2][1] };
  }
  m = text.match(/^mid\(([A-Z]{2})\)$/i);
  if (m) {
    return { type: "mid", a: m[1][0], b: m[1][1] };
  }

  m = text.match(/^h\(([A-Z]),([A-Z]{2})\)$/i);
  if (m) {
    return { type: "altitude", from: m[1], ontoA: m[2][0], ontoB: m[2][1] };
  }
  m = text.match(/^m\(([A-Z]),([A-Z]{2})\)$/i);
  if (m) {
    return { type: "median", from: m[1], ontoA: m[2][0], ontoB: m[2][1] };
  }
  m = text.match(/^b\(∠?([A-Z])\)$/i);
  if (m) {
    return { type: "bisector", vertex: m[1] };
  }
  m = text.match(/^pb\(([A-Z]{2})\)$/i);
  if (m) {
    return { type: "perp-bisector", a: m[1][0], b: m[1][1] };
  }
  m = text.match(/^par\(([A-Z]),([A-Z]{2})\)$/i);
  if (m) {
    return { type: "parallel", point: m[1], a: m[2][0], b: m[2][1] };
  }
  m = text.match(/^perp\(([A-Z]),([A-Z]{2})\)$/i);
  if (m) {
    return { type: "perp", point: m[1], a: m[2][0], b: m[2][1] };
  }

  m = text.match(/^([A-Z])=([A-Z]{2})(?:∩|&)([A-Z]{2})$/);
  if (m) {
    return {
      type: "intersect",
      name: m[1],
      a1: m[2][0],
      a2: m[2][1],
      b1: m[3][0],
      b2: m[3][1],
    };
  }
  m = text.match(/^([A-Z]{2})(?:∩|&)([A-Z]{2})$/);
  if (m) {
    return {
      type: "intersect",
      a1: m[1][0],
      a2: m[1][1],
      b1: m[2][0],
      b2: m[2][1],
    };
  }

  m = text.match(/^circ\(([A-Z]{3})\)$/i);
  if (m) {
    return { type: "circum", a: m[1][0], b: m[1][1], c: m[1][2] };
  }
  m = text.match(/^inc\(([A-Z]{3})\)$/i);
  if (m) {
    return { type: "in", a: m[1][0], b: m[1][1], c: m[1][2] };
  }
  m = text.match(/^circ\(([A-Z]),([A-Z])\)$/i);
  if (m) {
    return { type: "circle-center", center: m[1], through: m[2] };
  }

  m = text.match(/^rot\(([A-Z]),(-?\d+(?:\.\d+)?),△([A-Z]{3})\)$/i);
  if (m) {
    return { type: "rotate", around: m[1], deg: Number(m[2]), names: m[3].split("") };
  }
  m = text.match(/^rot\(([A-Z]),(-?\d+(?:\.\d+)?),([A-Z]+)\)$/i);
  if (m) {
    return { type: "rotate", around: m[1], deg: Number(m[2]), names: m[3].split("") };
  }

  m = text.match(/^move\(([A-Z])→([A-Z])\)$/);
  if (m) {
    return { type: "move-to", name: m[1], dest: m[2] };
  }
  m = text.match(/^move\(([A-Z]),([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)\)$/);
  if (m) {
    return { type: "move", name: m[1], x: Number(m[2]), y: Number(m[3]) };
  }

  m = text.match(/^fit\(△([A-Z]{3})(?:≅|~|cong)△([A-Z]{3})\)$/i);
  if (m) {
    const similar = /~/.test(text) && !/≅/.test(text) && !/cong/i.test(text);
    return {
      type: "fit",
      from: [m[1][0], m[1][1], m[1][2]],
      to: [m[2][0], m[2][1], m[2][2]],
      similar,
    };
  }
  m = text.match(/^△([A-Z]{3})(≅|~)△([A-Z]{3})$/);
  if (m) {
    return {
      type: "fit",
      from: [m[1][0], m[1][1], m[1][2]],
      to: [m[3][0], m[3][1], m[3][2]],
      similar: m[2] === "~",
    };
  }

  m = text.match(/^mark\(90,([A-Z])\)$/i);
  if (m) {
    return { type: "mark-right", vertex: m[1] };
  }
  m = text.match(/^mark\(=,(.+)\)$/i);
  if (m) {
    return { type: "mark-equal", segs: splitArgs(m[1]) };
  }
  m = text.match(/^mark\(∠,(.+)\)$/);
  if (m) {
    return { type: "mark-angle", angles: splitArgs(m[1]).map((item) => item.replace(/^∠/, "")) };
  }
  m = text.match(/^mark\(\|\|,(.+)\)$/);
  if (m) {
    return { type: "mark-parallel", segs: splitArgs(m[1]) };
  }

  m = text.match(/^lab\(([A-Z]{2})=(.+)\)$/i);
  if (m) {
    return { type: "label-len", seg: m[1], text: m[2] };
  }
  m = text.match(/^lab\(∠([A-Z]{1,3})=(.+)\)$/);
  if (m) {
    return { type: "label-ang", angle: m[1], text: m[2] };
  }
  m = text.match(/^lab\(S=(.+)\)$/i);
  if (m) {
    return { type: "label-area", triangle: "ABC", text: m[1] };
  }

  m = text.match(/^sq\(([A-Z]{2})\)$/i);
  if (m) {
    return { type: "square", a: m[1][0], b: m[1][1] };
  }
  m = text.match(/^highlight\((.+)\)$/i);
  if (m) {
    return { type: "highlight", ids: splitArgs(m[1]) };
  }
  if (/^axes\(on\)$/i.test(text)) {
    return { type: "axes", on: true };
  }
  if (/^axes\(off\)$/i.test(text)) {
    return { type: "axes", on: false };
  }

  m = text.match(/^segment\(([A-Z]{2})\)$/i);
  if (m) {
    return { type: "segment", a: m[1][0], b: m[1][1] };
  }

  const pair = parsePair(text);
  if (pair && text.length === 2) {
    return { type: "segment", a: pair[0], b: pair[1] };
  }
  const triple = parseTriple(text);
  if (triple && /^[A-Z]{3}$/.test(text)) {
    return { type: "triangle", a: triple[0], b: triple[1], c: triple[2] };
  }
  if (/^[A-Z]$/.test(text)) {
    return { type: "point", name: text };
  }
  return null;
}

export function splitGanCommands(raw: string): string[] {
  return raw
    .split(/[;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function needPoint(figure: Figure, name: string): Vec {
  const p = figure.points[name];
  if (p) {
    return { x: p.x, y: p.y };
  }
  const fallback = DEFAULT_TRIANGLE[name as keyof typeof DEFAULT_TRIANGLE];
  const pos = fallback || vec((Object.keys(figure.points).length % 5) - 2, 1);
  ensurePoint(figure, name, pos);
  return pos;
}

function rightRays(figure: Figure, vertex: string): [string, string] | null {
  const tri = triangleAtVertex(figure, vertex);
  if (!tri) {
    return null;
  }
  return oppositeVertex(tri, vertex);
}

function mapFit(
  from: [Vec, Vec, Vec],
  to: [Vec, Vec, Vec],
  similar: boolean
): (p: Vec) => Vec {
  const origin = from[0];
  const dest = to[0];
  const vFrom = sub(from[1], from[0]);
  const vTo = sub(to[1], to[0]);
  const lenFrom = Math.max(dist(from[0], from[1]), 1e-6);
  const lenTo = Math.max(dist(to[0], to[1]), 1e-6);
  const k = similar ? lenTo / lenFrom : 1;
  const angFrom = Math.atan2(vFrom.y, vFrom.x);
  const angTo = Math.atan2(vTo.y, vTo.x);
  const deg = ((angTo - angFrom) * 180) / Math.PI;
  return (p: Vec) => {
    const scaled = {
      x: dest.x + (p.x - origin.x) * k,
      y: dest.y + (p.y - origin.y) * k,
    };
    const scaledOrigin = dest;
    return rotateAround(scaled, scaledOrigin, deg);
  };
}

export type ApplyGanResult = {
  figure: Figure;
  command: string;
  created: string[];
  animation?: FigureAnimation;
  error?: string;
};

export function applyGanCommand(figure: Figure, raw: string): ApplyGanResult {
  const command = parseGanCommand(raw);
  if (!command) {
    return { figure, command: raw, created: [], error: `Unknown GAN: ${raw}` };
  }
  const next = cloneFigure(figure);
  const created: string[] = [];
  let animation: FigureAnimation | undefined;

  const remember = (id: string) => {
    if (created.indexOf(id) < 0) {
      created.push(id);
    }
  };

  if (command.type === "triangle") {
    needPoint(next, command.a);
    needPoint(next, command.b);
    needPoint(next, command.c);
    addTriangle(next, command.a, command.b, command.c);
    remember("△" + command.a + command.b + command.c);
    animation = {
      type: "draw",
      from: next.points[command.a],
      to: next.points[command.b],
    };
  } else if (command.type === "point") {
    const pos =
      command.x !== undefined && command.y !== undefined
        ? vec(command.x, command.y)
        : needPoint(next, command.name);
    ensurePoint(next, command.name, pos);
    remember(command.name);
  } else if (command.type === "segment") {
    needPoint(next, command.a);
    needPoint(next, command.b);
    addStroke(next, command.a, command.b);
    remember(command.a + command.b);
    animation = { type: "draw", from: next.points[command.a], to: next.points[command.b] };
  } else if (command.type === "mid") {
    needPoint(next, command.a);
    needPoint(next, command.b);
    const name = command.name || nextPointName(next, ["M"]);
    const a = next.points[command.a];
    const b = next.points[command.b];
    ensurePoint(next, name, vec((a.x + b.x) / 2, (a.y + b.y) / 2), {
      constraint: { kind: "mid", a: command.a, b: command.b },
    });
    remember(name);
  } else if (command.type === "altitude") {
    needPoint(next, command.from);
    needPoint(next, command.ontoA);
    needPoint(next, command.ontoB);
    const name = nextPointName(next, ["H", "F"]);
    const from = next.points[command.from];
    const foot = footOfPerpendicular(
      from,
      next.points[command.ontoA],
      next.points[command.ontoB]
    );
    ensurePoint(next, name, foot, {
      constraint: {
        kind: "foot",
        from: command.from,
        ontoA: command.ontoA,
        ontoB: command.ontoB,
      },
    });
    addStroke(next, command.from, name, { dashed: true, construction: true });
    remember(name);
    remember("h(" + command.from + "," + command.ontoA + command.ontoB + ")");
    animation = { type: "draw", from, to: foot };
  } else if (command.type === "median") {
    needPoint(next, command.from);
    needPoint(next, command.ontoA);
    needPoint(next, command.ontoB);
    const midName = nextPointName(next, ["M"]);
    const a = next.points[command.ontoA];
    const b = next.points[command.ontoB];
    ensurePoint(next, midName, vec((a.x + b.x) / 2, (a.y + b.y) / 2), {
      constraint: { kind: "mid", a: command.ontoA, b: command.ontoB },
    });
    addStroke(next, command.from, midName, { dashed: true, construction: true });
    remember(midName);
    remember("m(" + command.from + "," + command.ontoA + command.ontoB + ")");
    animation = {
      type: "draw",
      from: next.points[command.from],
      to: next.points[midName],
    };
  } else if (command.type === "bisector") {
    const tri = triangleAtVertex(next, command.vertex);
    if (!tri) {
      return { figure, command: raw, created: [], error: "No triangle at " + command.vertex };
    }
    const opp = oppositeVertex(tri, command.vertex);
    if (!opp) {
      return { figure, command: raw, created: [], error: "Need two other vertices" };
    }
    const name = nextPointName(next, ["D"]);
    ensurePoint(next, name, next.points[opp[0]], {
      constraint: {
        kind: "bisect",
        vertex: command.vertex,
        left: opp[0],
        right: opp[1],
      },
    });
    addStroke(next, command.vertex, name, { dashed: true, construction: true });
    remember(name);
    remember("b(" + command.vertex + ")");
    animation = {
      type: "draw",
      from: next.points[command.vertex],
      to: next.points[name],
    };
  } else if (command.type === "perp-bisector") {
    needPoint(next, command.a);
    needPoint(next, command.b);
    const midName = nextPointName(next, ["M"]);
    const a = next.points[command.a];
    const b = next.points[command.b];
    ensurePoint(next, midName, vec((a.x + b.x) / 2, (a.y + b.y) / 2), {
      constraint: { kind: "mid", a: command.a, b: command.b },
    });
    const ab = unit(sub(b, a));
    const perp = { x: -ab.y, y: ab.x };
    const pName = nextPointName(next, ["P"]);
    const far = {
      x: next.points[midName].x + perp.x * 3,
      y: next.points[midName].y + perp.y * 3,
    };
    ensurePoint(next, pName, far);
    addStroke(next, midName, pName, { kind: "line", dashed: true, construction: true });
    remember(midName);
    remember("pb(" + command.a + command.b + ")");
  } else if (command.type === "parallel") {
    needPoint(next, command.point);
    needPoint(next, command.a);
    needPoint(next, command.b);
    const p = next.points[command.point];
    const dir = sub(next.points[command.b], next.points[command.a]);
    const qName = nextPointName(next, ["Q"]);
    ensurePoint(next, qName, { x: p.x + dir.x, y: p.y + dir.y });
    addStroke(next, command.point, qName, { kind: "line", dashed: true, construction: true });
    remember(qName);
  } else if (command.type === "perp") {
    needPoint(next, command.point);
    needPoint(next, command.a);
    needPoint(next, command.b);
    const p = next.points[command.point];
    const dir = unit(sub(next.points[command.b], next.points[command.a]));
    const n = { x: -dir.y, y: dir.x };
    const qName = nextPointName(next, ["Q"]);
    ensurePoint(next, qName, { x: p.x + n.x * 2, y: p.y + n.y * 2 });
    addStroke(next, command.point, qName, { kind: "line", dashed: true, construction: true });
    remember(qName);
  } else if (command.type === "intersect") {
    needPoint(next, command.a1);
    needPoint(next, command.a2);
    needPoint(next, command.b1);
    needPoint(next, command.b2);
    const name = command.name || nextPointName(next, ["X"]);
    ensurePoint(next, name, next.points[command.a1], {
      constraint: {
        kind: "intersect",
        a1: command.a1,
        a2: command.a2,
        b1: command.b1,
        b2: command.b2,
      },
    });
    remember(name);
  } else if (command.type === "circum") {
    needPoint(next, command.a);
    needPoint(next, command.b);
    needPoint(next, command.c);
    const id = "circ(" + command.a + command.b + command.c + ")";
    if (!next.circles.some((c) => c.id === id)) {
      next.circles.push({
        id,
        kind: "circum",
        a: command.a,
        b: command.b,
        c: command.c,
      });
    }
    remember(id);
  } else if (command.type === "in") {
    needPoint(next, command.a);
    needPoint(next, command.b);
    needPoint(next, command.c);
    const id = "inc(" + command.a + command.b + command.c + ")";
    if (!next.circles.some((c) => c.id === id)) {
      next.circles.push({
        id,
        kind: "in",
        a: command.a,
        b: command.b,
        c: command.c,
      });
    }
    remember(id);
  } else if (command.type === "circle-center") {
    needPoint(next, command.center);
    needPoint(next, command.through);
    const id = "circ(" + command.center + "," + command.through + ")";
    if (!next.circles.some((c) => c.id === id)) {
      next.circles.push({
        id,
        kind: "center-point",
        center: command.center,
        through: command.through,
      });
    }
    remember(id);
  } else if (command.type === "rotate") {
    const around = next.points[command.around];
    if (!around) {
      return { figure, command: raw, created: [], error: "Missing " + command.around };
    }
    animation = {
      type: "rotate",
      around,
      aroundName: command.around,
      names: command.names,
      deg: command.deg,
    };
    const rotated = rotateNamed(next, command.around, command.deg, command.names);
    Object.keys(rotated.points).forEach((name) => {
      next.points[name] = rotated.points[name];
    });
  } else if (command.type === "move") {
    const point = next.points[command.name];
    if (!point || !point.free) {
      return { figure, command: raw, created: [], error: "Cannot move " + command.name };
    }
    animation = {
      type: "move",
      name: command.name,
      from: { x: point.x, y: point.y },
      to: vec(command.x, command.y),
    };
    point.x = command.x;
    point.y = command.y;
  } else if (command.type === "move-to") {
    const point = next.points[command.name];
    const dest = needPoint(next, command.dest);
    if (!point || !point.free) {
      return { figure, command: raw, created: [], error: "Cannot move " + command.name };
    }
    animation = {
      type: "move",
      name: command.name,
      from: { x: point.x, y: point.y },
      to: dest,
    };
    point.x = dest.x;
    point.y = dest.y;
  } else if (command.type === "fit") {
    command.from.forEach((name) => needPoint(next, name));
    command.to.forEach((name) => needPoint(next, name));
    const map = mapFit(
      [next.points[command.from[0]], next.points[command.from[1]], next.points[command.from[2]]],
      [next.points[command.to[0]], next.points[command.to[1]], next.points[command.to[2]]],
      command.similar
    );
    const ghostPts: Record<string, Vec> = {};
    command.from.forEach((name, index) => {
      ghostPts[name + "'"] = map(next.points[name]);
      if (index === 0) {
        ghostPts[name + "'"] = {
          x: next.points[command.to[0]].x,
          y: next.points[command.to[0]].y,
        };
      }
    });
    next.ghost = {
      points: ghostPts,
      strokes: [
        { a: command.from[0] + "'", b: command.from[1] + "'", kind: "segment" },
        { a: command.from[1] + "'", b: command.from[2] + "'", kind: "segment" },
        { a: command.from[2] + "'", b: command.from[0] + "'", kind: "segment" },
      ],
    };
    animation = { type: "fit" };
    remember("fit");
  } else if (command.type === "mark-equal") {
    next.equalGroups.push({
      segments: command.segs.map((s) => segmentKey(s[0], s[1])),
      tick: next.equalGroups.length + 1,
    });
  } else if (command.type === "mark-angle") {
    next.angleEqualGroups.push({
      angles: command.angles,
      arcs: next.angleEqualGroups.length + 1,
    });
  } else if (command.type === "mark-right") {
    const rays = rightRays(next, command.vertex);
    if (!rays) {
      return { figure, command: raw, created: [], error: "No angle at " + command.vertex };
    }
    next.rights.push({ vertex: command.vertex, a: rays[0], b: rays[1] });
    remember("mark(90," + command.vertex + ")");
    const vertex = next.points[command.vertex];
    animation = { type: "draw", from: vertex, to: vertex };
  } else if (command.type === "mark-parallel") {
    next.parallels.push({
      segments: command.segs.map((s) => segmentKey(s[0], s[1])),
    });
  } else if (command.type === "label-len") {
    next.lengthLabels.push({ segment: segmentKey(command.seg[0], command.seg[1]), text: command.text });
  } else if (command.type === "label-ang") {
    next.angleLabels.push({ angle: command.angle, text: command.text });
  } else if (command.type === "label-area") {
    next.areaLabels.push({ triangle: command.triangle, text: command.text });
  } else if (command.type === "square") {
    const a = needPoint(next, command.a);
    const b = needPoint(next, command.b);
    const d = sub(b, a);
    const n = { x: -d.y, y: d.x };
    const cPos = { x: b.x + n.x, y: b.y + n.y };
    const dPos = { x: a.x + n.x, y: a.y + n.y };
    const cName = nextPointName(next, [command.b + "s"]);
    const dName = nextPointName(next, [command.a + "s"]);
    ensurePoint(next, cName, cPos);
    ensurePoint(next, dName, dPos);
    addStroke(next, command.b, cName);
    addStroke(next, cName, dName);
    addStroke(next, dName, command.a);
    remember("sq(" + command.a + command.b + ")");
  } else if (command.type === "highlight") {
    next.highlights = command.ids.slice();
  } else if (command.type === "axes") {
    next.showAxes = command.on;
  }

  resolveFigure(next);
  const token = compact(raw);
  if (next.applied.indexOf(token) < 0) {
    next.applied.push(token);
  }
  return { figure: next, command: token, created, animation };
}

export function applyGan(figure: Figure, raw: string): ApplyGanResult {
  const parts = splitGanCommands(raw);
  if (!parts.length) {
    return { figure, command: raw, created: [], error: "Empty GAN" };
  }
  let current = figure;
  let last: ApplyGanResult = { figure, command: raw, created: [] };
  const created: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    last = applyGanCommand(current, parts[i]);
    if (last.error) {
      return last;
    }
    current = last.figure;
    last.created.forEach((id) => {
      if (created.indexOf(id) < 0) {
        created.push(id);
      }
    });
  }
  return { ...last, figure: current, created, command: parts.join("; ") };
}

export function commandSatisfied(figure: Figure, raw: string): boolean {
  const command = parseGanCommand(raw);
  if (!command) {
    return false;
  }
  if (command.type === "triangle") {
    return hasTriangle(figure, command.a, command.b, command.c);
  }
  if (command.type === "segment") {
    return hasStroke(figure, command.a, command.b);
  }
  if (command.type === "point") {
    return Boolean(figure.points[command.name]);
  }
  if (command.type === "mid") {
    return Object.keys(figure.points).some((name) => {
      const c = figure.points[name].constraint;
      return c && c.kind === "mid" && segmentKey(c.a, c.b) === segmentKey(command.a, command.b);
    });
  }
  if (command.type === "altitude") {
    return Object.keys(figure.points).some((name) => {
      const c = figure.points[name].constraint;
      return (
        c &&
        c.kind === "foot" &&
        c.from === command.from &&
        segmentKey(c.ontoA, c.ontoB) === segmentKey(command.ontoA, command.ontoB)
      );
    });
  }
  if (command.type === "median") {
    return Object.keys(figure.points).some((name) => {
      const c = figure.points[name].constraint;
      return c && c.kind === "mid" && segmentKey(c.a, c.b) === segmentKey(command.ontoA, command.ontoB);
    });
  }
  if (command.type === "bisector") {
    return Object.keys(figure.points).some((name) => {
      const c = figure.points[name].constraint;
      return c && c.kind === "bisect" && c.vertex === command.vertex;
    });
  }
  if (command.type === "circum") {
    return figure.circles.some((c) => c.kind === "circum");
  }
  if (command.type === "in") {
    return figure.circles.some((c) => c.kind === "in");
  }
  if (command.type === "mark-right") {
    return figure.rights.some((r) => r.vertex === command.vertex);
  }
  if (command.type === "fit") {
    return Boolean(figure.ghost);
  }
  const token = compact(raw);
  return figure.applied.indexOf(token) >= 0;
}

export function isPlayableGan(raw: string): boolean {
  const command = parseGanCommand(raw);
  if (!command) {
    return false;
  }
  return (
    command.type === "triangle" ||
    command.type === "segment" ||
    command.type === "mid" ||
    command.type === "altitude" ||
    command.type === "median" ||
    command.type === "bisector" ||
    command.type === "perp-bisector" ||
    command.type === "parallel" ||
    command.type === "perp" ||
    command.type === "intersect" ||
    command.type === "circum" ||
    command.type === "in" ||
    command.type === "circle-center" ||
    command.type === "rotate" ||
    command.type === "move" ||
    command.type === "move-to" ||
    command.type === "fit" ||
    command.type === "mark-right" ||
    command.type === "mark-equal" ||
    command.type === "square"
  );
}

export function ganIdsForCommand(raw: string): string[] {
  const command = parseGanCommand(raw);
  if (!command) {
    return [];
  }
  if (command.type === "triangle") {
    return ["△" + command.a + command.b + command.c, command.a, command.b, command.c, command.a + command.b, command.b + command.c, command.c + command.a];
  }
  if (command.type === "segment") {
    return [command.a + command.b, command.a, command.b];
  }
  if (command.type === "point") {
    return [command.name];
  }
  if (command.type === "altitude") {
    return ["h(" + command.from + "," + command.ontoA + command.ontoB + ")", command.from, command.ontoA + command.ontoB];
  }
  if (command.type === "median") {
    return ["m(" + command.from + "," + command.ontoA + command.ontoB + ")", command.from];
  }
  if (command.type === "bisector") {
    return ["b(" + command.vertex + ")", "∠" + command.vertex, command.vertex];
  }
  if (command.type === "circum") {
    return ["circ(" + command.a + command.b + command.c + ")", "△" + command.a + command.b + command.c];
  }
  if (command.type === "in") {
    return ["inc(" + command.a + command.b + command.c + ")"];
  }
  if (command.type === "mark-right") {
    return ["∠" + command.vertex, command.vertex];
  }
  if (command.type === "fit") {
    return [
      "△" + command.from.join(""),
      "△" + command.to.join(""),
    ];
  }
  if (command.type === "rotate") {
    return [command.around, ...command.names];
  }
  if (command.type === "move" || command.type === "move-to") {
    return [command.name];
  }
  return [];
}

export function angleAt(figure: Figure, vertex: string): number | null {
  const tri = triangleAtVertex(figure, vertex);
  if (!tri) {
    return null;
  }
  const opp = oppositeVertex(tri, vertex);
  if (!opp) {
    return null;
  }
  return angleDeg(figure.points[opp[0]], figure.points[vertex], figure.points[opp[1]]);
}

export { triangleContaining };
