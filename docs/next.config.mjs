import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  // Markdown twins of the documentation pages. The public URL is `/docs/<slug>.md`;
  // it cannot be a route handler under app/docs/[[...slug]] because that segment
  // already holds the HTML page, so it is rewritten onto app/api/docs-md.
  async rewrites() {
    return [
      { source: '/docs.md', destination: '/api/docs-md' },
      { source: '/docs/:slug*.md', destination: '/api/docs-md/:slug*' },
    ];
  },
};

export default withMDX(config);
