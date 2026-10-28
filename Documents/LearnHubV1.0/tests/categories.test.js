const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../server');
test('categorias persistem, validam ofertas e preservam conversas após edição',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'learnhub-categories-'));
 let app=createApp(dir);await new Promise(r=>app.listen(0,'127.0.0.1',r));
 let base=`http://127.0.0.1:${app.address().port}`;
 const call=async(route,method='GET',data,cookie='')=>{const r=await fetch(base+'/api'+route,{method,headers:{'Content-Type':'application/json',Cookie:cookie},body:data===undefined?undefined:JSON.stringify(data)});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};};
 try{
  const cookies=[];
  for(const [name,tipo] of [['School','escola'],['Helper','colaborador'],['Other','colaborador']]){
   assert.equal((await call('/register','POST',{nome:name,email:name+'@test.local',senha:'test-password',tipo,communityType:'aluno'})).status,201);
   cookies.push((await call('/login','POST',{email:name+'@test.local',senha:'test-password'})).cookie);
  }
  const [school,helper,other]=cookies;
  for(const value of [[],['Inventada'],'Mão de obra',[null]])assert.equal((await call('/projects','POST',{titulo:'Inválido',status:'Planejamento',supportCategories:value},school)).status,400);
  const p=(await call('/projects','POST',{titulo:'Horta',status:'Planejamento',supportCategories:['Mão de obra','Recursos materiais']},school)).data;
  assert.deepEqual(p.supportCategories,['Mão de obra','Recursos materiais']);
  const route=`/projects/${p.id}/proposals`;
  for(const kind of ['', 'Serviços','<script>'])assert.equal((await call(route,'POST',{kind,description:'Oferta de apoio'},helper)).status,400);
  const r=await call(route,'POST',{kind:'Voluntariado',description:'Preparar os canteiros'},helper);assert.equal(r.status,201);assert.equal(r.data.kind,'Mão de obra');
  assert.equal((await call(route,'POST',{kind:'Materiais',description:'Outra oferta'},helper)).status,409);
  assert.equal((await call('/collaborations','GET',undefined,other)).data.length,0);
  assert.equal((await call('/collaborations','GET',undefined,school)).data[0].kind,'Mão de obra');
  assert.equal((await call(`/projects/${p.id}/messages?request=${r.data.id}`,'GET',undefined,helper)).status,403);
  assert.equal((await call('/proposals/'+r.data.id,'PUT',{status:'aceita'},school)).status,200);
  await call('/projects','POST',{...p,supportCategories:['Recursos materiais']},school);
  const c=(await call('/conversations','GET',undefined,helper)).data[0];assert.equal(c.kind,'Mão de obra');assert.equal(c.project,p.id);
  assert.equal((await call(`/projects/${p.id}/messages`,'POST',{request:r.data.id,text:'Sábado estarei disponível.'},helper)).status,201);
  assert.equal((await call(`/projects/${p.id}/messages?request=${r.data.id}`,'GET',undefined,other)).status,403);
  await new Promise(r=>app.close(r));app=createApp(dir);await new Promise(r=>app.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.address().port}`;
  assert.equal((await call('/conversations','GET',undefined,helper)).data[0].kind,'Mão de obra');
  assert.equal((await call(`/projects/${p.id}/messages?request=${r.data.id}`,'GET',undefined,helper)).data[0].text,'Sábado estarei disponível.');
 }finally{await new Promise(r=>app.close(r));}
});
