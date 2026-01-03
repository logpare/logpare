import React, { useState } from 'react';
import { Sandpack, SandpackProps } from '@codesandbox/sandpack-react';

export interface CompressionDemoProps {
  /** Demo title */
  title?: string;
  /** Demo description */
  description?: string;
  /** Preset log dataset */
  dataset?: 'basic' | 'hdfs' | 'spark' | 'errors';
  /** Output format */
  format?: 'summary' | 'detailed' | 'json';
  /** Allow format toggle */
  allowFormatToggle?: boolean;
  /** Theme for the Sandpack editor */
  theme?: SandpackProps['theme'];
  /** Editor height */
  editorHeight?: number;
}

const DATASETS = {
  basic: {
    name: 'Basic Example',
    logs: `ERROR Connection to 192.168.1.100 failed after 30s
ERROR Connection to 192.168.1.101 failed after 25s
INFO Request abc123 processed in 45ms
INFO Request xyz789 processed in 52ms
WARN Retry attempt 1 for task-001
WARN Retry attempt 2 for task-001`,
    options: { depth: 4, simThreshold: 0.4 },
  },
  hdfs: {
    name: 'HDFS Logs',
    logs: `081109 203518 143 INFO dfs.DataNode$PacketResponder: PacketResponder 1 for block blk_38865049064139660 terminating
081109 203518 144 INFO dfs.DataNode$PacketResponder: PacketResponder 0 for block blk_-6670958622368987959 terminating
081109 203519 146 INFO dfs.DataNode$DataXceiver: Receiving block blk_-1608999687919862906 src: /10.250.19.102:54106 dest: /10.250.19.102:50010
081109 203519 147 INFO dfs.DataNode$DataXceiver: Receiving block blk_-3544583377289625738 src: /10.250.10.6:40524 dest: /10.250.10.6:50010
081109 203520 148 INFO dfs.DataNode$PacketResponder: PacketResponder 1 for block blk_-1608999687919862906 terminating
081109 203521 150 INFO dfs.DataBlockScanner: Verification succeeded for blk_8229193803249955061
081109 203521 151 INFO dfs.DataBlockScanner: Verification succeeded for blk_-4980916519894289629
081109 203522 152 WARN dfs.DataNode$DataXceiver: DatanodeRegistration(10.250.19.102:50010, storageID=DS-1085928313-10.250.19.102-50010-1224117547049, infoPort=50075, ipcPort=50020):Got exception while serving blk_38865049064139660 to /10.251.31.84:`,
    options: { depth: 4, simThreshold: 0.4 },
  },
  spark: {
    name: 'Spark Logs',
    logs: `17/06/09 20:10:40 INFO SparkContext: Running Spark version 2.1.1
17/06/09 20:10:41 INFO SparkContext: Submitted application: PythonPi
17/06/09 20:10:42 INFO SparkEnv: Registering MapOutputTracker
17/06/09 20:10:42 INFO SparkEnv: Registering BlockManagerMaster
17/06/09 20:10:42 INFO SparkEnv: Registering OutputCommitCoordinator
17/06/09 20:10:43 INFO Utils: Successfully started service 'SparkUI' on port 4040.
17/06/09 20:10:43 INFO Utils: Successfully started service 'org.apache.spark.network.netty.NettyBlockTransferService' on port 42765.
17/06/09 20:10:43 INFO BlockManager: Using org.apache.spark.storage.RandomBlockReplicationPolicy for block replication policy
17/06/09 20:10:44 INFO SparkContext: Starting job: reduce at /home/user/pi.py:43
17/06/09 20:10:44 INFO MemoryStore: Block broadcast_0 stored as values in memory (estimated size 4.0 KB, free 366.3 MB)`,
    options: { depth: 5, simThreshold: 0.4 },
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
    options: { depth: 4, simThreshold: 0.3 },
  },
};

export function CompressionDemo({
  title,
  description,
  dataset = 'basic',
  format = 'summary',
  allowFormatToggle = true,
  theme = 'light',
  editorHeight = 400,
}: CompressionDemoProps) {
  const [selectedFormat, setSelectedFormat] = useState(format);
  const selectedDataset = DATASETS[dataset];

  // Escape all characters that have special meaning in template literals
  const escapeForTemplateLiteral = (value: string): string =>
    value
      // Escape backslashes first to avoid double-processing
      .replace(/\\/g, '\\\\')
      // Escape backticks, which delimit template literals
      .replace(/`/g, '\\`')
      // Escape `${` to prevent unintended interpolation
      .replace(/\$\{/g, '\\${');

  const appCode = `import { compressText } from 'logpare';

// ${selectedDataset.name}
const logs = \`${escapeForTemplateLiteral(selectedDataset.logs)}\`;

const options = {
  ...${JSON.stringify(selectedDataset.options)},
  format: '${selectedFormat}',
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
    <div className="compression-demo">
      {(title || description || allowFormatToggle) && (
        <div className="demo-header">
          {title && <h3>{title}</h3>}
          {description && <p>{description}</p>}
          {allowFormatToggle && (
            <div className="format-toggle">
              <label>Output Format:</label>
              <div className="format-buttons">
                {(['summary', 'detailed', 'json'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    className={selectedFormat === fmt ? 'active' : ''}
                    onClick={() => setSelectedFormat(fmt)}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Sandpack
        template="node"
        theme={theme}
        files={{
          '/App.js': {
            code: appCode,
            active: true,
          },
          '/package.json': {
            code: JSON.stringify(
              {
                dependencies: {
                  logpare: 'latest',
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
          editorHeight,
          editorWidthPercentage: 55,
          showConsoleButton: true,
        }}
        customSetup={{
          dependencies: {
            logpare: 'latest',
          },
        }}
      />

      <style jsx>{`
        .compression-demo {
          margin: 2rem 0;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
        }

        .demo-header {
          background: #f8f9fa;
          padding: 1.5rem;
          border-bottom: 1px solid #e0e0e0;
        }

        .demo-header h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1.2rem;
          font-weight: 600;
        }

        .demo-header p {
          margin: 0 0 1rem 0;
          color: #666;
          font-size: 0.95rem;
        }

        .format-toggle {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .format-toggle label {
          font-weight: 500;
          font-size: 0.9rem;
        }

        .format-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .format-buttons button {
          padding: 0.4rem 1rem;
          border: 1px solid #ccc;
          background: white;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .format-buttons button:hover {
          border-color: #999;
          background: #f5f5f5;
        }

        .format-buttons button.active {
          background: #007bff;
          color: white;
          border-color: #007bff;
        }

        .format-buttons button.active:hover {
          background: #0056b3;
          border-color: #0056b3;
        }
      `}</style>
    </div>
  );
}
