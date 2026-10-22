import {test,expect,type BrowserContext,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const fixture=process.env.POMINS_SAVE_FIXTURE_ORIGIN;
test.skip(!fixture,'Requires disposable SQL/Auth fixture, never remote accounts.');
async function signIn(context:BrowserContext,session:unknown){
  await context.addCookies([{name:'sb-127-auth-token',value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url'),domain:'localhost',path:'/'}]);
}
async function birth(page:Page,name:string,sky:boolean){
  await page.getByRole('button',{name:'Criar meu primeiro Pomin',exact:true}).click();
  await page.getByRole('textbox',{name:'Nome do seu Pomin',exact:true}).fill(name);
  await page.getByRole('button',{name:'Dar boas-vindas ao mundo',exact:true}).click();
  await expect(page.getByRole('heading',{name:new RegExp('O mundo ganhou')})).toContainText(name);
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await page.getByRole('button',{name:sky?/A luz dançando na janela/:/A voz que diz/}).click();
  await page.getByRole('button',{name:'Guardar essa primeira memória',exact:true}).click();
  await expect(page.getByRole('button',{name:'Cuidar do meu bebê',exact:true})).toBeVisible();
}

test('manages two new stories, resumes creation, birth, archive, restore and login without focus effects',async({page,context,request},testInfo)=>{
  test.setTimeout(90000);
  const info=await(await request.get(fixture+'/__test/info')).json();await signIn(context,info.session);
  const prefix=`História ${testInfo.project.name} ${Date.now()}`;
  await page.goto('/saves');await expect(page.getByRole('heading',{name:'Suas partidas',exact:true})).toBeVisible();
  await expect(page.getByRole('article',{name:'Minha primeira partida',exact:true}).getByRole('button',{name:'Arquivar',exact:true})).toBeDisabled();
  const initial=await(await page.request.get('/api/game-saves/'+info.one)).json();
  await page.getByRole('link',{name:'Nova partida',exact:true}).click();
  await page.getByRole('textbox',{name:'Nome da partida',exact:true}).fill(prefix+' A');
  // Let SQL commit, then lose the response. Retry after reload must recover exactly that save.
  let dropped=false;
  await page.route('**/api/game-saves',async route=>{
    if(route.request().method()==='POST' && !dropped){dropped=true;await route.fetch();await route.abort('failed');}else await route.continue();
  });
  await page.getByRole('button',{name:'Criar partida',exact:true}).click();
  await expect(page.locator('main [role="alert"]')).toBeVisible();await page.reload();
  await expect(page.getByRole('textbox',{name:'Nome da partida'})).toHaveValue(prefix+' A');
  await page.getByRole('button',{name:'Continuar pedido de criação',exact:true}).click();
  await expect(page).toHaveURL(/\/game\/[0-9a-f-]+$/);const first=page.url().split('/').at(-1)!;
  await page.goto('/saves');
  await expect(page.getByRole('article',{name:prefix+' A',exact:true})).toHaveCount(1);
  await page.getByRole('article',{name:prefix+' A',exact:true}).getByRole('link',{name:'Retomar criação'}).click();
  await birth(page,'Lua',true);
  await page.goto('/saves/new');await page.getByRole('textbox',{name:'Nome da partida'}).fill(prefix+' B');await page.getByRole('button',{name:'Criar partida',exact:true}).click();
  await expect(page).toHaveURL(/\/game\/[0-9a-f-]+$/);const second=page.url().split('/').at(-1)!;expect(first).not.toBe(second);
  await birth(page,'Mar',false);
  const a=await(await page.request.get('/api/game-saves/'+first)).json(),b=await(await page.request.get('/api/game-saves/'+second)).json();
  expect(a.data.characters.map((c:{name:string})=>c.name)).toEqual(['Lua']);expect(b.data.characters.map((c:{name:string})=>c.name)).toEqual(['Mar']);
  expect(a.data.memories[0].choice_id).toBe('sky');expect(b.data.memories[0].choice_id).toBe('home');
  expect(a.data.room.credits).toEqual(initial.data.room.credits);expect(b.data.sessions).toEqual(initial.data.sessions);
  await page.goto('/saves');let card=page.getByRole('article',{name:prefix+' A',exact:true});
  await expect(card.getByRole('img',{name:'Aparência de Lua'})).toBeVisible();
  await card.getByRole('button',{name:'Arquivar',exact:true}).click();await card.getByRole('button',{name:'Manter partida'}).click();await expect(card).toBeVisible();
  await card.getByRole('button',{name:'Arquivar',exact:true}).click();await card.getByRole('button',{name:'Confirmar arquivamento'}).click();await expect(card).toHaveCount(0);
  await page.getByRole('link',{name:'Arquivadas',exact:true}).click();card=page.getByRole('article',{name:prefix+' A',exact:true});await expect(card).toBeVisible();
  await page.goto('/game/'+first);await expect(page.getByRole('heading',{name:'Partida indisponível'})).toBeVisible();
  await page.goto('/saves?archived=true');await page.getByRole('article',{name:prefix+' A',exact:true}).getByRole('button',{name:'Restaurar',exact:true}).click();await expect(page.getByRole('article',{name:prefix+' A',exact:true})).toHaveCount(0);
  await context.clearCookies();await page.goto('/saves');await expect(page).toHaveURL(/\/auth\?next=/);
  await signIn(context,info.session);await page.goto('/saves');
  await page.getByRole('article',{name:prefix+' A',exact:true}).getByRole('link',{name:'Continuar',exact:true}).click();
  await expect(page.getByRole('navigation',{name:'Moradores da partida'})).toContainText('Lua · Protagonista');
  await page.reload();await page.getByRole('button',{name:'Cuidar do meu bebê',exact:true}).click();await expect(page.locator('.baby-care')).toBeVisible();
  await page.goto('/saves');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('saves.png'),fullPage:true});
  const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa']).analyze();expect(audit.violations).toEqual([]);
  const final=await(await page.request.get('/api/game-saves/'+info.one)).json();expect(final.data.sessions).toEqual(initial.data.sessions);expect(final.data.room.credits).toEqual(initial.data.room.credits);
});

test('rejects foreign archive and handles connection errors and pending protagonist',async({page,context,request})=>{
  const info=await(await request.get(fixture+'/__test/info')).json();await signIn(context,info.session);
  await page.goto('/saves');
  const foreign=await page.request.patch('/api/game-saves',{headers:{origin:new URL(page.url()).origin},data:{saveId:info.foreign,archived:true,expectedRevision:0}});expect(foreign.status()).toBe(409);
  await page.route('**/api/game-saves',route=>route.fulfill({status:503,json:{error:'Conexão indisponível'}}));
  await page.goto('/saves/new');await page.getByRole('textbox',{name:'Nome da partida'}).fill('Falha temporária');await page.getByRole('button',{name:'Criar partida',exact:true}).click();await expect(page.locator('main [role="alert"]')).toContainText('Conexão indisponível');
  await page.unroute('**/api/game-saves');await page.goto('/game/'+info.two);
  // A parallel regression scenario may already have chosen Nina. Neither listing nor navigation chooses automatically.
  const result=await(await page.request.get('/api/game-saves/'+info.two)).json();
  if(result.data.context.save.state==='pending_selection')await expect(page.getByRole('heading',{name:'Quem protagoniza esta história?'})).toBeVisible();
});
