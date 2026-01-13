import { startOfDay, endOfDay, subDays, parseISO, isValid } from "date-fns";
import { CLIOptions, DateRange } from "../types.js";

export function getToday(): Date {
  return startOfDay(new Date());
}

export function getLast7Days(): DateRange {
  const today = new Date();
  return {
    start: startOfDay(subDays(today, 6)), // 7 days ago (including today)
    end: endOfDay(today),
  };
}

export function formatDateForGit(date: Date): string {
  return date.toISOString();
}

export function parseDateRange(options: CLIOptions): DateRange {
  // Handle relative date options first
  if (options.week) {
    return getLast7Days();
  }

  if (options.today) {
    const today = getToday();
    return {
      start: startOfDay(today),
      end: new Date(), // Current time, not end of day
    };
  }

  // Handle specific date
  if (options.date) {
    const date = parseISO(options.date);
    if (!isValid(date)) {
      throw new Error(
        `Invalid date format: ${options.date}. Use YYYY-MM-DD format.`
      );
    }
    return {
      start: startOfDay(date),
      end: endOfDay(date),
    };
  }

  const today = getToday();
  return {
    start: startOfDay(today),
    end: new Date(),
  };
}
