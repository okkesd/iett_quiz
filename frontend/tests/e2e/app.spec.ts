import { test,expect,type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { QuizEngine } from '../../src/lib/quiz';
import type { Network } from '../../src/lib/types';
import type { Session } from '../../src/lib/storage';
const data:Network=JSON.parse(readFileSync('public/data/network.json','utf8'));const engine=new QuizEngine(data);
async function answer(page:Page,correct=true){
 const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:session:v1')!) as Session);
 const q=engine.generate(s.config)[s.index];const o=q.options.find(o=>correct?o.id===q.correctId:o.id!==q.correctId)!;
 await page.getByRole('button',{name:new RegExp(o.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).filter({has:page.locator('.option-letter')}).click();
 await expect(page.getByText(correct?'Doğru duraktasın!':'Bu kez durağı kaçırdın.')).toBeVisible();
}
test.beforeEach(async({page})=>{await page.goto('/');await expect(page.getByRole('button',{name:'Tura başla',exact:true})).toBeVisible();});
test('desktop home, data attribution and route explorer',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.screenshot({path:'test-results/home-desktop.png',fullPage:true});
 await page.locator('.sidebar').getByRole('button',{name:'Veri ve kaynaklar',exact:true}).click();await expect(page.getByText('17 Mart 2026',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Hatları keşfet',exact:true}).click();await page.getByRole('textbox',{name:'Hat ara'}).fill('500T');await page.locator('.line-list button').first().click();await expect(page.locator('.route-title')).toContainText('500T');
 await page.locator('.pattern-select select').selectOption('1');await expect(page.locator('.stop-list li').first()).toContainText('Şifa');
 await page.screenshot({path:'test-results/explorer-desktop.png',fullPage:true});expect(errors).toEqual([]);
});
test('daily completion, persisted answer, locked reward and result sharing',async({page})=>{
 await page.getByRole('button',{name:'Günün rotasını çöz'}).click();await answer(page);
 await page.reload();await page.getByRole('button',{name:'Devam et',exact:true}).click();await expect(page.getByText('Doğru duraktasın!')).toBeVisible();
 await page.getByRole('button',{name:'Sıradaki soru'}).click();
 for(let i=1;i<5;i++){await answer(page,i!==2);await page.getByRole('button',{name:i===4?'Sonucumu gör':'Sıradaki soru'}).click();}
 await expect(page.locator('.result-stats')).toContainText('400');await page.getByRole('button',{name:'Sonucunu paylaş'}).click();await expect(page.getByLabel('Paylaşım metni / bağlantısı')).toHaveValue(/🟩🟩⬛🟩🟩/);
 const xp=await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:progress:v1')!).xp);
 await page.reload();await page.getByRole('button',{name:'Bugünkü sonucunu gör'}).click();await expect(page.locator('.result-stats')).toContainText('400');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:progress:v1')!).xp)).toBe(xp);
});
test('survival ends after exactly three wrong answers',async({page})=>{
 await page.getByRole('button',{name:/Son Yolcu/}).click();
 await page.getByRole('button',{name:'Yola çık',exact:true}).click();
 for(let i=0;i<3;i++){await answer(page,false);await page.getByRole('button',{name:i===2?'Sonucumu gör':'Sıradaki soru'}).click();}
 await expect(page.locator('.results-page')).toBeVisible();await expect(page.locator('.result-stats')).toContainText('/3');
});
test('quick round expires on wall clock and survives refresh',async({page})=>{
 await page.getByRole('button',{name:'Tura başla',exact:true}).click();await answer(page);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('son-durak:session:v1')!);s.deadline=Date.now()-100;localStorage.setItem('son-durak:session:v1',JSON.stringify(s));});
 await page.reload();await page.getByRole('button',{name:'Devam et',exact:true}).click();await expect(page.locator('.results-page')).toBeVisible();await expect(page.locator('.result-stats')).toContainText('100');await expect(page.locator('.result-grid .empty')).toHaveCount(9);
});
test('duel URLs reproduce questions and reject incompatible data',async({page,context})=>{
 await page.getByRole('button',{name:/Arkadaş Düellosu/}).click();
 await page.getByRole('button',{name:'Düelloya başla',exact:true}).click();const prompt=await page.locator('.question-card h1').textContent();
 await page.getByRole('button',{name:'Aynı soruların bağlantısını kopyala'}).click();const url=await page.getByLabel('Paylaşım metni / bağlantısı').inputValue();
 const other=await context.newPage();await other.goto(url);await other.getByRole('button',{name:'Düelloyu başlat',exact:true}).click();await expect(other.locator('.question-card h1')).toHaveText(prompt!);
 const invalid=new URL(url);invalid.searchParams.set('v','old-data');await other.goto(invalid.toString());await expect(other.getByText('Bu düello bağlantısı açılamıyor.')).toBeVisible();await expect(other.getByRole('button',{name:'Düelloyu başlat',exact:true})).toHaveCount(0);
});
test('mobile plays through a full expert round without horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/home-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
 await page.getByRole('button',{name:/Hat Uzmanı/}).click();
 await page.getByRole('button',{name:'Hattını test et'}).click();
 for(let i=0;i<10;i++){await answer(page);if(i===0)await page.screenshot({path:'test-results/answer-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.getByRole('button',{name:i===9?'Sonucumu gör':'Sıradaki soru'}).click();}
 await expect(page.getByRole('heading',{name:'İstanbul senden sorulur.'})).toBeVisible();
 await page.getByRole('button',{name:'Yolculuğum',exact:true}).click();await expect(page.getByText('Hat uzmanı',{exact:true})).toBeVisible();
});
test('district selection and invalid stored JSON recover safely',async({page})=>{
 await page.getByRole('button',{name:/Mahalleni Tanı/}).click();
 await page.getByLabel('Oyun ilçesi').selectOption('Beşiktaş');await page.getByRole('button',{name:'Semtini keşfet'}).click();await answer(page);
 await page.evaluate(()=>{localStorage.setItem('son-durak:progress:v1','broken-json');localStorage.setItem('son-durak:session:v1','{"version":"garbage"}');});
 await page.reload();await expect(page.getByRole('button',{name:'Tura başla',exact:true})).toBeVisible();
});
test('hard mode includes a usable transfer question and accessible keyboard answers',async({page})=>{
 await page.getByRole('button',{name:'Zor',exact:true}).click();await page.getByRole('button',{name:/Hat Uzmanı/}).click();await page.getByRole('button',{name:'Hattını test et'}).click();
 for(let i=0;i<3;i++){await answer(page);await page.getByRole('button',{name:'Sıradaki soru'}).click();}
 await expect(page.locator('.question-card h1')).toBeVisible();
 await page.locator('.question-card h1').focus();await page.keyboard.press('1');await expect(page.locator('.answer-feedback')).toBeVisible();
 await expect(page.locator('.answer-option:disabled')).toHaveCount(4);
 await page.screenshot({path:'test-results/hard-answer.png',fullPage:true});
});
test('optional WebMCP read tool follows visible state and rejects invalid inputs',async({page})=>{
 await page.addInitScript(()=>{
  const registry:unknown[]=[];(window as unknown as {registeredTools:unknown[]}).registeredTools=registry;
  Object.defineProperty(document,'modelContext',{value:{registerTool:(tool:unknown)=>registry.push(tool)}});
 });
 await page.reload();await page.getByRole('button',{name:'Tura başla',exact:true}).click();
 const result=await page.evaluate(()=>{
  const registry=(window as unknown as {registeredTools:{name:string;execute:(input:unknown)=>unknown}[]}).registeredTools;
  const tool=registry.at(-1)!;let rejected=false;try{tool.execute({unexpected:true});}catch{rejected=true;}
  return {name:tool.name,state:tool.execute({}),rejected};
 });
 expect(result.name).toBe('get_quiz_state');expect(result.rejected).toBe(true);expect(result.state).toMatchObject({view:'game',mode:'quick'});
});
