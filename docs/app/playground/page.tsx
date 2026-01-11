'use client';

import { useState, useEffect } from 'react';
import { Sandpack } from '@codesandbox/sandpack-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';

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
};

export default function PlaygroundPage(): React.JSX.Element {
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof DATASETS>('basic');
  const [options, setOptions] = useState({
    depth: 4,
    simThreshold: 0.4,
    format: 'summary' as 'summary' | 'detailed' | 'json',
  });
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();

  // Avoid hydration mismatch by only rendering Sandpack on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const dataset = DATASETS[selectedDataset];

  const escapeForTemplateLiteral = (value: string): string =>
    value
      .replace(/\\/g, '\\\\')
      .replace(/`/g, '\\`')
      .replace(/\$\{/g, '\\${');

  const appCode = `import { compressText } from 'logpare';

// ${dataset.name}
const logs = \`${escapeForTemplateLiteral(dataset.logs)}\`;

const options = {
  depth: ${options.depth},
  simThreshold: ${options.simThreshold},
  format: '${options.format}',
};

const result = compressText(logs, options);

console.log('📊 Compression Stats:');
console.log(\`  • Input: \${result.stats.inputLines} lines\`);
console.log(\`  • Templates: \${result.stats.uniqueTemplates}\`);
console.log(\`  • Compression: \${(result.stats.compressionRatio * 100).toFixed(1)}% reduction\`);
console.log(\`  • Token savings: ~\${result.stats.estimatedTokenReduction}%\`);
console.log('');
console.log(result.formatted);

export default result;
`;

  return (
    <div className="min-h-screen bg-fd-background">
      <header className="border-b border-fd-border px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-mono font-bold text-2xl">Playground</h1>
            <p className="text-fd-muted-foreground text-sm">
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

      <main className="max-w-6xl mx-auto px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
          {/* Dataset Selection */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium mb-2">Sample Dataset</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(DATASETS) as (keyof typeof DATASETS)[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setSelectedDataset(key)}
                  className={`p-3 text-left rounded-lg border transition-colors ${
                    selectedDataset === key
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-fd-border hover:border-fd-border-strong'
                  }`}
                >
                  <div className="font-medium text-sm">{DATASETS[key].name}</div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-fd-muted-foreground">
              {dataset.description}
            </p>
          </div>

          {/* Options */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Depth: {options.depth}
              </label>
              <input
                type="range"
                min="2"
                max="8"
                value={options.depth}
                onChange={(e) =>
                  setOptions({ ...options, depth: parseInt(e.target.value, 10) })
                }
                className="w-full"
              />
              <p className="text-xs text-fd-muted-foreground mt-1">
                Parse tree depth (higher = more specific templates)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Similarity: {options.simThreshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={options.simThreshold}
                onChange={(e) =>
                  setOptions({ ...options, simThreshold: parseFloat(e.target.value) })
                }
                className="w-full"
              />
              <p className="text-xs text-fd-muted-foreground mt-1">
                Matching threshold (lower = more grouping)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Output Format</label>
              <div className="flex gap-2">
                {(['summary', 'detailed', 'json'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOptions({ ...options, format: fmt })}
                    className={`px-3 py-1.5 text-sm rounded border transition-colors ${
                      options.format === fmt
                        ? 'border-primary bg-primary text-white'
                        : 'border-fd-border hover:border-fd-border-strong'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Sandpack Editor */}
        <div className="rounded-lg overflow-hidden border border-fd-border">
          {mounted ? (
            <Sandpack
              key={selectedDataset}
              template="node"
              theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
              files={{
                '/index.js': {
                  code: appCode,
                  active: true,
                },
                '/package.json': {
                  code: JSON.stringify(
                    {
                      main: 'index.js',
                      scripts: {
                        start: 'node index.js',
                      },
                      dependencies: {
                        logpare: '^0.0.5',
                      },
                    },
                    null,
                    2
                  ),
                  hidden: true,
                },
              }}
              options={{
                showNavigator: false,
                showTabs: false,
                showLineNumbers: true,
                editorHeight: 500,
                editorWidthPercentage: 55,
              }}
              customSetup={{
                dependencies: {
                  logpare: '^0.0.5',
                },
              }}
            />
          ) : (
            <div className="h-[500px] flex items-center justify-center bg-fd-muted">
              <span className="text-fd-muted-foreground">Loading editor...</span>
            </div>
          )}
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
