// Explicit, idempotent test fixtures for one account. Does not alter existing conversations.
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'learnhub.sqlite'));
db.exec('PRAGMA busy_timeout=5000');
try {
    const target = db.prepare('SELECT id FROM users WHERE email=?').get(process.argv[2]);
    if (!target) throw new Error('Informe o e-mail de uma conta existente.');
    db.exec('BEGIN IMMEDIATE');
    for (const [key, name, title, icon] of [
        ['marina', 'Marina · Demonstração', 'Oficina de leitura · Teste', '📚'],
        ['lucas', 'Lucas · Demonstração', 'Robótica educativa · Teste', '🤖'],
        ['beatriz', 'Beatriz · Demonstração', 'Horta comunitária · Teste', '🌱']
    ]) {
        const id = `demo-contact-${key}`, email = `${key}@learnhub.demo`;
        const existing = db.prepare('SELECT id FROM users WHERE id=? OR email=?').get(id,email);
        if (existing && existing.id !== id) throw new Error('Conflito com conta existente.');
        if (!existing) {
            const salt = crypto.randomBytes(16).toString('hex');
            const password = `${salt}:${crypto.scryptSync('learnhub123',salt,64).toString('hex')}`;
            db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(id,email,password,JSON.stringify({id,email,nome:name,tipo:'escola',xp:10,dataCadastro:new Date().toISOString()}));
        }
        const projectId = `demo-chat-${key}-${target.id}`;
        if (db.prepare('SELECT id FROM projects WHERE id=?').get(projectId)) continue;
        const date = new Date().toISOString();
        const project = {id:projectId,titulo:title,escolaId:id,escolaNome:name,colaboradores:[target.id],status:'Planejamento',categoria:'Educação',imagem:icon,descricao:'Projeto fictício para testar mensagens. Este contato não responde automaticamente.',objetivo:'Testar a comunicação entre duas contas.',recursos:'Ambiente de demonstração',visualizacoes:0,dataCriacao:date,dataAtualizacao:date};
        db.prepare('INSERT INTO projects VALUES (?,?)').run(projectId,JSON.stringify(project));
        db.prepare('INSERT INTO messages(project,sender,recipient,text,date) VALUES (?,?,?,?,?)').run(projectId,id,target.id,`Olá! Sou ${name}. Este é um perfil fictício: você pode enviar mensagens para testar o chat. Não há resposta automática.`,date);
    }
    db.exec('COMMIT');
    console.log('Três contatos de demonstração disponíveis para a conta informada.');
} catch (error) {
    if (db.isTransaction) db.exec('ROLLBACK');
    throw error;
} finally { db.close(); }
