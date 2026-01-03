# logpare Documentation

Complete documentation site for logpare built with Docusaurus 3.9, featuring comprehensive guides, API reference, and interactive playgrounds.

## Quick Start

```bash
cd docs
pnpm install
# or npm install

pnpm start
# or npm start
```

The site will open at `http://localhost:3000`.

## Documentation Structure

```
docs/
├── docs/                    # Documentation pages (markdown)
│   ├── intro.md            # Getting started
│   ├── installation.md     # Installation guide
│   ├── quick-start.md      # Quick start tutorial
│   ├── api/                # API reference
│   │   ├── compress.md
│   │   ├── compress-text.md
│   │   ├── create-drain.md
│   │   └── types.md
│   ├── guides/             # How-to guides
│   │   ├── parameter-tuning.md
│   │   ├── custom-preprocessing.md
│   │   └── mcp-integration.md
│   └── cli.md              # CLI reference
├── src/
│   ├── components/         # React components (playgrounds)
│   └── css/                # Custom CSS
├── static/                 # Static assets
│   └── img/
├── docusaurus.config.ts    # Site configuration
├── sidebars.ts             # Sidebar configuration
└── package.json
```

## Interactive Components

### LogparePlayground

Full-featured interactive playground with customizable options (if available).

```tsx
import { LogparePlayground } from '@site/src/components/LogparePlayground';

<LogparePlayground
  initialLogs="ERROR Connection failed\nINFO Request completed"
  initialOptions={{ depth: 4, simThreshold: 0.4 }}
  showAdvancedOptions={true}
  theme="light"
/>
```

### CompressionDemo

Simpler demo component with pre-loaded datasets for embedding in docs (if available).

```tsx
import { CompressionDemo } from '@site/src/components/CompressionDemo';

<CompressionDemo
  dataset="hdfs"
  title="HDFS Log Analysis"
  description="Real-world Hadoop filesystem logs"
  format="summary"
  allowFormatToggle={true}
/>
```

## Available Datasets

### basic
Common log patterns with errors, info messages, and warnings.
- Best for: Learning the basics
- Settings: depth=4, simThreshold=0.4

### hdfs
Real Hadoop Distributed File System logs.
- Best for: Distributed system logs
- Settings: depth=4, simThreshold=0.4

### spark
Apache Spark application logs.
- Best for: Big data processing logs
- Settings: depth=5, simThreshold=0.4

### errors
Error-focused logs with connection failures and API issues.
- Best for: Error pattern analysis
- Settings: depth=4, simThreshold=0.3

## MDX Usage

In your MDX documentation files:

```mdx
---
title: Playground
---

import { LogparePlayground } from '@site/src/components/LogparePlayground';
import { CompressionDemo } from '@site/src/components/CompressionDemo';

# Try Logpare

<LogparePlayground />

## Quick Examples

<CompressionDemo dataset="basic" />
<CompressionDemo dataset="hdfs" />
```

## Development

### Setup

1. Install dependencies:
```bash
cd docs
pnpm install
```

2. Start development server:
```bash
pnpm start
```

3. Build for production:
```bash
pnpm build
```

### Adding a New Documentation Page

1. Create a new `.md` file in `docs/` or a subdirectory
2. Add frontmatter with `sidebar_position` (optional):

```markdown
---
sidebar_position: 1
---

# Page Title

Your content here...
```

3. Update `sidebars.ts` if needed
4. The page will automatically appear in the sidebar

## Customization

### Adding Custom Datasets

Edit `CompressionDemo.tsx` to add more datasets:

```typescript
const DATASETS = {
  // ... existing datasets
  custom: {
    name: 'Custom Logs',
    logs: `YOUR LOG DATA HERE`,
    options: { depth: 4, simThreshold: 0.4 },
  },
};
```

### Styling

Both components use scoped CSS-in-JS with styled-jsx. To customize:

1. Override CSS classes in your global styles
2. Modify the `<style jsx>` blocks in the components
3. Use the `theme` prop to switch between light/dark modes

### Sandpack Themes

Available themes:
- `light` - Light theme (default)
- `dark` - Dark theme
- `auto` - System preference
- `aqua-blue`, `github-light`, `monokai-pro`, `night-owl` - Community themes

```tsx
<LogparePlayground theme="night-owl" />
```

## Usage in MDX Pages

In Docusaurus MDX files, import components using `@site/` alias:

```mdx
---
title: My Page
---

import { CompressionDemo } from '@site/src/components/CompressionDemo';

# Log Compression Demo

<CompressionDemo dataset="basic" />
```

## Pages

- **`/playground`** - Full interactive playground with parameter controls
- **`/docs/playground-examples`** - Curated examples with explanations

## Performance Notes

- Sandpack loads code execution environment on-demand
- First load may take a few seconds to initialize
- Subsequent interactions are fast
- Each demo runs in an isolated sandbox

## Troubleshooting

### Module not found: 'logpare'

The docs use workspace protocol to link to the local logpare package:
```json
{
  "dependencies": {
    "logpare": "workspace:*"
  }
}
```

Make sure you've built logpare first:
```bash
# From repository root
cd /home/user/logpare
pnpm build
```

### Sandpack not loading

Check browser console for errors. Sandpack requires:
- Modern browser (ES2020+)
- JavaScript enabled
- No aggressive content blockers
- WebAssembly support

### React version conflicts

Docusaurus uses React 18. Ensure all dependencies are compatible:
```bash
pnpm install --force  # If you encounter peer dependency issues
```

### TypeScript errors

The components use TypeScript. If you see type errors:
```bash
pnpm typecheck  # Check for type issues
```

## License

MIT - Same as logpare
