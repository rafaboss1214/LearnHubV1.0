let projectUser = verificarLogin();

if (projectUser) {

    renderNav();

    let project = LearnHubStore
        .getProjects()
        .find(
            p =>
                p.id ===
                new URLSearchParams(location.search)
                    .get('id')
        );

    if (!project) {

        location.href = 'hub.html';

    } else {

        let viewed =
            projectUser.projetosVisualizados || [];

        if (
            projectUser.tipo === 'colaborador' &&
            !viewed.includes(project.id)
        ) {

            viewed.push(project.id);

            projectUser.projetosVisualizados =
                viewed;

            project.visualizacoes++;

            LearnHubStore.addXP(
                projectUser,
                LearnHubStore.XP.VISUALIZAR,
                `Você visualizou o projeto ${project.titulo}.`
            );

            LearnHubStore.updateUser(
                projectUser
            );

            LearnHubStore.updateProject(
                project
            );
        }

        let joined =
            (projectUser.projetosColaborados || [])
                .includes(project.id);

        document.getElementById(
            'detail'
        ).innerHTML = `

            <div class="project-banner">
                ${project.imagem || '✨'}
            </div>

            <article class="detail-card panel">

                <div class="detail-head">

                    <div>

                        <span class="badge status-${project.status
                            .toLowerCase()
                            .replaceAll(' ', '-')}">
                            ${project.status}
                        </span>

                        <h1>
                            ${project.titulo}
                        </h1>

                        <p>
                            Por
                            <strong>
                                ${project.escolaNome}
                            </strong>
                        </p>

                    </div>

                    <span class="badge">
                        ${project.categoria}
                    </span>

                </div>

                <p>
                    ${project.descricao}
                </p>

                <div class="info-grid">

                    <div class="info">

                        <small>
                            Objetivo
                        </small>

                        ${project.objetivo}

                    </div>

                    <div class="info">

                        <small>
                            Recursos necessários
                        </small>

                        ${project.recursos}

                    </div>

                    <div class="info">

                        <small>
                            Colaboradores
                        </small>

                        🤝 ${project.colaboradores.length}

                    </div>

                    <div class="info">

                        <small>
                            Visualizações
                        </small>

                        👁 ${project.visualizacoes}

                    </div>

                </div>

                ${
                    projectUser.tipo === 'colaborador'

                        ? `
                            <button
                                id="join"
                                class="btn btn-primary collaborate"
                                ${joined ? 'disabled' : ''}
                            >
                                ${
                                    joined
                                        ? 'Você já colabora com este projeto'
                                        : 'Quero colaborar'
                                }
                            </button>
                        `

                        : `
                            <p class="muted">
                                Você está visualizando este projeto como escola.
                            </p>
                        `
                }

            </article>
        `;

        let b =
            document.getElementById('join');

        if (b) {

            b.onclick = () => {

                if (
                    (projectUser.projetosColaborados || [])
                        .includes(project.id)
                ) {

                    return toast(
                        'Você já colabora com este projeto.',
                        true
                    );
                }

                project.colaboradores.push(
                    projectUser.id
                );

                projectUser.projetosColaborados.push(
                    project.id
                );

                LearnHubStore.addXP(
                    projectUser,
                    LearnHubStore.XP.COLABORAR,
                    `Você colaborou com o projeto ${project.titulo}.`
                );

                let school =
                    LearnHubStore
                        .getUsers()
                        .find(
                            u =>
                                u.id ===
                                project.escolaId
                        );

                if (
                    school &&
                    !school.colaboradores.includes(
                        projectUser.id
                    )
                ) {

                    school.colaboradores.push(
                        projectUser.id
                    );

                    LearnHubStore.updateUser(
                        school
                    );
                }

                let items =
                    LearnHubStore.checkAchievements(
                        projectUser
                    );

                LearnHubStore.updateUser(
                    projectUser
                );

                LearnHubStore.updateProject(
                    project
                );

                toast(
                    'Colaboração registrada! +10 XP'
                );

                b.textContent =
                    'Você já colabora com este projeto';

                b.disabled = true;

                showAchievements(
                    items
                );
            };
        }
    }
}