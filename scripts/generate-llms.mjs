#!/usr/bin/env node
/**
 * Generate llms.txt and llms-full.txt from the canonical documentation.
 *
 * Canonical inputs
 *   docs/content/llms-intro.md      curated orientation block for llms.txt
 *   docs/content/docs/meta.json     page order and section headings
 *   docs/content/docs/**\/*.mdx     page content and frontmatter
 *
 * Outputs (byte-identical pairs, so the site and the npm tarball never disagree)
 *   llms.txt              docs/public/llms.txt
 *   llms-full.txt         docs/public/llms-full.txt
 *
 * Usage
 *   node scripts/generate-llms.mjs           write the four files
 *   node scripts/generate-llms.mjs --check   exit 1 if any file is stale
 *
 * Output is deterministic: ordering comes from meta.json, and nothing timestamped or
 * environment-specific is emitted.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DOCS_DIR = resolve(ROOT, 'docs/content/docs');
const INTRO_FILE = resolve(ROOT, 'docs/content/llms-intro.md');

export const SITE = 'https://logpare.com';
const GITHUB = 'https://github.com/logpare/logpare';
const NPM = 'https://www.npmjs.com/package/logpare';

/** Section heading overrides. meta.json separators are terse; these read better as links. */
const SECTION_TITLES = {
  'API Reference': 'API reference',
  Guides: 'Guides',
};

/** Heading for pages that follow a bare `---` divider in meta.json. */
const TRAILING_SECTION_TITLE = 'Reference';

/** Read a UTF-8 file with LF line endings. */
function read(path) {
  return readFileSync(path, 'utf-8').replace(/\r\n/g, '\n');
}

/**
 * Split YAML frontmatter from an MDX file.
 * Only `title` and `description` are needed, so this stays a few lines rather than a
 * YAML dependency. Values may be bare or single/double quoted.
 */
export function parseFrontmatter(source) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(source);
  if (!match) {
    return { data: {}, body: source };
  }

  const data = {};
  for (const line of match[1].split('\n')) {
    const kv = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) continue;
    let value = kv[2].trim();
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      value = value.slice(1, -1);
    }
    data[kv[1]] = value;
  }

  return { data, body: source.slice(match[0].length) };
}

/**
 * Strip MDX-only syntax so the result is plain Markdown.
 *
 * Removes `import`/`export` statements and lines that consist solely of a JSX tag. Prose
 * inside a JSX wrapper (a `<Callout>` body, for example) is kept — it is the part an agent
 * needs.
 */
export function stripMdx(body) {
  return body
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (/^(import|export)\s/.test(trimmed)) return false;
      if (/^<\/?[A-Z][\w.]*(\s[^>]*)?\/?>$/.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Slug for a meta.json entry, e.g. `api/compress` -> `/docs/api/compress`. */
function pageUrl(id, extension = '') {
  return id === 'index' ? `${SITE}/docs${extension}` : `${SITE}/docs/${id}${extension}`;
}

/**
 * Walk meta.json, yielding `{ kind: 'section', title }` and `{ kind: 'page', ... }` in
 * document order. `---Label---` entries open a section; a bare `---` closes one.
 */
export function readPages() {
  const meta = JSON.parse(read(resolve(DOCS_DIR, 'meta.json')));
  const entries = [];

  for (const id of meta.pages) {
    const separator = /^---(.*)---$/.exec(id);
    if (separator) {
      const label = separator[1].trim();
      entries.push({ kind: 'section', title: SECTION_TITLES[label] ?? label });
      continue;
    }
    if (id === '---') {
      entries.push({ kind: 'section', title: TRAILING_SECTION_TITLE });
      continue;
    }

    const source = read(resolve(DOCS_DIR, `${id}.mdx`));
    const { data, body } = parseFrontmatter(source);
    entries.push({
      kind: 'page',
      id,
      title: data.title ?? id,
      description: data.description ?? '',
      body: stripMdx(body),
      htmlUrl: pageUrl(id),
      markdownUrl: pageUrl(id, '.md'),
    });
  }

  return entries;
}

/**
 * Curated navigation file. Short by design: orientation, then descriptive link lists.
 */
export function buildLlmsTxt(entries = readPages()) {
  const out = [read(INTRO_FILE).trim(), ''];

  let open = false;
  for (const entry of entries) {
    if (entry.kind === 'section') {
      if (open) out.push('');
      out.push(`## ${entry.title}`, '');
      open = true;
      continue;
    }
    if (!open) {
      out.push('## Documentation', '');
      open = true;
    }
    out.push(`- [${entry.title}](${entry.markdownUrl}): ${entry.description}`);
  }

  out.push(
    '',
    '## More',
    '',
    `- [Full documentation](${SITE}/llms-full.txt): Every page above concatenated, for when you want the whole reference in one fetch.`,
    `- [Source repository](${GITHUB}): Issues, contributing guide, and the MCP server package.`,
    `- [npm package](${NPM}): Published releases and install instructions.`,
    '',
    '## MCP',
    '',
    'An MCP server lives in this repository at `packages/mcp`. It is **not published to npm**,',
    'so `npx @logpare/mcp` will fail; build it from source and point your client at',
    '`packages/mcp/dist/cli.js`. See the MCP integration page above.',
    '',
  );

  return out.join('\n');
}

/**
 * Full agent-readable documentation: every canonical page, in navigation order.
 */
export function buildLlmsFullTxt(entries = readPages()) {
  const pages = entries.filter((entry) => entry.kind === 'page');

  const out = [
    '# logpare — full documentation',
    '',
    '> Generated from the logpare documentation site. Do not edit by hand: change the MDX',
    '> pages under docs/content/docs/ and run `pnpm docs:llms`.',
    '>',
    `> Short navigation version: ${SITE}/llms.txt`,
    '',
    '## Contents',
    '',
  ];

  for (const page of pages) {
    out.push(`- ${page.title} — ${page.markdownUrl}`);
  }
  out.push('');

  for (const page of pages) {
    out.push(
      '---',
      '',
      `# ${page.title}`,
      '',
      page.description,
      '',
      `Source: ${page.htmlUrl} (Markdown: ${page.markdownUrl})`,
      '',
      page.body,
      '',
    );
  }

  return out.join('\n');
}

const TARGETS = [
  { file: 'llms.txt', build: buildLlmsTxt },
  { file: 'docs/public/llms.txt', build: buildLlmsTxt },
  { file: 'llms-full.txt', build: buildLlmsFullTxt },
  { file: 'docs/public/llms-full.txt', build: buildLlmsFullTxt },
];

/** Resolved output paths plus their expected content. Used by the drift test too. */
export function expectedOutputs() {
  const entries = readPages();
  const short = buildLlmsTxt(entries);
  const full = buildLlmsFullTxt(entries);

  return TARGETS.map(({ file, build }) => ({
    file,
    path: resolve(ROOT, file),
    content: build === buildLlmsTxt ? short : full,
  }));
}

function main() {
  const check = process.argv.includes('--check');
  const outputs = expectedOutputs();
  const stale = [];

  for (const { file, path, content } of outputs) {
    let current = null;
    try {
      current = readFileSync(path, 'utf-8');
    } catch {
      current = null;
    }

    if (current === content) continue;

    if (check) {
      stale.push(file);
    } else {
      writeFileSync(path, content, 'utf-8');
      console.log(`wrote ${file}`);
    }
  }

  if (check) {
    if (stale.length > 0) {
      console.error(
        `Stale generated files:\n${stale.map((f) => `  - ${f}`).join('\n')}\n\n` +
          'Run `pnpm docs:llms` and commit the result.'
      );
      process.exit(1);
    }
    console.log('llms.txt and llms-full.txt are up to date.');
    return;
  }

  console.log(`${outputs.length} file(s) checked.`);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main();
}
