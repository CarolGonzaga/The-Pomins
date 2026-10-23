import {test,expect,type BrowserContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture=process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture,'Requires isolated SQL and simulated Auth, never remote accounts.');
async function session(context:BrowserContext,info:{session:unknown}){
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(info.session)).toString('base64url'),domain:'localhost',path:'/'}]);
}
test('protects portal routes and game while retaining legacy guest experiences',async({page})=>{
  for(const path of ['/menu','/rules','/settings','/saves','/saves/new','/game/20000000-0000-4000-8000-000000000002']){
    await page.goto(path);await expect(page).toHaveURL(/\/auth\?next=/);
  }
  await page.goto('/');await expect(page.locator('main')).toBeVisible();
  await page.goto('/play');await expect(page.getByRole('textbox',{name:'Nome do Pomin',exact:true})).toBeVisible();
});
test('navigates menu and six rules with touch targets, safe layout and accessibility',async({page,context,request},testInfo)=>{
  const info=await(await request.get(fixture+'/__test/info'+(testInfo.project.name==='iphone'?'?account=b':''))).json();await session(context,info);
  await page.goto('/menu');await expect(page.getByRole('heading',{name:'pomins.',exact:true})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath('menu.png'),fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const label of ['Começar','Regras','Configurações']){const box=await page.getByRole('link',{name:label,exact:true}).boundingBox();expect(box!.height).toBeGreaterThanOrEqual(48);}
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await page.getByRole('link',{name:'Regras',exact:true}).click();
  const titles=['Um momento para você','Seu foco vira cuidado','Pequenos gestos, uma vida','Crescer é uma escolha','Cada história, um mundo','Um foco, muitas histórias'];
  for(const [i,title] of titles.entries()){await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(i<5)await page.getByRole('button',{name:'Próximo',exact:true}).click();}
  await page.getByRole('link',{name:'Escolher partida'}).click();await expect(page.getByRole('heading',{name:'Suas partidas',exact:true})).toBeVisible();
  await page.getByRole('link',{name:'Menu principal',exact:true}).click();await page.getByRole('link',{name:'Regras',exact:true}).click();await page.getByRole('link',{name:'Pular tutorial'}).click();await expect(page).toHaveURL(/\/saves$/);
});
test('persists account preferences, themes, avatar and motion without changing a paused focus',async({page,context,request},testInfo)=>{
  const iphone=testInfo.project.name==='iphone',info=await(await request.get(fixture+'/__test/info'+(iphone?'?account=b':''))).json();await session(context,info);
  const before=await(await page.request.get('/api/game-saves/'+info.one)).json();
  await page.goto('/settings');await page.getByRole('spinbutton',{name:'Duração padrão do foco (minutos)',exact:true}).fill('37');
  await page.getByRole('combobox',{name:'Tema',exact:true}).selectOption('dark');
  await page.getByRole('checkbox',{name:'Reduzir animações da interface'}).check();await page.getByRole('radio',{name:'Lua',exact:true}).check();
  await page.getByRole('button',{name:'Salvar preferências',exact:true}).click();await expect(page.getByRole('status')).toContainText('Preferências salvas');
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await expect(page.locator('html')).toHaveAttribute('data-reduce-motion','true');
  await page.reload();await expect(page.getByRole('spinbutton',{name:'Duração padrão do foco (minutos)',exact:true})).toHaveValue('37');await expect(page.getByRole('radio',{name:'Lua',exact:true})).toBeChecked();
  await page.screenshot({path:testInfo.outputPath('settings.png'),fullPage:true});
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze()).violations).toEqual([]);
  await context.clearCookies();await page.goto('/settings');await expect(page).toHaveURL(/\/auth/);await session(context,info);await page.goto('/settings');await expect(page.getByRole('combobox',{name:'Tema',exact:true})).toHaveValue('dark');
  await page.getByRole('combobox',{name:'Tema',exact:true}).selectOption('system');await page.getByRole('button',{name:'Salvar preferências',exact:true}).click();await expect(page.getByRole('status')).toContainText('salvas');
  await page.emulateMedia({colorScheme:'light',reducedMotion:'reduce'});await expect(page.locator('html')).toHaveAttribute('data-theme','light');await page.emulateMedia({colorScheme:'dark'});await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.getByRole('link',{name:'Menu principal',exact:true}).click();await expect(page.getByRole('img',{name:'Lua',exact:true})).toBeVisible();
  if(!iphone){await page.goto('/settings');await page.getByRole('link',{name:'Privacidade e dados do universo'}).click();await expect(page.getByRole('heading',{name:'Privacidade primeiro.',exact:true})).toBeVisible();}
  if(!iphone){const after=await(await page.request.get('/api/game-saves/'+info.one)).json();expect(after.data.sessions).toEqual(before.data.sessions);expect(after.data.room.credits).toEqual(before.data.room.credits);}
  else{
    const character={name:'Tutorial',appearance:{species:'human',skin:'#d8a17d',hair:'tuft',hairColor:'#49352e',eyes:'round',eyeColor:'#544532',outfit:'#b7b0d4',accessory:'none',antennas:true,marks:false}};
    const created=await page.request.post('/api/game',{headers:{origin:new URL(page.url()).origin},data:{kind:'character',saveId:info.foreign,character}});expect(created.status()).toBe(200);
    await page.goto('/game/'+info.foreign);await page.getByRole('button',{name:'Encontrar meu foco',exact:true}).click();
    await page.getByText('Duração e intenção do foco',{exact:true}).click();
    await expect(page.getByRole('spinbutton',{name:'Ou escolha seu tempo (2 a 120 min)',exact:true})).toHaveValue('37');
  }
  const calls=await(await request.get(fixture+'/__test/info')).json();expect(calls.commands).not.toContain('focus_command');
});
test('requires password for email changes, reuses recovery and logs out to the auth menu flow',async({page,context,request},testInfo)=>{
  const iphone=testInfo.project.name==='iphone',info=await(await request.get(fixture+'/__test/info'+(iphone?'?account=b':''))).json();await session(context,info);
  await page.goto('/settings');await page.getByRole('textbox',{name:'Novo e-mail',exact:true}).fill('future@example.test');
  await page.getByLabel('Senha atual',{exact:true}).fill('wrong-fixture-password');await page.getByRole('button',{name:'Solicitar alteração de e-mail'}).click();await expect(page.locator('main [role="alert"]')).toContainText('senha atual');
  await page.getByLabel('Senha atual',{exact:true}).fill('fixture-current-password');await page.getByRole('button',{name:'Solicitar alteração de e-mail'}).click();await expect(page.getByRole('status')).toContainText('confirmação');await expect(page.getByLabel('Senha atual',{exact:true})).toHaveValue('');
  await page.getByRole('button',{name:'Receber link para alterar senha'}).click();await expect(page.getByRole('status')).toContainText('mesmo navegador');
  await page.getByRole('button',{name:'Sair da conta',exact:true}).click();await expect(page).toHaveURL(/\/auth$/);
  await page.getByRole('textbox',{name:'E-mail',exact:true}).fill(iphone?'fixture-b@example.test':'fixture-a@example.test');
  await page.getByLabel('Senha',{exact:true}).fill('fixture-current-password');await page.getByRole('button',{name:'Entrar na minha história'}).click();await expect(page).toHaveURL(/\/menu$/);
});
