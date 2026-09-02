import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { SITE_URL } from './robots';

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
