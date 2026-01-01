import { describe, it, expect, beforeAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_ESM = resolve(__dirname, '../dist/cli.js');
const CLI_CJS = resolve(__dirname, '../dist/cli.cjs');
const FIXTURES = resolve(__dirname, 'fixtures');

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

function runCli(args: string[], input?: string, cjs = false): CliResult {
  const cli = cjs ? CLI_CJS : CLI_ESM;
  try {
    const result = spawnSync('node', [cli, ...args], {
      input,
      encoding: 'utf-8',
      timeout: 30000,
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: String(error),
      exitCode: 1,
    };
  }
}

describe('CLI Integration Tests', () => {
  beforeAll(() => {
    if (!existsSync(CLI_ESM)) {
      throw new Error('dist/cli.js not found. Run `pnpm build` first.');
    }
  });

  describe('ESM CLI (dist/cli.js)', () => {
    it('should show help with --help', () => {
      const { stdout, exitCode } = runCli(['--help']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('logpare');
      expect(stdout).toContain('USAGE');
      expect(stdout).toContain('OPTIONS');
    });

    it('should show help with -h', () => {
      const { stdout, exitCode } = runCli(['-h']);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('logpare');
    });

    it('should show version with --version', () => {
      const { stdout, exitCode } = runCli(['--version']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/logpare v\d+\.\d+\.\d+/);
    });

    it('should show version with -v', () => {
      const { stdout, exitCode } = runCli(['-v']);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/logpare v\d+\.\d+\.\d+/);
    });

    it('should process file input', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli([testFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should process stdin input', () => {
      const input = 'INFO test line 1\nINFO test line 2\nINFO test line 3';
      const { stdout, exitCode } = runCli([], input);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should support --format json', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['--format', 'json', testFile]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.templates).toBeDefined();
      expect(parsed.stats).toBeDefined();
      expect(Array.isArray(parsed.templates)).toBe(true);
    });

    it('should support -f json', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['-f', 'json', testFile]);
      expect(exitCode).toBe(0);
      expect(() => JSON.parse(stdout)).not.toThrow();
    });

    it('should support --format detailed', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['--format', 'detailed', testFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Details');
    });

    it('should support --format summary (default)', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['--format', 'summary', testFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should error on invalid format', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stderr, exitCode } = runCli(['--format', 'invalid', testFile]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid format');
    });

    it('should error on missing file', () => {
      const { stderr, exitCode } = runCli(['nonexistent-file.log']);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('File not found');
    });

    it('should error on empty input', () => {
      const { stderr, exitCode } = runCli([], '');
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Empty input');
    });

    it('should handle multiple files', () => {
      const file1 = resolve(FIXTURES, 'hdfs.log');
      const file2 = resolve(FIXTURES, 'spark.log');
      const { stdout, exitCode } = runCli([file1, file2]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should support --depth option', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['--depth', '5', testFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should support --threshold option', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['--threshold', '0.5', testFile]);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should support --max-templates option', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['-f', 'json', '--max-templates', '3', testFile]);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.templates.length).toBeLessThanOrEqual(3);
    });

    it('should write to output file with --output', () => {
      const inputFile = resolve(FIXTURES, 'hdfs.log');
      const outputFile = resolve(__dirname, '../.test-output.txt');

      try {
        const { stderr, exitCode } = runCli(['--output', outputFile, inputFile]);
        expect(exitCode).toBe(0);
        expect(stderr).toContain(`Output written to ${outputFile}`);
        expect(existsSync(outputFile)).toBe(true);

        const content = readFileSync(outputFile, 'utf-8');
        expect(content).toContain('Summary');
      } finally {
        if (existsSync(outputFile)) {
          unlinkSync(outputFile);
        }
      }
    });

    it('should error on invalid depth', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stderr, exitCode } = runCli(['--depth', 'abc', testFile]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid depth');
    });

    it('should error on invalid threshold', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stderr, exitCode } = runCli(['--threshold', '2.0', testFile]);
      expect(exitCode).toBe(1);
      expect(stderr).toContain('Invalid threshold');
    });
  });

  describe('CJS CLI (dist/cli.cjs)', () => {
    beforeAll(() => {
      if (!existsSync(CLI_CJS)) {
        throw new Error('dist/cli.cjs not found. Run `pnpm build` first.');
      }
    });

    it('should show version with --version (CJS)', () => {
      const { stdout, exitCode } = runCli(['--version'], undefined, true);
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/logpare v\d+\.\d+\.\d+/);
    });

    it('should show help with --help (CJS)', () => {
      const { stdout, exitCode } = runCli(['--help'], undefined, true);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('logpare');
      expect(stdout).toContain('USAGE');
    });

    it('should process file input (CJS)', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli([testFile], undefined, true);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should process stdin input (CJS)', () => {
      const input = 'INFO test line 1\nINFO test line 2\nINFO test line 3';
      const { stdout, exitCode } = runCli([], input, true);
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Summary');
    });

    it('should support --format json (CJS)', () => {
      const testFile = resolve(FIXTURES, 'hdfs.log');
      const { stdout, exitCode } = runCli(['--format', 'json', testFile], undefined, true);
      expect(exitCode).toBe(0);
      const parsed = JSON.parse(stdout);
      expect(parsed.templates).toBeDefined();
      expect(parsed.stats).toBeDefined();
    });
  });
});

describe('CLI Edge Cases', () => {
  it('should handle whitespace-only input', () => {
    const { stderr, exitCode } = runCli([], '   \n   \n   ');
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Empty input');
  });

  it('should handle very large input', () => {
    const lines = Array.from({ length: 1000 }, (_, i) =>
      `INFO Request ${i} from 192.168.1.1 completed in 50ms`
    ).join('\n');

    const { stdout, exitCode } = runCli(['-f', 'json'], lines);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed.stats.inputLines).toBe(1000);
  });

  it('should handle special characters in logs', () => {
    const input = 'Error: "unexpected <token>" at [line 5]\nError: "unexpected <token>" at [line 10]';
    const { stdout, exitCode } = runCli([], input);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Summary');
  });
});
