const progressUser = verificarLogin();

if (progressUser) {
    renderNav('progressao');

    const info = LearnHubStore.levelInfo(progressUser);
    const isSchool = progressUser.tipo === 'escola';
    const projects = LearnHubStore.getProjects();
    const definitions = LearnHubStore.badgesFor(progressUser);
    const levelSteps = LearnHubStore.levelRoadmap(progressUser);
    const unlockedCount = definitions.filter(badge => badge.desbloqueado).length;
    const nextBadge = definitions.find(badge => !badge.desbloqueado);
    const userProjects = isSchool
        ? projects.filter(project => project.escolaId === progressUser.id)
        : projects.filter(project => (progressUser.projetosColaborados || []).includes(project.id));

    const stats = isSchool
        ? [
            ['Projetos', userProjects.length, 'iniciativas publicadas'],
            ['Em andamento', userProjects.filter(project => project.status === 'Em andamento').length, 'projetos mobilizando pessoas'],
            ['Apoiadores', (progressUser.colaboradores || []).length, 'pessoas conectadas à escola'],
            ['Concluídos', (progressUser.projetosConcluidos || []).length, 'ideias transformadas em realidade']
        ]
        : [
            ['Projetos apoiados', userProjects.length, 'iniciativas que contam com você'],
            ['Concluídos', (progressUser.projetosConcluidos || []).length, 'projetos levados até o fim'],
            ['Descobertas', (progressUser.projetosVisualizados || []).length, 'projetos que você conheceu'],
            ['Emblemas', unlockedCount, 'marcos da sua jornada']
        ];

    const mission = getNextMission();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weeklyXP = (progressUser.historico || [])
        .filter(item => new Date(item.data) >= weekStart)
        .reduce((total, item) => total + (Number(item.xp) || 0), 0);
    const weeklyGoal = 50;
    const weeklyPercent = Math.min(100, weeklyXP / weeklyGoal * 100);
    const xpGuide = isSchool
        ? [
            ['📣', 'Publicar um projeto', LearnHubStore.XP.PUBLICAR, 'Dê visibilidade a uma necessidade real.'],
            ['✨', 'Criar sua conta', LearnHubStore.XP.CONTA, 'O primeiro passo da jornada já conta.'],
            ['🏅', 'Desbloquear um emblema', LearnHubStore.XP.EMBLEMA, 'Avance em marcos importantes da escola.']
        ]
        : [
            ['👀', 'Conhecer um novo projeto', LearnHubStore.XP.VISUALIZAR, 'Descubra onde sua ajuda faz mais sentido.'],
            ['🤝', 'Apoiar uma iniciativa', LearnHubStore.XP.COLABORAR, 'Conecte-se diretamente com uma escola.'],
            ['🏅', 'Desbloquear um emblema', LearnHubStore.XP.EMBLEMA, 'Alcance novos marcos da sua jornada.']
        ];

    document.getElementById('progress').innerHTML = `
        <header class="progress-intro">
            <div>
                <span class="badge">Sua jornada de impacto</span>
                <h1 class="page-title">Continue transformando educação</h1>
                <p>Seu progresso mostra o impacto real das conexões que você constrói na LearnHub.</p>
            </div>
            <div class="progress-summary" aria-label="Resumo da progressão">
                <strong>${unlockedCount}/${definitions.length}</strong>
                <span>emblemas conquistados</span>
            </div>
        </header>

        <section class="level-card panel">
            <div class="level-orbit" style="--level-progress:${Math.max(4, info.percent)}%" aria-label="${Math.round(info.percent)}% do nível concluído">
                <div>
                    <span>Nível</span>
                    <strong>${info.level}</strong>
                </div>
            </div>

            <div class="level-copy">
                <span class="level-kicker">Seu momento atual</span>
                <h2>${escapeHtml(info.title)}</h2>
                <p>${getLevelMessage()}</p>
                <div class="level-progress-row">
                    <strong>${Number(progressUser.xp) || 0} XP</strong>
                    <span>${info.next === null ? 'Nível máximo' : `${info.remaining} XP para ${escapeHtml(info.nextTitle)}`}</span>
                </div>
                <div class="bar bar-large"><i style="width:${info.percent}%"></i></div>
            </div>

            <aside class="next-mission">
                <span class="mission-label">Próxima missão</span>
                <strong>${escapeHtml(mission.title)}</strong>
                <p>${escapeHtml(mission.description)}</p>
                <div class="mission-footer">
                    <span>${escapeHtml(mission.reward)}</span>
                    <a class="btn btn-primary" href="${mission.href}">${escapeHtml(mission.action)} →</a>
                </div>
            </aside>
        </section>

        <section class="engagement-grid" aria-label="Metas e níveis">
            <article class="weekly-goal panel">
                <div class="weekly-goal-copy">
                    <span class="section-kicker">Meta dos últimos 7 dias</span>
                    <h2>${weeklyXP >= weeklyGoal ? 'Meta alcançada!' : 'Mantenha o ritmo de impacto'}</h2>
                    <p>${weeklyXP >= weeklyGoal
                        ? 'Você manteve uma participação consistente. Continue acompanhando sua rede.'
                        : `Conquiste mais ${Math.max(0, weeklyGoal - weeklyXP)} XP com ações que ajudam projetos reais.`}</p>
                </div>
                <div class="weekly-progress">
                    <strong>${weeklyXP}<small>/${weeklyGoal} XP</small></strong>
                    <div class="bar"><i style="width:${weeklyPercent}%"></i></div>
                </div>
            </article>

            <article class="level-roadmap-card panel">
                <div class="level-roadmap-head">
                    <div>
                        <span class="section-kicker">Visão de longo prazo</span>
                        <h2>Rota de níveis</h2>
                    </div>
                    <span>${levelSteps.filter(step => step.unlocked).length}/${levelSteps.length}</span>
                </div>
                <div class="level-steps">
                    ${levelSteps.map(step => `
                        <div class="level-step ${step.unlocked ? 'unlocked' : ''} ${step.current ? 'current' : ''}">
                            <span>${step.level}</span>
                            <div>
                                <strong>${escapeHtml(step.title)}</strong>
                                <small>${step.minimum} XP</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </article>
        </section>

        <section class="impact-section" aria-labelledby="impact-title">
            <div class="section-title-row">
                <div>
                    <span class="section-kicker">O que você já movimentou</span>
                    <h2 id="impact-title">Seu impacto até aqui</h2>
                </div>
                <p>Números que representam participação, não apenas pontos.</p>
            </div>
            <div class="impact-grid">
                ${stats.map((stat, index) => `
                    <article class="impact-card panel">
                        <span class="impact-index">0${index + 1}</span>
                        <strong>${Number(stat[1]) || 0}</strong>
                        <h3>${escapeHtml(stat[0])}</h3>
                        <p>${escapeHtml(stat[2])}</p>
                    </article>
                `).join('')}
            </div>
        </section>

        <div class="progress-dashboard">
            <section class="journey-card panel">
                <div class="section-title-row compact">
                    <div>
                        <span class="section-kicker">Caminho de evolução</span>
                        <h2>Jornada de conquistas</h2>
                    </div>
                    ${nextBadge ? `<span class="next-badge-hint">Próxima: ${escapeHtml(nextBadge.nome)}</span>` : '<span class="next-badge-hint success">Jornada completa</span>'}
                </div>

                <div class="achievement-roadmap">
                    ${definitions.map((badge, index) => {
                        const percent = Math.min(100, badge.progresso / badge.meta * 100);
                        return `
                            <article class="roadmap-item ${badge.desbloqueado ? 'unlocked' : ''} ${badge.id === nextBadge?.id ? 'current' : ''}">
                                <div class="roadmap-marker"><span>${badge.desbloqueado ? escapeHtml(badge.icon) : index + 1}</span></div>
                                <div class="roadmap-content">
                                    <div class="roadmap-heading">
                                        <div>
                                            <h3>${escapeHtml(badge.nome)}</h3>
                                            <p>${escapeHtml(badge.descricao)}</p>
                                        </div>
                                        <span>${badge.desbloqueado ? 'Conquistado' : `${badge.progresso}/${badge.meta}`}</span>
                                    </div>
                                    <div class="bar"><i style="width:${percent}%"></i></div>
                                </div>
                            </article>
                        `;
                    }).join('')}
                </div>
            </section>

            <aside class="progress-sidebar">
                <section class="xp-guide panel">
                    <span class="section-kicker">Cada ação conta</span>
                    <h2>Como ganhar XP</h2>
                    <p>Participe de forma útil e acompanhe os projetos até o resultado.</p>
                    <div class="xp-action-list">
                        ${xpGuide.map(action => `
                            <div class="xp-action">
                                <span class="xp-icon" aria-hidden="true">${action[0]}</span>
                                <div>
                                    <strong>${escapeHtml(action[1])}</strong>
                                    <small>${escapeHtml(action[3])}</small>
                                </div>
                                <b>+${action[2]}</b>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <section class="activity-card panel">
                    <div class="section-title-row compact">
                        <div>
                            <span class="section-kicker">Recente</span>
                            <h2>Sua atividade</h2>
                        </div>
                    </div>
                    <div class="activity-list">
                        ${(progressUser.historico || []).length
                            ? progressUser.historico.slice(0, 5).map(item => `
                                <div class="activity-item">
                                    <span class="activity-dot"></span>
                                    <div>
                                        <strong>${escapeHtml(item.descricao)}</strong>
                                        <small>${escapeHtml(formatDate(item.data, true))}</small>
                                    </div>
                                    ${item.xp ? `<b>+${Number(item.xp)}</b>` : ''}
                                </div>
                            `).join('')
                            : '<div class="empty compact-empty">Suas próximas ações aparecerão aqui.</div>'}
                    </div>
                </section>
            </aside>
        </div>
    `;

    function getNextMission() {
        if (isSchool) {
            if (!userProjects.length) {
                return {
                    title: 'Publique sua primeira iniciativa',
                    description: 'Conte à comunidade o que sua escola precisa para começar a gerar conexões.',
                    action: 'Criar projeto',
                    href: 'adicionar-projeto.html',
                    reward: `+${LearnHubStore.XP.PUBLICAR} XP`
                };
            }

            const activeProject = userProjects.find(project => project.status === 'Em andamento');

            if (activeProject) {
                return {
                    title: `Conclua “${activeProject.titulo}”`,
                    description: 'Registre o resultado do projeto e celebre o impacto construído com a comunidade.',
                    action: 'Atualizar projeto',
                    href: `adicionar-projeto.html?edit=${encodeURIComponent(activeProject.id)}`,
                    reward: `+${LearnHubStore.XP.CONCLUIR_PROJETO} XP`
                };
            }

            return {
                title: 'Compartilhe uma nova necessidade',
                description: 'Publique outra iniciativa da escola e abra espaço para novas conexões.',
                action: 'Criar projeto',
                href: 'adicionar-projeto.html',
                reward: `+${LearnHubStore.XP.PUBLICAR} XP`
            };
        }

        return {
            title: userProjects.length ? 'Encontre sua próxima causa' : 'Apoie seu primeiro projeto',
            description: userProjects.length
                ? 'Conheça outra iniciativa e multiplique o alcance da sua participação.'
                : 'Escolha uma iniciativa alinhada ao que você pode oferecer e converse com a escola.',
            action: 'Explorar projetos',
            href: 'hub.html',
            reward: `+${LearnHubStore.XP.COLABORAR} XP`
        };
    }

    function getLevelMessage() {
        if (info.next === null) {
            return 'Você chegou ao nível máximo. Continue participando para ampliar ainda mais o seu impacto.';
        }

        return isSchool
            ? 'Quanto mais sua escola publica, conecta apoiadores e conclui projetos, mais forte fica sua rede.'
            : 'Cada projeto conhecido e apoiado aproxima uma escola dos recursos de que ela precisa.';
    }
}
