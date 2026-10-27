const {test}=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {createApp}=require('../server');
test('migração preserva dados e mensagens sem inventar aceites nem verificações',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'learnhub-migration-')),filename=path.join(dir,'learnhub.sqlite');
 let db=new DatabaseSync(filename);
 db.exec('CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,data TEXT); CREATE TABLE projects(id TEXT PRIMARY KEY,data TEXT); CREATE TABLE proposals(id TEXT PRIMARY KEY,project TEXT,supporter TEXT,kind TEXT,description TEXT,availability TEXT,status TEXT,created TEXT,updated TEXT); CREATE TABLE messages(id INTEGER PRIMARY KEY AUTOINCREMENT,project TEXT,sender TEXT,recipient TEXT,text TEXT,date TEXT,read INTEGER DEFAULT 0);');
 for(const [id,tipo]of [['school','escola'],['person','colaborador']])db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(id,id+'@test.local','unused',JSON.stringify({id,nome:id,email:id+'@test.local',tipo,xp:12}));
 const p={id:'old-project',escolaId:'school',escolaNome:'Escola antiga',titulo:'Projeto antigo',colaboradores:['person'],status:'Planejamento'};db.prepare('INSERT INTO projects VALUES (?,?)').run(p.id,JSON.stringify(p));
 db.prepare('INSERT INTO messages(project,sender,recipient,text,date) VALUES (?,?,?,?,?)').run(p.id,'person','school','Mensagem anterior preservada','2026-01-01T00:00:00Z');db.close();
 let app=createApp(dir);await new Promise(r=>app.listen(0,'127.0.0.1',r));await new Promise(r=>app.close(r));
 db=new DatabaseSync(filename);const r=db.prepare('SELECT * FROM requests').get();assert.equal(r.status,'pendente');assert.equal(r.legacy,1);assert.equal(db.prepare('SELECT request_id FROM messages').get().request_id,r.id);assert.equal(db.prepare('SELECT text FROM messages').get().text,'Mensagem anterior preservada');const u=JSON.parse(db.prepare("SELECT data FROM users WHERE id='school'").get().data);assert.equal(u.emailVerifiedAt,undefined);assert.equal(u.institutionStatus,undefined);assert.equal(u.xp,12);assert.equal(db.prepare('SELECT count(*) n FROM certificates').get().n,0);db.close();
 assert.ok(fs.readdirSync(dir).some(f=>f.startsWith('before-workflow-')));
 app=createApp(dir);await new Promise(r=>app.listen(0,'127.0.0.1',r));await new Promise(r=>app.close(r));db=new DatabaseSync(filename);assert.equal(db.prepare('SELECT count(*) n FROM requests').get().n,1);db.close();
});
