import React, { useEffect, useMemo, useRef, useState } from "react";
import { circleGeometry, oppositeVertex, pointVec, segmentKey } from "../../geometry/figure";
import { idsMatchHighlight, isAngleHighlighted } from "../../geometry/hitTest";
import { dist, midpoint, unit, sub, add, scale } from "../../geometry/math";
import { Figure, FigureAnimation, Vec } from "../../geometry/types";
import "./GeometryCanvas.css";

type Props = {
  figure: Figure;
  peekIds?: string[];
  locked?: boolean;
  quiz?: boolean;
  animation?: FigureAnimation | null;
  onPointMove?: (name: string, position: Vec) => void;
  onObjectClick?: (id: string) => void;
};

function figureBounds(figure: Figure): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts: Vec[] = Object.keys(figure.points).map((name) => figure.points[name]);
  figure.circles.forEach((c) => {
    const geo = circleGeometry(figure, c);
    if (!geo) {
      return;
    }
    pts.push(
      { x: geo.center.x - geo.radius, y: geo.center.y - geo.radius },
      { x: geo.center.x + geo.radius, y: geo.center.y + geo.radius }
    );
  });
  if (!pts.length) {
    return { minX: -3.5, minY: -2.5, maxX: 3.5, maxY: 2.8 };
  }
  let minX = pts[0].x;
  let minY = pts[0].y;
  let maxX = pts[0].x;
  let maxY = pts[0].y;
  pts.forEach((p) => {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  });
  const pad = 1.35;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
}

function tickMark(a: Vec, b: Vec, count: number): string {
  const mid = midpoint(a, b);
  const dir = unit(sub(b, a));
  const n = { x: -dir.y, y: dir.x };
  const paths: string[] = [];
  const start = -(count - 1) * 0.06;
  for (let i = 0; i < count; i++) {
    const c = add(mid, scale(dir, start + i * 0.12));
    const p1 = add(c, scale(n, 0.12));
    const p2 = add(c, scale(n, -0.12));
    paths.push(`M ${p1.x} ${-p1.y} L ${p2.x} ${-p2.y}`);
  }
  return paths.join(" ");
}

function rightAnglePath(vertex: Vec, a: Vec, b: Vec): string {
  const ua = unit(sub(a, vertex));
  const ub = unit(sub(b, vertex));
  const s = 0.22;
  const p1 = add(vertex, scale(ua, s));
  const p2 = add(p1, scale(ub, s));
  const p3 = add(vertex, scale(ub, s));
  return `M ${p1.x} ${-p1.y} L ${p2.x} ${-p2.y} L ${p3.x} ${-p3.y}`;
}

function angleSweep(ua: Vec, ub: Vec): 0 | 1 {
  return ua.x * ub.y - ua.y * ub.x < 0 ? 0 : 1;
}

function angleArc(vertex: Vec, left: Vec, right: Vec, arcs: number): string {
  const ua = unit(sub(left, vertex));
  const ub = unit(sub(right, vertex));
  const r = 0.38;
  const paths: string[] = [];
  const sweep = angleSweep(ua, ub);
  for (let i = 0; i < arcs; i++) {
    const rr = r + i * 0.08;
    const a1 = add(vertex, scale(ua, rr));
    const a2 = add(vertex, scale(ub, rr));
    paths.push(
      `M ${a1.x} ${-a1.y} A ${rr} ${rr} 0 0 ${sweep} ${a2.x} ${-a2.y}`
    );
  }
  return paths.join(" ");
}

function angleSector(vertex: Vec, left: Vec, right: Vec): string {
  const ua = unit(sub(left, vertex));
  const ub = unit(sub(right, vertex));
  const r = 0.48;
  const a1 = add(vertex, scale(ua, r));
  const a2 = add(vertex, scale(ub, r));
  const sweep = angleSweep(ua, ub);
  return `M ${vertex.x} ${-vertex.y} L ${a1.x} ${-a1.y} A ${r} ${r} 0 0 ${sweep} ${a2.x} ${-a2.y} Z`;
}

export default function GeometryCanvas({
  figure,
  peekIds = [],
  locked,
  quiz,
  animation,
  onPointMove,
  onObjectClick,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<string | null>(null);
  const [hand, setHand] = useState<Vec | null>(null);
  const bounds = useMemo(() => figureBounds(figure), [figure]);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const highlights = figure.highlights.concat(peekIds);
  const hotAngles = figure.triangles.flatMap((t) =>
    t
      .map((vertex) => {
        const opp = oppositeVertex(t, vertex);
        if (!opp || !isAngleHighlighted(vertex, opp[0], opp[1], highlights)) {
          return null;
        }
        return { vertex, left: opp[0], right: opp[1] };
      })
      .filter((item): item is { vertex: string; left: string; right: string } => Boolean(item))
  );

  useEffect(() => {
    if (!animation) {
      setHand(null);
      return;
    }
    if (animation.type === "draw") {
      const from = animation.from;
      const to = animation.to;
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 700);
        setHand({
          x: from.x + (to.x - from.x) * t,
          y: from.y + (to.y - from.y) * t,
        });
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        }
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
    if (animation.type === "move") {
      const start = performance.now();
      let frame = 0;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / 700);
        setHand({
          x: animation.from.x + (animation.to.x - animation.from.x) * t,
          y: animation.from.y + (animation.to.y - animation.from.y) * t,
        });
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        }
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }
    return;
  }, [animation]);

  function clientToWorld(event: { clientX: number; clientY: number }): Vec | null {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) {
      return null;
    }
    const loc = pt.matrixTransform(ctm.inverse());
    return { x: loc.x, y: -loc.y };
  }

  function onPointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (locked) {
      return;
    }
    const world = clientToWorld(event);
    if (!world) {
      return;
    }
    if (quiz) {
      return;
    }
    const names = Object.keys(figure.points);
    let closestName: string | null = null;
    let closestD = 0.28;
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const p = figure.points[name];
      if (!p.free) {
        continue;
      }
      const d = dist(world, p);
      if (d < closestD) {
        closestName = name;
        closestD = d;
      }
    }
    if (closestName) {
      dragRef.current = closestName;
      (event.target as Element).setPointerCapture?.(event.pointerId);
    }
  }

  function onPointerMove(event: React.PointerEvent<SVGSVGElement>) {
    if (!dragRef.current || locked) {
      return;
    }
    const world = clientToWorld(event);
    if (!world) {
      return;
    }
    onPointMove?.(dragRef.current, world);
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onClick(event: React.MouseEvent<SVGSVGElement>) {
    if (!onObjectClick || dragRef.current) {
      return;
    }
    const world = clientToWorld(event);
    if (!world) {
      return;
    }
    let bestId = "";
    let bestD = 0.32;
    const names = Object.keys(figure.points);
    for (let i = 0; i < names.length; i++) {
      const name = names[i];
      const d = dist(world, figure.points[name]);
      if (d < bestD) {
        bestId = name;
        bestD = d;
      }
    }
    for (let i = 0; i < figure.strokes.length; i++) {
      const s = figure.strokes[i];
      const a = pointVec(figure, s.a);
      const b = pointVec(figure, s.b);
      if (!a || !b) {
        continue;
      }
      const d = dist(world, midpoint(a, b));
      if (d < bestD) {
        bestId = s.a + s.b;
        bestD = d + 0.04;
      }
    }
    for (let t = 0; t < figure.triangles.length; t++) {
      const tri = figure.triangles[t];
      for (let v = 0; v < tri.length; v++) {
        const vertex = tri[v];
        const d = dist(world, figure.points[vertex]);
        if (d < 0.45 && d + 0.05 < bestD) {
          bestId = "∠" + vertex;
          bestD = d + 0.05;
        }
      }
    }
    for (let i = 0; i < figure.circles.length; i++) {
      const geo = circleGeometry(figure, figure.circles[i]);
      if (!geo) {
        continue;
      }
      const d = Math.abs(dist(world, geo.center) - geo.radius);
      if (d < bestD) {
        bestId = figure.circles[i].id;
        bestD = d;
      }
    }
    if (bestId) {
      onObjectClick(bestId);
    }
  }

  const names = Object.keys(figure.points);

  return (
    <div className="geometry-frame" data-quiz={quiz ? "true" : undefined}>
      <svg
        ref={svgRef}
        className="geometry-canvas"
        viewBox={`${bounds.minX} ${-bounds.maxY} ${width} ${height}`}
        role="img"
        aria-label="Triangle figure"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={onClick}
      >
        {figure.showAxes && (
          <g className="geometry-axes">
            <line x1={bounds.minX} y1={0} x2={bounds.maxX} y2={0} />
            <line x1={0} y1={-bounds.minY} x2={0} y2={-bounds.maxY} />
          </g>
        )}
        {figure.circles.map((c) => {
          const geo = circleGeometry(figure, c);
          if (!geo) {
            return null;
          }
          const active = idsMatchHighlight(c.id, highlights);
          return (
            <circle
              key={c.id}
              className={active ? "geometry-circle is-hot" : "geometry-circle"}
              cx={geo.center.x}
              cy={-geo.center.y}
              r={geo.radius}
              fill="none"
            />
          );
        })}
        {figure.ghost &&
          figure.ghost.strokes.map((s, index) => {
            const a = figure.ghost!.points[s.a];
            const b = figure.ghost!.points[s.b];
            if (!a || !b) {
              return null;
            }
            return (
              <line
                key={"g" + index}
                className="geometry-ghost"
                x1={a.x}
                y1={-a.y}
                x2={b.x}
                y2={-b.y}
              />
            );
          })}
        {hotAngles.map((ang) => {
          const v = pointVec(figure, ang.vertex);
          const a = pointVec(figure, ang.left);
          const b = pointVec(figure, ang.right);
          if (!v || !a || !b) {
            return null;
          }
          return (
            <g key={"hot-ang-" + ang.vertex + ang.left + ang.right} data-angle={"∠" + ang.vertex}>
              <path className="geometry-angle is-hot" d={angleSector(v, a, b)} />
              <path className="geometry-angle-arc is-hot" d={angleArc(v, a, b, 1)} fill="none" />
            </g>
          );
        })}
        {figure.strokes.map((s, index) => {
          const a = pointVec(figure, s.a);
          const b = pointVec(figure, s.b);
          if (!a || !b) {
            return null;
          }
          const id = s.a + s.b;
          const angleLeg = hotAngles.some(
            (ang) =>
              segmentKey(s.a, s.b) === segmentKey(ang.vertex, ang.left) ||
              segmentKey(s.a, s.b) === segmentKey(ang.vertex, ang.right)
          );
          const active =
            idsMatchHighlight(id, highlights) ||
            idsMatchHighlight(segmentKey(s.a, s.b), highlights) ||
            angleLeg;
          const cls = [
            "geometry-stroke",
            s.dashed || s.construction ? "is-dashed" : "",
            active ? "is-hot" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <line
              key={index}
              className={cls}
              x1={a.x}
              y1={-a.y}
              x2={b.x}
              y2={-b.y}
            />
          );
        })}
        {figure.equalGroups.map((g, gi) =>
          g.segments.map((seg) => {
            const a = pointVec(figure, seg[0]);
            const b = pointVec(figure, seg[1]);
            if (!a || !b) {
              return null;
            }
            return (
              <path
                key={"eq" + gi + seg}
                className="geometry-mark"
                d={tickMark(a, b, g.tick)}
              />
            );
          })
        )}
        {figure.rights.map((r, index) => {
          const v = pointVec(figure, r.vertex);
          const a = pointVec(figure, r.a);
          const b = pointVec(figure, r.b);
          if (!v || !a || !b) {
            return null;
          }
          const hot = isAngleHighlighted(r.vertex, r.a, r.b, highlights);
          return (
            <path
              key={"rt" + index}
              className={hot ? "geometry-mark is-hot" : "geometry-mark"}
              d={rightAnglePath(v, a, b)}
            />
          );
        })}
        {figure.angleEqualGroups.map((g, gi) =>
          g.angles.map((ang) => {
            const vertex = ang.length === 1 ? ang : ang[1];
            const tri = figure.triangles.find((t) => t.indexOf(vertex) >= 0);
            if (!tri) {
              return null;
            }
            const rest = tri.filter((n) => n !== vertex);
            const v = pointVec(figure, vertex);
            const a = pointVec(figure, rest[0]);
            const b = pointVec(figure, rest[1]);
            if (!v || !a || !b) {
              return null;
            }
            const hot = isAngleHighlighted(vertex, rest[0], rest[1], highlights);
            return (
              <path
                key={"ang" + gi + ang}
                className={hot ? "geometry-mark is-hot" : "geometry-mark"}
                d={angleArc(v, a, b, g.arcs)}
                fill="none"
              />
            );
          })
        )}
        {figure.lengthLabels.map((l, index) => {
          const a = pointVec(figure, l.segment[0]);
          const b = pointVec(figure, l.segment[1]);
          if (!a || !b) {
            return null;
          }
          const mid = midpoint(a, b);
          return (
            <text
              key={"ll" + index}
              className="geometry-label"
              x={mid.x}
              y={-mid.y - 0.18}
            >
              {l.text}
            </text>
          );
        })}
        {figure.angleLabels.map((l, index) => {
          const vertex = l.angle.length === 1 ? l.angle : l.angle[1];
          const p = pointVec(figure, vertex);
          if (!p) {
            return null;
          }
          return (
            <text
              key={"al" + index}
              className="geometry-label"
              x={p.x + 0.2}
              y={-p.y - 0.28}
            >
              {l.text}°
            </text>
          );
        })}
        {names.map((name) => {
          const p = figure.points[name];
          const active =
            idsMatchHighlight(name, highlights) ||
            hotAngles.some((ang) => ang.vertex === name);
          return (
            <g key={name} className={active ? "geometry-point is-hot" : "geometry-point"}>
              <circle cx={p.x} cy={-p.y} r={p.free ? 0.09 : 0.07} />
              <text x={p.x + 0.14} y={-p.y - 0.14}>
                {name}
              </text>
            </g>
          );
        })}
        {hand && (
          <g className="geometry-hand">
            <circle cx={hand.x} cy={-hand.y} r={0.14} />
          </g>
        )}
      </svg>
    </div>
  );
}
