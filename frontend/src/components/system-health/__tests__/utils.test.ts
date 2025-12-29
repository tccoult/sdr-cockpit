import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatRelativeTimestamp } from "../utils";

describe("formatRelativeTimestamp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-12-29T14:30:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows seconds ago for timestamps < 1 minute old", () => {
    const now = Date.now();
    expect(formatRelativeTimestamp(now - 30 * 1000)).toBe("30s ago");
    expect(formatRelativeTimestamp(now - 1 * 1000)).toBe("1s ago");
    expect(formatRelativeTimestamp(now - 59 * 1000)).toBe("59s ago");
  });

  it("shows minutes ago for timestamps < 1 hour old", () => {
    const now = Date.now();
    expect(formatRelativeTimestamp(now - 60 * 1000)).toBe("1m ago");
    expect(formatRelativeTimestamp(now - 5 * 60 * 1000)).toBe("5m ago");
    expect(formatRelativeTimestamp(now - 59 * 60 * 1000)).toBe("59m ago");
  });

  it("shows absolute timestamp for timestamps >= 1 hour old", () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const result = formatRelativeTimestamp(oneHourAgo);

    // Should not be relative format
    expect(result).not.toMatch(/ago$/);
    // Should contain time components (hour and minute)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
