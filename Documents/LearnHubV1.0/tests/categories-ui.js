// Run with PLAYWRIGHT_MODULE set to the installed Playwright module path.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict');
const {createApp}=require('../server');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const app=createApp(fs.mkdtempSync(path.join(os.tmpdir(),'learnhub-category-ui-')));await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.address().port}`,out=path.join(__dirname,'../tmp/qa');fs.mkdirSync(out,{recursive:true});
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{
  const contexts=[];const errors=[];
  for(const [nome,tipo]of [['Escola Jardim','escola'],['Ana Voluntária','colaborador'],['Bruno Materiais','colaborador']]){
   const c=await browser.newContext({baseURL:base,viewport:{width:1440,height:1000}});contexts.push(c);
   const data={nome,tipo,email:`person${contexts.length}@qa.local`,senha:'test-password',communityType:'aluno'};
   assert.equal((await c.request.post('/api/register',{data})).status(),201);
   assert.equal((await c.request.post('/api/login',{data:{email:data.email,senha:data.senha}})).status(),200);
  }
  const [school,ana,bruno]=contexts;const page=await school.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/adicionar-projeto.html');
  for(const [name,value]of Object.entries({titulo:'Horta comunitária',descricao:'Horta para a escola',objetivo:'Aprender a cultivar',recursos:'Ferramentas e voluntários'}))await page.locator(`[name=${name}]`).fill(value);
  await page.getByRole('button',{name:'Publicar projeto'}).click();await page.getByText('Selecione pelo menos uma categoria de apoio válida.').waitFor();
  for(const value of ['Mão de obra','Recursos materiais'])await page.locator(`[name=supportCategories][value="${value}"]`).check();
  await page.getByRole('button',{name:'Publicar projeto'}).click();await page.waitForURL('**/projeto.html?id=*');const id=new URL(page.url()).searchParams.get('id');
  await page.goto(base+'/adicionar-projeto.html?edit='+id);assert.equal(await page.locator('[name=supportCategories]:checked').count(),2);
  const a=await ana.newPage();a.on('pageerror',e=>errors.push(e.message));await a.goto(base+'/projeto.html?id='+id);
  assert.equal(await a.locator('[name=kind] option').count(),3);await a.locator('[name=kind]').selectOption('Mão de obra');await a.locator('[name=description]').fill('Posso preparar os canteiros no sábado.');await a.getByRole('button',{name:'Enviar solicitação',exact:true}).click();await a.locator('#requests').getByText('Pendente',{exact:true}).waitFor();
  assert.equal((await bruno.request.post(`/api/projects/${id}/proposals`,{data:{kind:'Recursos materiais',description:'Posso doar ferramentas.'}})).status(),201);
  const other=(await(await school.request.post('/api/projects',{data:{titulo:'Biblioteca',status:'Planejamento',supportCategories:['Mão de obra']}})).json());
  await ana.request.post(`/api/projects/${other.id}/proposals`,{data:{kind:'Mão de obra',description:'Organizar livros.'}});
  await page.goto(base+'/chat.html?project='+id);await page.locator('#chatCategories [data-category="Mão de obra"]').click();
  assert.equal(await page.locator('#conversations .conversation-item').count(),1);assert.match(await page.locator('#conversations').innerText(),/Ana Voluntária/);
  await page.locator('#conversations button').click();await page.getByText('Posso preparar os canteiros no sábado.',{exact:true}).waitFor();assert.equal(await page.locator('#messageForm').isVisible(),false);
  await page.screenshot({path:path.join(out,'categories-desktop.png'),fullPage:true});
  await page.getByRole('button',{name:'Aceitar e abrir chat'}).click();await page.locator('#messageForm').waitFor({state:'visible'});
  await page.locator('#messageText').fill('Combinado!');await page.getByRole('button',{name:'Enviar mensagem'}).click();await page.locator('.message-body').getByText('Combinado!',{exact:true}).waitFor();
  await page.locator('#chatCategories [data-category="Recursos materiais"]').click();assert.match(await page.locator('#conversations').innerText(),/Bruno Materiais/);assert.doesNotMatch(await page.locator('#conversations').innerText(),/Ana Voluntária/);
  await page.locator('#conversations button').click();await page.locator('[name=reason]').fill('A escola já recebeu as ferramentas.');await page.getByRole('button',{name:'Recusar solicitação'}).click();await page.getByText('Motivo da recusa:',{exact:true}).waitFor();
  await page.locator('#chatProject').selectOption(other.id);await page.locator('#conversations button').click();await page.getByText('Organizar livros.',{exact:true}).waitFor();
  assert.doesNotMatch(await page.locator('#messages').innerText(),/Combinado!/);
  for(const width of [390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);}
  await page.screenshot({path:path.join(out,'categories-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('Categories browser QA passed: creation/edit, required choice, project/category isolation, pending, acceptance, private message, refusal, 320px/390px.');
 }finally{await browser.close();await new Promise(r=>app.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
