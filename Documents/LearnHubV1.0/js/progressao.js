let progressUser = verificarLogin();

if (progressUser) {

    renderNav('progressao');

    let info =
        LearnHubStore.levelInfo(
            progressUser
        );

    let isSchool =
        progressUser.tipo === 'escola';

    let projects =
        LearnHubStore.getProjects();

    let stats = isSchool

        ? [
            [
                'Projetos publicados',
                (progressUser.projetos || []).length
            ],

            [
                'Em andamento',
                projects.filter(
                    p =>
                        p.escolaId ===
                            progressUser.id &&
                        p.status ===
                            'Em andamento'
                ).length
            ],

            [
                'Concluídos',
                (progressUser.projetosConcluidos || [])
                    .length
            ],

            [
                'Colaboradores',
                (progressUser.colaboradores || [])
                    .length
            ],

            [
                'XP total',
                progressUser.xp
            ]
        ]

        : [
            [
                'Projetos colaborados',
                (progressUser.projetosColaborados || [])
                    .length
            ],

            [
                'Projetos concluídos',
                (progressUser.projetosConcluidos || [])
                    .length
            ],

            [
                'Projetos visualizados',
                (progressUser.projetosVisualizados || [])
                    .length
            ],

            [
                'XP total',
                progressUser.xp
            ]
        ];

    let definitions =
        LearnHubStore.badgesFor(
            progressUser
        );

    let metric = b =>

        b[0] === 'maximo' ||
        b[0] === 'referencia'

            ? progressUser.xp

            : isSchool

                ? b[0] === 'comunidade' ||
                  b[0] === 'impacto-escola'

                    ? (
                        progressUser.colaboradores || []
                    ).length

                    : b[0] === 'transformadora'

                        ? (
                            progressUser.projetosConcluidos || []
                        ).length

                        : (
                            progressUser.projetos || []
                        ).length

                : (
                    progressUser.projetosColaborados || []
                ).length;

    let req = b =>

        b[0] === 'maximo' ||
        b[0] === 'referencia'

            ? 500

            : b[0] === 'primeiro-passo' ||
              b[0] === 'primeiro-projeto'

                ? 1

                : b[0] === 'mao-amiga' ||
                  b[0] === 'escola-ativa'

                    ? 5

                    : b[0] === 'ativo' ||
                      b[0] === 'comunidade'

                        ? 10

                        : b[0] === 'apoio'

                            ? 15

                            : b[0] === 'mudanca' ||
                              b[0] === 'impacto-escola'

                                ? 25

                                : b[0] === 'transformadora'

                                    ? 5

                                    : 500;

    document.getElementById(
        'progress'
    ).innerHTML = `

        <h1 class="page-title">
            Minha Progressão
        </h1>

        <p class="muted">
            Cada ação fortalece uma educação mais colaborativa.
        </p>

        <section class="level-card panel">

            <small class="muted">
                NÍVEL ${info.level}
            </small>

            <h2>
                ${info.title}
            </h2>

            <strong>
                ${progressUser.xp} XP
            </strong>

            <div class="bar">

                <i
                    style="width:${info.percent}%"
                ></i>

            </div>

            <span class="muted">

                ${
                    info.next === null

                        ? 'Você alcançou o nível máximo!'

                        : `${progressUser.xp} / ${info.next} XP · Faltam ${info.remaining} XP para o próximo nível.`
                }

            </span>

        </section>

        <div class="progress-grid">

            <section class="side-card panel">

                <h2>
                    Meu impacto
                </h2>

                <div class="stat-grid">

                    ${stats.map(
                        s => `

                            <div class="stat">

                                <small class="muted">
                                    ${s[0]}
                                </small>

                                <b>
                                    ${s[1]}
                                </b>

                            </div>

                        `
                    ).join('')}

                </div>

                <h2>
                    Próximas conquistas
                </h2>

                ${
                    definitions
                        .filter(
                            b =>
                                !progressUser.emblemas
                                    .some(
                                        x =>
                                            x.id === b[0]
                                    )
                        )
                        .slice(0, 3)
                        .map(
                            b => {

                                let v =
                                    metric(b);

                                let r =
                                    req(b);

                                return `

                                    <div class="objective">

                                        <strong>
                                            ${b[1]} ${b[2]}
                                        </strong>

                                        <small class="muted">
                                            ${Math.min(v, r)}/${r}
                                            ·
                                            ${b[3]}
                                        </small>

                                        <div class="bar">

                                            <i
                                                style="width:${Math.min(
                                                    100,
                                                    v / r * 100
                                                )}%"
                                            ></i>

                                        </div>

                                    </div>

                                `;
                            }
                        )
                        .join('')

                    ||

                    '<p class="muted">Todas as conquistas foram desbloqueadas!</p>'
                }

            </section>

            <section class="content-card panel">

                <h2>
                    Meus Emblemas
                </h2>

                <div class="badge-grid">

                    ${definitions.map(
                        b => {

                            let unlocked =
                                progressUser.emblemas
                                    .find(
                                        x =>
                                            x.id === b[0]
                                    );

                            return `

                                <div
                                    class="badge-card ${
                                        unlocked
                                            ? ''
                                            : 'locked'
                                    }"
                                >

                                    <div class="icon">

                                        ${
                                            unlocked
                                                ? b[1]
                                                : '🔒'
                                        }

                                    </div>

                                    <strong>
                                        ${b[2]}
                                    </strong>

                                    <small class="muted">

                                        ${
                                            unlocked
                                                ? 'Desbloqueado'
                                                : b[3]
                                        }

                                    </small>

                                </div>

                            `;
                        }
                    ).join('')}

                </div>

                <h2>
                    Histórico de atividades
                </h2>

                ${
                    (progressUser.historico || [])
                        .length

                        ? progressUser.historico
                            .slice(0, 10)
                            .map(
                                h => `

                                    <div class="list-item">

                                        <strong>
                                            ${h.descricao}
                                        </strong>

                                        <span class="muted">
                                            ${new Date(
                                                h.data
                                            ).toLocaleString(
                                                'pt-BR'
                                            )}
                                        </span>

                                        ${
                                            h.xp
                                                ? `
                                                    <span class="history-xp">
                                                        +${h.xp} XP
                                                    </span>
                                                `
                                                : ''
                                        }

                                    </div>

                                `
                            )
                            .join('')

                        : `
                            <div class="empty">
                                Suas atividades aparecerão aqui.
                            </div>
                        `
                }

            </section>

        </div>

    `;
}