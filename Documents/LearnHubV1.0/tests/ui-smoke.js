// Optional browser QA. Uses an isolated database and an in-memory mail transport; never production accounts.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../server');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'learnhub-ui-')),mails=[];
 const out=path.join(__dirname,'..','tmp','qa');fs.mkdirSync(out,{recursive:true});
 const app=createApp(dir,{sendMail:async m=>mails.push(m)});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.address().port}`;
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const errors=[];
 try{
  const setup=await browser.newContext({baseURL:base});
  for(const [nome,tipo]of [['Escola de teste','escola'],['Colaborador de teste','colaborador']]){
   const email=tipo+'@qa.local';await setup.request.post('/api/register',{data:{nome,tipo,email,senha:'test-password',communityType:'responsavel',institutionEvidence:'Instituição fictícia exclusiva para teste automatizado'}});
   const link=mails.at(-1).text.match(/https?:\/\/\S+/)[0];const token=new URLSearchParams(new URL(link).hash.slice(1)).get('token');await setup.request.post('/api/auth/verify',{data:{token}});
  }
  const db=new DatabaseSync(path.join(dir,'learnhub.sqlite'));const row=db.prepare("SELECT * FROM users WHERE email='escola@qa.local'").get();const school=JSON.parse(row.data);school.institutionStatus='aprovada';db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(school),school.id);db.close();
  const schoolContext=await browser.newContext({baseURL:base,viewport:{width:1440,height:900}}),supportContext=await browser.newContext({baseURL:base,viewport:{width:1440,height:900}});
  const schoolPage=await schoolContext.newPage(),personPage=await supportContext.newPage();
  for(const [page,email]of [[schoolPage,'escola@qa.local'],[personPage,'colaborador@qa.local']]){
   page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/login.html');await page.locator('[name=email]').fill(email);await page.locator('[name=senha]').fill('test-password');await page.getByRole('button',{name:'Entrar',exact:true}).click();await page.waitForURL('**/hub.html');
  }
  const p=await(await schoolContext.request.post('/api/projects',{data:{titulo:'Biblioteca da comunidade',descricao:'Projeto fictício para teste visual.',objetivo:'Ampliar o acervo escolar.',recursos:'Livros',categoria:'Leitura',status:'Planejamento'}})).json();
  await personPage.goto(base+'/projeto.html?id='+p.id);await personPage.locator('[name=description]').fill('Organização e entrega de livros para a biblioteca comunitária.');await personPage.getByRole('button',{name:'Enviar solicitação',exact:true}).click();await personPage.locator('#requests').getByText('Pendente',{exact:true}).waitFor();
  await schoolPage.goto(base+'/historico.html');await schoolPage.getByRole('button',{name:'Aceitar',exact:true}).click();await schoolPage.getByRole('button',{name:'Confirmar realização'}).waitFor();
  await personPage.goto(base+'/historico.html');await personPage.getByRole('link',{name:'Chat privado'}).click();await personPage.getByRole('textbox',{name:'Sua mensagem'}).fill('Olá, podemos combinar a entrega?');await personPage.getByRole('button',{name:'Enviar mensagem'}).click();await personPage.getByText('Olá, podemos combinar a entrega?',{exact:true}).last().waitFor();
  await schoolPage.getByRole('button',{name:'Confirmar realização'}).click();await schoolPage.getByRole('button',{name:'Confirmar realização',exact:true}).last().click();await schoolPage.getByRole('button',{name:'Emitir certificado'}).click();await schoolPage.getByRole('link',{name:'Ver certificado'}).click();await schoolPage.getByRole('link',{name:'Baixar PDF'}).waitFor();
  const download=await schoolContext.request.get(await schoolPage.getByRole('link',{name:'Baixar PDF'}).getAttribute('href'));assert.equal(download.status(),200);fs.writeFileSync(path.join(out,'certificate-test.pdf'),await download.body());
  // Exercise maximum-size descriptions without truncating them in certificate generation.
  const longOffer=await(await supportContext.request.post(`/api/projects/${p.id}/proposals`,{data:{kind:'Serviços',description:'Organização e catalogação de livros para a comunidade escolar. '.repeat(23)}})).json();
  assert.ok(longOffer.id);await schoolContext.request.put('/api/proposals/'+longOffer.id,{data:{status:'aceita'}});await schoolContext.request.put('/api/proposals/'+longOffer.id,{data:{status:'concluida'}});
  const longCert=await(await schoolContext.request.post('/api/proposals/'+longOffer.id+'/certificate',{data:{}})).json();
  const longPdf=await schoolContext.request.get('/api/certificates/'+longCert.code+'/pdf');assert.equal(longPdf.status(),200);fs.writeFileSync(path.join(out,'certificate-test.pdf'),await longPdf.body());
  await schoolPage.screenshot({path:path.join(out,'certificate-desktop.png'),fullPage:true});
  for(const width of [1440,390]){
   await personPage.setViewportSize({width,height:900});
   for(const page of ['historico.html','chat.html','progressao.html','perfil.html','cadastro-colaborador.html','cadastro-escola.html']){
    await personPage.goto(base+'/'+page);await personPage.waitForTimeout(150);
    const overflow=await personPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${page} overflow at ${width}`);
    const toggle=personPage.locator('[data-theme-toggle]');if(await toggle.count()){await toggle.click();assert.equal(await personPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${page} theme overflow`);}
   }
  }
  // CEP service failure/not-found responses keep manual fields editable.
  await personPage.goto(base+'/cadastro-colaborador.html');
  await personPage.route('https://viacep.com.br/**',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({erro:true})}));
  await personPage.locator('[name=cep]').fill('01001000');await personPage.getByRole('button',{name:'Consultar CEP'}).click();await personPage.getByText('CEP não encontrado. Confira ou preencha o endereço manualmente.').waitFor();
  await personPage.unroute('https://viacep.com.br/**');await personPage.route('https://viacep.com.br/**',route=>route.abort());await personPage.getByRole('button',{name:'Consultar CEP'}).click();await personPage.getByText('Consulta indisponível. Você pode preencher todos os campos manualmente.').waitFor();await personPage.locator('[name=rua]').fill('Rua preenchida manualmente');
  await personPage.goto(base+'/historico.html');await personPage.screenshot({path:path.join(out,'history-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);console.log('Browser QA passed: login, request, acceptance, chat, completion, PDF and six responsive pages. Artifacts: '+out);
 }finally{await browser.close();await new Promise(r=>app.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
