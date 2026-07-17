import {
  startOfDay,
  endOfDay,
  subDays,
  parseISO,
  isValid,
  startOfWeek,
  endOfWeek,
  subWeeks,
} from "date-fns";
import { CLIOptions, DateRange } from "../types.js";

export function getToday(): Date {
  return startOfDay(new Date());
}

export function getYesterday(): DateRange {
  const yesterday = subDays(new Date(), 1);
  return {
    start: startOfDay(yesterday),
    end: endOfDay(yesterday),
  };
}

export function getThisWeek(): DateRange {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: now,
  };
}

export function getLastWeek(): DateRange {
  const lastWeek = subWeeks(new Date(), 1);
  return {
    start: startOfWeek(lastWeek, { weekStartsOn: 1 }),
    end: endOfWeek(lastWeek, { weekStartsOn: 1 }),
  };
}

export function formatDateForGit(date: Date): string {
  return date.toISOString();
}

export function parseDateRange(options: CLIOptions): DateRange {
  validateDateOptionConflicts(options);

  if (options.thisWeek || options.week) {
    return getThisWeek();
  }

  if (options.lastWeek) {
    return getLastWeek();
  }

  if (options.yesterday) {
    return getYesterday();
  }

  if (options.today) {
    const today = getToday();
    return {
      start: startOfDay(today),
      end: new Date(), // Current time, not end of day
    };
  }

  if (options.date) {
    const date = parseDateOption(options.date, "date");
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  if (options.since || options.until) {
    const start = options.since
      ? startOfDay(parseDateOption(options.since, "since"))
      : new Date(0);
    const end = options.until
      ? endOfDay(parseDateOption(options.until, "until"))
      : new Date();

    if (start > end) {
      throw new Error("--since must be before or equal to --until.");
    }

    return { start, end };
  }

  const today = getToday();
  return {
    start: startOfDay(today),
    end: new Date(),
  };
}

function parseDateOption(value: string, optionName: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(
      `Invalid date format for --${optionName}: ${value}. Use YYYY-MM-DD format.`,
    );
  }

  const date = parseISO(value);

  if (!isValid(date)) {
    throw new Error(
      `Invalid date format for --${optionName}: ${value}. Use YYYY-MM-DD format.`,
    );
  }

  return date;
}

function validateDateOptionConflicts(options: CLIOptions): void {
  const selectedModes = [
    options.date ? "--date" : null,
    options.today ? "--today" : null,
    options.yesterday ? "--yesterday" : null,
    options.thisWeek ? "--this-week" : null,
    options.lastWeek ? "--last-week" : null,
    options.week ? "--week" : null,
    options.since || options.until ? "--since/--until" : null,
  ].filter((mode): mode is string => mode !== null);

  if (options.thisWeek && options.week) {
    selectedModes.splice(selectedModes.indexOf("--week"), 1);
  }

  if (selectedModes.length > 1) {
    throw new Error(
      `Conflicting date options: ${selectedModes.join(", ")}. Choose one date mode.`,
    );
  }
}
