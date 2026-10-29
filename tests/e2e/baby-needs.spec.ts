import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture=process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture,'Synthetic local database only.');
test('effective needs set all five accessible bands and the existing baby expression',async({page,context,request},info)=>{
  const data=await(await request.get(fixture+'/__test/immersive?project=nursery-'+info.project.name)).json();
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(data.session)).toString('base64url'),domain:'localhost',path:'/'}]);
  let value=85,critical=false;
  await page.route('**/api/baby?**',async route=>{
    const response=await route.fetch(),body=await response.json();
    body.data.stats.needs={satiety:critical?10:value,hygiene:value,energy:value,affection:value,fun:value};
    await route.fulfill({json:body});
  });
  for(const [n,mood,band] of [[85,'happy','adequate'],[53,'unhappy','attention'],[32,'sad','critical']] as const){
    value=n;await page.goto('/game/'+data.babySave);await page.reload();
    await expect(page.locator('.baby-care-portrait > svg')).toHaveAttribute('data-mood',mood);
    await expect(page.locator(`meter[data-band="${band}"]`)).toHaveCount(5);
  }
  value=100;critical=true;await page.reload();
  await expect(page.locator('.baby-care-portrait > svg')).toHaveAttribute('data-mood','unhappy');
  await expect(page.getByRole('meter',{name:'Saciedade',exact:true})).toHaveAttribute('aria-valuetext','10 de 100 · Crítico');
  await page.setViewportSize({width:320,height:693});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.screenshot({path:info.outputPath('baby-needs-mood.png'),fullPage:true});
});
test('rotation arrows never capture touches and idle hint disappears during focus',async({page,context,request},info)=>{
  const data=await(await request.get(fixture+'/__test/immersive?project=nursery-'+info.project.name)).json();
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(data.session)).toString('base64url'),domain:'localhost',path:'/'}]);
  await page.route('**/api/game',async route=>{
    const body=route.request().postDataJSON();if(body.kind!=='focus')return route.continue();
    await route.fulfill({json:{data:{id:body.id,character_id:data.baby,status:'active',planned_seconds:120,validated_ms:0,sequence:0,client_id:body.clientId,task:'',first_step:'',reward_xp:0,created_at:new Date().toISOString(),last_seen_at:new Date().toISOString()}}});
  });
  await page.goto('/game/'+data.babySave);
  await expect(page.locator('.dial-rotation-hint')).toBeVisible();
  expect(await page.locator('.dial-rotation-hint').evaluate(el=>getComputedStyle(el).pointerEvents)).toBe('none');
  await expect(page.getByText('Gire para ajustar o tempo',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Iniciar foco',exact:true}).click();
  await expect(page.locator('.dial-rotation-hint')).toHaveCount(0);
  await expect(page.getByText('Duração preservada na sessão',{exact:true})).toBeVisible();
});
