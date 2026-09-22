const hubUser = verificarLogin();

if (hubUser) {
    renderNav('hub');

    const allProjects = LearnHubStore.getProjects();
    const firstName = hubUser.nome.split(' ')[0];
    const isSchool = hubUser.tipo === 'escola';
    const categoryFilter = document.getElementById('categoryFilter');
    const sortProjects = document.getElementById('sortProjects');
    const searchInput = document.getElementById('search');
    const myFilterButton = document.getElementById('myProjectsFilter');
    let filter = 'Todos';

    document.getElementById('greeting').textContent = `Olá, ${firstName}!`;
    myFilterButton.textContent = isSchool ? 'Meus projetos' : 'Meus apoios';

    populateCategories();
    renderOverview();
    renderHighlights();
    renderProjects();

    searchInput.addEventListener('input', renderProjects);
    categoryFilter.addEventListener('change', renderProjects);
    sortProjects.addEventListener('change', renderProjects);

    document.querySelectorAll('[data-filter]').forEach(button => {
        button.addEventListener('click', () => {
            filter = button.dataset.filter;
            document.querySelectorAll('[data-filter]').forEach(item => {
                item.classList.toggle('active', item === button);
            });
            renderProjects();
        });
    });

    function ownProjects() {
        return isSchool
            ? allProjects.filter(project => project.escolaId === hubUser.id)
            : allProjects.filter(project => (hubUser.projetosColaborados || []).includes(project.id));
    }

    function populateCategories() {
        const categories = [...new Set(allProjects.map(project => project.categoria).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, 'pt-BR'));

        categoryFilter.insertAdjacentHTML(
            'beforeend',
            categories.map(category =>
                `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`
            ).join('')
        );
    }

    function renderOverview() {
        const related = ownProjects();
        const supporters = new Set(allProjects.flatMap(project => project.colaboradores || []));
        const completed = allProjects.filter(project => project.status === 'Concluído').length;
        const active = allProjects.filter(project => project.status === 'Em andamento').length;

        const stats = [
            ['Projetos ativos', active, 'iniciativas em movimento', '↗'],
            [isSchool ? 'Projetos da escola' : 'Projetos apoiados', related.length, isSchool ? 'publicados por você' : 'que contam com você', isSchool ? '🏫' : '🤝'],
            ['Rede de apoio', supporters.size, 'pessoas conectadas', '◎'],
            ['Impactos concluídos', completed, 'projetos realizados', '✓']
        ];

        document.getElementById('hubStats').innerHTML = stats.map(stat => `
            <article class="hub-stat panel">
                <span class="hub-stat-icon" aria-hidden="true">${stat[3]}</span>
                <strong>${stat[1]}</strong>
                <h2>${escapeHtml(stat[0])}</h2>
                <p>${escapeHtml(stat[2])}</p>
            </article>
        `).join('');

        const info = LearnHubStore.levelInfo(hubUser);
        document.getElementById('miniLevel').innerHTML = `
            <div class="mini-level-head">
                <small>NÍVEL ${info.level}</small>
                <a href="progressao.html">Ver jornada</a>
            </div>
            <strong>${escapeHtml(info.title)}</strong>
            <span>${Number(hubUser.xp) || 0} XP · ${info.next === null ? 'nível máximo' : `${info.remaining} para avançar`}</span>
            <div class="bar"><i style="width:${info.percent}%"></i></div>
        `;
    }

    function renderHighlights() {
        const related = ownProjects();
        let action;

        if (isSchool) {
            const planning = related.find(project => project.status === 'Planejamento');
            action = planning
                ? {
                    eyebrow: 'Próximo passo recomendado',
                    title: `Coloque “${planning.titulo}” em movimento`,
                    text: 'Atualize o status, revise os recursos necessários e deixe a comunidade acompanhar a evolução.',
                    label: 'Atualizar projeto',
                    href: `adicionar-projeto.html?edit=${encodeURIComponent(planning.id)}`
                }
                : {
                    eyebrow: 'Continue mobilizando',
                    title: 'Compartilhe uma nova necessidade da escola',
                    text: 'Projetos claros aproximam pessoas, materiais e conhecimento de quem precisa.',
                    label: 'Criar projeto',
                    href: 'adicionar-projeto.html'
                };
        } else {
            const available = allProjects.find(project =>
                project.status !== 'Concluído' &&
                !(hubUser.projetosColaborados || []).includes(project.id)
            );
            action = available
                ? {
                    eyebrow: 'Uma causa para conhecer',
                    title: available.titulo,
                    text: available.descricao,
                    label: 'Conhecer projeto',
                    href: `projeto.html?id=${encodeURIComponent(available.id)}`
                }
                : {
                    eyebrow: 'Sua rede de impacto',
                    title: 'Acompanhe os projetos que você apoia',
                    text: 'Converse com as escolas e acompanhe cada iniciativa até o resultado.',
                    label: 'Ver meus apoios',
                    href: 'perfil.html'
                };
        }

        const spotlight = [...allProjects]
            .filter(project => project.status !== 'Concluído')
            .sort((a, b) =>
                (b.colaboradores.length * 3 + b.visualizacoes) -
                (a.colaboradores.length * 3 + a.visualizacoes)
            )[0];

        document.getElementById('hubHighlights').innerHTML = `
            <article class="hub-action-card panel">
                <span class="section-kicker">${escapeHtml(action.eyebrow)}</span>
                <h2>${escapeHtml(action.title)}</h2>
                <p>${escapeHtml(action.text)}</p>
                <a class="btn btn-primary" href="${action.href}">${escapeHtml(action.label)} →</a>
            </article>

            <article class="hub-spotlight panel">
                ${spotlight ? `
                    <div class="spotlight-cover">${renderProjectMedia(spotlight, spotlight.titulo)}</div>
                    <div class="spotlight-copy">
                        <div class="spotlight-heading">
                            <span class="section-kicker">Em destaque</span>
                            <span class="badge status-${slugify(spotlight.status)}">${escapeHtml(spotlight.status)}</span>
                        </div>
                        <h2>${escapeHtml(spotlight.titulo)}</h2>
                        <p>${escapeHtml(spotlight.objetivo)}</p>
                        <div class="spotlight-meta">
                            <span>🤝 ${spotlight.colaboradores.length} apoiadores</span>
                            <a href="projeto.html?id=${encodeURIComponent(spotlight.id)}">Ver detalhes →</a>
                        </div>
                    </div>
                ` : '<div class="empty">Novos destaques aparecerão aqui.</div>'}
            </article>
        `;
    }

    function renderProjects() {
        const term = searchInput.value.trim().toLocaleLowerCase('pt-BR');
        const category = categoryFilter.value;

        let projects = allProjects.filter(project => {
            const matchesStatus =
                filter === 'Todos' ||
                (filter === 'Meus'
                    ? ownProjects().some(item => item.id === project.id)
                    : project.status === filter);
            const matchesCategory = category === 'Todas' || project.categoria === category;
            const matchesTerm = [project.titulo, project.escolaNome, project.categoria, project.descricao, project.objetivo]
                .join(' ')
                .toLocaleLowerCase('pt-BR')
                .includes(term);

            return matchesStatus && matchesCategory && matchesTerm;
        });

        projects = sortList(projects, sortProjects.value);
        document.getElementById('resultsSummary').textContent =
            `${projects.length} ${projects.length === 1 ? 'projeto encontrado' : 'projetos encontrados'}`;

        document.getElementById('cards').innerHTML = projects.length
            ? projects.map(renderCard).join('')
            : `
                <div class="empty panel project-empty">
                    <span aria-hidden="true">⌕</span>
                    <h2>Nenhum projeto encontrado</h2>
                    <p>Tente remover algum filtro ou buscar por outro termo.</p>
                    <button class="btn" type="button" id="clearFilters">Limpar filtros</button>
                </div>
            `;

        document.getElementById('clearFilters')?.addEventListener('click', clearFilters);
    }

    function sortList(projects, sort) {
        return [...projects].sort((a, b) => {
            if (sort === 'apoio') return b.colaboradores.length - a.colaboradores.length;
            if (sort === 'visualizacoes') return b.visualizacoes - a.visualizacoes;
            if (sort === 'titulo') return a.titulo.localeCompare(b.titulo, 'pt-BR');
            return new Date(b.dataAtualizacao) - new Date(a.dataAtualizacao);
        });
    }

    function renderCard(project) {
        const isOwner = project.escolaId === hubUser.id;
        return `
            <article class="project-card panel">
                <div class="project-cover">
                    ${renderProjectMedia(project, project.titulo)}
                    ${isOwner ? '<span class="owner-label">Seu projeto</span>' : ''}
                </div>
                <div class="project-content">
                    <div class="card-badges">
                        <span class="badge status-${slugify(project.status)}">${escapeHtml(project.status)}</span>
                        <span class="category-label">${escapeHtml(project.categoria)}</span>
                    </div>
                    <h2>${escapeHtml(project.titulo)}</h2>
                    <small class="muted">${escapeHtml(project.escolaNome)}</small>
                    <p>${escapeHtml(project.descricao)}</p>
                    <div class="project-meta">
                        <span>🤝 ${project.colaboradores.length}</span>
                        <span>👁 ${project.visualizacoes}</span>
                        <span>${escapeHtml(formatDate(project.dataAtualizacao))}</span>
                    </div>
                    <div class="card-actions">
                        <a class="btn btn-primary" href="projeto.html?id=${encodeURIComponent(project.id)}">Ver projeto</a>
                        ${isOwner ? `<a class="btn card-edit" href="adicionar-projeto.html?edit=${encodeURIComponent(project.id)}" aria-label="Editar ${escapeHtml(project.titulo)}">Editar</a>` : ''}
                    </div>
                </div>
            </article>
        `;
    }

    function clearFilters() {
        filter = 'Todos';
        searchInput.value = '';
        categoryFilter.value = 'Todas';
        sortProjects.value = 'recentes';
        document.querySelectorAll('[data-filter]').forEach(button => {
            button.classList.toggle('active', button.dataset.filter === 'Todos');
        });
        renderProjects();
    }
}
