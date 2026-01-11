#!/usr/bin/env node

import { parseCLI } from "./cli.js";

// Parse CLI - commander will handle --help and --version automatically
const options = parseCLI();

// For now, just show options (will be replaced with actual implementation)
console.log("Options:", JSON.stringify(options, null, 2));
