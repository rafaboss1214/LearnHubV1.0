let profileUser = verificarLogin();

if (profileUser) {

    renderNav('perfil');

    let projects =
        LearnHubStore.getProjects();

    let own =
        profileUser.tipo === 'escola'

            ? projects.filter(
                p =>
                    p.escolaId ===
                    profileUser.id
            )

            : projects.filter(
                p =>
                    (
                        profileUser.projetosColaborados || []
                    ).includes(p.id)
            );

    let info =
        LearnHubStore.levelInfo(
            profileUser
        );

    function show() {

        document.getElementById(
            'profile'
        ).innerHTML = `

            <section class="profile-hero panel">

                <div class="avatar">

                    ${
                        profileUser.foto ||
                        profileUser.nome[0]
                            .toUpperCase()
                    }

                </div>

                <div>

                    <h1>
                        ${profileUser.nome}
                    </h1>

                    <p class="muted">

                        ${
                            profileUser.tipo === 'escola'
                                ? 'Escola'
                                : 'Colaborador'
                        }

                        ·

                        ${info.title}

                    </p>

                </div>

                <button
                    class="btn edit-btn"
                    id="edit"
                >
                    Editar perfil
                </button>

            </section>

            <div class="profile-grid">

                <section class="side-card panel">

                    <h2>
                        Informações
                    </h2>

                    <div class="key-value">

                        <small>
                            E-mail
                        </small>

                        ${profileUser.email}

                    </div>

                    <div class="key-value">

                        <small>
                            Tipo de conta
                        </small>

                        ${profileUser.tipo}

                    </div>

                    <div class="key-value">

                        <small>
                            Cadastro
                        </small>

                        ${
                            new Date(
                                profileUser.dataCadastro
                            ).toLocaleDateString(
                                'pt-BR'
                            )
                        }

                    </div>

                    <div class="key-value">

                        <small>
                            Nível e XP
                        </small>

                        Nível ${info.level}
                        ·
                        ${profileUser.xp} XP

                    </div>

                </section>

                <section class="content-card panel">

                    <h2>

                        ${
                            profileUser.tipo === 'escola'
                                ? 'Meus projetos'
                                : 'Projetos que estou apoiando'
                        }

                    </h2>

                    ${
                        own.length

                            ? own.map(
                                p => `

                                    <a
                                        class="list-item"
                                        href="projeto.html?id=${p.id}"
                                    >

                                        <strong>
                                            ${p.titulo}
                                        </strong>

                                        <span class="muted">
                                            ${p.escolaNome}
                                            ·
                                            ${p.status}
                                        </span>

                                    </a>

                                `
                            ).join('')

                            : `

                                <div class="empty">

                                    ${
                                        profileUser.tipo === 'escola'

                                            ? 'Você ainda não publicou nenhum projeto.'

                                            : 'Você ainda não colaborou com nenhum projeto. Explore o Hub e encontre uma iniciativa para apoiar.'
                                    }

                                </div>

                            `
                    }

                </section>

            </div>

        `;

        document.getElementById(
            'edit'
        ).onclick = edit;
    }

    function edit() {

        let n =
            prompt(
                'Nome:',
                profileUser.nome
            );

        if (
            n &&
            n.trim()
        ) {

            profileUser.nome =
                n.trim();

            if (
                profileUser.tipo ===
                'escola'
            ) {

                profileUser.nomeEscola =
                    n.trim();
            }

            LearnHubStore.updateUser(
                profileUser
            );

            toast(
                'Perfil atualizado.'
            );

            show();
        }
    }

    show();
}