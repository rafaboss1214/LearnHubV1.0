// Operator-only bootstrap. Never exposed through HTTP or public registration.
const {DatabaseSync}=require('node:sqlite');
const path=require('node:path');
const email=String(process.argv[2]||'').trim().toLowerCase();
if(!email)throw new Error('Uso: node scripts/set-admin.js email@dominio');
const db=new DatabaseSync(path.join(require('../config').dataDirectory(),'learnhub.sqlite'),{open:true,readOnly:false});
try{const row=db.prepare('SELECT * FROM users WHERE email=?').get(email);if(!row)throw new Error('Cadastre uma conta exclusiva para administração primeiro.');const u=JSON.parse(row.data);if(!u.emailVerifiedAt)throw new Error('Confirme o e-mail antes de atribuir administração.');if(u.tipo==='escola')throw new Error('Use uma conta separada de colaborador, não uma escola com projetos.');u.tipo='admin';db.prepare('UPDATE users SET data=? WHERE id=?').run(JSON.stringify(u),u.id);console.log('Administrador configurado. Entre novamente.');}finally{db.close();}
