const projectUser = verificarLogin();

if (projectUser) {
    renderNav();

    const projectId = new URLSearchParams(location.search).get('id');
    let project = LearnHubStore.getProjects().find(item => item.id === projectId);

    if (!project) {
        location.href = 'hub.html';
    } else {
        renderProject();
    }

    function isJoined() { return (project.colaboradores || []).includes(projectUser.id); }

    function renderConnection() {
        return `<aside class="connection-card panel"><h2>Da solicitação à contribuição</h2><p>Explique como deseja ajudar. Somente o aceite da escola libera o chat privado.</p><a class="btn btn-primary" href="#propostas">Ver solicitações</a><a class="btn" href="historico.html">Histórico e certificados</a></aside>`;
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
                            <span class="badge">${LearnHubStore.getUsers().find(u=>u.id===project.escolaId)?.institutionStatus==='aprovada'?'Escola verificada pelo administrador':'Escola ainda não verificada'}</span>
                        </div>
                        <span class="badge">${escapeHtml(project.categoria)}</span>
                    </div>

                    <p>${escapeHtml(project.descricao)}</p>

                    <div class="info-grid">
                        <div class="info"><small>Objetivo</small>${escapeHtml(project.objetivo)}</div>
                        <div class="info"><small>Categorias de apoio</small>${SupportCategories.forProject(project).map(escapeHtml).join(" · ")}</div><div class="info"><small>Recursos necessários</small>${escapeHtml(project.recursos)}</div>
                        <div class="info"><small>Solicitações recebidas</small>${project.solicitacoesRecebidas||0}</div>
                        <div class="info"><small>Colaborações aceitas</small>${project.colaboracoesAceitas||0}</div>
                        <div class="info"><small>Colaborações concluídas</small>${project.colaboracoesConcluidas||0}</div>
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
        document.getElementById('join')?.addEventListener('click', () => { location.hash='propostas'; });
        document.getElementById('deleteProject')?.addEventListener('click', deleteProject);
    }

    async function deleteProject() {
        const confirmed = await confirmAction(
            `Excluir “${project.titulo}”? No servidor, projetos com histórico não podem ser excluídos; marque-os como concluídos.`,
            'Excluir projeto'
        );

        if (!confirmed) {
            return;
        }

        if (window.LearnHubAPI) {
            try { await LearnHubAPI(`/projects/${encodeURIComponent(project.id)}`, 'DELETE'); location.href='hub.html'; }
            catch (error) { toast(error.message, true); }
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

}
