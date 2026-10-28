const crypto = require('node:crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const SupportCategories = require('./js/support-categories');

function createWorkflow(db, options = {}) {
    const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
    const now=()=>new Date().toISOString();
    const user=id=>{const r=db.prepare('SELECT data FROM users WHERE id=?').get(id);return r && JSON.parse(r.data);};
    const project=id=>{const r=db.prepare('SELECT data FROM projects WHERE id=?').get(id);return r && JSON.parse(r.data);};
    const saveUser=u=>db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(u),u.id);
    const tx=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
    const text=(b,k,max,required=true)=>{const v=typeof b[k]==='string'?b[k].trim():'';if((required && !v)||v.length>max)fail(400,`Revise o campo ${k}.`);return v;};
    const digest=t=>crypto.createHash('sha256').update(t).digest('hex');
    const passwordHash=(s,salt=crypto.randomBytes(16).toString('hex'))=>`${salt}:${crypto.scryptSync(s,salt,64).toString('hex')}`;
    const password=s=>{if(typeof s!=='string'||s.length<10||s.length>128)fail(400,'Use uma senha de 10 a 128 caracteres.');return s;};
    const email=s=>{const v=String(s||'').trim().toLowerCase();if(v.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))fail(400,'Informe um e-mail válido.');return v;};
    const address=b=>{
        const a={};for(const k of ['cep','rua','bairro','cidade','estado','numero','complemento'])a[k]=text(b,k,k==='complemento'?120:100,false);
        if(a.cep && !/^\d{5}-?\d{3}$/.test(a.cep))fail(400,'O CEP deve conter 8 dígitos, com hífen opcional.');
        a.cep=a.cep.replace('-','');a.estado=a.estado.toUpperCase();
        if(a.cep && !/^\d{8}$/.test(a.cep))fail(400,'O CEP deve ter 8 dígitos.');
        if(a.estado && !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(a.estado))fail(400,'Estado inválido.');return a;
    };
    db.exec(`CREATE TABLE IF NOT EXISTS workflow_migrations(version TEXT PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,project TEXT NOT NULL,school TEXT NOT NULL,supporter TEXT NOT NULL,kind TEXT NOT NULL,description TEXT NOT NULL,availability TEXT,status TEXT NOT NULL CHECK(status IN ('pendente','aceita','recusada','concluida')),reason TEXT,created TEXT,updated TEXT,accepted TEXT,completed TEXT,snapshot TEXT NOT NULL,legacy INTEGER DEFAULT 0);
      CREATE UNIQUE INDEX IF NOT EXISTS active_request ON requests(project,supporter) WHERE status IN ('pendente','aceita');
      CREATE TABLE IF NOT EXISTS certificates(code TEXT PRIMARY KEY,request TEXT UNIQUE NOT NULL,data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS participation_rewards(request TEXT PRIMARY KEY,user_id TEXT,amount INTEGER,created TEXT);
      CREATE TABLE IF NOT EXISTS account_tokens(hash TEXT PRIMARY KEY,user_id TEXT,purpose TEXT,expires INTEGER);
      CREATE TABLE IF NOT EXISTS auth_limits(key TEXT PRIMARY KEY,count INTEGER,until INTEGER);
      CREATE TABLE IF NOT EXISTS institution_reviews(id TEXT PRIMARY KEY,school TEXT,admin TEXT,status TEXT,reason TEXT,created TEXT);`);
    if(!db.prepare('PRAGMA table_info(messages)').all().some(c=>c.name==='request_id'))db.exec('ALTER TABLE messages ADD COLUMN request_id TEXT');
    if(!db.prepare('SELECT version FROM workflow_migrations WHERE version=?').get('requests-v1'))tx(()=>{
        for(const old of db.prepare('SELECT * FROM proposals ORDER BY created').all()){
            const p=project(old.project);if(!p)continue;
            const status=({enviada:'pendente',aceita:'aceita',em_andamento:'aceita',concluida:'concluida'})[old.status]||'recusada';
            db.prepare('INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(old.id,p.id,p.escolaId,old.supporter,old.kind,old.description,old.availability,status,status==='recusada'?'Registro anterior: '+old.status:'',old.created,old.updated,['aceita','concluida'].includes(status)?old.updated:null,status==='concluida'?old.updated:null,JSON.stringify({project:p.titulo,school:p.escolaNome,supporter:user(old.supporter)?.nome||'Colaborador'}),1);
            if(status==='concluida')db.prepare('INSERT OR IGNORE INTO participation_rewards VALUES (?,?,?,?)').run(old.id,old.supporter,0,old.updated);
        }
        for(const row of db.prepare('SELECT data FROM projects').all()){
            const p=JSON.parse(row.data);
            for(const supporter of p.colaboradores||[]){
                let r=db.prepare("SELECT * FROM requests WHERE project=? AND supporter=? ORDER BY CASE status WHEN 'aceita' THEN 0 WHEN 'concluida' THEN 1 ELSE 2 END,created DESC LIMIT 1").get(p.id,supporter);
                if(!r){const id=crypto.randomUUID();db.prepare('INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,p.id,p.escolaId,supporter,'Outro','Participação do fluxo anterior. A escola precisa revisar e aceitar antes de liberar novas conversas.','','pendente','',now(),now(),null,null,JSON.stringify({project:p.titulo,school:p.escolaNome,supporter:user(supporter)?.nome||'Colaborador'}),1);r={id};}
                db.prepare('UPDATE messages SET request_id=? WHERE project=? AND ((sender=? AND recipient=?) OR (sender=? AND recipient=?)) AND request_id IS NULL').run(r.id,p.id,p.escolaId,supporter,supporter,p.escolaId);
            }
        }
        db.prepare('INSERT INTO workflow_migrations VALUES (?)').run('requests-v1');
    });
    const summary=p=>{const rows=db.prepare('SELECT status,supporter FROM requests WHERE project=?').all(p.id);return {...p,supportCategories:SupportCategories.forProject(p),colaboradores:[...new Set(rows.filter(r=>['aceita','concluida'].includes(r.status)).map(r=>r.supporter))],solicitacoesRecebidas:rows.length,colaboracoesAceitas:rows.filter(r=>r.status==='aceita').length,colaboracoesConcluidas:rows.filter(r=>r.status==='concluida').length};};
    const safe=u=>u?{id:u.id,nome:u.nome,tipo:u.tipo,foto:u.foto||'',habilidades:u.habilidades||'',institutionStatus:u.institutionStatus||'nao_verificada'}:{nome:'Conta indisponível'};
    const serialize=r=>({...r,kind:SupportCategories.normalize(r.kind)||'Outros',snapshot:JSON.parse(r.snapshot),person:safe(user(r.supporter)),schoolPerson:safe(user(r.school)),certificate:db.prepare('SELECT code FROM certificates WHERE request=?').get(r.id)?.code});
    const allowed=(r,me)=>{if(!r||![r.school,r.supporter].includes(me.id))fail(403,'Você não participa desta solicitação.');};
    const limit=(key,max=8)=>{
        db.prepare('DELETE FROM auth_limits WHERE until<?').run(Date.now());
        const old=db.prepare('SELECT * FROM auth_limits WHERE key=?').get(key),active=old&&old.until>Date.now();
        const count=active?old.count+1:1,until=active?old.until:Date.now()+15*60000;
        db.prepare('INSERT OR REPLACE INTO auth_limits VALUES (?,?,?)').run(key,count,until);if(count>max)fail(429,'Muitas tentativas. Aguarde 15 minutos.');
    };
    const base=process.env.APP_URL||'http://localhost:3000';
    const mailer=options.sendMail || (process.env.SMTP_HOST&&process.env.MAIL_FROM?async mail=>{
        const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_SECURE==='1',requireTLS:process.env.SMTP_SECURE!=='1',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined,connectionTimeout:10000,socketTimeout:15000});
        await transport.sendMail({from:process.env.MAIL_FROM,...mail});
    }:null);
    async function sendToken(u,purpose){
        if(!mailer)fail(503,'Recuperação por e-mail indisponível. Contate o responsável pelo site.');
        const token=crypto.randomBytes(32).toString('hex');
        const hash=digest(token);db.prepare('INSERT INTO account_tokens VALUES (?,?,?,?)').run(hash,u.id,purpose,Date.now()+(purpose==='reset'?30:1440)*60000);
        try{await mailer({to:u.email,subject:purpose==='reset'?'Redefinir senha · LearnHub':'Confirme seu e-mail · LearnHub',text:`Abra ${base}/conta.html#${new URLSearchParams({action:purpose,token})}\nSe não solicitou esta ação, ignore este e-mail.`});}
        catch{db.prepare('DELETE FROM account_tokens WHERE hash=?').run(hash);fail(503,'Não foi possível enviar o e-mail. Tente reenviar mais tarde.');}
    }
    const requireSchool=me=>{if(me.tipo!=='escola')fail(403,'Apenas escolas podem realizar esta ação.');};
    async function route({req,res,url,body,me,json}) {
        const pathname=url.pathname,method=req.method;
        if(['/api/register','/api/login','/api/auth/request-reset','/api/auth/resend'].includes(pathname)&&method==='POST'){
            limit('ip:'+req.socket.remoteAddress,35);const mail=email(body.email);limit(pathname+':'+mail);
            const row=db.prepare('SELECT * FROM users WHERE email=?').get(mail);
            if(pathname==='/api/register'){
                if(row)fail(409,'E-mail já cadastrado. Entre ou recupere sua senha.');
                if(!['escola','colaborador'].includes(body.tipo))fail(400,'Tipo de conta inválido.');
                const u={id:crypto.randomUUID(),nome:text(body,'nome',100),email:mail,tipo:body.tipo,emailVerifiedAt:null,institutionStatus:body.tipo==='escola'?'nao_verificada':null,xp:0,dataCadastro:now(),enderecoPrivado:address(body)};
                if(u.tipo==='colaborador'){if(!['aluno','responsavel','comunidade'].includes(body.communityType))fail(400,'Selecione sua identificação na comunidade.');u.communityType=body.communityType;}
                else{u.nomeEscola=u.nome;u.institutionEvidence=text(body,'institutionEvidence',1000,false);}
                db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(u.id,mail,passwordHash(password(body.senha)),JSON.stringify(u));
                json(201,{ok:true,emailSent:false,message:'Conta criada! Você já pode entrar com seu e-mail e senha.'});return true;
            }
            if(pathname!=='/api/login'){
                if(pathname.endsWith('/resend')){json(200,{message:'Não é necessário confirmar o e-mail. Você já pode entrar com sua senha.'});return true;}
                if(!mailer)fail(503,'Envio de e-mail ainda não configurado pelo administrador.');
                if(row){const u=JSON.parse(row.data);if(pathname.endsWith('request-reset')||!u.emailVerifiedAt)await sendToken(u,pathname.endsWith('request-reset')?'reset':'verify');}
                json(200,{message:'Se a conta for elegível, enviaremos um e-mail com as instruções.'});return true;
            }
            const stored=row?.password||passwordHash('invalid-password');
            const candidate=passwordHash(String(body.senha||'').slice(0,129),stored.split(':')[0]);
            if(!row||candidate.length!==stored.length||!crypto.timingSafeEqual(Buffer.from(candidate),Buffer.from(stored)))fail(401,'E-mail ou senha inválidos.');
            const token=crypto.randomBytes(32).toString('hex');db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(token,row.id,Date.now()+7*86400000);
            res.setHeader('Set-Cookie',`learnhub_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.SECURE_COOKIE==='1'?'; Secure':''}`);
            db.prepare('DELETE FROM auth_limits WHERE key=?').run(pathname+':'+mail);
            json(200,{ok:true});return true;
        }
        if(['/api/auth/verify','/api/auth/reset'].includes(pathname)&&method==='POST'){
            limit('token:'+req.socket.remoteAddress,30);
            const purpose=pathname.endsWith('/reset')?'reset':'verify';const h=digest(text(body,'token',128));
            tx(()=>{const t=db.prepare('SELECT * FROM account_tokens WHERE hash=? AND purpose=? AND expires>?').get(h,purpose,Date.now());if(!t)fail(400,'Link inválido ou expirado. Solicite outro.');
                const u=user(t.user_id);if(purpose==='verify'){u.emailVerifiedAt=now();saveUser(u);}else{db.prepare('UPDATE users SET password=? WHERE id=?').run(passwordHash(password(body.senha)),u.id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(u.id);}
                db.prepare('DELETE FROM account_tokens WHERE user_id=? AND purpose=?').run(u.id,purpose);
            });json(200,{message:purpose==='verify'?'E-mail confirmado. Você já pode entrar.':'Senha atualizada. Entre novamente.'});return true;
        }
        if(!me)return false;
        if(pathname==='/api/institution'&&method==='POST'){
            requireSchool(me);
            const u=user(me.id);u.institutionEvidence=text(body,'institutionEvidence',1000);u.institutionStatus='pendente';u.institutionReason='';saveUser(u);json(200,u);return true;
        }
        if(pathname==='/api/admin/schools'&&method==='GET'){
            if(me.tipo!=='admin')fail(403,'Apenas administradores.');
            json(200,db.prepare('SELECT data FROM users').all().map(r=>JSON.parse(r.data)).filter(u=>u.tipo==='escola').map(u=>({id:u.id,nome:u.nome,email:u.email,emailVerifiedAt:u.emailVerifiedAt,status:u.institutionStatus||'nao_verificada',evidence:u.institutionEvidence||'',reason:u.institutionReason||''})));return true;
        }
        const review=/^\/api\/admin\/schools\/([^/]+)$/.exec(pathname);
        if(review&&method==='PUT'){
            if(me.tipo!=='admin')fail(403,'Apenas administradores.');const u=user(review[1]);if(!u||u.tipo!=='escola')fail(404,'Escola não encontrada.');
            if(!['aprovada','recusada'].includes(body.status))fail(400,'Situação inválida.');
            const reason=text(body,'reason',1000);tx(()=>{u.institutionStatus=body.status;u.institutionReason=reason;u.institutionReviewedAt=now();saveUser(u);db.prepare('INSERT INTO institution_reviews VALUES (?,?,?,?,?,?)').run(crypto.randomUUID(),u.id,me.id,body.status,reason,now());});json(200,{ok:true});return true;
        }
        if(pathname==='/api/projects'&&method==='POST')requireSchool(me);
        if(pathname==='/api/collaborations'&&method==='GET'){
            const rows=db.prepare('SELECT * FROM requests WHERE school=? OR supporter=? ORDER BY created DESC').all(me.id,me.id);json(200,rows.map(serialize));return true;
        }
        const proposal=/^\/api\/proposals\/([^/]+)$/.exec(pathname);
        if(proposal&&method==='PUT'){
            const r=db.prepare('SELECT * FROM requests WHERE id=?').get(proposal[1]);allowed(r,me);if(r.school!==me.id)fail(403,'Apenas a escola responsável altera a situação.');requireSchool(me);
            if(!({pendente:['aceita','recusada'],aceita:['concluida']}[r.status]||[]).includes(body.status))fail(409,'Transição não permitida. Atualize a lista.');
            const reason=body.status==='recusada'?text(body,'reason',1000):'';
            const updated=now();tx(()=>{
                const changed=db.prepare('UPDATE requests SET status=?,reason=?,updated=?,accepted=COALESCE(accepted,?),completed=? WHERE id=? AND status=?').run(body.status,reason,updated,body.status==='aceita'?updated:null,body.status==='concluida'?updated:null,r.id,r.status);if(!changed.changes)fail(409,'A solicitação já mudou.');
                if(body.status==='concluida'){
                    const added=db.prepare('INSERT OR IGNORE INTO participation_rewards VALUES (?,?,?,?)').run(r.id,r.supporter,20,updated);
                    if(added.changes){const u=user(r.supporter);u.xp=(Number(u.xp)||0)+20;u.nivel=[0,50,100,200,350,500,700].filter(n=>u.xp>=n).length;u.projetosConcluidos=[...new Set([...(u.projetosConcluidos||[]),r.project])];u.emblemas=[...new Set([...(u.emblemas||[]),'colaboracao-confirmada'])];u.historico=[{id:r.id,descricao:'Colaboração confirmada pela escola',xp:20,tipo:'xp',data:updated},...(u.historico||[])];saveUser(u);}
                }
            });json(200,serialize(db.prepare('SELECT * FROM requests WHERE id=?').get(r.id)));return true;
        }
        const issue=/^\/api\/proposals\/([^/]+)\/certificate$/.exec(pathname);
        if(issue&&method==='POST'){
            const r=db.prepare('SELECT * FROM requests WHERE id=?').get(issue[1]);allowed(r,me);if(me.id!==r.school)fail(403,'Apenas a escola responsável emite o certificado.');requireSchool(me);if(r.status!=='concluida')fail(409,'Confirme a conclusão antes de emitir.');
            let c=db.prepare('SELECT * FROM certificates WHERE request=?').get(r.id);
            if(!c){const code=crypto.randomBytes(20).toString('hex');const snap=JSON.parse(r.snapshot);const data={code,request:r.id,colaborador:user(r.supporter).nome,escola:user(r.school).nome,projeto:snap.project,contribuicao:r.description,tipo:r.kind,concluidaEm:r.completed,emitidoEm:now()};db.prepare('INSERT INTO certificates VALUES (?,?,?)').run(code,r.id,JSON.stringify(data));c={code,data:JSON.stringify(data)};}
            json(200,JSON.parse(c.data));return true;
        }
        const cert=/^\/api\/certificates\/([a-f0-9]{40})(\/pdf)?$/.exec(pathname);
        if(cert&&method==='GET'){
            const c=db.prepare('SELECT * FROM certificates WHERE code=?').get(cert[1]);if(!c)fail(404,'Certificado não encontrado.');const r=db.prepare('SELECT * FROM requests WHERE id=?').get(c.request);allowed(r,me);const data=JSON.parse(c.data);
            if(!cert[2]){json(200,data);return true;}
            const doc=new PDFDocument({size:'A4',margin:54,info:{Title:'Certificado de participação - LearnHub'}});
            res.writeHead(200,{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="certificado-${c.code}.pdf"`,'Cache-Control':'private, no-store'});doc.pipe(res);
            doc.roundedRect(54,54,150,40,8).fill('#171021');
            doc.fontSize(24).fillColor('#ffffff').text('Learn',64,62,{continued:true}).fillColor('#b77aff').text('Hub');
            doc.fillColor('#7620c8').fontSize(22).text('Certificado de participação',54,124).moveDown();
            doc.fillColor('#201a28').fontSize(12).text(`A escola ${data.escola} confirma a participação de ${data.colaborador} no projeto ${data.projeto}.`,{lineGap:5}).moveDown();
            doc.fontSize(12).text('Contribuição confirmada:').moveDown(.5).fontSize(11).text(data.contribuicao,{lineGap:4}).moveDown();
            doc.text(`Tipo de apoio: ${data.tipo}`).text(`Conclusão: ${new Date(data.concluidaEm).toLocaleDateString('pt-BR')}`).text(`Emissão: ${new Date(data.emitidoEm).toLocaleDateString('pt-BR')}`).moveDown();
            doc.fontSize(9).text('Código de verificação: '+data.code).text('Consulta autenticada: '+base+'/certificado.html?code='+data.code).moveDown().text('Documento de participação emitido pela escola. Não atribui carga horária nem equivalência acadêmica.');doc.end();return true;
        }
        const match=/^\/api\/projects\/([^/]+)(?:\/(join|messages|proposals))?$/.exec(pathname);
        if(match){const p=project(match[1]);if(!p)fail(404,'Projeto não encontrado.');
            if(!match[2]&&method==='DELETE'){
                if(me.id!==p.escolaId)fail(403,'Apenas a escola responsável pode excluir.');
                if(db.prepare('SELECT id FROM requests WHERE project=?').get(p.id)||db.prepare('SELECT id FROM messages WHERE project=?').get(p.id))fail(409,'Projeto com histórico não pode ser excluído. Marque-o como concluído para preservar solicitações e certificados.');
                db.prepare('DELETE FROM projects WHERE id=?').run(p.id);json(200,{ok:true});return true;
            }
            if(match[2]==='join')fail(409,'A participação imediata foi desativada. Envie uma solicitação.');
            if(match[2]==='proposals'){
                if(method==='GET'){const rows=me.id===p.escolaId?db.prepare('SELECT * FROM requests WHERE project=? ORDER BY created DESC').all(p.id):db.prepare('SELECT * FROM requests WHERE project=? AND supporter=? ORDER BY created DESC').all(p.id,me.id);json(200,rows.map(serialize));return true;}
                if(method==='POST'){if(me.tipo!=='colaborador')fail(403,'Apenas colaboradores enviam solicitações.');if(p.status==='Concluído')fail(409,'Projeto concluído.');
                    const kind=SupportCategories.normalize(text(body,'kind',30)),description=text(body,'description',1500),availability=text(body,'availability',200,false);if(!kind || !SupportCategories.forProject(p).includes(kind))fail(400,'Escolha uma categoria de apoio disponível neste projeto.');
                    const id=crypto.randomUUID();tx(()=>{if(db.prepare("SELECT id FROM requests WHERE project=? AND supporter=? AND status IN ('pendente','aceita')").get(p.id,me.id))fail(409,'Já existe uma solicitação ativa para este projeto.');db.prepare('INSERT INTO requests VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id,p.id,p.escolaId,me.id,kind,description,availability,'pendente','',now(),now(),null,null,JSON.stringify({project:p.titulo,school:user(p.escolaId).nome,supporter:me.nome}),0);});json(201,serialize(db.prepare('SELECT * FROM requests WHERE id=?').get(id)));return true;
                }
            }
            if(match[2]==='messages'){
                const id=url.searchParams.get('request')||body.request;
                if(!id)fail(400,'Selecione uma solicitação aceita para conversar.');const r=db.prepare('SELECT * FROM requests WHERE id=? AND project=?').get(id,p.id);allowed(r,me);if(!['aceita','concluida'].includes(r.status))fail(403,'O chat só é liberado após o aceite.');
                const other=me.id===r.school?r.supporter:r.school;
                if(body.recipient&&body.recipient!==other)fail(403,'Destinatário inválido.');
                if(method==='POST'){db.prepare('INSERT INTO messages(project,sender,recipient,text,date,request_id) VALUES (?,?,?,?,?,?)').run(p.id,me.id,other,text(body,'text',2000),now(),r.id);json(201,{ok:true});return true;}
                if(method==='GET'){json(200,db.prepare('SELECT * FROM messages WHERE request_id=? ORDER BY id').all(r.id));return true;}
                if(method==='PUT'){db.prepare('UPDATE messages SET read=1 WHERE request_id=? AND recipient=?').run(r.id,me.id);json(200,{ok:true});return true;}
            }
        }
        if(pathname==='/api/conversations'&&method==='GET'){
            const rows=db.prepare("SELECT * FROM requests WHERE (school=? OR supporter=?) AND status IN ('aceita','concluida')").all(me.id,me.id);
            json(200,rows.map(r=>{const other=me.id===r.school?r.supporter:r.school,person=user(other);const last=db.prepare('SELECT * FROM messages WHERE request_id=? ORDER BY id DESC LIMIT 1').get(r.id);return {request:r.id,kind:SupportCategories.normalize(r.kind)||'Outros',status:r.status,project:r.project,title:JSON.parse(r.snapshot).project,other,name:person?.nome||'Usuário',photo:person?.foto||'',last:last?.text||'',date:last?.date||r.accepted,unread:db.prepare('SELECT count(*) n FROM messages WHERE request_id=? AND recipient=? AND read=0').get(r.id,me.id).n};}).sort((a,b)=>String(b.date).localeCompare(String(a.date))));return true;
        }
        return false;
    }
    const participation=u=>({...u,participation:{sent:db.prepare('SELECT count(*) n FROM requests WHERE supporter=?').get(u.id).n,received:db.prepare('SELECT count(*) n FROM requests WHERE school=?').get(u.id).n,accepted:db.prepare("SELECT count(*) n FROM requests WHERE (school=? OR supporter=?) AND status='aceita'").get(u.id,u.id).n,completed:db.prepare("SELECT count(*) n FROM requests WHERE (school=? OR supporter=?) AND status='concluida'").get(u.id,u.id).n}});
    return {route,summary,participation};
}
module.exports={createWorkflow};
