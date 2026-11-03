/* NY UDGAVE AF ADMIN (3/11, js/admin/udgave.js). Chefen havde admin
   åben fra før "Rediger booking" kom op og så kun de gamle knapper.
   Nu spørger admin selv, om der ligger en nyere udgave, og viser en knap. */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

async function medStempel(page, kører, påNettet) {
  await page.route('**/admin.html*', async (route) => {
    const svar = await route.fetch();
    const tekst = (await svar.text()).replace(/__V__/g,
      route.request().url().includes('udgave=') ? påNettet : kører);
    await route.fulfill({ response: svar, body: tekst });
  });
}

test('ligger der en nyere udgave, kommer knappen — og den henter den', async ({ page }) => {
  await medStempel(page, 'aaa111', 'bbb222');
  await åbnAdmin(page, { data: grunddata() });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  const knap = page.locator('.ny-udgave');
  await expect(knap).toBeVisible();
  await expect(knap).toContainText('Admin er opdateret');
});

test('samme udgave: ingen knap', async ({ page }) => {
  await medStempel(page, 'aaa111', 'aaa111');
  await åbnAdmin(page, { data: grunddata() });
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(1500);
  await expect(page.locator('.ny-udgave')).toHaveCount(0);
});
