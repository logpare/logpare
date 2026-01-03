import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'logpare',
  tagline: 'Semantic log compression for LLM context windows',
  favicon: 'img/favicon.ico',

  // Vercel will set VERCEL_URL, or use custom domain
  url: process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://logpare.dev',
  baseUrl: '/',

  organizationName: 'logpare',
  projectName: 'logpare',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/logpare/logpare/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/logpare-social-card.jpg',
    navbar: {
      title: 'logpare',
      logo: {
        alt: 'logpare Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/playground',
          label: 'Playground',
          position: 'left',
        },
        {
          href: 'https://github.com/logpare/logpare',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.npmjs.com/package/logpare',
          label: 'npm',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/docs/api/compress',
            },
            {
              label: 'CLI Reference',
              to: '/docs/cli',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/logpare/logpare',
            },
            {
              label: 'Issues',
              href: 'https://github.com/logpare/logpare/issues',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'npm Package',
              href: 'https://www.npmjs.com/package/logpare',
            },
            {
              label: 'MCP Server',
              href: 'https://www.npmjs.com/package/@logpare/mcp',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} logpare. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'typescript'],
    },
    algolia: {
      // Placeholder - replace with actual Algolia credentials
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'logpare',
      contextualSearch: true,
      searchPagePath: 'search',
    },
    colorMode: {
      defaultMode: 'light',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
