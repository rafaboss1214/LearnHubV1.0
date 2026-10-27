// Run explicitly on the development database; never overwrites existing accounts.
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const filename = path.join(__dirname, '..', 'data', 'learnhub.sqlite');
if (!fs.existsSync(filename)) throw new Error('Execute npm start antes de carregar a demonstração.');
const db = new DatabaseSync(filename);
db.exec('PRAGMA busy_timeout=5000');
const accounts = [
    {id:'demo-school-online',email:'escola@learnhub.demo',nome:'Escola Comunidade Viva',tipo:'escola',nomeEscola:'Escola Comunidade Viva'},
    {id:'demo-supporter-online',email:'apoiador@learnhub.demo',nome:'Alex — Apoiador de demonstração',tipo:'colaborador'}
];
try {
    db.exec('BEGIN IMMEDIATE');
    db.exec('CREATE TABLE IF NOT EXISTS demo_seeds (version TEXT PRIMARY KEY)');
    if (db.prepare('SELECT version FROM demo_seeds WHERE version=?').get('chat-demo-v1')) {
        console.log('Demonstração já carregada. Nenhum dado foi alterado.');
    } else {
        for (const account of accounts) {
            if (db.prepare('SELECT id FROM users WHERE email=? OR id=?').get(account.email, account.id)) {
                throw new Error(`A conta ${account.email} já existe. Operação cancelada para preservar seus dados.`);
            }
            const salt=crypto.randomBytes(16).toString('hex');
            const password=`${salt}:${crypto.scryptSync('learnhub123',salt,64).toString('hex')}`;
            db.prepare('INSERT INTO users VALUES (?,?,?,?)').run(account.id,account.email,password,JSON.stringify({...account,xp:15,dataCadastro:new Date().toISOString()}));
        }
        const examples=[
            ['Horta Escolar','Sustentabilidade','Em andamento','🌱','Cultivar alimentos e aprender sobre sustentabilidade.','Sementes, ferramentas e voluntários para os encontros semanais.'],
            ['Biblioteca Comunitária','Leitura','Planejamento','📚','Renovar o acervo e criar um espaço acolhedor de leitura.','Livros, estantes e mediação de leitura.'],
            ['Laboratório de Ciências','Ciência','Em andamento','🔬','Aproximar os estudantes da ciência com experiências práticas.','Kits de experimentos, microscópios e mentoria.'],
            ['Projeto de Robótica','Tecnologia','Em andamento','🤖','Oferecer oficinas de programação e robótica.','Computadores, kits de robótica e instrutores voluntários.'],
            ['Espaço de Leitura','Leitura','Concluído','📖','Criar um ambiente dedicado à descoberta de novas histórias.','Projeto concluído com apoio da comunidade.']
        ];
        examples.forEach(([titulo,categoria,status,imagem,objetivo,recursos],i)=>{
            const project={id:`demo-online-${i}`,titulo,categoria,status,imagem,objetivo,recursos,descricao:`${objetivo} Iniciativa fictícia para demonstração e teste das conexões da LearnHub.`,escolaId:accounts[0].id,escolaNome:accounts[0].nome,colaboradores:i===0?[accounts[1].id]:[],visualizacoes:0,dataCriacao:new Date().toISOString(),dataAtualizacao:new Date().toISOString()};
            db.prepare('INSERT INTO projects VALUES (?,?)').run(project.id,JSON.stringify(project));
        });
        db.prepare('INSERT INTO messages(project,sender,recipient,text,date) VALUES (?,?,?,?,?)').run('demo-online-0',accounts[0].id,accounts[1].id,'Olá! Esta é uma conversa de demonstração. Podemos combinar aqui como você gostaria de ajudar na Horta Escolar.',new Date().toISOString());
        db.prepare('INSERT INTO demo_seeds VALUES (?)').run('chat-demo-v1');
        console.log('5 projetos fictícios e 2 contas de demonstração adicionados. A Horta Escolar já tem uma conversa disponível.');
    }
    db.exec('COMMIT');
} catch(error) { db.exec('ROLLBACK'); throw error; }
finally { db.close(); }
