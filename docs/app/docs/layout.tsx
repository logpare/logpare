import type { ReactNode } from 'react';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '../layout.config';
import { source } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <DocsLayout tree={source.pageTree} {...baseOptions}>
      {children}
    </DocsLayout>
  );
}
