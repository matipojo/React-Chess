export type Vec = {
  x: number;
  y: number;
};

export type PointConstraint =
  | { kind: "mid"; a: string; b: string }
  | { kind: "foot"; from: string; ontoA: string; ontoB: string }
  | { kind: "intersect"; a1: string; a2: string; b1: string; b2: string }
  | { kind: "centroid"; a: string; b: string; c: string }
  | { kind: "bisect"; vertex: string; left: string; right: string };

export type PointDef = {
  name: string;
  x: number;
  y: number;
  free: boolean;
  constraint?: PointConstraint;
};

export type StrokeKind = "segment" | "line" | "ray";

export type StrokeDef = {
  a: string;
  b: string;
  kind: StrokeKind;
  dashed?: boolean;
  construction?: boolean;
};

export type CircleDef = {
  id: string;
  kind: "circum" | "in" | "center-point";
  a?: string;
  b?: string;
  c?: string;
  center?: string;
  through?: string;
};

export type EqualGroup = {
  segments: string[];
  tick: number;
};

export type AngleEqualGroup = {
  angles: string[];
  arcs: number;
};

export type RightMark = {
  vertex: string;
  a: string;
  b: string;
};

export type ParallelGroup = {
  segments: string[];
};

export type LengthLabel = {
  segment: string;
  text: string;
};

export type AngleLabel = {
  angle: string;
  text: string;
};

export type AreaLabel = {
  triangle: string;
  text: string;
};

export type GhostFigure = {
  points: Record<string, Vec>;
  strokes: StrokeDef[];
};

export type FigureAnimation =
  | { type: "draw"; from: Vec; to: Vec; reverse?: boolean }
  | { type: "move"; name: string; from: Vec; to: Vec }
  | { type: "rotate"; around: Vec; aroundName: string; names: string[]; deg: number }
  | { type: "fit" };

export type Figure = {
  points: Record<string, PointDef>;
  strokes: StrokeDef[];
  triangles: string[][];
  circles: CircleDef[];
  equalGroups: EqualGroup[];
  angleEqualGroups: AngleEqualGroup[];
  rights: RightMark[];
  parallels: ParallelGroup[];
  lengthLabels: LengthLabel[];
  angleLabels: AngleLabel[];
  areaLabels: AreaLabel[];
  highlights: string[];
  ghost?: GhostFigure;
  showAxes: boolean;
  applied: string[];
};

export type GanRefPart = {
  type: "ref";
  value: string;
  ids: string[];
  playable: boolean;
  command: string;
};

export type GanTextPart = { type: "text"; value: string } | GanRefPart;
