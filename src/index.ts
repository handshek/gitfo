#!/usr/bin/env node

import { parseCLI } from "./cli.js";
import { parseDateRange, formatDateForGit } from "./utils/date.js";
import { getGitUserEmail } from "./utils/git.js";

// Parse CLI - commander will handle --help and --version automatically
const options = parseCLI();

// Main execution
(async () => {
  try {
    // Parse date range
    const dateRange = parseDateRange(options);
    const startDate = formatDateForGit(dateRange.start);
    const endDate = formatDateForGit(dateRange.end);

    console.log(`Analyzing: ${startDate} to ${endDate}`);

    // Get author
    const author = options.author || (await getGitUserEmail());
    if (author) {
      console.log(`Author: ${author}`);
    } else {
      console.log("Author: (not specified)");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }
})();
