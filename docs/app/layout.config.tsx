import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import Logo from '@/components/Logo';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <Logo className="w-6 h-6" />
        <span className="font-mono font-bold">logpare</span>
      </div>
    ),
  },
  links: [
    {
      text: 'Docs',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'Playground',
      url: '/playground',
    },
    {
      text: 'GitHub',
      url: 'https://github.com/logpare/logpare',
      external: true,
    },
    {
      text: 'npm',
      url: 'https://www.npmjs.com/package/logpare',
      external: true,
    },
  ],
  githubUrl: 'https://github.com/logpare/logpare',
};
