import { Vec } from "./types";

export const EPS = 1e-6;

export function vec(x: number, y: number): Vec {
  return { x, y };
}

export function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a: Vec, k: number): Vec {
  return { x: a.x * k, y: a.y * k };
}

export function dot(a: Vec, b: Vec): number {
  return a.x * b.x + a.y * b.y;
}

export function cross(a: Vec, b: Vec): number {
  return a.x * b.y - a.y * b.x;
}

export function dist(a: Vec, b: Vec): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Vec, b: Vec): Vec {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function len(a: Vec): number {
  return Math.hypot(a.x, a.y);
}

export function unit(a: Vec): Vec {
  const n = len(a);
  if (n < EPS) {
    return { x: 1, y: 0 };
  }
  return { x: a.x / n, y: a.y / n };
}

export function rotateAround(p: Vec, origin: Vec, deg: number): Vec {
  const rad = (deg * Math.PI) / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const d = sub(p, origin);
  return {
    x: origin.x + d.x * c - d.y * s,
    y: origin.y + d.x * s + d.y * c,
  };
}

export function footOfPerpendicular(p: Vec, a: Vec, b: Vec): Vec {
  const ab = sub(b, a);
  const t = dot(sub(p, a), ab) / Math.max(dot(ab, ab), EPS);
  return add(a, scale(ab, t));
}

export function lineIntersection(a1: Vec, a2: Vec, b1: Vec, b2: Vec): Vec | null {
  const r = sub(a2, a1);
  const s = sub(b2, b1);
  const den = cross(r, s);
  if (Math.abs(den) < EPS) {
    return null;
  }
  const t = cross(sub(b1, a1), s) / den;
  return add(a1, scale(r, t));
}

export function angleDeg(left: Vec, vertex: Vec, right: Vec): number {
  const u = sub(left, vertex);
  const v = sub(right, vertex);
  const nu = len(u);
  const nv = len(v);
  if (nu < EPS || nv < EPS) {
    return 0;
  }
  const cos = Math.min(1, Math.max(-1, dot(u, v) / (nu * nv)));
  return (Math.acos(cos) * 180) / Math.PI;
}

export function triangleArea(a: Vec, b: Vec, c: Vec): number {
  return Math.abs(cross(sub(b, a), sub(c, a))) / 2;
}

export function circumcenter(a: Vec, b: Vec, c: Vec): Vec | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < EPS) {
    return null;
  }
  const a2 = a.x * a.x + a.y * a.y;
  const b2 = b.x * b.x + b.y * b.y;
  const c2 = c.x * c.x + c.y * c.y;
  return {
    x: (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d,
    y: (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d,
  };
}

export function incenter(a: Vec, b: Vec, c: Vec): Vec {
  const la = dist(b, c);
  const lb = dist(a, c);
  const lc = dist(a, b);
  const p = la + lb + lc;
  return {
    x: (la * a.x + lb * b.x + lc * c.x) / p,
    y: (la * a.y + lb * b.y + lc * c.y) / p,
  };
}

export function angleBisectorDirection(left: Vec, vertex: Vec, right: Vec): Vec {
  const u = unit(sub(left, vertex));
  const v = unit(sub(right, vertex));
  const s = add(u, v);
  if (len(s) < EPS) {
    return { x: -u.y, y: u.x };
  }
  return unit(s);
}

export function roundCoord(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function nearlyEqual(a: number, b: number, eps = 1e-3): boolean {
  return Math.abs(a - b) < eps;
}

export function nearlySame(a: Vec, b: Vec, eps = 1e-3): boolean {
  return dist(a, b) < eps;
}
