# Ambiente de testes publicado — 27/10/2026

- URL: https://learnhub.alwaysdata.net/
- Provedor/plano confirmado no painel: alwaysdata Free, €0, 1 GB de disco, 256 MB RAM.
- Site Node.js: 1093077; versão principal 24.
- Código remoto: `/home/learnhub/www/learnhub-20261027`.
- Banco persistente: `/home/learnhub/private/learnhub-data/learnhub.sqlite`.
- Backups: `/home/learnhub/private/learnhub-backups` (primeiro snapshot criado).
- HTTPS obrigatório; cookie seguro; variáveis configuradas no painel do site.
- SMTP: `smtp-learnhub.alwaysdata.net:587`, STARTTLS obrigatório.
- Remetente: `learnhub@alwaysdata.net`, caixa existente da conta.
- Sem credenciais SMTP no código: o provedor autoriza serviços hospedados na sua rede.

O envio de teste para a própria caixa foi aceito pelo SMTP e consta como **Sent**
no histórico do provedor. Isso não comprova entrega na caixa de entrada de provedores
externos; o primeiro usuário deve confirmar o recebimento do link de cadastro, inclusive Spam.
O relatório do provedor identifica a conta como restrita; acompanhe os limites do plano
e eventuais pedidos de confirmação diretamente no painel. Nenhuma proteção foi desativada.

O banco online começou vazio. Não foram enviados dados pessoais do banco local,
contas fictícias nem senhas. Cadastros de localhost/localStorage não foram importados.
O administrador inicial ainda precisa de uma conta real cadastrada e confirmada,
e de atribuição explícita pelo operador com `scripts/set-admin.js`.

Atualize somente o código; não sobrescreva a pasta private. Execute comandos
administrativos com DATA_DIR apontando ao banco remoto, pois as variáveis do site
não são automaticamente herdadas pelo terminal SSH.

Exemplo de backup no SSH:

```sh
cd /home/learnhub/www/learnhub-20261027
DATA_DIR=/home/learnhub/private/learnhub-data BACKUP_DIR=/home/learnhub/private/learnhub-backups NODEJS_VERSION=24 node scripts/backup.js
```

Não há tarefa recorrente de backup instalada; faça e baixe snapshots antes de atualizar.
Nodemailer atualizado para versão corrigida (>=10.1.4); auditoria sem avisos no deploy.
Sem commit ou push realizados nesta publicação.
