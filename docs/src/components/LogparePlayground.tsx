import React, { useState } from 'react';
import { Sandpack, SandpackProps } from '@codesandbox/sandpack-react';

export interface LogparePlaygroundProps {
  /** Initial log input */
  initialLogs?: string;
  /** Initial compression options */
  initialOptions?: {
    depth?: number;
    simThreshold?: number;
    maxChildren?: number;
    maxClusters?: number;
    format?: 'summary' | 'detailed' | 'json';
  };
  /** Show advanced options panel */
  showAdvancedOptions?: boolean;
  /** Theme for the Sandpack editor */
  theme?: SandpackProps['theme'];
}

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

export function LogparePlayground({
  initialLogs = DEFAULT_LOGS,
  initialOptions = {},
  showAdvancedOptions = true,
  theme = 'light',
}: LogparePlaygroundProps) {
  const [logs, setLogs] = useState(initialLogs);
  const [options, setOptions] = useState({
    depth: initialOptions.depth ?? 4,
    simThreshold: initialOptions.simThreshold ?? 0.4,
    maxChildren: initialOptions.maxChildren ?? 100,
    maxClusters: initialOptions.maxClusters ?? 1000,
    format: initialOptions.format ?? 'summary',
  });

  const appCode = `import { compressText } from 'logpare';

// Input logs
const logs = \`${logs.replace(/`/g, '\\`')}\`;

// Compression options
const options = ${JSON.stringify(options, null, 2)};

// Compress the logs
const result = compressText(logs, options);

// Display results
console.log('=== COMPRESSION STATS ===');
console.log(\`Input lines: \${result.stats.inputLines}\`);
console.log(\`Unique templates: \${result.stats.uniqueTemplates}\`);
console.log(\`Compression ratio: \${(result.stats.compressionRatio * 100).toFixed(1)}%\`);
console.log(\`Token reduction: ~\${result.stats.estimatedTokenReduction}%\`);
console.log('');
console.log('=== OUTPUT ===');
console.log(result.formatted);

// Export for inspection
export default result;
`;

  const files = {
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
  };

  return (
    <div className="logpare-playground">
      {showAdvancedOptions && (
        <div className="playground-controls">
          <h3>Compression Options</h3>
          <div className="options-grid">
            <div className="option">
              <label htmlFor="depth">
                Depth: {options.depth}
                <span className="option-help">Parse tree depth (3-6)</span>
              </label>
              <input
                id="depth"
                type="range"
                min="3"
                max="6"
                value={options.depth}
                onChange={(e) =>
                  setOptions({ ...options, depth: parseInt(e.target.value) })
                }
              />
            </div>
            <div className="option">
              <label htmlFor="simThreshold">
                Similarity: {options.simThreshold}
                <span className="option-help">Template matching threshold (0-1)</span>
              </label>
              <input
                id="simThreshold"
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={options.simThreshold}
                onChange={(e) =>
                  setOptions({ ...options, simThreshold: parseFloat(e.target.value) })
                }
              />
            </div>
            <div className="option">
              <label htmlFor="format">
                Output Format
              </label>
              <select
                id="format"
                value={options.format}
                onChange={(e) =>
                  setOptions({ ...options, format: e.target.value as any })
                }
              >
                <option value="summary">Summary</option>
                <option value="detailed">Detailed</option>
                <option value="json">JSON</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <Sandpack
        template="node"
        theme={theme}
        files={files}
        options={{
          showNavigator: false,
          showTabs: false,
          showLineNumbers: true,
          editorHeight: 500,
          editorWidthPercentage: 50,
        }}
        customSetup={{
          dependencies: {
            logpare: 'latest',
          },
        }}
      />

      <style jsx>{`
        .logpare-playground {
          margin: 2rem 0;
        }

        .playground-controls {
          background: #f5f5f5;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        .playground-controls h3 {
          margin: 0 0 1rem 0;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
        }

        .option {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .option label {
          font-weight: 500;
          font-size: 0.9rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .option-help {
          font-weight: normal;
          font-size: 0.8rem;
          color: #666;
        }

        .option input[type='range'] {
          width: 100%;
        }

        .option select {
          padding: 0.5rem;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
