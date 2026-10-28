const {serverConfig} = require('../config');
try {
    serverConfig({...process.env, NODE_ENV:'production'});
    for (const key of ['SMTP_HOST', 'MAIL_FROM']) {
        if (!process.env[key]) throw new Error(`Configure ${key} para recuperação de senha por e-mail (cadastro e login não exigem SMTP).`);
    }
    if (Boolean(process.env.SMTP_USER) !== Boolean(process.env.SMTP_PASSWORD)) throw new Error('Preencha SMTP_USER e SMTP_PASSWORD juntos.');
    if (!process.env.SMTP_USER) console.log('SMTP sem credenciais: o provedor precisa autorizar o envio a partir desta hospedagem. Não serve para um SMTP externo que exige login.');
    console.log('Configuração preenchida. Ainda é necessário testar HTTPS, entrega real de e-mail e persistência na hospedagem.');
} catch(error) { console.error(error.message); process.exitCode = 1; }
