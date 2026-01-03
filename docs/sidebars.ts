import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'doc',
      id: 'intro',
      label: 'Getting Started',
    },
    {
      type: 'doc',
      id: 'installation',
      label: 'Installation',
    },
    {
      type: 'doc',
      id: 'quick-start',
      label: 'Quick Start',
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: false,
      items: [
        'api/compress',
        'api/compress-text',
        'api/create-drain',
        'api/types',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: false,
      items: [
        'guides/parameter-tuning',
        'guides/custom-preprocessing',
        'guides/mcp-integration',
      ],
    },
    {
      type: 'doc',
      id: 'cli',
      label: 'CLI Reference',
    },
  ],
};

export default sidebars;
