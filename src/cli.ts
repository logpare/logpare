#!/usr/bin/env node
import { parseArgs } from "node:util";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { compressText } from "./api.js";
import type { CompressOptions, OutputFormat } from "./types.js";

const VERSION = "0.2.0";

const HELP = `
logpare - Semantic log compression for LLM context windows

USAGE:
  logpare [options] [file...]
  cat logs.txt | logpare [options]

OPTIONS:
  -f, --format <fmt>      Output format: summary, detailed, json (default: summary)
  -o, --output <file>     Write output to file instead of stdout
  -d, --depth <n>         Parse tree depth (default: 4)
  -t, --threshold <n>     Similarity threshold 0.0-1.0 (default: 0.4)
  -c, --max-children <n>  Max children per node (default: 100)
  -m, --max-clusters <n>  Max total clusters (default: 1000)
  -n, --max-templates <n> Max templates in output (default: 50)
  -h, --help              Show this help message
  -v, --version           Show version number

EXAMPLES:
  logpare server.log
  cat /var/log/syslog | logpare --format json
  logpare --depth 5 --threshold 0.5 app.log -o templates.txt
  logpare access.log error.log --format detailed

DESCRIPTION:
  logpare uses the Drain algorithm to extract templates from repetitive log
  data, achieving 60-90% token reduction while preserving diagnostic information.
  This is useful for fitting more log context into LLM prompts.

  For more information: https://github.com/logpare/logpare
`;

interface ParsedArgs {
  format: OutputFormat;
  output: string | undefined;
  depth: number;
  threshold: number;
  maxChildren: number;
  maxClusters: number;
  maxTemplates: number;
  files: string[];
  help: boolean;
  version: boolean;
}

function parseCliArgs(): ParsedArgs {
  const { values, positionals } = parseArgs({
    options: {
      format: { type: "string", short: "f", default: "summary" },
      output: { type: "string", short: "o" },
      depth: { type: "string", short: "d", default: "4" },
      threshold: { type: "string", short: "t", default: "0.4" },
      "max-children": { type: "string", short: "c", default: "100" },
      "max-clusters": { type: "string", short: "m", default: "1000" },
      "max-templates": { type: "string", short: "n", default: "50" },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    allowPositionals: true,
  });

  const format = values.format as string;
  if (!["summary", "detailed", "json"].includes(format)) {
    console.error(
      `Error: Invalid format "${format}". Use: summary, detailed, json`
    );
    process.exit(1);
  }

  const depth = parseInt(values.depth as string, 10);
  const threshold = parseFloat(values.threshold as string);
  const maxChildren = parseInt(values["max-children"] as string, 10);
  const maxClusters = parseInt(values["max-clusters"] as string, 10);
  const maxTemplates = parseInt(values["max-templates"] as string, 10);

  if (isNaN(depth) || depth < 1) {
    console.error(
      `Error: Invalid depth "${values.depth}". Must be a positive integer.`
    );
    process.exit(1);
  }

  if (isNaN(threshold) || threshold < 0 || threshold > 1) {
    console.error(
      `Error: Invalid threshold "${values.threshold}". Must be a number between 0.0 and 1.0.`
    );
    process.exit(1);
  }

  if (isNaN(maxChildren) || maxChildren < 1) {
    console.error(
      `Error: Invalid max-children "${values["max-children"]}". Must be a positive integer.`
    );
    process.exit(1);
  }

  if (isNaN(maxClusters) || maxClusters < 1) {
    console.error(
      `Error: Invalid max-clusters "${values["max-clusters"]}". Must be a positive integer.`
    );
    process.exit(1);
  }

  if (isNaN(maxTemplates) || maxTemplates < 1) {
    console.error(
      `Error: Invalid max-templates "${values["max-templates"]}". Must be a positive integer.`
    );
    process.exit(1);
  }

  return {
    format: format as OutputFormat,
    output: values.output as string | undefined,
    depth,
    threshold,
    maxChildren,
    maxClusters,
    maxTemplates,
    files: positionals,
    help: values.help as boolean,
    version: values.version as boolean,
  };
}

function readInput(files: string[]): string {
  if (files.length > 0) {
    const contents: string[] = [];
    for (const file of files) {
      if (!existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }
      contents.push(readFileSync(file, "utf-8"));
    }
    return contents.join("\n");
  }

  // Read from stdin
  if (process.stdin.isTTY) {
    console.error(
      "Error: No input provided. Provide file(s) or pipe input via stdin."
    );
    console.error('Run "logpare --help" for usage information.');
    process.exit(1);
  }

  return readFileSync(0, "utf-8");
}

function main(): void {
  const args = parseCliArgs();

  if (args.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (args.version) {
    console.log(`logpare v${VERSION}`);
    process.exit(0);
  }

  const input = readInput(args.files);

  if (!input.trim()) {
    console.error("Error: Empty input");
    process.exit(1);
  }

  const options: CompressOptions = {
    format: args.format,
    maxTemplates: args.maxTemplates,
    drain: {
      depth: args.depth,
      simThreshold: args.threshold,
      maxChildren: args.maxChildren,
      maxClusters: args.maxClusters,
    },
  };

  const result = compressText(input, options);

  const output =
    args.format === "json"
      ? JSON.stringify(
          { templates: result.templates, stats: result.stats },
          null,
          2
        )
      : result.formatted;

  if (args.output) {
    writeFileSync(args.output, output, "utf-8");
    console.error(`Output written to ${args.output}`);
  } else {
    console.log(output);
  }
}

main();
