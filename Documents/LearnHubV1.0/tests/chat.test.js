const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const {createApp}=require('../server');
const sharp=require('sharp');
test('fluxo completo e isolamento de colaboração, certificados, identidade e persistência',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'learnhub-workflow-')),mails=[];
 const options={sendMail:async m=>mails.push(m)};
 let app=createApp(dir,options);await new Promise(r=>app.listen(0,'127.0.0.1',r));let base=`http://127.0.0.1:${app.address().port}`;
 const token=name=>new URL(mails.filter(m=>m.to===name+'@test.local').at(-1).text.match(/https?:\/\/\S+/)[0]).hash.split('token=')[1];
 async function call(route,method='GET',body,cookie=''){const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const login=name=>call('/login','POST',{email:name+'@test.local',senha:'test-password'});
 try{
  for(const [name,tipo]of [['school','escola'],['supporter','colaborador'],['outsider','colaborador'],['admin','colaborador']]){
   const r=await call('/register','POST',{nome:name,tipo,email:name+'@test.local',senha:'test-password',communityType:'aluno',institutionEvidence:'INEP e contato oficial',cep:'01001000',rua:'Rua privada',bairro:'Centro',cidade:'São Paulo',estado:'SP',numero:'100',complemento:'Apartamento privado'});assert.equal(r.status,201,JSON.stringify(r.data));
  }
  assert.equal((await login('school')).status,403);
  const expiryDb=new DatabaseSync(path.join(dir,'learnhub.sqlite'));
  expiryDb.prepare("UPDATE account_tokens SET expires=0 WHERE user_id=(SELECT id FROM users WHERE email='outsider@test.local')").run();expiryDb.close();
  assert.equal((await call('/auth/verify','POST',{token:token('outsider')})).status,400);
  assert.equal((await call('/auth/resend','POST',{email:'outsider@test.local'})).status,200);
  for(const name of ['school','supporter','outsider','admin'])assert.equal((await call('/auth/verify','POST',{token:token(name)})).status,200);
  assert.equal((await call('/auth/verify','POST',{token:token('school')})).status,400);
  const db=new DatabaseSync(path.join(dir,'learnhub.sqlite'));const row=db.prepare('SELECT * FROM users WHERE email=?').get('admin@test.local');const u=JSON.parse(row.data);u.tipo='admin';db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(u),u.id);db.close();
  const school=(await login('school')).cookie,supporter=(await login('supporter')).cookie,outsider=(await login('outsider')).cookie,admin=(await login('admin')).cookie;assert.ok(school&&supporter&&outsider&&admin);
  assert.equal((await call('/projects','POST',{titulo:'Projeto',status:'Planejamento'},school)).status,403);
  assert.equal((await call('/admin/schools','GET',undefined,supporter)).status,403);
  const schoolId=(await call('/profile','GET',undefined,school)).data.id;
  assert.equal((await call('/admin/schools/'+schoolId,'PUT',{status:'aprovada',reason:'Forjado'},school)).status,403);
  assert.equal((await call('/admin/schools/'+schoolId,'PUT',{status:'recusada',reason:'Faltam referências oficiais'},admin)).status,200);
  assert.equal((await call('/institution','POST',{institutionEvidence:'Novas referências oficiais para análise'},school)).status,200);
  assert.equal((await call('/admin/schools/'+schoolId,'PUT',{status:'aprovada',reason:'Registro oficial e vínculo confirmados'},admin)).status,200);
  const p=(await call('/projects','POST',{titulo:'Projeto de leitura',status:'Planejamento'},school)).data;assert.ok(p.id);
  const photoData=(await sharp({create:{width:64,height:36,channels:3,background:'#7620c8'}}).png().toBuffer()).toString('base64');
  assert.equal((await call('/projects','POST',{...p,imageData:photoData},outsider)).status,403);
  assert.equal((await call('/projects','POST',{...p,imageData:'bm90YW5pbWFnZQ=='},school)).status,400);
  const image=await call('/projects','POST',{...p,imageData:photoData},school);assert.match(image.data.imagem,/^data:image\/jpeg;base64,/);
  assert.equal((await call('/projects','POST',{...p,keepImage:true},school)).data.imagem,image.data.imagem);
  const offer={kind:'Materiais',description:'Entrega de livros e organização da biblioteca.',availability:'Sábado'},endpoint=`/projects/${p.id}/proposals`;
  assert.equal((await call(`/projects/${p.id}/join`,'POST',{},supporter)).status,409);
  assert.equal((await call(endpoint,'POST',offer,school)).status,403);
  assert.equal((await call(endpoint,'POST',{...offer,description:' '},supporter)).status,400);
  const first=await call(endpoint,'POST',offer,supporter);assert.equal(first.status,201);assert.equal(first.data.status,'pendente');
  assert.equal((await call(endpoint,'POST',offer,supporter)).status,409);
  assert.equal((await call('/conversations','GET',undefined,supporter)).data.length,0);
  const requestPath='/proposals/'+first.data.id;
  assert.equal((await call(`/projects/${p.id}/messages?request=${first.data.id}`,'GET',undefined,supporter)).status,403);
  for(const cookie of [outsider,supporter])assert.equal((await call(requestPath,'PUT',{status:'aceita'},cookie)).status,403);
  assert.equal((await call(requestPath,'PUT',{status:'concluida'},school)).status,409);
  assert.equal((await call(requestPath,'PUT',{status:'recusada'},school)).status,400);
  assert.equal((await call(requestPath,'PUT',{status:'recusada',reason:'O acervo já recebeu estes materiais.'},school)).status,200);
  assert.equal((await call('/collaborations','GET',undefined,supporter)).data[0].reason,'O acervo já recebeu estes materiais.');
  assert.equal((await call('/collaborations','GET',undefined,outsider)).data.length,0);
  const second=await call(endpoint,'POST',offer,supporter);assert.equal(second.status,201);const id=second.data.id;
  assert.equal((await call('/proposals/'+id,'PUT',{status:'aceita'},school)).status,200);
  assert.equal((await call('/conversations','GET',undefined,supporter)).data[0].request,id);
  const msgRoute=`/projects/${p.id}/messages?request=${id}`;
  assert.equal((await call(msgRoute,'POST',{request:id,text:'Olá!'},outsider)).status,403);
  assert.equal((await call(msgRoute,'POST',{request:id,recipient:'intruso',text:'Olá!'},supporter)).status,403);
  assert.equal((await call(msgRoute,'POST',{request:id,text:'Vamos combinar a entrega?'},supporter)).status,201);
  assert.equal((await call('/conversations','GET',undefined,school)).data[0].unread,1);
  assert.equal((await call(msgRoute,'GET',undefined,school)).data[0].text,'Vamos combinar a entrega?');
  await call(msgRoute,'PUT',{},school);assert.equal((await call('/conversations','GET',undefined,school)).data[0].unread,0);
  assert.equal((await call(msgRoute,'POST',{request:id,text:'Combinado!'},school)).status,201);
  assert.equal((await call('/proposals/'+id+'/certificate','POST',{},school)).status,409);
  assert.equal((await call('/profile','PUT',{nome:'Colaborador atualizado',tipo:'admin',xp:999,emailVerifiedAt:'fake',institutionStatus:'aprovada'},supporter)).data.tipo,'colaborador');
  const parallel=await Promise.all([call('/profile','PUT',{photoData},supporter),call('/proposals/'+id,'PUT',{status:'concluida'},school)]);assert.equal(parallel[0].status,200);assert.equal(parallel[1].status,200);
  assert.equal((await call('/proposals/'+id,'PUT',{status:'concluida'},school)).status,409);
  const rewarded=(await call('/profile','GET',undefined,supporter)).data;assert.equal(rewarded.xp,20);assert.ok(rewarded.emblemas.includes('colaboracao-confirmada'));
  const avatar=await fetch(base+rewarded.foto,{headers:{Cookie:school}});assert.equal(avatar.status,200);const meta=await sharp(Buffer.from(await avatar.arrayBuffer())).metadata();assert.equal(meta.width,512);assert.equal(meta.exif,undefined);
  assert.equal((await call('/proposals/'+id+'/certificate','POST',{},supporter)).status,403);
  assert.equal((await call('/proposals/'+id+'/certificate','POST',{},outsider)).status,403);
  const certificate=await call('/proposals/'+id+'/certificate','POST',{},school);assert.equal(certificate.status,200);const code=certificate.data.code;
  assert.equal((await call('/proposals/'+id+'/certificate','POST',{},school)).data.code,code);assert.equal(certificate.data.cargaHoraria,undefined);
  assert.equal((await call('/certificates/'+code,'GET',undefined,outsider)).status,403);assert.equal((await call('/certificates/'+code)).status,401);
  const pdf=await fetch(base+'/api/certificates/'+code+'/pdf',{headers:{Cookie:supporter}});assert.equal(pdf.headers.get('content-type'),'application/pdf');const buffer=Buffer.from(await pdf.arrayBuffer());assert.equal(buffer.subarray(0,4).toString(),'%PDF');assert.ok(buffer.length>1000);
  assert.equal((await call(`/projects/${p.id}`,'DELETE',undefined,school)).status,409);
  const html=await(await fetch(base+'/hub.html')).text();assert.ok(!html.includes('Rua privada'));assert.ok(!html.includes('Apartamento privado'));
  const third=await call(endpoint,'POST',{...offer,description:'Nova entrega distinta'},supporter);assert.equal(third.status,201);await call('/proposals/'+third.data.id,'PUT',{status:'aceita'},school);await call('/proposals/'+third.data.id,'PUT',{status:'concluida'},school);assert.equal((await call('/profile','GET',undefined,supporter)).data.xp,40);
  await new Promise(r=>app.close(r));app=createApp(dir,options);await new Promise(r=>app.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.address().port}`;
  assert.equal((await call(msgRoute,'GET',undefined,school)).data.length,2);assert.equal((await call('/profile','GET',undefined,supporter)).data.xp,40);assert.equal((await call('/certificates/'+code,'GET',undefined,supporter)).data.code,code);
  assert.equal((await call('/profile','PUT',{nome:'Escola com nome alterado'},school)).data.institutionStatus,'pendente');
  assert.equal((await call('/projects','POST',{titulo:'Sem nova análise',status:'Planejamento'},school)).status,403);
  assert.equal((await call('/certificates/'+code,'GET',undefined,supporter)).data.escola,'school');
  await call('/auth/request-reset','POST',{email:'supporter@test.local'});const reset=token('supporter');
  assert.equal((await call('/auth/reset','POST',{token:reset,senha:'new-test-password'})).status,200);assert.equal((await call('/auth/reset','POST',{token:reset,senha:'another-password'})).status,400);assert.equal((await call('/profile','GET',undefined,supporter)).status,401);
  for(let i=0;i<9;i++){const r=await call('/login','POST',{email:'outsider@test.local',senha:'wrong-password'});if(i===8)assert.equal(r.status,429);}
 }finally{await new Promise(r=>app.close(r));}
});
test('sem SMTP não anuncia verificação ou entrega real',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'learnhub-no-mail-'));const app=createApp(dir);await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const r=await fetch(`http://127.0.0.1:${app.address().port}/api/register`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:'Sem SMTP',email:'no-mail@test.local',senha:'test-password',tipo:'colaborador',communityType:'comunidade'})});const data=await r.json();assert.equal(r.status,201);assert.equal(data.emailSent,false);assert.match(data.message,/não confirmada/);}finally{await new Promise(r=>app.close(r));}
});
