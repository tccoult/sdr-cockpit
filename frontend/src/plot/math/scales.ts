export type ScaleType = "linear" | "log";

export interface ScaleDefinition {
  domain: [number, number];
  range: [number, number];
  type: ScaleType;
}

export function createScale(definition: ScaleDefinition) {
  const [d0, d1] = definition.domain;
  const [r0, r1] = definition.range;
  const span = d1 - d0 || 1;
  const factor = (r1 - r0) / span;

  return (value: number) => r0 + (value - d0) * factor;
}
