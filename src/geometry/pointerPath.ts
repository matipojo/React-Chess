import { rotateAround } from "./math";
import { Figure, FigureAnimation, Vec } from "./types";

export function animationPointerPath(
  animation: FigureAnimation,
  figure: Figure
): { from: Vec; to: Vec; grab: boolean } | null {
  if (animation.type === "draw") {
    if (animation.reverse) {
      return { from: animation.to, to: animation.from, grab: true };
    }
    return { from: animation.from, to: animation.to, grab: true };
  }
  if (animation.type === "move") {
    return { from: animation.from, to: animation.to, grab: true };
  }
  if (animation.type === "rotate") {
    const name = animation.names.find((item) => figure.points[item] && item !== animation.aroundName);
    const start = name ? figure.points[name] : animation.around;
    if (!start) {
      return null;
    }
    return {
      from: { x: start.x, y: start.y },
      to: rotateAround(start, animation.around, animation.deg),
      grab: true,
    };
  }
  if (animation.type === "fit") {
    const names = Object.keys(figure.points);
    const start = names.length ? figure.points[names[0]] : null;
    if (!start) {
      return null;
    }
    return { from: start, to: start, grab: false };
  }
  return null;
}
