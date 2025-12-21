import { describe, it, expect } from "vitest";
import {
  DEFAULT_PATTERNS,
  WILDCARD,
  applyPatterns,
} from "../src/preprocessing/patterns.js";
import {
  defaultStrategy,
  defineStrategy,
} from "../src/preprocessing/default.js";

describe("DEFAULT_PATTERNS", () => {
  it("should match IPv4 addresses", () => {
    const line = "Connection from 192.168.1.100 established";
    const result = applyPatterns(line, { ipv4: DEFAULT_PATTERNS.ipv4 });

    expect(result).toBe("Connection from <*> established");
  });

  it("should match multiple IPs", () => {
    const line = "src: 10.0.0.1 dest: 10.0.0.2";
    const result = applyPatterns(line, { ipv4: DEFAULT_PATTERNS.ipv4 });

    expect(result).toBe("src: <*> dest: <*>");
  });

  it("should match UUIDs", () => {
    const line = "Request 550e8400-e29b-41d4-a716-446655440000 started";
    const result = applyPatterns(line, { uuid: DEFAULT_PATTERNS.uuid });

    expect(result).toBe("Request <*> started");
  });

  it("should match ISO timestamps", () => {
    const line = "[2025-12-18T10:30:45.123Z] INFO Starting";
    const result = applyPatterns(line, {
      isoTimestamp: DEFAULT_PATTERNS.isoTimestamp,
    });

    expect(result).toBe("[<*>] INFO Starting");
  });

  it("should match Unix timestamps", () => {
    const line = "Event at 1702891845123 completed";
    const result = applyPatterns(line, {
      unixTimestamp: DEFAULT_PATTERNS.unixTimestamp,
    });

    expect(result).toBe("Event at <*> completed");
  });

  it("should match file paths", () => {
    const line = "Reading /var/log/syslog file";
    const result = applyPatterns(line, { filePath: DEFAULT_PATTERNS.filePath });

    expect(result).toBe("Reading <*> file");
  });

  it("should match hex IDs", () => {
    const line = "Memory at 0x7fff5fbff8c0 freed";
    const result = applyPatterns(line, { hexId: DEFAULT_PATTERNS.hexId });

    expect(result).toBe("Memory at <*> freed");
  });

  it("should match block IDs (HDFS)", () => {
    const line = "Received block blk_-1234567890123456789";
    const result = applyPatterns(line, { blockId: DEFAULT_PATTERNS.blockId });

    expect(result).toBe("Received block <*>");
  });

  it("should match numbers", () => {
    const line = "Processed 1500 items in 250ms";
    const result = applyPatterns(line, { numbers: DEFAULT_PATTERNS.numbers });

    // Numbers with units (250ms) are matched as a whole
    expect(result).toBe("Processed <*> items in <*>");
  });

  it("should match URLs", () => {
    const line = "Fetching https://api.example.com/v1/users";
    const result = applyPatterns(line, { url: DEFAULT_PATTERNS.url });

    expect(result).toBe("Fetching <*>");
  });

  it("should apply all default patterns", () => {
    const line =
      "2025-12-18T10:30:45Z Request 550e8400-e29b-41d4-a716-446655440000 from 192.168.1.1 completed in 150ms";
    const result = applyPatterns(line, DEFAULT_PATTERNS);

    expect(result).toContain("<*>");
    expect(result).not.toContain("192.168.1.1");
    expect(result).not.toContain("550e8400");
    expect(result).not.toContain("150ms");
  });
});

describe("defaultStrategy", () => {
  it("should preprocess with default patterns", () => {
    const line = "Connection from 10.0.0.1 on port 8080";
    const result = defaultStrategy.preprocess(line);

    expect(result).toContain("<*>");
  });

  it("should tokenize by whitespace", () => {
    const line = "ERROR  multiple   spaces   here";
    const tokens = defaultStrategy.tokenize(line);

    expect(tokens).toEqual(["ERROR", "multiple", "spaces", "here"]);
  });

  it("should filter empty tokens", () => {
    const line = "  leading and trailing  ";
    const tokens = defaultStrategy.tokenize(line);

    expect(tokens).toEqual(["leading", "and", "trailing"]);
  });

  it("should return constant similarity threshold", () => {
    expect(defaultStrategy.getSimThreshold(0)).toBe(0.4);
    expect(defaultStrategy.getSimThreshold(5)).toBe(0.4);
    expect(defaultStrategy.getSimThreshold(100)).toBe(0.4);
  });
});

describe("defineStrategy", () => {
  it("should use default when no overrides", () => {
    const strategy = defineStrategy({});

    expect(strategy.getSimThreshold(0)).toBe(0.4);
    expect(strategy.tokenize("a b c")).toEqual(["a", "b", "c"]);
  });

  it("should allow custom patterns", () => {
    const strategy = defineStrategy({
      patterns: {
        customId: /req-[a-z0-9]+/gi,
      },
    });

    const result = strategy.preprocess("Request req-abc123 started");
    expect(result).toContain("<*>");
  });

  it("should allow custom tokenizer", () => {
    const strategy = defineStrategy({
      tokenize: (line) => line.split(",").map((t) => t.trim()),
    });

    const tokens = strategy.tokenize("a, b, c");
    expect(tokens).toEqual(["a", "b", "c"]);
  });

  it("should allow custom similarity threshold", () => {
    const strategy = defineStrategy({
      getSimThreshold: (depth) => (depth < 2 ? 0.5 : 0.3),
    });

    expect(strategy.getSimThreshold(0)).toBe(0.5);
    expect(strategy.getSimThreshold(1)).toBe(0.5);
    expect(strategy.getSimThreshold(2)).toBe(0.3);
    expect(strategy.getSimThreshold(5)).toBe(0.3);
  });

  it("should allow custom preprocessor", () => {
    const strategy = defineStrategy({
      preprocess: (line) => line.toUpperCase(),
    });

    expect(strategy.preprocess("hello")).toBe("HELLO");
  });
});

describe("WILDCARD constant", () => {
  it("should be the expected value", () => {
    expect(WILDCARD).toBe("<*>");
  });
});
