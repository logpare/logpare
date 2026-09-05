import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { SITE_URL } from './robots';

/**
 * Serves `/sitemap.xml`, built from the docs source so new pages are listed without a
 * hand-kept list. The end-to-end suite also walks this file, so a page that ships
 * without appearing here is a page nothing tests.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = source.getPages().map((page) => ({
    url: `${SITE_URL}${page.url}`,
    changeFrequency: 'weekly' as const,
    priority: page.url === '/docs' ? 0.9 : 0.7,
  }));

  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/playground`, changeFrequency: 'monthly', priority: 0.8 },
    ...pages,
  ];
}
