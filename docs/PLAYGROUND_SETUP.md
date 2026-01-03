# Sandpack Playground Setup Guide

This document describes the Sandpack playground components created for the logpare documentation site.

## Files Created

### React Components

1. **`/home/user/logpare/docs/src/components/LogparePlayground.tsx`**
   - Full-featured interactive playground
   - Parameter controls (depth, similarity threshold, format)
   - Real-time code editing
   - Live compression statistics

2. **`/home/user/logpare/docs/src/components/CompressionDemo.tsx`**
   - Simpler embeddable demo component
   - Pre-loaded datasets (basic, hdfs, spark, errors)
   - Format toggle (summary/detailed/json)
   - Smaller footprint for inline examples

3. **`/home/user/logpare/docs/src/components/index.ts`**
   - Component exports and TypeScript types

### Documentation Pages

4. **`/home/user/logpare/docs/playground.mdx`**
   - Full-page interactive playground
   - Multiple curated examples
   - Usage instructions
   - Parameter tuning guide

5. **`/home/user/logpare/docs/docs/playground-examples.mdx`**
   - Embedded demo examples
   - Real-world use cases
   - Format comparison
   - Next steps and links

### Configuration

6. **`/home/user/logpare/docs/package.json`** (updated)
   - Added `@codesandbox/sandpack-react` dependency
   - Added `logpare: "workspace:*"` for local package

7. **`/home/user/logpare/docs/README.md`** (updated)
   - Component documentation
   - Usage examples
   - Troubleshooting guide

## Installation

### 1. Install Dependencies

From the docs directory:

```bash
cd /home/user/logpare/docs
pnpm install
```

This will install:
- `@codesandbox/sandpack-react` (v2.19.11+)
- Link to local `logpare` package via workspace

### 2. Build Logpare

Sandpack will load logpare from npm, but for local development, build it first:

```bash
cd /home/user/logpare
pnpm build
```

### 3. Start Development Server

```bash
cd /home/user/logpare/docs
pnpm start
```

Open http://localhost:3000/playground to see the full playground.

## Usage Examples

### Full Playground Page

```mdx
---
title: Playground
---

import { LogparePlayground } from '@site/src/components/LogparePlayground';

<LogparePlayground />
```

### Embedded Demo

```mdx
import { CompressionDemo } from '@site/src/components/CompressionDemo';

<CompressionDemo dataset="hdfs" title="HDFS Example" />
```

### Custom Configuration

```tsx
<LogparePlayground
  initialLogs={`ERROR Connection failed
INFO Request completed`}
  initialOptions={{
    depth: 5,
    simThreshold: 0.3,
    format: 'detailed'
  }}
  showAdvancedOptions={true}
  theme="dark"
/>
```

### Multiple Demos Side-by-Side

```mdx
## Compare Datasets

<CompressionDemo dataset="basic" format="summary" />
<CompressionDemo dataset="hdfs" format="detailed" />
<CompressionDemo dataset="spark" format="json" />
```

## Component Props

### LogparePlayground

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialLogs` | `string` | Sample logs | Initial log input |
| `initialOptions` | `DrainOptions` | `{}` | Compression options |
| `showAdvancedOptions` | `boolean` | `true` | Show parameter controls |
| `theme` | `SandpackTheme` | `'light'` | Editor theme |

### CompressionDemo

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dataset` | `'basic' \| 'hdfs' \| 'spark' \| 'errors'` | `'basic'` | Pre-loaded dataset |
| `title` | `string` | `undefined` | Demo title |
| `description` | `string` | `undefined` | Demo description |
| `format` | `'summary' \| 'detailed' \| 'json'` | `'summary'` | Output format |
| `allowFormatToggle` | `boolean` | `true` | Show format buttons |
| `theme` | `SandpackTheme` | `'light'` | Editor theme |
| `editorHeight` | `number` | `400` | Editor height (px) |

## Available Datasets

### basic
- **Content**: Common error, info, and warning logs
- **Settings**: depth=4, simThreshold=0.4
- **Best for**: Learning basics

### hdfs
- **Content**: Hadoop Distributed File System logs
- **Settings**: depth=4, simThreshold=0.4
- **Best for**: Distributed system logs

### spark
- **Content**: Apache Spark application logs
- **Settings**: depth=5, simThreshold=0.4
- **Best for**: Big data processing logs

### errors
- **Content**: Error analysis (connection, auth, API)
- **Settings**: depth=4, simThreshold=0.3
- **Best for**: Error pattern detection

## Adding Custom Datasets

Edit `src/components/CompressionDemo.tsx`:

```typescript
const DATASETS = {
  // ... existing datasets
  nginx: {
    name: 'Nginx Access Logs',
    logs: `127.0.0.1 - - [15/Jan/2024:10:23:45 +0000] "GET /api/users HTTP/1.1" 200 1234
127.0.0.1 - - [15/Jan/2024:10:23:46 +0000] "POST /api/orders HTTP/1.1" 201 567`,
    options: { depth: 4, simThreshold: 0.4 },
  },
};
```

Then use it:

```mdx
<CompressionDemo dataset="nginx" title="Nginx Logs" />
```

## Styling

### Custom CSS

Override component styles globally:

```css
/* In src/css/custom.css */
.logpare-playground {
  border: 2px solid var(--ifm-color-primary);
  border-radius: 12px;
}

.compression-demo {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Sandpack Themes

Available themes:
- `light`, `dark`, `auto`
- `aqua-blue`, `github-light`, `monokai-pro`, `night-owl`
- `sandpack-dark`, `cobalt2`, `gruvbox-dark`

```tsx
<LogparePlayground theme="night-owl" />
<CompressionDemo theme="auto" />
```

## Sandpack Configuration

Both components use these Sandpack settings:

```typescript
{
  template: "node",
  options: {
    showNavigator: false,
    showTabs: false,
    showLineNumbers: true,
    editorHeight: 400-500,
    editorWidthPercentage: 50-55,
  },
  customSetup: {
    dependencies: {
      logpare: "latest",
    },
  },
}
```

## Performance

- **First Load**: 2-3 seconds (Sandpack initialization)
- **Subsequent Runs**: <100ms
- **Bundle Size**: ~150KB (Sandpack) + ~20KB (logpare)
- **Isolated Sandboxes**: Each demo runs independently

## Troubleshooting

### Build Errors

**Error**: `Module not found: 'logpare'`

**Solution**: Build logpare first:
```bash
cd /home/user/logpare
pnpm build
```

**Error**: `Cannot find module '@codesandbox/sandpack-react'`

**Solution**: Install dependencies:
```bash
cd /home/user/logpare/docs
pnpm install
```

### Runtime Errors

**Error**: Sandpack fails to load in browser

**Solution**: Check browser console. Common issues:
- Ad blockers blocking CodeSandbox domains
- JavaScript disabled
- Old browser (need ES2020+ support)

**Error**: `styled-jsx` errors

**Solution**: Docusaurus should handle this automatically. If not:
```bash
pnpm add styled-jsx
```

### Type Errors

**Error**: TypeScript errors in components

**Solution**: Run typecheck:
```bash
pnpm typecheck
```

### Workspace Issues

**Error**: `logpare` package not found

**Solution**: Ensure workspace is configured. Check `pnpm-workspace.yaml` in root:
```yaml
packages:
  - 'docs'
  - '.'
```

## Testing

### Manual Testing Checklist

- [ ] Playground loads without errors
- [ ] Code editing works in real-time
- [ ] Compression runs and shows output
- [ ] Parameter sliders update configuration
- [ ] Format toggle switches between summary/detailed/json
- [ ] All datasets load correctly
- [ ] Stats display (lines, templates, compression ratio)
- [ ] Console output shows logs
- [ ] Mobile responsive (if applicable)

### Browser Testing

Test in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Future Enhancements

Potential improvements:

1. **File Upload**: Allow users to upload log files
2. **Export Results**: Download compressed output
3. **Share Links**: Generate shareable playground URLs
4. **Performance Metrics**: Show processing time, memory usage
5. **Advanced Options**: Expose more Drain parameters
6. **Templates Library**: Save and load template configurations
7. **Diff View**: Compare before/after compression
8. **Dark Mode**: Auto-detect system preference

## Documentation Links

- [Sandpack Documentation](https://sandpack.codesandbox.io/)
- [Docusaurus MDX](https://docusaurus.io/docs/markdown-features/react)
- [logpare API](https://github.com/logpare/logpare#api)

## Support

For issues or questions:
- Check existing documentation
- Review troubleshooting section
- Open issue on GitHub
- Test in isolation (create minimal reproduction)

## License

MIT - Same as logpare
