import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '../layout.config';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {/*
        Points agents at the curated navigation file for this section. React hoists
        <link> elements into <head>. The per-page Markdown alternate is emitted from
        generateMetadata() in app/docs/[[...slug]]/page.tsx.
      */}
      <link rel="describedby" href="/llms.txt" type="text/plain" />
      {children}
    </DocsLayout>
  );
}
