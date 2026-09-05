import type { MetadataRoute } from 'next';

export const SITE_URL = 'https://logpare.com';

/**
 * Serves `/robots.txt`. Everything on the site is public documentation, so crawling is
 * unrestricted; the value of the file is pointing crawlers at the sitemap.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
