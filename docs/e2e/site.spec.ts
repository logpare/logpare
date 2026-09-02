import { test, expect, type Page } from '@playwright/test';

// Requests to third parties (Google Fonts, Vercel Insights) are not what these tests
// measure and are flaky in CI sandboxes, so they are aborted up front.
test.beforeEach(async ({ context }) => {
  await context.route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
});

/** Collects uncaught exceptions and failed same-origin responses for the page. */
function watch(page: Page): { errors: string[] } {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('response', (response) => {
    const url = response.url();
    // Vercel injects its analytics script only on Vercel; locally it is a 404.
    if (response.status() >= 400 && url.startsWith('http://localhost') && !url.includes('/_vercel/')) {
      errors.push(`${response.status()} ${new URL(url).pathname}`);
    }
  });
  return { errors };
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function sitemapPaths(page: Page): Promise<string[]> {
  const response = await page.request.get('/sitemap.xml');
  expect(response.status(), 'sitemap.xml should be served').toBe(200);
  const xml = await response.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  expect(paths.length, 'sitemap should list pages').toBeGreaterThan(5);
  return paths;
}

test('every page in the sitemap renders cleanly', async ({ page }, testInfo) => {
  const scheme = testInfo.project.use.colorScheme;
  const { errors } = watch(page);

  for (const path of await sitemapPaths(page)) {
    await test.step(path, async () => {
      errors.length = 0;
      await page.goto(path);
      await expect(page.locator('h1').first()).toBeVisible();

      expect(errors, `${path} should load without errors`).toEqual([]);
      expect(await horizontalOverflow(page), `${path} must not scroll sideways`).toBe(0);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/\S/);
      // next-themes resolves the system scheme onto <html class="...">.
      await expect(page.locator('html')).toHaveClass(scheme === 'dark' ? /dark/ : /light/);
    });
  }
});

test('docs search returns results instead of crashing', async ({ page }) => {
  const { errors } = watch(page);
  await page.goto('/docs');

  // The sidebar and the navbar each carry their own trigger button depending on the
  // viewport; the keyboard shortcut fumadocs binds is the same everywhere.
  await page.locator('h1').first().click();
  await page.keyboard.press('ControlOrMeta+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  await page.keyboard.type('compress');
  // fumadocs renders each hit as a button inside its command list.
  await expect(dialog.getByRole('button', { name: /compress/i }).first()).toBeVisible({
    timeout: 10_000,
  });
  expect(errors).toEqual([]);
  await expect(page.getByText('Application error')).toHaveCount(0);
});

test('playground compresses in the browser', async ({ page }) => {
  const { errors } = watch(page);
  await page.goto('/playground');

  const output = page.locator('pre').first();
  await expect(output).toContainText('Log Compression Summary');

  await page.getByRole('button', { name: 'Spark Logs' }).click();
  await expect(output).toContainText('SparkContext');

  await page.getByRole('button', { name: 'json', exact: true }).click();
  await expect(output).toContainText('"version"');

  await page.getByRole('button', { name: 'summary', exact: true }).click();
  await page.locator('#logs').fill('ERROR disk full on node-1\nERROR disk full on node-2\nERROR disk full on node-3');
  await expect(output).toContainText('[3x] ERROR disk full on node-<*>');

  expect(errors).toEqual([]);
  expect(await horizontalOverflow(page)).toBe(0);
});

test('agent-facing text surfaces are served', async ({ page }) => {
  for (const [path, type, startsWith] of [
    ['/llms.txt', 'text/plain', '# logpare'],
    ['/llms-full.txt', 'text/plain', '# logpare'],
    ['/robots.txt', 'text/plain', 'User-Agent'],
    ['/docs.md', 'text/markdown', '# '],
  ] as const) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()['content-type'], path).toContain(type);
    expect((await response.text()).startsWith(startsWith), `${path} body`).toBe(true);
  }

  // Every documentation page has a Markdown twin at the same path plus `.md`.
  const docPaths = (await sitemapPaths(page)).filter((p) => p.startsWith('/docs/'));
  for (const path of docPaths) {
    const response = await page.request.get(`${path}.md`);
    expect(response.status(), `${path}.md`).toBe(200);
    expect(response.headers()['content-type'], `${path}.md`).toContain('text/markdown');
  }
});
