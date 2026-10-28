# LearnHub

Aplicação em HTML/CSS/JavaScript com API Node.js, SQLite (`node:sqlite`), Sharp para imagens, Nodemailer para e-mails e PDFKit para certificados. Requer Node.js 22.13 ou superior. Não há framework de frontend nem serviço de banco externo obrigatório.

## Executar

Para testes pela internet com banco persistente, veja [publicação gratuita no alwaysdata](deploy/README.md).
Há configuração de produção, diretório de dados separado e backup consistente; a publicação
exige conta na hospedagem; SMTP é usado para recuperação de senha. Nenhum deploy é realizado automaticamente.

```powershell
npm install
npm start
```

Abra `http://localhost:3000`. A porta pode ser configurada por `PORT`; `HOST` usa `127.0.0.1` por padrão. Reinicie o processo após alterar o backend.

### Cadastro imediato e recuperação de senha

Copie `.env.example` para `.env` e configure `APP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `MAIL_FROM`. Inicie com:

```powershell
node --env-file=.env server.js
```

`APP_URL` deve ser a URL confiável do ambiente, sem depender do cabeçalho Host enviado pelo cliente. Use HTTPS e `SECURE_COOKIE=1` em produção. SMTP na porta 587 usa STARTTLS obrigatório; porta 465 normalmente usa `SMTP_SECURE=1`. Configure domínio/remetente e SPF/DKIM/DMARC no provedor de e-mail. Nunca envie `.env` ao Git.

O cadastro não envia confirmação de e-mail e o login fica disponível imediatamente, inclusive sem SMTP. O endereço não é marcado como verificado artificialmente. SMTP continua necessário para recuperar senha: tokens são armazenados como hash, expiram em 30 minutos e são de uso único. Redefinir senha invalida todas as sessões. A resposta de recuperação é genérica para não revelar se a conta existe. Validação de campos, hash de senha, sessão e limite de tentativas continuam ativos.

Contas antigas também podem entrar sem confirmar o e-mail. Links de confirmação antigos permanecem compatíveis, mas são opcionais. Nenhum registro é promovido automaticamente a verificado. Não há importação automática de contas `file://`.

### Administrador e análise de escolas

Cadastre uma conta dedicada como colaborador e execute, no servidor:

```powershell
npm run admin:grant -- administrador@seu-dominio.com
```

O comando não cria senha padrão nem confirma e-mail. Não converte escolas com projetos em administradores. Escolas podem publicar/editar seus projetos, aceitar contribuições, concluir e emitir certificados sem aprovação do administrador. A análise institucional foi mantida como selo opcional e auditado, sem bloquear essas operações. A coleta de INEP/CNPJ/site não verifica a escola automaticamente. Somente o responsável pelo projeto mantém permissão de alterá-lo; colaboradores não podem publicar como escola.

## Fluxo de colaboração

1. O colaborador (Aluno, Pai/Mãe ou Responsável, ou Outro membro da comunidade) envia tipo de apoio, descrição e disponibilidade pelo projeto. Todos esses subtipos têm somente permissões de colaborador; o login identifica a conta automaticamente.
2. A solicitação fica **Pendente**. Não concede XP, não conta como colaboração e não abre chat. Um índice único impede outra solicitação ativa da mesma pessoa no projeto.
3. A escola **Aceita** ou **Recusa**. A recusa exige motivo, visível ao solicitante. Após recusa é possível enviar uma nova solicitação.
4. Somente o aceite libera o chat privado, vinculado ao ID da solicitação. Escola e colaborador são os únicos participantes autorizados. Nome, mensagem, horário e leitura são apresentados. Conversas distintas do mesmo projeto não compartilham mensagens.
5. A escola confirma a realização: **Concluída**. São concedidos 20 XP ao colaborador, uma única vez por solicitação, na mesma transação. Visualização, mensagem, envio, cadastro e publicação não geram novos pontos no servidor. Saldos históricos não são apagados. Emblemas atuais dependem de conclusões confirmadas.
6. A escola emite o certificado. A emissão é idempotente: repetir retorna o mesmo código/documento. O certificado contém colaborador, escola, projeto, contribuição, tipo, datas e código aleatório único. Não contém carga horária inventada. Pode ser consultado pelos participantes e baixado em PDF no histórico. O código no PDF leva à consulta autenticada; ele não é uma assinatura digital ICP-Brasil nem equivalência acadêmica.

**Colaborações** reúne o histórico de cada usuário, com filtro de situação e acesso ao chat/certificado. Uma escola vê os registros dos seus projetos; o colaborador vê apenas os seus. Administradores de instituições não recebem acesso às mensagens privadas por esse papel.

Projetos com solicitações não podem ser excluídos fisicamente: conclua o projeto para encerrar novas solicitações e preservar histórico/certificados. Projetos sem histórico continuam com CRUD. Alterar o nome ou descrição do projeto não modifica certificados já emitidos.

## Migração e preservação

Antes da primeira migração, o servidor cria uma cópia SQLite consistente `data/before-workflow-*.sqlite` por `VACUUM INTO`, incluindo conteúdo do WAL. Os arquivos `data/learnhub.sqlite`, `-wal` e `-shm` são dados operacionais; não os apague com o servidor ativo.

As tabelas antigas `proposals`, `messages`, `users`, `projects` e `xp_rewards` são preservadas. A migração cria `requests`, `certificates`, `participation_rewards`, `account_tokens`, `auth_limits` e `institution_reviews`; acrescenta `messages.request_id`.

- Propostas enviadas viram Pendentes; aceitas/em execução viram Aceitas; concluídas permanecem Concluídas.
- Cancelamentos antigos ficam como Recusadas com indicação explícita do estado anterior, sem inventar um motivo da escola.
- Participações imediatas antigas, sem aceite registrado, viram Pendentes para revisão da escola. Mensagens existentes permanecem armazenadas e serão acessíveis no chat quando houver aceite.
- Conclusões anteriores não recebem novos pontos na migração. Certificados não são emitidos automaticamente.
- A migração é versionada e idempotente. Para restaurar backup, pare o servidor e preserve o banco atual antes de qualquer substituição; não misture banco restaurado com WAL antigo.

O bootstrap público da aplicação omite e-mail, endereço e dados de verificação privados de outros usuários. O endereço completo do colaborador é armazenado em `enderecoPrivado`, não no perfil público.

## CEP e imagens

O cadastro consulta [ViaCEP](https://viacep.com.br/) automaticamente ao completar oito dígitos. Rua, bairro, cidade e UF são preenchidos; número e complemento continuam manuais. Respostas antigas são ignoradas ao trocar de CEP. CEP inválido, inexistente ou serviço indisponível são tratados na interface. O preenchimento manual permanece disponível e o servidor valida formato de CEP/UF. Apenas o CEP é enviado à API externa; a consulta não comprova residência.

Uploads de perfil/capa continuam limitados a JPG, PNG ou WebP estáticos, 3 MB e 16 megapixels. O servidor valida, remove metadados e converte para JPEG. O banner é compartilhado com a capa do projeto.

## Protótipo local

`local.html` mantém a navegação dos arquivos em uma única página. O chat local de Marina/Lucas/Beatriz é **demonstração**, salvo apenas no navegador, sem mensagens para pessoas reais. O modo local não pode oferecer segurança de servidor, e-mail verificado, análise institucional nem certificado autêntico. Solicitações reais e suas ações usam a versão conectada; não há fallback silencioso para aprovações locais.

Os antigos comandos `seed:demo` e `scripts/seed-chat-contacts.js` são exclusivamente de demonstração. Não aprovam instituições nem verificam e-mails. Contas `@learnhub.demo` não são endereços entregáveis e não devem ser usadas para validação real ou produção.

## Testes e limitações operacionais

`npm test` cobre armazenamento, migração idempotente, login imediato sem confirmação, publicação sem aprovação institucional, recuperação de senha e uso único de tokens, solicitações, duplicatas, recusa, chat privado, conclusão, XP, PDF, restrições de terceiros, imagens e reinicialização. `tests/legacy-chat.fixture.js` guarda o fluxo anterior apenas como referência de migração.

`tests/ui-smoke.js` é uma checagem opcional em Chrome headless com banco temporário e transporte de e-mail somente em memória. Configure `PLAYWRIGHT_MODULE` com o módulo Playwright instalado e, se necessário, `CHROME_PATH`. Executa login, envio/aceite, chat, conclusão e PDF; checa overflow a 1440/390 px. Artefatos de teste ficam em `tmp/qa`, ignorado pelo Git. Nenhuma conta de teste é inserida no banco real.

Rate limiting persistido no SQLite protege IP e e-mail (15 minutos). Para produção, configure HTTPS, backups periódicos, monitoramento e limpeza de tokens expirados, além do provedor SMTP e de um administrador responsável pela análise institucional. Este projeto usa SQLite de uma instância; múltiplos servidores exigem planejamento de armazenamento e sessões compartilhadas. Não há integração automática com cadastro oficial de escolas.

Referências das integrações: [SMTP/Nodemailer](https://nodemailer.com/smtp) e [PDFKit](https://pdfkit.org/docs/text.html).
# Colaborações por categoria

A escola escolhe as categorias de apoio ao criar ou editar o projeto: Mão de obra, Recursos materiais, Conhecimento, Serviços e Outros. O colaborador precisa escolher uma categoria disponível antes de enviar sua solicitação. O tema do projeto continua separado dessas categorias.

Em Mensagens, selecione o projeto e a aba da categoria para consultar solicitações e conversas privadas. A escola pode aceitar ou recusar com motivo nessa tela. Apenas o aceite libera mensagens; a organização em abas não cria chats de grupo nem amplia permissões. Continua permitida apenas uma solicitação ativa por colaborador e projeto.

Projetos antigos ficam disponíveis para todas as categorias até serem editados. Materiais e Voluntariado são apresentados como Recursos materiais e Mão de obra. Remover uma categoria do projeto impede novas ofertas nela, mas mantém solicitações e conversas existentes acessíveis. Os dados continuam persistidos no SQLite, sem migração destrutiva e sem nova integração externa.

Validação: `npm test` inclui os casos de categorias, persistência e isolamento. `tests/categories-ui.js` verifica o fluxo visual com Playwright e banco temporário.
