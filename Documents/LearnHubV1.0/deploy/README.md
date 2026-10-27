# Publicar gratuitamente para testes: alwaysdata

Preparação local; **o site ainda não foi publicado**. Não é Expo, nem aplicativo nativo.
O mesmo servidor Node.js atende HTML/CSS/JS e API; SQLite guarda contas, projetos,
imagens e mensagens no disco da hospedagem, fora da pasta de código.

## Plano e limites (consultados em 27/10/2026)

Escolha **Free**, não a avaliação de 30 dias do Plus. A oferta anuncia 1 GB de disco,
256 MB de RAM, 1/4 CPU e endereço `SUA_CONTA.alwaysdata.net`, para uso pessoal.
É adequada para ensaio com poucos usuários, não uma garantia de capacidade para uma escola inteira.
Dependências, banco, imagens, backups e logs consomem a mesma quota. A oferta gratuita
não inclui domínio próprio para o site. Confirme as condições no cadastro.

Fontes oficiais:
- https://www.alwaysdata.com/en/offers/
- https://help.alwaysdata.com/en/docs/web-hosting/languages/nodejs/configuration/

## 1. Conta e arquivos

Crie a conta Free e confirme seu e-mail pessoal. Não envie senhas neste chat.
Em **Environment → Node.js**, escolha **24** (o projeto requer Node >=22.13).
Envie o código por SFTP para `/home/SUA_CONTA/www/learnhub`, ou clone uma versão
atualizada do seu GitHub nesse diretório. Use os dados SSH/SFTP mostrados no painel.

Envie HTML, `js/`, `css/`, `server.js`, `workflow.js`, `config.js`, `scripts/`,
`package.json` e `package-lock.json`. Não envie `node_modules` do Windows,
`.git`, `.env`, `data/`, `tmp/` nem arquivos pessoais. Isso começa com banco vazio.
Em SSH, dentro da pasta do código, execute:

```sh
node --version
npm ci --omit=dev
```

## 2. Dados e variáveis

No painel, em **Web → Sites**, crie um site do tipo **Node.js**.
Use o endereço gratuito fornecido. Ative HTTPS e redirecionamento HTTP para HTTPS.
Diretório de trabalho: `/home/SUA_CONTA/www/learnhub`.
Comando: `node /home/SUA_CONTA/www/learnhub/server.js`.

Configure as variáveis de `deploy/alwaysdata.env.example` com a sua conta real.
Não use o `.env.example` local: ele fixa localhost. Não fixe IP/HOST/PORT;
o servidor aceita os valores injetados pelo alwaysdata, inclusive IPv6.
`DATA_DIR` deve ser `/home/SUA_CONTA/private/learnhub-data`, fora da pasta do código.
O servidor cria o diretório e o banco na primeira inicialização, preservando-os nas seguintes.
Use uma única instância do servidor.

Variáveis do painel do site podem não estar presentes no SSH. Para comandos administrativos,
carregue os mesmos valores de um arquivo privado `/home/SUA_CONTA/private/learnhub.env`,
com permissões 600, ou configure-os no ambiente da sessão. Nunca coloque esse arquivo no Git.
Com arquivo privado, por exemplo:

```sh
node --env-file=/home/SUA_CONTA/private/learnhub.env scripts/check-production.js
node --env-file=/home/SUA_CONTA/private/learnhub.env scripts/backup.js
node --env-file=/home/SUA_CONTA/private/learnhub.env scripts/set-admin.js seu-email-confirmado@example.com
```

## 3. E-mails reais

É obrigatório configurar um SMTP com remetente autorizado para confirmar cadastro e
recuperar senha. Use uma conta/provedor que autorize envio SMTP e confira sua quota gratuita.
Preencha SMTP_HOST, SMTP_PORT, SMTP_SECURE e MAIL_FROM. Se o provedor exigir login,
preencha SMTP_USER e SMTP_PASSWORD juntos.
O alwaysdata documenta autorização de SMTP sem senha para serviços executados na própria
hospedagem: use `smtp-SUA_CONTA.alwaysdata.net`, porta 587 com STARTTLS,
e o remetente da sua caixa real, como `SUA_CONTA@alwaysdata.net`.
Isso não se aplica ao servidor no seu computador. Não desabilite TLS.
Fonte: https://help.alwaysdata.com/en/docs/e-mails/use-an-e-mail-address/
Não use a senha pessoal comum quando o provedor exigir senha de aplicativo ou credencial SMTP.
Porta 587: SMTP_SECURE=0 (STARTTLS); porta 465: SMTP_SECURE=1.
APP_URL deve ser exatamente a origem HTTPS pública, sem caminho.
O check:production verifica campos preenchidos; não testa autenticação SMTP nem entrega.
Sem SMTP funcionando os usuários não poderão confirmar novos cadastros e entrar.
Não há confirmação falsa nem desativação das proteções para colocar a demonstração no ar.

## 4. Verificação após publicar

- Abra o link público no celular usando outra rede e confira HTTPS.
- Cadastre escola e colaborador com e-mails reais; confira confirmação e recuperação de senha.
- Crie uma conta administrativa dedicada, confirme seu e-mail e execute set-admin no servidor.
- Analise e aprove a escola na administração; publique um projeto com imagem.
- Envie uma solicitação, aceite, troque mensagens, conclua e baixe o certificado.
- Reinicie o site pelo painel e confirme que contas, imagem, histórico e mensagens continuam.
- Teste com terceiro usuário: não deve acessar conversas/certificados alheios.
- Faça backup, baixe-o por SFTP e mantenha uma cópia privada fora da hospedagem.

O rate limit por conexão permanece conservador: atrás de proxy, visitantes podem dividir
o limite por IP (35 tentativas de autenticação/15 min). Não confiamos cegamente em
X-Forwarded-For enviado pelo cliente. Para ampliar os testes, configure confiança no proxy
somente após verificar os cabeçalhos e a política efetiva do provedor.

## 5. Atualizações, backup e dados antigos

Atualize apenas o código, execute npm ci se necessário e reinicie pelo painel.
Nunca apague/substitua DATA_DIR em uma atualização e não rode seed:demo em produção.
`npm run backup` cria um snapshot SQLite consistente, mesmo com WAL, sem sobrescrever
backups anteriores. Configure BACKUP_DIR privado; monitore espaço e baixe as cópias.
Não há limpeza automática para evitar apagar backups inadvertidamente.

Para levar dados do localhost, faça snapshot com o script usando o DATA_DIR local correto.
Pare o site remoto, guarde backup do banco remoto se já existir, e transfira o snapshot
como `learnhub.sqlite` para o DATA_DIR remoto. Só faça isso em diretório novo ou seguindo
restauração controlada; não misture banco restaurado com arquivos WAL/SHM antigos.
Não sobrescreva cadastros criados no ar. Dados de localStorage não são importados automaticamente.
Contas antigas continuam sujeitas a confirmação real de e-mail e escolas à análise institucional.

O plano gratuito não elimina a necessidade de backup nem garante disponibilidade ilimitada.
Antes de abrir inscrições reais, revise capacidade, monitoramento e práticas de privacidade.
