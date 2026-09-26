/* ============================================================
   ADMINS FEJL SIGES PÅ DANSK  (26/9)
   ------------------------------------------------------------
   Gennemgangen af admin fandt to rå beskeder på skærmen:
   "Bestillingerne kunne ikke hentes: bestillinger: 401" og
   browserens egen "Load failed". Reglen bor ét sted:
   Admin.forklarFejl (js/admin/kerne.js).
   ============================================================ */
const { test, expect } = require('@playwright/test');
const { åbnAdmin, grunddata } = require('./hjaelp');

test('rå koder og browserens netfejl bliver til noget, man kan handle på', async ({ page }) => {
  await åbnAdmin(page, { data: grunddata() });
  const svar = await page.evaluate(() => ({
    login: Admin.forklarFejl(new Error('bestillinger: 401')),
    nede: Admin.forklarFejl(new Error('borde: 503')),
    safari: Admin.forklarFejl(new Error('Load failed')),
    chrome: Admin.forklarFejl(new TypeError('Failed to fetch')),
    /* Modstykket: en besked, der allerede er dansk, rører reglen ikke. */
    dansk: Admin.forklarFejl(new Error('Dagen er allerede lejet ud.')),
  }));
  expect(svar.login).toContain('logget ud');
  expect(svar.nede).toContain('svarer ikke');
  for (const t of [svar.login, svar.nede, svar.safari, svar.chrome]) {
    expect(t, 'en rå kode står stadig på skærmen').not.toMatch(/\b(401|503)\b|Load failed|Failed to fetch/);
  }
  expect(svar.safari).toContain('forbindelse');
  expect(svar.dansk).toBe('Dagen er allerede lejet ud.');
});
