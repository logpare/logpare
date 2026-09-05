import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { baseOptions } from '../layout.config';

export const metadata: Metadata = {
  title: 'Playground',
  description:
    'Try logpare log compression in your browser. Paste logs, tune the Drain parameters, and see the compressed templates instantly.',
};

/** Wraps the playground in the marketing-site chrome (nav bar, theme provider). */
export default function Layout({ children }: { children: ReactNode }): React.JSX.Element {
  return <HomeLayout {...baseOptions}>{children}</HomeLayout>;
}
