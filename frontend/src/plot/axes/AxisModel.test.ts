import { describe, expect, it } from "vitest";
import { AxisModel } from "./AxisModel";

describe("AxisModel", () => {
  it("generates ticks within range", () => {
    const model = new AxisModel({
      side: "bottom",
      ticksTarget: 5,
    });
    model.setRange([0, 10]);
    model.setSpanPx(100);
    const ticks = model.ticks();
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.value).toBeGreaterThanOrEqual(0);
      expect(tick.value).toBeLessThanOrEqual(10);
      expect(Number.isFinite(tick.px)).toBe(true);
      expect(tick.px).toBeGreaterThanOrEqual(0);
      expect(tick.px).toBeLessThanOrEqual(100);
    }
  });

  it("uses formatter when provided", () => {
    const model = new AxisModel({
      side: "left",
      ticksTarget: 4,
      format: (value) => `${value.toFixed(1)}dB`,
    });
    model.setRange([-50, 0]);
    model.setSpanPx(80);
    const ticks = model.ticks();
    expect(ticks[0].label.endsWith("dB")).toBe(true);
  });

  it("supports logarithmic scales", () => {
    const model = new AxisModel({
      side: "left",
      scale: "log",
    });
    model.setRange([1, 1_000]);
    model.setSpanPx(200);
    const ticks = model.ticks();
    expect(ticks.length).toBeGreaterThan(0);
    for (const tick of ticks) {
      expect(tick.value).toBeGreaterThan(0);
      expect(Number.isFinite(tick.px)).toBe(true);
    }
  });

  it("formats time axes with readable labels", () => {
    const start = Date.UTC(2024, 0, 1, 0, 0, 0);
    const end = Date.UTC(2024, 0, 1, 0, 0, 30);
    const model = new AxisModel({
      side: "bottom",
      scale: "time",
    });
    model.setRange([start, end]);
    model.setSpanPx(300);
    const ticks = model.ticks();
    expect(ticks.length).toBeGreaterThan(0);
    expect(ticks.every((tick) => Number.isFinite(tick.px))).toBe(true);
    expect(ticks.some((tick) => tick.label.includes(":"))).toBe(true);
  });
});
