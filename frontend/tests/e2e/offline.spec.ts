import {test,expect} from '@playwright/test';
test('production PWA remains playable offline after its initial load',async({page,context})=>{
 test.skip(process.env.TEST_PRODUCTION!=='1','Service worker is enabled only in production builds.');
 await page.goto('/');await expect(page.getByRole('button',{name:'Tura başla',exact:true})).toBeVisible();
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await context.setOffline(true);await page.reload();await expect(page.getByRole('button',{name:'Tura başla',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Günün rotasını çöz'}).click();await expect(page.locator('.answer-option')).toHaveCount(4);await page.locator('.answer-option').first().click();await expect(page.locator('.answer-feedback')).toBeVisible();
 const font=await page.locator('body').evaluate(el=>getComputedStyle(el).fontFamily);expect(font).toContain('sans-serif');
});
