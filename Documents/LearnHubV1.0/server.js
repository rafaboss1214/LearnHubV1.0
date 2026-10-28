const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const sharp = require('sharp');
const {createWorkflow} = require('./workflow');
const {dataDirectory, serverConfig} = require('./config');

function createApp(dataDir = dataDirectory(), options = {}) {
    fs.mkdirSync(dataDir, { recursive: true });
    const db = new DatabaseSync(path.join(dataDir, 'learnhub.sqlite'));
    db.exec(`PRAGMA journal_mode=WAL;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE,password TEXT,data TEXT);
      CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT,expires INTEGER);
      CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,data TEXT);
      CREATE TABLE IF NOT EXISTS avatars(user_id TEXT PRIMARY KEY,image BLOB NOT NULL,version TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS xp_rewards(user_id TEXT,project TEXT,proposal TEXT,amount INTEGER,created TEXT,PRIMARY KEY(user_id,project));
      CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,project TEXT,supporter TEXT,kind TEXT,description TEXT,availability TEXT,status TEXT,created TEXT,updated TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS active_proposal ON proposals(project,supporter) WHERE status IN ('enviada','aceita','em_andamento');
      CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,project TEXT,sender TEXT,recipient TEXT,text TEXT,date TEXT,read INTEGER DEFAULT 0);
      CREATE INDEX IF NOT EXISTS conversation ON messages(project,sender,recipient,id);`);
    const users = () => db.prepare('SELECT data FROM users').all().map(r => JSON.parse(r.data));
    const projects = () => db.prepare('SELECT data FROM projects').all().map(r => JSON.parse(r.data));
    const putProject = p => db.prepare('INSERT OR REPLACE INTO projects VALUES (?,?)').run(p.id, JSON.stringify(p));
    const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
    const publicUser = u => ({ id:u.id, nome:u.nome, nomeEscola:u.nomeEscola, tipo:u.tipo, foto:u.foto || '', descricao:u.descricao || '', habilidades:u.habilidades || '', institutionStatus:u.institutionStatus || 'nao_verificada' });
    const transaction = action => {
        db.exec('BEGIN IMMEDIATE');
        try { const result=action(); db.exec('COMMIT'); return result; }
        catch(error) { db.exec('ROLLBACK'); throw error; }
    };
    const field = (body, name, limit, required=false) => {
        if (typeof body[name] !== 'string') fail(400,`Campo ${name} inválido.`);
        const value=body[name].trim();
        if (value.length>limit || (required && !value)) fail(400,`Revise o campo ${name} (até ${limit} caracteres).`);
        return value;
    };
    const awardCollaboration = (proposal,project) => {
        const person=users().find(u=>u.id===proposal.supporter);
        if (!person) fail(404,'Apoiador não encontrado.');
        const added=db.prepare('INSERT OR IGNORE INTO xp_rewards VALUES (?,?,?,?,?)').run(person.id,project.id,proposal.id,20,proposal.updated);
        if (!added.changes) return 0;
        const level=xp=>[0,50,100,200,350,500,700].filter(min=>xp>=min).length;
        const before=level(Number(person.xp)||0);
        person.xp=(Number(person.xp)||0)+20;
        person.nivel=level(person.xp);
        person.projetosConcluidos=[...new Set([...(person.projetosConcluidos || []),project.id])];
        const history=[{id:crypto.randomUUID(),descricao:`A escola confirmou sua colaboração em ${project.titulo}.`,xp:20,tipo:'xp',data:proposal.updated}];
        if (person.nivel>before) history.unshift({id:crypto.randomUUID(),descricao:`Você alcançou o nível ${person.nivel}.`,xp:0,tipo:'nivel',data:proposal.updated});
        person.historico=[...history,...(person.historico || [])].sort((a,b)=>b.data.localeCompare(a.data)).slice(0,60);
        db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(person),person.id);
        return 20;
    };
    if (!db.prepare("SELECT name FROM sqlite_master WHERE name='workflow_migrations'").get()) {
        const backup=path.join(dataDir,`before-workflow-${Date.now()}.sqlite`).replaceAll("'","''");
        db.exec(`VACUUM INTO '${backup}'`);
    }
    // Reconcile pre-existing completed collaborations once, using the same durable reward key.
    transaction(()=>{
        for (const proposal of db.prepare("SELECT * FROM proposals WHERE status='concluida' ORDER BY updated").all()) {
            const project=projects().find(p=>p.id===proposal.project);
            if (project && users().some(u=>u.id===proposal.supporter)) awardCollaboration(proposal,project);
        }
    });
    const workflow=createWorkflow(db, options);
    const server = http.createServer(async (req, res) => {
      const json = (status, value) => { res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); };
      try {
        const url = new URL(req.url, 'http://localhost');
        const token = /(?:^|;\s*)learnhub_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1];
        const session = token && db.prepare('SELECT user_id FROM sessions WHERE token=? AND expires>?').get(token, Date.now());
        const me = session && users().find(u => u.id === session.user_id);
        if (url.pathname.startsWith('/api/')) {
          if (!['GET','HEAD'].includes(req.method) && req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) fail(403,'Origem não permitida.');
          let body = {};
          if (['POST','PUT'].includes(req.method)) {
            if (!String(req.headers['content-type']).startsWith('application/json')) fail(415,'Envie JSON.');
            const limit=['/api/profile','/api/projects'].includes(url.pathname)?4300000:32768;
            let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw)>limit) fail(413,'Conteúdo muito grande. A foto deve ter até 3 MB.'); }
            try { body = JSON.parse(raw || '{}'); } catch { fail(400,'JSON inválido.'); }
            if (!body || typeof body!=='object' || Array.isArray(body)) fail(400,'Objeto JSON inválido.');
          }
          if (await workflow.route({req,res,url,body,me,json})) return;
          if (!me) fail(401,'Entre na sua conta para continuar.');
          const avatarMatch=/^\/api\/avatars\/([a-zA-Z0-9-]+)$/.exec(url.pathname);
          if (avatarMatch && req.method==='GET') {
            const avatar=db.prepare('SELECT image FROM avatars WHERE user_id=?').get(avatarMatch[1]);
            if(!avatar) fail(404,'Foto não encontrada.');
            res.writeHead(200,{'Content-Type':'image/jpeg','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store'});
            return res.end(Buffer.from(avatar.image));
          }
          if (url.pathname==='/api/profile' && req.method==='GET') return json(200,workflow.participation(me));
          if (url.pathname==='/api/profile' && req.method==='PUT') {
            const changes={};
            for (const [name,limit] of Object.entries({nome:80,descricao:280,cidade:80,estado:2,habilidades:200,foto:2000})) {
              if (Object.hasOwn(body,name)) changes[name]=field(body,name,limit,name==='nome');
            }
            if (changes.estado && !/^[a-z]{2}$/i.test(changes.estado)) fail(400,'Use a sigla de duas letras do estado.');
            if(Object.hasOwn(changes,'estado')) changes.estado=changes.estado.toUpperCase();
            let image;
            if (Object.hasOwn(body,'photoData')) {
              if(typeof body.photoData!=='string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.photoData) || body.photoData.length>4194304) fail(400,'Arquivo de foto inválido ou maior que 3 MB.');
              const bytes=Buffer.from(body.photoData,'base64');
              if(bytes.length>3*1024*1024) fail(413,'Escolha uma foto de até 3 MB.');
              try {
                const decoder=sharp(bytes,{limitInputPixels:16000000,failOn:'warning'});
                const metadata=await decoder.metadata();
                if(!['jpeg','png','webp'].includes(metadata.format) || (metadata.pages || 1)>1) fail(400,'Use uma foto estática JPG, PNG ou WebP.');
                image=await decoder.rotate().resize(512,512,{fit:'cover'}).jpeg({quality:85}).toBuffer();
              } catch(error) { if(error.status) throw error; fail(400,'Não foi possível ler a foto. Use JPG, PNG ou WebP de até 16 megapixels.'); }
              changes.foto=`/api/avatars/${me.id}?v=${crypto.randomUUID()}`;
            }
            if (!image && changes.foto && changes.foto!==me.foto) {
              let photo; try { photo=new URL(changes.foto); } catch { fail(400,'Informe uma URL HTTPS válida para a foto.'); }
              if (photo.protocol!=='https:' || photo.username || photo.password) fail(400,'A foto deve usar uma URL HTTPS sem credenciais.');
            }
            const update=transaction(()=>{
              const current=JSON.parse(db.prepare('SELECT data FROM users WHERE id=?').get(me.id).data);
              const update={...current,...changes};
              if(me.tipo==='escola') {
                update.nomeEscola=update.nome;
                if(changes.nome && changes.nome!==current.nome) {
                  update.institutionStatus='pendente';
                  update.institutionReason='Nome institucional alterado. É necessária nova análise do administrador.';
                }
              }
              if(image) db.prepare('INSERT OR REPLACE INTO avatars VALUES (?,?,?)').run(me.id,image,update.foto);
              else if(Object.hasOwn(changes,'foto') && changes.foto!==current.foto) db.prepare('DELETE FROM avatars WHERE user_id=?').run(me.id);
              db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(update),me.id);
              if (me.tipo==='escola') for(const p of projects().filter(p=>p.escolaId===me.id)) putProject({...p,escolaNome:update.nome});
              return update;
            });
            return json(200,update);
          }
          if (url.pathname==='/api/logout' && req.method==='POST') {
            db.prepare('DELETE FROM sessions WHERE token=?').run(token);
            res.setHeader('Set-Cookie','learnhub_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
            return json(200,{ok:true});
          }
          if (url.pathname==='/api/projects' && req.method==='POST') {
            if (me.tipo!=='escola') fail(403,'Somente escolas publicam projetos.');
            const old=projects().find(p=>p.id===body.id);
            if (old && old.escolaId!==me.id) fail(403,'Este projeto pertence a outra escola.');
            const p={...(old || {}),id:old?.id || crypto.randomUUID(),escolaId:me.id,escolaNome:me.nome, colaboradores:old?.colaboradores || [],dataCriacao:old?.dataCriacao || new Date().toISOString(),dataAtualizacao:new Date().toISOString()};
            const categories=require('./js/support-categories');
            try { p.supportCategories=Object.hasOwn(body,'supportCategories') ? categories.validate(body.supportCategories) : categories.forProject(old); }
            catch(error) { fail(400,error.message); }
            for (const field of ['titulo','descricao','objetivo','categoria','recursos','imagem','status']) p[field]=String(body[field] || '').slice(0,5000);
            if (!p.titulo.trim() || !['Planejamento','Em andamento','Concluído'].includes(p.status)) fail(400,'Título e status válidos são obrigatórios.');
            if (Object.hasOwn(body,'imageData')) {
              if (typeof body.imageData !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.imageData) || body.imageData.length>4194304) fail(400,'Envie uma imagem de até 3 MB.');
              try {
                const decoder=sharp(Buffer.from(body.imageData,'base64'),{limitInputPixels:16000000,failOn:'warning'});
                const metadata=await decoder.metadata();
                if (!['jpeg','png','webp'].includes(metadata.format) || (metadata.pages || 1)>1) fail(400,'Use JPG, PNG ou WebP sem animação.');
                const image=await decoder.rotate().resize(1600,900,{fit:'cover',withoutEnlargement:true}).jpeg({quality:82}).toBuffer();
                p.imagem='data:image/jpeg;base64,'+image.toString('base64');
                p.banner='';
              } catch { fail(400,'Imagem inválida. Use JPG, PNG ou WebP de até 16 megapixels.'); }
              // Recheck after asynchronous decoding to avoid resurrecting a deleted project.
              if (old && !projects().some(item=>item.id===old.id)) fail(409,'O projeto foi excluído durante o envio.');
              if (old) p.colaboradores=projects().find(item=>item.id===old.id).colaboradores;
            } else if (body.keepImage && old) {
              p.imagem=old.imagem;
            } else {
              p.banner='';
            }
            putProject(p); return json(200,p);
          }
          fail(404,'Rota não encontrada.');
        }
        const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
        if (me && pathname === '/index.html') {
          res.writeHead(302, {Location:'/hub.html', 'Cache-Control':'no-store'});
          return res.end();
        }
        if (!/^\/(?:[a-z-]+\.html|(?:js|css)\/[a-z-]+\.(?:js|css))$/.test(pathname)) fail(404,'Arquivo não encontrado.');
        const filename=path.join(__dirname,pathname);
        if (!fs.existsSync(filename)) fail(404,'Arquivo não encontrado.');
        let content=fs.readFileSync(filename);
        const ext=path.extname(filename);
        if (ext==='.html') {
          const boot={user:me?workflow.participation(me):null,users:users().map(u=>u.id===me?.id?workflow.participation(u):publicUser(u)),projects:projects().map(workflow.summary)};
          const data=JSON.stringify(boot).replace(/</g,'\\u003c');
          content=content.toString().replace('<script src="js/storage.js"></script>',`<script>window.LearnHubOnline=${data};</script><script src="js/api.js"></script><script src="js/storage.js"></script>`);
        }
        res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[ext]+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}); res.end(content);
      } catch (error) { if(!error.status && options.onError)options.onError(error); json(error.status || 500,{error:error.status?error.message:'Erro no servidor. Tente novamente.'}); }
    });
    server.on('close',()=>db.close());
    return server;
}
if (require.main===module) {
    const config = serverConfig();
    const app = createApp(config.dataDir);
    app.listen(config.port, config.host, () => console.log(`LearnHub iniciado na porta ${config.port}.`));
    const stop = () => {
        app.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
}
module.exports={createApp};
