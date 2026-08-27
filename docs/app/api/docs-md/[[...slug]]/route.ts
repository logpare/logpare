import { source } from '@/lib/source';
import { notFound } from 'next/navigation';

/**
 * Markdown twin of every documentation page.
 *
 * Reached through the `/docs/<slug>.md` rewrite in next.config.mjs, so the public,
 * documented URL is `https://logpare.com/docs/api/compress.md` — this handler path is an
 * implementation detail. Prerendered at build time via generateStaticParams(), so no
 * filesystem access happens at request time.
 *
 * Only pages under content/docs are reachable. Repository instructions, configuration,
 * and source files are never exposed here.
 */
export const dynamic = 'force-static';
export const revalidate = false;

const SITE = 'https://logpare.com';

/** The HTML URL this Markdown response is the alternate of. */
function canonicalPath(slug: string[] | undefined): string {
  return slug && slug.length > 0 ? `/docs/${slug.join('/')}` : '/docs';
}

/**
 * Drop lines that are nothing but a JSX tag.
 *
 * The MDAST stringifier keeps components such as <Callout> in the processed Markdown.
 * Their prose is worth serving; the tags are not. Mirrors stripMdx() in
 * scripts/generate-llms.mjs, which does the same for llms-full.txt.
 */
function stripJsx(markdown: string): string {
  return markdown
    .split('\n')
    .filter((line) => !/^\s*<\/?[A-Z][\w.]*(\s[^>]*)?\/?>\s*$/.test(line))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** Serve one documentation page as Markdown, with canonical and llms.txt discovery links. */
export async function GET(
  _request: Request,
  props: { params: Promise<{ slug?: string[] }> }
): Promise<Response> {
  const params = await props.params;
  const page = source.getPage(params.slug);
  if (!page) notFound();

  // fumadocs-mdx types the collection data loosely; the runtime shape is DocData &
  // DocMethods, which is where getText() lives.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = page.data as any;

  const title: string = data.title ?? '';
  const description: string = data.description ?? '';
  const body: string = await data.getText('processed');

  const htmlPath = canonicalPath(params.slug);
  const markdown = [`# ${title}`, '', description, '', stripJsx(body).trim(), ''].join('\n');

  return new Response(markdown, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      Link: `<${SITE}${htmlPath}>; rel="canonical", </llms.txt>; rel="describedby"; type="text/plain"`,
    },
  });
}

/** Prerender a Markdown route for every documentation page at build time. */
export async function generateStaticParams(): Promise<{ slug?: string[] }[]> {
  return source.generateParams();
}
