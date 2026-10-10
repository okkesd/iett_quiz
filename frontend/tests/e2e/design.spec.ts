import { test, expect } from '@playwright/test';

test('spring controls retarget immediately, respect reduced motion, and survive resizing', async ({page}) => {
 await page.goto('/');
 const group=page.getByRole('group',{name:'Hızlı Tur yakası'});
 await group.getByRole('button',{name:'Avrupa',exact:true}).click();
 await group.getByRole('button',{name:'Anadolu',exact:true}).click();
 await expect(group.getByRole('button',{name:'Anadolu',exact:true})).toHaveAttribute('aria-pressed','true');
 const distance=()=>group.evaluate(el=>{
  const button=el.querySelector('[aria-pressed="true"]')!.getBoundingClientRect();
  const indicator=el.querySelector('.segmented-indicator')!.getBoundingClientRect();
  return Math.abs(button.x-indicator.x)+Math.abs(button.width-indicator.width);
 });
 await expect.poll(distance).toBeLessThan(1);
 await page.setViewportSize({width:390,height:844});
 await expect.poll(distance).toBeLessThan(1);
 await page.emulateMedia({reducedMotion:'reduce'});
 await group.getByRole('button',{name:'Tüm İstanbul',exact:true}).click();
 expect(await distance()).toBeLessThan(1);
 await expect(page.getByRole('group',{name:'Hızlı Tur bölgesi'})).toHaveCount(0);
});

test('mobile disclosures, picker, dark theme and navigation remain usable', async ({page}) => {
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 await page.goto('/');
 await expect(page.getByRole('heading',{name:'Bir şehir. Binlerce keşif.'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Hattını test et'})).not.toBeVisible();
 await page.getByRole('button',{name:/Hat Uzmanı/}).click();
 await page.getByRole('button',{name:/Hattını seç/}).click();
 await page.getByRole('searchbox',{name:'Hat kodu veya adıyla ara'}).fill('500T');
 await page.getByRole('group',{name:'Bulunan hatlar'}).getByRole('button',{name:/500T/}).click();
 await expect(page.getByRole('button',{name:/Hattını seç/})).toBeFocused();
 await expect(page.getByRole('button',{name:/Hattını seç/})).toContainText('500T');
 await page.getByRole('button',{name:'Koyu tema',exact:true}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.reload();
 await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 for (const width of [320,390,768,1024,1440]) {
  await page.setViewportSize({width,height:900});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 for (const name of ['Hatları keşfet','Yolculuğum','Oyun alanı']) {
  await page.getByRole('navigation',{name:'Ana menü'}).getByRole('button',{name,exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Ana menü'}).getByRole('button',{name,exact:true})).toHaveAttribute('aria-current','page');
 }
 expect(errors).toEqual([]);
});
