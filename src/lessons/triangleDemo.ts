export const ALTITUDE_DEMO = {
  id: "altitude" as const,
  template: "right-at-C",
  title: "Altitude to the hypotenuse",
  paragraphs: [
    "Right triangle △ABC with the right angle at C. The altitude h(C,AB) meets the hypotenuse at a right angle.",
  ],
  stepTitle: "Drop the altitude",
  why: "From the right angle at C, the shortest path to hypotenuse AB is perpendicular to it.",
  gan: "h(C,AB)",
};

export function parseTriangleDemo(
  search: string
): "pointer" | "altitude" | null {
  const demo = new URLSearchParams(search).get("demo");
  if (demo === "pointer" || demo === "altitude") {
    return demo;
  }
  return null;
}
