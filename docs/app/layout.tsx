import './global.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | logpare',
    default: 'logpare - Semantic Log Compression',
  },
  description: 'Semantic log compression for LLM context windows. Reduce log tokens by 60-90% while preserving diagnostic information.',
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://logpare.com'
  ),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'manifest', url: '/site.webmanifest' },
    ],
  },
  openGraph: {
    title: 'logpare - Semantic Log Compression',
    description: 'Semantic log compression for LLM context windows. Reduce log tokens by 60-90% while preserving diagnostic information.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'logpare - Semantic Log Compression',
    description: 'Semantic log compression for LLM context windows. Reduce log tokens by 60-90% while preserving diagnostic information.',
  },
};

export default function Layout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-ds-primary text-ds-primary flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
