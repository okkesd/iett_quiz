import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { ENGINE_VERSION, QuizEngine } from '../../src/lib/quiz';
import { questionHint } from '../../src/lib/hints';
import type { Config, Difficulty, Network, Question } from '../../src/lib/types';

const network:Network=JSON.parse(readFileSync('public/data/network.json','utf8'));
const engine=new QuizEngine(network);

async function round(page:Page,difficulty:Difficulty='easy') {
  for(let attempt=0;attempt<30;attempt++) {
    const config:Config={mode:'duel',difficulty,seed:`hint-browser-${attempt}`,count:10};
    const questions=engine.generate(config);
    const kinds=['not-stop','not-line','endpoints',difficulty==='hard'?'transfer':'direct','common','map','order','at-stop'];
    if(!kinds.every((kind,i)=>questions[i].kind===kind))continue;
    await page.goto('/?'+new URLSearchParams({duel:config.seed,v:network.version,ev:ENGINE_VERSION,d:difficulty}));
    await page.getByRole('button',{name:'Düelloyu başlat',exact:true}).click();
    return questions;
  }
  throw new Error('Could not find the representative hint round.');
}

async function correct(page:Page,q:Question,last=false) {
  await page.locator('.answer-option').nth(q.options.findIndex(o=>o.id===q.correctId)).click();
  await page.getByRole('button',{name:last?'Sonucumu gör':'Sıradaki soru',exact:true}).click();
}

test('all easy hints work, persist, hide the common stop name and appear in shared results',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.emulateMedia({colorScheme:'dark'});
  const questions=await round(page);
  for(let i=0;i<questions.length;i++) {
    const q=questions[i],hint=questionHint(engine,q);
    await page.getByRole('button',{name:'İpucu al',exact:true}).click();
    await expect(page.getByRole('button',{name:'İpucu açıldı',exact:true})).toBeDisabled();
    await expect(page.locator('.hint-panel')).toContainText(hint.text);
    await expect(page.locator('.answer-option:not(:disabled)')).toHaveCount(4);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    if(i===0) {
      expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:session:v1')!).answers.length)).toBe(0);
      await page.reload();await page.getByRole('button',{name:'Devam et',exact:true}).click();
      await expect(page.locator('.hint-panel')).toContainText(hint.text);
      expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:session:v1')!).hintedQuestionIds.length)).toBe(1);
    }
    if(q.kind==='common') {
      await expect(page.locator('.hint-panel .route-stop')).toHaveCount(1);
      await expect(page.locator('.hint-panel .route-path')).toHaveCount(0);
      await page.locator('.hint-panel .route-stop').hover();
      await expect(page.locator('.hint-panel .leaflet-tooltip')).toHaveCount(0);
      await expect(page.locator('.hint-panel')).not.toContainText(engine.groups.get(q.correctId)!.name);
      await page.screenshot({path:'test-results/common-hint-mobile.png',fullPage:true});
    }
    if(q.kind==='direct') {
      await expect(page.locator('.hint-panel .route-stop')).toHaveCount(2);
      await expect(page.locator('.hint-panel .route-path')).toHaveCount(0);
      await expect(page.locator('.hint-panel')).toContainText('A · Başlangıç');
    }
    await correct(page,q,i===questions.length-1);
  }
  await expect(page.locator('.result-stats')).toContainText('1.000');
  await expect(page.locator('.result-hints')).toHaveText('10 soruda ipucu kullanıldı.');
  await page.getByRole('button',{name:'Sonucunu paylaş'}).click();
  await expect(page.getByLabel('Paylaşım metni / bağlantısı')).toHaveValue(/İpucu: 10 soru/);
});

test('transfer hint shows the first leg and keeps every choice available',async({page})=>{
  const questions=await round(page,'hard');
  for(let i=0;i<3;i++)await correct(page,questions[i]);
  await page.getByRole('button',{name:'İpucu al',exact:true}).click();
  await expect(page.getByRole('heading',{name:'İlk hattı buldun'})).toBeVisible();
  await expect(page.locator('.answer-option:not(:disabled)')).toHaveCount(4);
  await correct(page,questions[3]);
  await expect(page.getByRole('button',{name:'İpucu al',exact:true})).toBeEnabled();
});

test('daily hints survive resuming and timed hints do not reset the deadline',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Günün rotasını çöz'}).click();
  await page.getByRole('button',{name:'İpucu al',exact:true}).click();
  const dailyText=await page.locator('.hint-panel p').textContent();
  await page.getByRole('button',{name:'Ara ver',exact:true}).click();
  await page.getByRole('button',{name:'Günün rotasını çöz'}).click();
  await expect(page.locator('.hint-panel p')).toHaveText(dailyText!);
  await page.getByRole('button',{name:'Ara ver',exact:true}).click();
  await page.getByRole('button',{name:'Tura başla',exact:true}).click();
  const deadline=await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:session:v1')!).deadline);
  await page.getByRole('button',{name:'İpucu al',exact:true}).click();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('son-durak:session:v1')!).deadline)).toBe(deadline);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('son-durak:session:v1')!);s.deadline=Date.now()-100;localStorage.setItem('son-durak:session:v1',JSON.stringify(s));});
  await page.reload();await page.getByRole('button',{name:'Devam et',exact:true}).click();
  await expect(page.locator('.result-hints')).toHaveText('1 soruda ipucu kullanıldı.');
  await expect(page.getByRole('button',{name:'İpucu al',exact:true})).toHaveCount(0);
});
