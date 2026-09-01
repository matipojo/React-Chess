import React, { useMemo, useRef, useState } from "react";
import { circleGeometry, cloneFigure, moveFreePoint, pointVec, rotateNamed, segmentKey } from "../../geometry/figure";
import { idsMatchHighlight } from "../../geometry/hitTest";
import { dist, midpoint, unit, sub, add, scale } from "../../geometry/math";
import { animationPointerPath } from "../../geometry/pointerPath";
import { Figure, FigureAnimation, Vec } from "../../geometry/types";
import PointerHandAnimation, { PointerHandHandle } from "../PointerHand/PointerHandAnimation";
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

export type GeometryCanvasHandle = {
  playAnimation: (animation: FigureAnimation, onComplete?: () => void) => void;
  cancelAnimation: () => void;
};

function previewFigure(figure: Figure, animation: FigureAnimation | null, t: number): Figure {
  if (!animation || t <= 0) {
    return figure;
  }
  if (animation.type === "move") {
    return moveFreePoint(cloneFigure(figure), animation.name, {
      x: animation.from.x + (animation.to.x - animation.from.x) * t,
      y: animation.from.y + (animation.to.y - animation.from.y) * t,
    });
  }
  if (animation.type === "rotate") {
    return rotateNamed(cloneFigure(figure), animation.aroundName, animation.deg * t, animation.names);
  }
  return figure;
}

function worldToClient(svg: SVGSVGElement, world: Vec): { x: number; y: number } {
  const ctm = svg.getScreenCTM?.();
  if (ctm && typeof svg.createSVGPoint === "function") {
    const pt = svg.createSVGPoint();
    pt.x = world.x;
    pt.y = -world.y;
    const loc = pt.matrixTransform(ctm);
    return { x: loc.x, y: loc.y };
  }
  const rect = svg.getBoundingClientRect();
  const viewBox = svg.viewBox && svg.viewBox.baseVal
    ? svg.viewBox.baseVal
    : { x: 0, y: 0, width: 1, height: 1 };
  const width = viewBox.width || rect.width || 1;
  const height = viewBox.height || rect.height || 1;
  return {
    x: rect.left + ((world.x - viewBox.x) / width) * rect.width,
    y: rect.top + ((-world.y - viewBox.y) / height) * rect.height,
  };
}

function figureBounds(figure: Figure, extra: Vec[] = []): { minX: number; minY: number; maxX: number; maxY: number } {
  const pts: Vec[] = Object.keys(figure.points).map((name) => figure.points[name]).concat(extra);
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

function angleArc(vertex: Vec, left: Vec, right: Vec, arcs: number): string {
  const ua = unit(sub(left, vertex));
  const ub = unit(sub(right, vertex));
  const r = 0.38;
  const paths: string[] = [];
  for (let i = 0; i < arcs; i++) {
    const rr = r + i * 0.08;
    const a1 = add(vertex, scale(ua, rr));
    const a2 = add(vertex, scale(ub, rr));
    const sweep = ua.x * ub.y - ua.y * ub.x < 0 ? 0 : 1;
    paths.push(
      `M ${a1.x} ${-a1.y} A ${rr} ${rr} 0 0 ${sweep} ${a2.x} ${-a2.y}`
    );
  }
  return paths.join(" ");
}

const GeometryCanvas = React.forwardRef<GeometryCanvasHandle, Props>(function GeometryCanvas(
  {
    figure,
    peekIds = [],
    locked,
    quiz,
    animation,
    onPointMove,
    onObjectClick,
  },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<string | null>(null);
  const pointerRef = useRef<PointerHandHandle>(null);
  const completeRef = useRef<(() => void) | null>(null);
  const [previewT, setPreviewT] = useState(0);
  const [activeAnimation, setActiveAnimation] = useState<FigureAnimation | null>(null);
  const liveAnimation = activeAnimation || animation || null;
  const displayFigure = useMemo(
    () => previewFigure(figure, liveAnimation, previewT),
    [figure, liveAnimation, previewT]
  );
  const bounds = useMemo(() => {
    const extra: Vec[] = [];
    if (liveAnimation && (liveAnimation.type === "move" || liveAnimation.type === "draw")) {
      extra.push(liveAnimation.from, liveAnimation.to);
    }
    return figureBounds(figure, extra);
  }, [figure, liveAnimation]);
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  const highlights = displayFigure.highlights.concat(peekIds);
  const ink =
    liveAnimation && liveAnimation.type === "draw" && previewT > 0
      ? {
          from: liveAnimation.from,
          to: {
            x: liveAnimation.from.x + (liveAnimation.to.x - liveAnimation.from.x) * previewT,
            y: liveAnimation.from.y + (liveAnimation.to.y - liveAnimation.from.y) * previewT,
          },
        }
      : null;

  const retryRef = useRef(0);
  const safetyRef = useRef(0);
  const figureRef = useRef(figure);
  figureRef.current = figure;
  const mountedRef = useRef(true);

  const finishPointer = () => {
    if (safetyRef.current) {
      window.clearTimeout(safetyRef.current);
      safetyRef.current = 0;
    }
    const done = completeRef.current;
    completeRef.current = null;
    done?.();
    if (mountedRef.current) {
      setActiveAnimation(null);
      setPreviewT(0);
    }
  };

  const cancelAnimation = () => {
    if (retryRef.current) {
      window.clearTimeout(retryRef.current);
      retryRef.current = 0;
    }
    pointerRef.current?.cancel();
    if (completeRef.current) {
      finishPointer();
    }
  };

  React.useImperativeHandle(ref, () => ({
    playAnimation: (next, onComplete) => {
      const started = Date.now();
      const attempt = () => {
        retryRef.current = 0;
        const svg = svgRef.current;
        const pointer = pointerRef.current;
        const path = animationPointerPath(next, figureRef.current);
        if (!svg || !pointer || !path) {
          if (Date.now() - started > 2000) {
            onComplete?.();
            return;
          }
          retryRef.current = window.setTimeout(attempt, 50);
          return;
        }
        if (completeRef.current) {
          pointer.cancel();
          finishPointer();
        }
        completeRef.current = onComplete || null;
        setActiveAnimation(next);
        setPreviewT(0);
        pointer.playDrag(worldToClient(svg, path.from), worldToClient(svg, path.to), {
          grab: path.grab,
          onProgress: setPreviewT,
          onComplete: finishPointer,
        });
        if (safetyRef.current) {
          window.clearTimeout(safetyRef.current);
        }
        safetyRef.current = window.setTimeout(() => {
          safetyRef.current = 0;
          pointer.cancel();
          if (completeRef.current) {
            finishPointer();
          }
        }, 3600);
      };
      attempt();
    },
    cancelAnimation,
  }));

  React.useEffect(() => {
    mountedRef.current = true;
    const pointer = pointerRef.current;
    return () => {
      mountedRef.current = false;
      if (retryRef.current) {
        window.clearTimeout(retryRef.current);
      }
      if (safetyRef.current) {
        window.clearTimeout(safetyRef.current);
      }
      pointer?.cancel();
    };
  }, []);

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

  const names = Object.keys(displayFigure.points);

  return (
    <div className="geometry-frame" data-quiz={quiz ? "true" : undefined}>
      <PointerHandAnimation ref={pointerRef} />
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
        {displayFigure.showAxes && (
          <g className="geometry-axes">
            <line x1={bounds.minX} y1={0} x2={bounds.maxX} y2={0} />
            <line x1={0} y1={-bounds.minY} x2={0} y2={-bounds.maxY} />
          </g>
        )}
        {displayFigure.circles.map((c) => {
          const geo = circleGeometry(displayFigure, c);
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
        {displayFigure.ghost &&
          displayFigure.ghost.strokes.map((s, index) => {
            const a = displayFigure.ghost!.points[s.a];
            const b = displayFigure.ghost!.points[s.b];
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
        {displayFigure.strokes.map((s, index) => {
          const a = pointVec(displayFigure, s.a);
          const b = pointVec(displayFigure, s.b);
          if (!a || !b) {
            return null;
          }
          const id = s.a + s.b;
          const active =
            idsMatchHighlight(id, highlights) ||
            idsMatchHighlight(segmentKey(s.a, s.b), highlights);
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
        {ink && (
          <line
            className="geometry-stroke is-dashed"
            x1={ink.from.x}
            y1={-ink.from.y}
            x2={ink.to.x}
            y2={-ink.to.y}
          />
        )}
        {displayFigure.equalGroups.map((g, gi) =>
          g.segments.map((seg) => {
            const a = pointVec(displayFigure, seg[0]);
            const b = pointVec(displayFigure, seg[1]);
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
        {displayFigure.rights.map((r, index) => {
          const v = pointVec(displayFigure, r.vertex);
          const a = pointVec(displayFigure, r.a);
          const b = pointVec(displayFigure, r.b);
          if (!v || !a || !b) {
            return null;
          }
          return (
            <path
              key={"rt" + index}
              className="geometry-mark"
              d={rightAnglePath(v, a, b)}
            />
          );
        })}
        {displayFigure.angleEqualGroups.map((g, gi) =>
          g.angles.map((ang) => {
            const vertex = ang.length === 1 ? ang : ang[1];
            const tri = displayFigure.triangles.find((t) => t.indexOf(vertex) >= 0);
            if (!tri) {
              return null;
            }
            const rest = tri.filter((n) => n !== vertex);
            const v = pointVec(displayFigure, vertex);
            const a = pointVec(displayFigure, rest[0]);
            const b = pointVec(displayFigure, rest[1]);
            if (!v || !a || !b) {
              return null;
            }
            return (
              <path
                key={"ang" + gi + ang}
                className="geometry-mark"
                d={angleArc(v, a, b, g.arcs)}
                fill="none"
              />
            );
          })
        )}
        {displayFigure.lengthLabels.map((l, index) => {
          const a = pointVec(displayFigure, l.segment[0]);
          const b = pointVec(displayFigure, l.segment[1]);
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
        {displayFigure.angleLabels.map((l, index) => {
          const vertex = l.angle.length === 1 ? l.angle : l.angle[1];
          const p = pointVec(displayFigure, vertex);
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
          const p = displayFigure.points[name];
          const active = idsMatchHighlight(name, highlights);
          return (
            <g
              key={name}
              className={active ? "geometry-point is-hot" : "geometry-point"}
              data-point={name}
            >
              <circle cx={p.x} cy={-p.y} r={p.free ? 0.09 : 0.07} />
              <text x={p.x + 0.14} y={-p.y - 0.14}>
                {name}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

export default GeometryCanvas;
