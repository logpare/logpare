'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { compressText } from 'logpare';
import type { CompressionResult, OutputFormat } from 'logpare';

const DEFAULT_LOGS = `ERROR Connection to 192.168.1.100 failed after 30s
ERROR Connection to 192.168.1.101 failed after 25s
ERROR Connection to 192.168.1.102 failed after 28s
INFO Request abc123 processed in 45ms
INFO Request xyz789 processed in 52ms
INFO Request def456 processed in 38ms
WARN Retry attempt 1 for task-001
WARN Retry attempt 2 for task-001
WARN Retry attempt 1 for task-002
DEBUG Cache hit for user_12345
DEBUG Cache hit for user_67890
DEBUG Cache miss for user_11111`;

const DATASETS = {
  basic: {
    name: 'Basic Example',
    logs: DEFAULT_LOGS,
    description: 'Simple log patterns with errors, info, warnings, and debug messages.',
  },
  hdfs: {
    name: 'HDFS Logs',
    logs: `081109 203518 143 INFO dfs.DataNode$PacketResponder: PacketResponder 1 for block blk_38865049064139660 terminating
081109 203518 144 INFO dfs.DataNode$PacketResponder: PacketResponder 0 for block blk_-6670958622368987959 terminating
081109 203519 146 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010
081109 203519 147 INFO dfs.DataNode$DataXceiver: Receiving block blk_-3544583377289625738 src: /10.250.10.6:40524 dest: /10.250.10.6:50010
081109 203520 148 INFO dfs.DataNode$PacketResponder: PacketResponder 1 for block blk_-1608999687919862906 terminating
081109 203521 150 INFO dfs.DataBlockScanner: Verification succeeded for blk_8229193803249955061
081109 203521 151 INFO dfs.DataBlockScanner: Verification succeeded for blk_-4980916519894289629`,
    description: 'Hadoop Distributed File System logs with block operations.',
  },
  spark: {
    name: 'Spark Logs',
    logs: `17/06/09 20:10:40 INFO SparkContext: Running Spark version 2.1.1
17/06/09 20:10:41 INFO SparkContext: Submitted application: PythonPi
17/06/09 20:10:42 INFO SparkEnv: Registering MapOutputTracker
17/06/09 20:10:42 INFO SparkEnv: Registering BlockManagerMaster
17/06/09 20:10:42 INFO SparkEnv: Registering OutputCommitCoordinator
17/06/09 20:10:43 INFO Utils: Successfully started service 'SparkUI' on port 4040
17/06/09 20:10:43 INFO Utils: Successfully started service 'org.apache.spark.network.netty.NettyBlockTransferService' on port 42765
17/06/09 20:10:43 INFO BlockManager: Using org.apache.spark.storage.RandomBlockReplicationPolicy for block replication policy
17/06/09 20:10:44 INFO SparkContext: Starting job: reduce at /home/user/pi.py:43
17/06/09 20:10:44 INFO MemoryStore: Block broadcast_0 stored as values in memory (estimated size 4.0 KB, free 366.3 MB)`,
    description: 'Apache Spark processing logs with service initialization.',
  },
  errors: {
    name: 'Error Analysis',
    logs: `ERROR [2024-01-15 10:23:45] Connection timeout to database db-prod-01 after 30s
ERROR [2024-01-15 10:23:46] Connection timeout to database db-prod-02 after 30s
ERROR [2024-01-15 10:24:12] Failed to authenticate user user_12345: invalid token
ERROR [2024-01-15 10:24:15] Failed to authenticate user user_67890: invalid token
ERROR [2024-01-15 10:25:01] API request failed: GET https://api.example.com/users 500 Internal Server Error
ERROR [2024-01-15 10:25:03] API request failed: POST https://api.example.com/orders 503 Service Unavailable
WARN [2024-01-15 10:25:10] Retry attempt 1/3 for request req-abc123
WARN [2024-01-15 10:25:15] Retry attempt 2/3 for request req-abc123
WARN [2024-01-15 10:25:18] Retry attempt 1/3 for request req-xyz789`,
    description: 'Error-focused logs for debugging and analysis.',
  },
} as const;

type DatasetKey = keyof typeof DATASETS;

const FORMATS: readonly OutputFormat[] = ['summary', 'detailed', 'json'] as const;

type Outcome =
  | { ok: true; result: CompressionResult }
  | { ok: false; message: string };

/**
 * Escapes a log body for embedding inside a backtick template literal in the
 * generated snippet, so pasted logs containing backticks or `${` stay valid code.
 */
const escapeForTemplateLiteral = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

/**
 * Interactive log-compression playground.
 *
 * logpare is dependency-free and imports no Node builtins, so `compressText()` runs
 * directly in the page and the result is prerendered on the server. There is no
 * sandboxed Node runtime to boot, which is what previously made this page unusable
 * on mobile Safari.
 */
export default function PlaygroundPage(): React.JSX.Element {
  const [selectedDataset, setSelectedDataset] = useState<DatasetKey>('basic');
  const [logs, setLogs] = useState<string>(DATASETS.basic.logs);
  const [depth, setDepth] = useState(4);
  const [simThreshold, setSimThreshold] = useState(0.4);
  const [format, setFormat] = useState<OutputFormat>('summary');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  // Return the copy button to its resting label a couple of seconds after an attempt.
  useEffect(() => {
    if (copyState === 'idle') return;
    const timer = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(timer);
  }, [copyState]);

  const dataset = DATASETS[selectedDataset];
  const isEdited = logs !== dataset.logs;

  /** Switches the active sample and replaces the editor body with its log lines. */
  const selectDataset = useCallback((key: DatasetKey): void => {
    setSelectedDataset(key);
    setLogs(DATASETS[key].logs);
  }, []);

  // logpare is a pure, dependency-free library, so compression runs inline in the
  // browser. No sandboxed Node runtime — those are unreliable on mobile Safari.
  const outcome = useMemo<Outcome>(() => {
    if (logs.trim() === '') {
      return { ok: false, message: 'Paste some log lines to see the compressed output.' };
    }
    try {
      return {
        ok: true,
        result: compressText(logs, { format, drain: { depth, simThreshold } }),
      };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : 'Compression failed.',
      };
    }
  }, [logs, format, depth, simThreshold]);

  const snippet = `import { compressText } from 'logpare';

const logs = \`${escapeForTemplateLiteral(logs)}\`;

// Drain algorithm options are nested under "drain";
// "format" and "maxTemplates" sit at the top level.
const result = compressText(logs, {
  format: '${format}',
  drain: {
    depth: ${depth},
    simThreshold: ${simThreshold},
  },
});

console.log(result.formatted);
`;

  /**
   * Copies the generated snippet, reporting the outcome on the button itself.
   * `navigator.clipboard` is undefined outside a secure context, and `writeText()`
   * rejects when the document is not focused or the permission is denied, so both
   * paths have to be handled or the failure surfaces as an unhandled rejection.
   */
  const copySnippet = useCallback((): void => {
    const { clipboard } = navigator;
    if (!clipboard) {
      setCopyState('failed');
      return;
    }
    void clipboard.writeText(snippet).then(
      () => setCopyState('copied'),
      () => setCopyState('failed')
    );
  }, [snippet]);

  const stats = outcome.ok ? outcome.result.stats : undefined;

  return (
    <div className="min-h-screen bg-fd-background text-fd-foreground">
      <header className="border-b border-fd-border px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-4 gap-y-2">
          <div>
            <h1 className="font-mono text-xl font-bold sm:text-2xl">Playground</h1>
            <p className="text-sm text-fd-muted-foreground">
              Try logpare compression in your browser
            </p>
          </div>
          <Link
            href="/docs"
            className="text-sm text-fd-muted-foreground hover:text-fd-foreground"
          >
            ← Back to Docs
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8">
          {/* Dataset selection */}
          <div>
            {/*
              A <label> needs a form control to name; these are buttons, so the group
              gets its name from role="group" + aria-labelledby instead.
            */}
            <span id="dataset-group-label" className="mb-2 block text-sm font-medium">
              Sample Dataset
            </span>
            <div
              role="group"
              aria-labelledby="dataset-group-label"
              className="grid grid-cols-2 gap-2"
            >
              {(Object.keys(DATASETS) as DatasetKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDataset(key)}
                  aria-pressed={selectedDataset === key}
                  className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                    selectedDataset === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-fd-border text-fd-foreground hover:bg-fd-accent'
                  }`}
                >
                  {DATASETS[key].name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-fd-muted-foreground">{dataset.description}</p>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div>
              <label htmlFor="depth" className="mb-2 block text-sm font-medium">
                Depth: {depth}
              </label>
              <input
                id="depth"
                type="range"
                min="2"
                max="8"
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <p className="mt-1 text-xs text-fd-muted-foreground">
                Parse tree depth (higher = more specific templates)
              </p>
            </div>

            <div>
              <label htmlFor="similarity" className="mb-2 block text-sm font-medium">
                Similarity: {simThreshold.toFixed(1)}
              </label>
              <input
                id="similarity"
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={simThreshold}
                onChange={(e) => setSimThreshold(parseFloat(e.target.value))}
                className="h-2 w-full cursor-pointer accent-primary"
              />
              <p className="mt-1 text-xs text-fd-muted-foreground">
                Matching threshold (lower = more grouping)
              </p>
            </div>

            <div>
              <span id="format-group-label" className="mb-2 block text-sm font-medium">
                Output Format
              </span>
              <div
                role="group"
                aria-labelledby="format-group-label"
                className="flex flex-wrap gap-2"
              >
                {FORMATS.map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormat(fmt)}
                    aria-pressed={format === fmt}
                    className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                      format === fmt
                        ? 'border-primary bg-primary text-fd-primary-foreground'
                        : 'border-fd-border text-fd-foreground hover:bg-fd-accent'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Input / output */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-2 lg:gap-8">
          <div className="flex flex-col">
            <div className="mb-2 flex items-center justify-between gap-2">
              <label htmlFor="logs" className="text-sm font-medium">
                Your logs
              </label>
              {isEdited && (
                <button
                  type="button"
                  onClick={() => setLogs(dataset.logs)}
                  className="text-xs text-fd-muted-foreground hover:text-fd-foreground"
                >
                  Reset to sample
                </button>
              )}
            </div>
            <textarea
              id="logs"
              value={logs}
              onChange={(e) => setLogs(e.target.value)}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              wrap="off"
              /* 16px on small screens keeps iOS Safari from zooming on focus. */
              className="h-64 w-full resize-y overflow-auto whitespace-pre rounded-lg border border-fd-border bg-fd-card p-3 font-mono text-base text-fd-card-foreground outline-none focus:border-primary sm:h-80 sm:text-sm"
            />
            <p className="mt-2 text-xs text-fd-muted-foreground">
              Paste your own logs — everything runs locally in your browser.
            </p>
          </div>

          <div className="flex min-w-0 flex-col">
            <span className="mb-2 block text-sm font-medium">Result</span>
            {outcome.ok ? (
              <>
                <dl className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Stat label="Input" value={`${stats?.inputLines ?? 0} lines`} />
                  <Stat label="Templates" value={`${stats?.uniqueTemplates ?? 0}`} />
                  <Stat
                    label="Compression"
                    value={`${((stats?.compressionRatio ?? 0) * 100).toFixed(1)}%`}
                  />
                  <Stat
                    label="Token savings"
                    value={`~${((stats?.estimatedTokenReduction ?? 0) * 100).toFixed(1)}%`}
                  />
                </dl>
                <pre className="h-64 overflow-auto rounded-lg border border-fd-border bg-fd-card p-3 font-mono text-xs leading-relaxed text-fd-card-foreground sm:h-80">
                  {outcome.result.formatted}
                </pre>
              </>
            ) : (
              <pre
                className={`h-64 overflow-auto rounded-lg border border-fd-border bg-fd-card p-3 font-mono text-xs sm:h-80 ${
                  logs.trim() === '' ? 'text-fd-muted-foreground' : 'text-red-600 dark:text-red-400'
                }`}
              >
                {outcome.message}
              </pre>
            )}
          </div>
        </div>

        {/* Equivalent code */}
        <div className="mt-6 lg:mt-8">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">Equivalent code</span>
            <button
              type="button"
              onClick={copySnippet}
              className="rounded border border-fd-border px-2 py-1 text-xs text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-foreground"
            >
              {copyState === 'copied' ? 'Copied' : copyState === 'failed' ? 'Copy failed' : 'Copy'}
            </button>
          </div>
          <pre className="max-h-80 overflow-auto rounded-lg border border-fd-border bg-fd-card p-3 font-mono text-xs leading-relaxed text-fd-card-foreground">
            {snippet}
          </pre>
        </div>

        <div className="mt-8 text-center text-sm text-fd-muted-foreground">
          <p>
            Learn more about{' '}
            <Link href="/docs/guides/parameter-tuning" className="text-primary hover:underline">
              parameter tuning
            </Link>{' '}
            and{' '}
            <Link href="/docs/guides/custom-preprocessing" className="text-primary hover:underline">
              custom preprocessing
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}

/** One labelled figure from the compression stats, sized to sit in a row of four. */
function Stat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="min-w-0 rounded-lg border border-fd-border bg-fd-card px-3 py-2">
      <dt className="truncate text-xs text-fd-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-sm font-medium text-fd-card-foreground">{value}</dd>
    </div>
  );
}
