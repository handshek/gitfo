import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format } from "date-fns";
import { parseDateRange } from "../../src/utils/date.js";

describe("parseDateRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-17T10:30:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to today through now", () => {
    const range = parseDateRange({});

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-07-17 00:00:00",
    );
    expect(range.end.toISOString()).toBe("2026-07-17T10:30:00.000Z");
  });

  it("parses --today", () => {
    const range = parseDateRange({ today: true });

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-07-17 00:00:00",
    );
    expect(range.end.toISOString()).toBe("2026-07-17T10:30:00.000Z");
  });

  it("parses --yesterday as a full day", () => {
    const range = parseDateRange({ yesterday: true });

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-07-16 00:00:00",
    );
    expect(format(range.end, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-07-16 23:59:59",
    );
  });

  it("parses --this-week and --week as the same date mode", () => {
    const thisWeek = parseDateRange({ thisWeek: true });
    const alias = parseDateRange({ week: true });

    expect(format(thisWeek.start, "yyyy-MM-dd")).toBe("2026-07-13");
    expect(thisWeek.end.toISOString()).toBe("2026-07-17T10:30:00.000Z");
    expect(alias).toEqual(thisWeek);
  });

  it("parses --last-week as a full week", () => {
    const range = parseDateRange({ lastWeek: true });

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-07-06 00:00:00",
    );
    expect(format(range.end, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-07-12 23:59:59",
    );
  });

  it("parses an exact --date", () => {
    const range = parseDateRange({ date: "2026-01-15" });

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-01-15 00:00:00",
    );
    expect(format(range.end, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-01-15 23:59:59",
    );
  });

  it("parses custom --since and --until bounds", () => {
    const range = parseDateRange({
      since: "2026-01-01",
      until: "2026-01-31",
    });

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-01-01 00:00:00",
    );
    expect(format(range.end, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-01-31 23:59:59",
    );
  });

  it("uses the current time when only --since is provided", () => {
    const range = parseDateRange({ since: "2026-01-01" });

    expect(format(range.start, "yyyy-MM-dd HH:mm:ss")).toBe(
      "2026-01-01 00:00:00",
    );
    expect(range.end.toISOString()).toBe("2026-07-17T10:30:00.000Z");
  });

  it("rejects invalid dates", () => {
    expect(() => parseDateRange({ date: "not-a-date" })).toThrow(
      "Invalid date format for --date",
    );
  });

  it("rejects conflicting date modes", () => {
    expect(() =>
      parseDateRange({ today: true, yesterday: true }),
    ).toThrow("Conflicting date options");
  });

  it("rejects --since after --until", () => {
    expect(() =>
      parseDateRange({ since: "2026-02-01", until: "2026-01-01" }),
    ).toThrow("--since must be before or equal to --until");
  });
});
