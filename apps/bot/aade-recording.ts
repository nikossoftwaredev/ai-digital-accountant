import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://login.gsis.gr/mylogin/login.jsp?bmctx=1DB55AB50C08F2B418903DE4EB7466AD47038BC455E39B9EA82B1EB28CE52BC6&contextType=external&username=string&password=secure_string&challenge_url=https%3A%2F%2Flogin.gsis.gr%2Fmylogin%2Flogin.jsp&ssoCookie=disablehttponly&request_id=-7959121918817115435&authn_try_count=0&locale=en_US&resource_url=https%253A%252F%252Fwww1.aade.gr%252Ftaxisnet%252F');
  await page.getByRole('textbox', { name: 'Όνομα χρήστη' }).click();
  await page.goto('about:blank');
  await page.locator('body').click();
});