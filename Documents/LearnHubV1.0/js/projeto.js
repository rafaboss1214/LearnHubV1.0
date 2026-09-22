const projectUser = verificarLogin();

if (projectUser) {
    renderNav();

    const projectId = new URLSearchParams(location.search).get('id');
    let project = LearnHubStore.getProjects().find(item => item.id === projectId);
    let selectedSupporterId = '';

    if (!project) {
        location.href = 'hub.html';
    } else {
        registerView();
        renderProject();
    }

    function registerView() {
        const viewed = projectUser.projetosVisualizados || [];

        if (projectUser.tipo !== 'colaborador' || viewed.includes(project.id)) {
            return;
        }

        projectUser.projetosVisualizados = [...viewed, project.id];
        project.visualizacoes += 1;
        LearnHubStore.addXP(
            projectUser,
            LearnHubStore.XP.VISUALIZAR,
            `Você visualizou o projeto ${project.titulo}.`
        );
        LearnHubStore.updateUser(projectUser);
        LearnHubStore.updateProject(project);
    }

    function getSupporters() {
        const supporterIds = new Set(project.colaboradores || []);
        return LearnHubStore.getUsers().filter(user => supporterIds.has(user.id));
    }

    function isJoined() {
        return (projectUser.projetosColaborados || []).includes(project.id);
    }

    function conversationWith(otherUserId) {
        return (project.mensagens || [])
            .filter(message =>
                [message.remetenteId, message.destinatarioId].includes(projectUser.id) &&
                [message.remetenteId, message.destinatarioId].includes(otherUserId)
            )
            .sort((a, b) => new Date(a.data) - new Date(b.data));
    }

    function renderMessages(otherUserId) {
        const messages = conversationWith(otherUserId);

        return messages.length
            ? messages.map(message => `
                <div class="message ${message.remetenteId === projectUser.id ? 'mine' : ''}">
                    ${escapeHtml(message.texto)}
                    <small>${escapeHtml(formatDate(message.data, true))}</small>
                </div>
            `).join('')
            : '<div class="message-empty">Comece a conversa sobre como colaborar com este projeto.</div>';
    }

    function renderConnection() {
        if (projectUser.tipo === 'colaborador') {
            if (!isJoined()) {
                return `
                    <aside class="connection-card panel">
                        <h2>Converse com a escola</h2>
                        <p>Ao apoiar o projeto, você poderá combinar materiais, serviços ou voluntariado diretamente com a equipe responsável.</p>
                        <div class="connection-locked">Registre seu apoio para liberar a conversa.</div>
                    </aside>
                `;
            }

            return conversationPanel(project.escolaId, project.escolaNome);
        }

        if (projectUser.id === project.escolaId || isAdmin(projectUser)) {
            const supporters = getSupporters();

            if (!supporters.length) {
                return `
                    <aside class="connection-card panel">
                        <h2>Apoiadores</h2>
                        <p>Quando alguém apoiar esta iniciativa, a conversa aparecerá aqui.</p>
                        <div class="connection-locked">Ainda não há apoiadores neste projeto.</div>
                    </aside>
                `;
            }

            if (!supporters.some(user => user.id === selectedSupporterId)) {
                selectedSupporterId = supporters[0].id;
            }

            const selected = supporters.find(user => user.id === selectedSupporterId);

            return `
                <aside class="connection-card panel">
                    <h2>Conversas do projeto</h2>
                    <p>Selecione um apoiador para alinhar a colaboração.</p>
                    <div class="supporter-list" aria-label="Apoiadores do projeto">
                        ${supporters.map(user => `
                            <button class="supporter-chip ${user.id === selectedSupporterId ? 'active' : ''}" type="button" data-supporter="${escapeHtml(user.id)}">
                                <span class="supporter-avatar" aria-hidden="true">${escapeHtml(user.nome.charAt(0).toUpperCase())}</span>
                                <span>${escapeHtml(user.nome)}</span>
                            </button>
                        `).join('')}
                    </div>
                    ${conversationContent(selected.id, selected.nome)}
                </aside>
            `;
        }

        return `
            <aside class="connection-card panel">
                <h2>Conexão do projeto</h2>
                <div class="connection-locked">Somente a escola responsável e os apoiadores participam desta conversa.</div>
            </aside>
        `;
    }

    function conversationPanel(otherUserId, name) {
        return `
            <aside class="connection-card panel">
                <h2>Conversa com ${escapeHtml(name)}</h2>
                <p>Use este espaço para alinhar a forma de apoio.</p>
                ${conversationContent(otherUserId, name)}
            </aside>
        `;
    }

    function conversationContent(otherUserId, name) {
        return `
            <div class="conversation" aria-live="polite" aria-label="Conversa com ${escapeHtml(name)}">
                ${renderMessages(otherUserId)}
            </div>
            <form class="message-form" data-recipient="${escapeHtml(otherUserId)}">
                <label class="sr-only" for="messageText">Mensagem</label>
                <textarea id="messageText" name="message" maxlength="500" placeholder="Escreva uma mensagem..." required></textarea>
                <button class="btn btn-primary" type="submit">Enviar mensagem</button>
            </form>
        `;
    }

    function renderProject() {
        const canManage = canManageProject(projectUser, project);

        document.getElementById('detail').innerHTML = `
            <div class="project-banner panel">
                ${renderProjectMedia(project, project.titulo)}
            </div>

            ${canManage ? `
                <section class="project-management panel" aria-label="Gerenciar projeto">
                    <div>
                        <span class="management-kicker">Painel da escola</span>
                        <strong>Gerencie esta iniciativa</strong>
                        <small>Última atualização: ${escapeHtml(formatDate(project.dataAtualizacao, true))}</small>
                    </div>
                    <div class="management-actions">
                        <a class="btn" href="adicionar-projeto.html?edit=${encodeURIComponent(project.id)}">
                            Editar projeto
                        </a>
                        <button class="btn btn-danger" id="deleteProject" type="button">
                            Excluir
                        </button>
                    </div>
                </section>
            ` : ''}

            <div class="project-layout">
                <article class="detail-card panel">
                    <div class="detail-head">
                        <div>
                            <span class="badge status-${slugify(project.status)}">${escapeHtml(project.status)}</span>
                            <h1>${escapeHtml(project.titulo)}</h1>
                            <p>Por <strong>${escapeHtml(project.escolaNome)}</strong></p>
                        </div>
                        <span class="badge">${escapeHtml(project.categoria)}</span>
                    </div>

                    <p>${escapeHtml(project.descricao)}</p>

                    <div class="info-grid">
                        <div class="info"><small>Objetivo</small>${escapeHtml(project.objetivo)}</div>
                        <div class="info"><small>Recursos necessários</small>${escapeHtml(project.recursos)}</div>
                        <div class="info"><small>Apoiadores</small>🤝 ${project.colaboradores.length}</div>
                        <div class="info"><small>Visualizações</small>👁 ${project.visualizacoes}</div>
                    </div>

                    ${projectUser.tipo === 'colaborador'
                        ? `<button id="join" class="btn btn-primary collaborate" ${isJoined() ? 'disabled' : ''}>
                            ${isJoined() ? 'Você já apoia este projeto' : 'Quero apoiar este projeto'}
                           </button>`
                        : `<p class="muted">${projectUser.id === project.escolaId ? 'Este projeto foi publicado pela sua escola.' : 'Você está visualizando este projeto como escola.'}</p>`
                    }
                </article>

                ${renderConnection()}
            </div>
        `;

        bindProjectActions();
    }

    function bindProjectActions() {
        const joinButton = document.getElementById('join');

        if (joinButton && !joinButton.disabled) {
            joinButton.addEventListener('click', joinProject);
        }

        document.querySelectorAll('[data-supporter]').forEach(button => {
            button.addEventListener('click', () => {
                selectedSupporterId = button.dataset.supporter;
                renderProject();
            });
        });

        const deleteButton = document.getElementById('deleteProject');

        if (deleteButton) {
            deleteButton.addEventListener('click', deleteProject);
        }

        const messageForm = document.querySelector('.message-form');

        if (messageForm) {
            messageForm.addEventListener('submit', event => {
                event.preventDefault();
                const input = messageForm.elements.message;
                const sent = LearnHubStore.sendProjectMessage(
                    project.id,
                    projectUser.id,
                    messageForm.dataset.recipient,
                    input.value
                );

                if (!sent) {
                    toast('Não foi possível enviar a mensagem.', true);
                    return;
                }

                project = LearnHubStore.getProjects().find(item => item.id === project.id);
                renderProject();
                const conversation = document.querySelector('.conversation');
                if (conversation) conversation.scrollTop = conversation.scrollHeight;
                toast('Mensagem enviada.');
            });
        }

        const conversation = document.querySelector('.conversation');
        if (conversation) conversation.scrollTop = conversation.scrollHeight;
    }

    async function deleteProject() {
        const confirmed = await confirmAction(
            `Excluir “${project.titulo}”? As conversas e vínculos deste projeto também serão removidos.`,
            'Excluir projeto'
        );

        if (!confirmed) {
            return;
        }

        const removed = LearnHubStore.removeProject(project.id);

        if (!removed) {
            toast('Não foi possível excluir o projeto.', true);
            return;
        }

        toast('Projeto excluído.');
        setTimeout(() => location.href = 'hub.html', 650);
    }

    function joinProject() {
        if (isJoined()) {
            toast('Você já apoia este projeto.', true);
            return;
        }

        project.colaboradores = [...new Set([...project.colaboradores, projectUser.id])];
        projectUser.projetosColaborados = [...new Set([...(projectUser.projetosColaborados || []), project.id])];

        LearnHubStore.addXP(
            projectUser,
            LearnHubStore.XP.COLABORAR,
            `Você começou a apoiar o projeto ${project.titulo}.`
        );

        const school = LearnHubStore.getUsers().find(user => user.id === project.escolaId);
        if (school) {
            school.colaboradores = [...new Set([...(school.colaboradores || []), projectUser.id])];
            LearnHubStore.updateUser(school);
        }

        const achievements = LearnHubStore.checkAchievements(projectUser);
        LearnHubStore.updateUser(projectUser);
        LearnHubStore.updateProject(project);
        project = LearnHubStore.getProjects().find(item => item.id === project.id);

        renderProject();
        toast('Apoio registrado! Agora vocês já podem conversar.');
        showAchievements(achievements);
    }
}
