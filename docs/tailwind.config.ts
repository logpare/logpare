import { createPreset } from 'fumadocs-ui/tailwind-plugin';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './content/**/*.{md,mdx}',
    './mdx-components.tsx',
    './node_modules/fumadocs-ui/dist/**/*.js',
  ],
  presets: [
    createPreset({
      addGlobalColors: true,
    }),
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Bodoni Moda', 'Didot', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'monospace'],
      },
      colors: {
        paper: '#f8f5f0',
        'paper-shadow': '#ebe6dd',
        ink: '#1a1917',
        'ink-muted': '#4a4843',
      },
    },
  },
};

export default config;
