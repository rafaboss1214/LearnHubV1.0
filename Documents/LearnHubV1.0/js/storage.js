const LearnHubStore = (() => {

    const K = {
        users: 'learnhub_usuarios',
        projects: 'learnhub_projetos',
        session: 'usuarioLogado',
        seed: 'learnhub_inicializado',
        schema: 'learnhub_schema_version'
    };

    const XP_ACTIONS = {
        CREATE_ACCOUNT: 10,
        VIEW_PROJECT: 1,
        COLLABORATE_PROJECT: 10,
        COMMENT_PROJECT: 3,
        COMPLETE_COLLABORATION: 20,
        PUBLISH_PROJECT: 10,
        COMPLETE_PROJECT: 30,
        UNLOCK_BADGE: 5
    };

    const XP = {
        CONTA: XP_ACTIONS.CREATE_ACCOUNT,
        VISUALIZAR: XP_ACTIONS.VIEW_PROJECT,
        COLABORAR: XP_ACTIONS.COLLABORATE_PROJECT,
        COMENTAR: XP_ACTIONS.COMMENT_PROJECT,
        CONCLUIR_COLABORACAO:
            XP_ACTIONS.COMPLETE_COLLABORATION,
        PUBLICAR: XP_ACTIONS.PUBLISH_PROJECT,
        CONCLUIR_PROJETO: XP_ACTIONS.COMPLETE_PROJECT,
        EMBLEMA: XP_ACTIONS.UNLOCK_BADGE
    };

    const LEVELS = [
        0,
        50,
        100,
        200,
        350,
        500,
        700
    ];

    const COLLABORATOR_TITLES = [
        'Novo Colaborador',
        'Colaborador',
        'Colaborador Ativo',
        'Agente da Mudança',
        'Impacto Social',
        'Embaixador da Educação',
        'Agente de Transformação'
    ];

    const SCHOOL_TITLES = [
        'Escola Iniciante',
        'Escola Participativa',
        'Escola Conectada',
        'Escola Inovadora',
        'Escola Transformadora',
        'Escola Referência',
        'Referência Educacional'
    ];

    function read(key, fallback = []) {

        try {

            const value = localStorage.getItem(key);

            return value
                ? JSON.parse(value)
                : fallback;

        } catch (error) {

            console.warn(
                `Não foi possível ler ${key}.`,
                error
            );

            return fallback;
        }
    }

    function write(key, value) {

        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    }

    function id(prefix) {

        return `${prefix}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2, 7)}`;
    }

    function unique(values) {

        return [
            ...new Set(
                Array.isArray(values)
                    ? values.filter(Boolean)
                    : []
            )
        ];
    }

    function normalizeComment(comment) {

        return {
            ...comment,
            id: comment.id || id('comment'),
            usuarioId:
                comment.usuarioId ||
                comment.userId ||
                '',
            nome:
                comment.nome ||
                comment.usuarioNome ||
                'Usuário LearnHub',
            foto: comment.foto || null,
            texto: String(comment.texto || '').trim(),
            data:
                comment.data ||
                new Date().toISOString()
        };
    }

    function normalizeMessage(message) {

        return {
            ...message,
            id: message.id || id('message'),
            remetenteId: message.remetenteId || message.senderId || '',
            destinatarioId: message.destinatarioId || message.recipientId || '',
            texto: String(message.texto || message.message || '').trim(),
            data: message.data || new Date().toISOString()
        };
    }

    function normalizeProject(project) {

        const image =
            project.banner ||
            project.imagem ||
            '';

        return {
            ...project,
            id: project.id || id('project'),
            titulo: String(project.titulo || 'Projeto sem título'),
            escolaId: project.escolaId || '',
            escolaNome:
                project.escolaNome ||
                'Escola LearnHub',
            descricao: String(project.descricao || ''),
            objetivo: String(project.objetivo || ''),
            categoria: project.categoria || 'Outro',
            recursos:
                project.recursos ||
                project.necessidades ||
                '',
            necessidades:
                project.necessidades ||
                project.recursos ||
                '',
            imagem: image,
            banner: image,
            status: project.status || 'Planejamento',
            colaboradores: unique(project.colaboradores),
            visualizacoes: Number(project.visualizacoes) || 0,
            comentarios: Array.isArray(project.comentarios)
                ? project.comentarios
                    .map(normalizeComment)
                    .filter(comment => comment.texto)
                : [],
            mensagens: Array.isArray(project.mensagens)
                ? project.mensagens
                    .map(normalizeMessage)
                    .filter(message =>
                        message.texto &&
                        message.remetenteId &&
                        message.destinatarioId
                    )
                : [],
            dataCriacao:
                project.dataCriacao ||
                new Date().toISOString(),
            dataAtualizacao:
                project.dataAtualizacao ||
                project.dataCriacao ||
                new Date().toISOString(),
            conclusaoRecompensada:
                Boolean(project.conclusaoRecompensada)
        };
    }

    function normalizeUser(user) {

        const normalized = {
            ...user,
            id: user.id || id('user'),
            nome: user.nome || 'Usuário LearnHub',
            email: String(user.email || '').toLowerCase(),
            senha: user.senha || '',
            tipo: user.tipo || 'colaborador',
            foto: user.foto || null,
            descricao: user.descricao || '',
            xp: Number(user.xp) || 0,
            nivel: calculateLevel(Number(user.xp) || 0),
            emblemas: Array.isArray(user.emblemas)
                ? user.emblemas
                : [],
            historico: Array.isArray(user.historico)
                ? user.historico
                : [],
            recompensasRegistradas: unique(
                user.recompensasRegistradas
            ),
            comentarios: unique(user.comentarios),
            dataCadastro:
                user.dataCadastro ||
                new Date().toISOString()
        };

        if (normalized.tipo === 'escola') {

            normalized.nomeEscola =
                user.nomeEscola ||
                normalized.nome;

            normalized.endereco = user.endereco || '';
            normalized.cidade = user.cidade || '';
            normalized.estado = user.estado || '';
            normalized.projetos = unique(user.projetos);
            normalized.colaboradores = unique(user.colaboradores);
            normalized.projetosConcluidos = unique(
                user.projetosConcluidos
            );

        } else if (
            normalized.tipo === 'admin' ||
            normalized.tipo === 'administrador'
        ) {

            normalized.projetos = unique(user.projetos);

        } else {

            normalized.tipo = 'colaborador';
            normalized.projetosColaborados = unique(
                user.projetosColaborados
            );
            normalized.projetosConcluidos = unique(
                user.projetosConcluidos
            );
            normalized.projetosVisualizados = unique(
                user.projetosVisualizados
            );
        }

        return normalized;
    }

    function getUsers() {

        const users = read(K.users);

        return Array.isArray(users)
            ? users.map(normalizeUser)
            : [];
    }

    function saveUsers(users) {

        write(
            K.users,
            users.map(normalizeUser)
        );
    }

    function getProjects() {

        const projects = read(K.projects);

        return Array.isArray(projects)
            ? projects.map(normalizeProject)
            : [];
    }

    function saveProjects(projects) {

        write(
            K.projects,
            projects.map(normalizeProject)
        );
    }

    function calculateLevel(xp) {

        let level = 1;

        LEVELS.forEach((minimum, index) => {

            if (xp >= minimum) {
                level = index + 1;
            }
        });

        return level;
    }

    function levelInfo(user) {

        const xp = Number(user.xp) || 0;
        const level = calculateLevel(xp);
        const next = LEVELS[level] ?? null;
        const start = LEVELS[level - 1];
        const titles =
            user.tipo === 'escola'
                ? SCHOOL_TITLES
                : COLLABORATOR_TITLES;

        return {
            level,
            title:
                titles[level - 1] ||
                titles[titles.length - 1],
            nextTitle:
                next === null
                    ? null
                    : titles[level] || titles[titles.length - 1],
            next,
            start,
            remaining:
                next === null
                    ? 0
                    : Math.max(0, next - xp),
            percent:
                next === null
                    ? 100
                    : Math.min(
                        100,
                        Math.max(
                            0,
                            ((xp - start) / (next - start)) * 100
                        )
                    )
        };
    }

    function levelRoadmap(user) {

        const xp = Number(user.xp) || 0;
        const titles =
            user.tipo === 'escola'
                ? SCHOOL_TITLES
                : COLLABORATOR_TITLES;

        return LEVELS.map((minimum, index) => ({
            level: index + 1,
            title: titles[index] || titles[titles.length - 1],
            minimum,
            unlocked: xp >= minimum,
            current: calculateLevel(xp) === index + 1
        }));
    }

    function getLoggedUser() {

        const sessionId = localStorage.getItem(K.session);

        if (!sessionId) {
            return null;
        }

        return getUsers().find(
            user => user.id === sessionId
        ) || null;
    }

    function setLoggedUser(userId) {

        localStorage.setItem(K.session, userId);
    }

    function logout() {

        localStorage.removeItem(K.session);
    }

    function updateUser(user) {

        const normalized = normalizeUser(user);
        const users = getUsers();
        const index = users.findIndex(
            item => item.id === normalized.id
        );

        if (index >= 0) {
            users[index] = normalized;
        } else {
            users.push(normalized);
        }

        saveUsers(users);

        return normalized;
    }

    function updateProject(project) {

        const normalized = normalizeProject(project);
        const projects = getProjects();
        const index = projects.findIndex(
            item => item.id === normalized.id
        );

        if (index >= 0) {
            projects[index] = normalized;
        } else {
            projects.push(normalized);
        }

        saveProjects(projects);

        return normalized;
    }

    function sendProjectMessage(projectId, senderId, recipientId, text) {

        const body = String(text || '').trim();
        const projects = getProjects();
        const project = projects.find(item => item.id === projectId);

        if (!project || !body || senderId === recipientId) {
            return null;
        }

        const participants = [project.escolaId, ...project.colaboradores];

        if (
            !participants.includes(senderId) ||
            !participants.includes(recipientId) ||
            ![senderId, recipientId].includes(project.escolaId)
        ) {
            return null;
        }

        const message = normalizeMessage({
            remetenteId: senderId,
            destinatarioId: recipientId,
            texto: body
        });

        project.mensagens.push(message);
        updateProject(project);

        return message;
    }

    function removeProject(projectId) {
        const allProjects = getProjects();
        const exists = allProjects.some(project => project.id === projectId);

        if (!exists) {
            return false;
        }

        const projects = allProjects.filter(
            project => project.id !== projectId
        );

        const users = getUsers().map(user => {

            if (user.tipo === 'escola') {

                user.projetos = user.projetos.filter(
                    id => id !== projectId
                );

                user.projetosConcluidos =
                    user.projetosConcluidos.filter(
                        id => id !== projectId
                    );

            } else if (user.tipo === 'colaborador') {

                user.projetosColaborados =
                    user.projetosColaborados.filter(
                        id => id !== projectId
                    );

                user.projetosConcluidos =
                    user.projetosConcluidos.filter(
                        id => id !== projectId
                    );

                user.projetosVisualizados =
                    user.projetosVisualizados.filter(
                        id => id !== projectId
                    );
            }

            return user;
        });

        users
            .filter(user => user.tipo === 'escola')
            .forEach(school => {
                school.colaboradores = unique(
                    projects
                        .filter(project => project.escolaId === school.id)
                        .flatMap(project => project.colaboradores)
                );
            });

        saveProjects(projects);
        saveUsers(users);

        return true;
    }

    function history(
        user,
        description,
        xp = 0,
        type = 'atividade'
    ) {

        user.historico = user.historico || [];

        user.historico.unshift({
            id: id('activity'),
            descricao: description,
            xp,
            tipo: type,
            data: new Date().toISOString()
        });

        user.historico = user.historico.slice(0, 60);
    }

    function addXP(user, amount, description) {

        const before = calculateLevel(user.xp || 0);

        user.xp = (user.xp || 0) + amount;

        history(
            user,
            description,
            amount,
            'xp'
        );

        const after = calculateLevel(user.xp);

        if (after > before) {

            history(
                user,
                `Você alcançou o nível ${after}.`,
                0,
                'nivel'
            );
        }

        user.nivel = after;

        return {
            before,
            after,
            leveledUp: after > before
        };
    }

    function addXp(userId, amount, description) {

        const user = getUsers().find(
            item => item.id === userId
        );

        if (!user) {
            return null;
        }

        addXP(
            user,
            amount,
            description || `Você ganhou ${amount} XP.`
        );

        updateUser(user);

        return user;
    }

    function registerActivity(
        user,
        action,
        description,
        uniqueKey = ''
    ) {

        user.recompensasRegistradas =
            user.recompensasRegistradas || [];

        if (
            uniqueKey &&
            user.recompensasRegistradas.includes(uniqueKey)
        ) {
            return {
                awarded: false,
                amount: 0,
                leveledUp: false
            };
        }

        const amount = XP_ACTIONS[action] || 0;

        if (uniqueKey) {
            user.recompensasRegistradas.push(uniqueKey);
        }

        if (amount > 0) {

            const result = addXP(
                user,
                amount,
                description
            );

            return {
                awarded: true,
                amount,
                leveledUp: result.leveledUp
            };
        }

        history(user, description);

        return {
            awarded: false,
            amount: 0,
            leveledUp: false
        };
    }

    function getBadgeDefinitions(user) {

        const firstSteps = {
            id: 'primeiros-passos',
            icon: '✨',
            nome: 'Primeiros Passos',
            descricao: 'Criou sua conta na LearnHub.',
            meta: 1,
            progress: item => item.dataCadastro ? 1 : 0
        };

        if (user.tipo === 'escola') {

            return [
                firstSteps,
                {
                    id: 'escola-ativa',
                    icon: '🏫',
                    nome: 'Escola Ativa',
                    descricao: 'Publicou seu primeiro projeto.',
                    meta: 1,
                    progress: item =>
                        (item.projetos || []).length
                },
                {
                    id: 'transformando-ideias',
                    icon: '🌱',
                    nome: 'Transformando Ideias',
                    descricao: 'Concluiu seu primeiro projeto.',
                    meta: 1,
                    progress: item =>
                        (item.projetosConcluidos || []).length
                },
                {
                    id: 'escola-destaque',
                    icon: '⭐',
                    nome: 'Escola Destaque',
                    descricao: 'Concluiu três projetos.',
                    meta: 3,
                    progress: item =>
                        (item.projetosConcluidos || []).length
                },
                {
                    id: 'comunidade-conectada',
                    icon: '🤝',
                    nome: 'Comunidade Conectada',
                    descricao: 'Recebeu apoio de cinco colaboradores.',
                    meta: 5,
                    progress: item =>
                        (item.colaboradores || []).length
                },
                {
                    id: 'referencia-educacional',
                    icon: '🏆',
                    nome: 'Referência Educacional',
                    descricao: 'Alcançou 500 XP.',
                    meta: 500,
                    progress: item => item.xp || 0
                }
            ];
        }

        return [
            firstSteps,
            {
                id: 'primeira-ajuda',
                icon: '🤝',
                nome: 'Primeira Ajuda',
                descricao: 'Colaborou pela primeira vez.',
                meta: 1,
                progress: item =>
                    (item.projetosColaborados || []).length
            },
            {
                id: 'participante-ativo',
                icon: '🌟',
                nome: 'Participante Ativo',
                descricao: 'Colaborou em três projetos.',
                meta: 3,
                progress: item =>
                    (item.projetosColaborados || []).length
            },
            {
                id: 'parceiro-educacao',
                icon: '💜',
                nome: 'Parceiro da Educação',
                descricao: 'Colaborou em cinco projetos.',
                meta: 5,
                progress: item =>
                    (item.projetosColaborados || []).length
            },
            {
                id: 'voz-comunidade',
                icon: '💬',
                nome: 'Voz da Comunidade',
                descricao: 'Publicou cinco comentários.',
                meta: 5,
                progress: item =>
                    (item.comentarios || []).length
            },
            {
                id: 'apoiador-frequente',
                icon: '🙌',
                nome: 'Apoiador Frequente',
                descricao: 'Participou de dez projetos.',
                meta: 10,
                progress: item =>
                    (item.projetosColaborados || []).length
            },
            {
                id: 'embaixador-educacao',
                icon: '🏆',
                nome: 'Embaixador da Educação',
                descricao: 'Alcançou 500 XP.',
                meta: 500,
                progress: item => item.xp || 0
            }
        ];
    }

    function badgesFor(user) {

        const unlockedIds = new Set(
            (user.emblemas || []).map(badge => badge.id)
        );

        return getBadgeDefinitions(user).map(definition => ({
            id: definition.id,
            icon: definition.icon,
            nome: definition.nome,
            descricao: definition.descricao,
            meta: definition.meta,
            progresso: Math.min(
                definition.meta,
                Math.max(0, definition.progress(user))
            ),
            desbloqueado: unlockedIds.has(definition.id)
        }));
    }

    function checkAchievements(user) {

        const unlocked = [];

        user.emblemas = user.emblemas || [];

        getBadgeDefinitions(user).forEach(definition => {

            const alreadyUnlocked = user.emblemas.some(
                badge => badge.id === definition.id
            );

            if (
                definition.progress(user) >= definition.meta &&
                !alreadyUnlocked
            ) {

                const badge = {
                    id: definition.id,
                    icon: definition.icon,
                    nome: definition.nome,
                    descricao: definition.descricao,
                    xp: XP_ACTIONS.UNLOCK_BADGE,
                    desbloqueado: true,
                    data: new Date().toISOString()
                };

                user.emblemas.push(badge);

                registerActivity(
                    user,
                    'UNLOCK_BADGE',
                    `Você desbloqueou o emblema ${definition.nome}.`,
                    `badge:${definition.id}`
                );

                unlocked.push(badge);
            }
        });

        return unlocked;
    }

    function checkBadges(userId) {

        const user = getUsers().find(
            item => item.id === userId
        );

        if (!user) {
            return [];
        }

        const badges = checkAchievements(user);

        updateUser(user);

        return badges;
    }

    function synchronizeRelations(users, projects) {

        const userMap = new Map(
            users.map(user => [user.id, user])
        );

        projects.forEach(project => {

            const school = userMap.get(project.escolaId);

            if (school && school.tipo === 'escola') {

                school.projetos = unique([
                    ...school.projetos,
                    project.id
                ]);

                if (project.status === 'Concluído') {

                    school.projetosConcluidos = unique([
                        ...school.projetosConcluidos,
                        project.id
                    ]);
                }
            }

            project.colaboradores.forEach(userId => {

                const collaborator = userMap.get(userId);

                if (
                    collaborator &&
                    collaborator.tipo === 'colaborador'
                ) {

                    collaborator.projetosColaborados = unique([
                        ...collaborator.projetosColaborados,
                        project.id
                    ]);
                }

                if (school && school.tipo === 'escola') {

                    school.colaboradores = unique([
                        ...school.colaboradores,
                        userId
                    ]);
                }
            });
        });
    }

    function createInitialData() {

        const school = normalizeUser({
            id: 'escola-demo',
            nome: 'Escola Comunidade Viva',
            email: 'escola@learnhub.demo',
            senha: 'learnhub123',
            tipo: 'escola',
            nomeEscola: 'Escola Comunidade Viva',
            endereco: 'Rua da Educação, 100',
            cidade: 'São Paulo',
            estado: 'SP',
            descricao:
                'Escola pública comprometida com projetos colaborativos e aprendizagem ativa.',
            dataCadastro: new Date().toISOString()
        });

        const data = [
            [
                'Horta Escolar',
                'Uma horta colaborativa para aproximar estudantes da alimentação saudável.',
                'Criar um espaço verde de aprendizagem.',
                'Sustentabilidade',
                'Sementes, ferramentas, irrigação e apoio técnico.',
                'Em andamento',
                '🌱'
            ],
            [
                'Biblioteca Comunitária',
                'Renovação do acervo e criação de um canto de leitura acolhedor.',
                'Ampliar o acesso à leitura.',
                'Leitura',
                'Livros, estantes, almofadas e voluntários para mediação.',
                'Planejamento',
                '📚'
            ],
            [
                'Laboratório de Ciências',
                'Experiências práticas que tornam a ciência mais próxima dos estudantes.',
                'Montar um laboratório acessível.',
                'Ciência',
                'Microscópios, kits experimentais e conhecimento técnico.',
                'Em andamento',
                '🔬'
            ],
            [
                'Projeto de Robótica',
                'Oficinas de robótica e programação para jovens criadores.',
                'Ensinar tecnologia por meio da prática.',
                'Tecnologia',
                'Kits de robótica, notebooks e mentoria voluntária.',
                'Em andamento',
                '🤖'
            ],
            [
                'Espaço de Leitura',
                'Um lugar calmo para descobrir novas histórias todos os dias.',
                'Fortalecer uma cultura de leitura.',
                'Leitura',
                'Livros e mobiliário.',
                'Concluído',
                '📖'
            ]
        ];

        const projects = data.map((item, index) =>
            normalizeProject({
                id: `demo-${index}`,
                titulo: item[0],
                escolaId: school.id,
                escolaNome: school.nome,
                descricao: item[1],
                objetivo: item[2],
                categoria: item[3],
                recursos: item[4],
                imagem: item[6],
                status: item[5],
                dataCriacao: new Date().toISOString()
            })
        );

        synchronizeRelations([school], projects);

        return {
            users: [school],
            projects
        };
    }

    function seed() {

        let users = getUsers();
        let projects = getProjects();

        const initialized = localStorage.getItem(K.seed);

        if (
            !initialized &&
            users.length === 0 &&
            projects.length === 0
        ) {

            const initialData = createInitialData();

            users = initialData.users;
            projects = initialData.projects;
        }

        synchronizeRelations(users, projects);

        saveUsers(users);
        saveProjects(projects);

        localStorage.setItem(K.seed, 'true');
        localStorage.setItem(K.schema, '2');
    }

    return {
        XP,
        XP_ACTIONS,
        id,
        getUsers,
        saveUsers,
        getProjects,
        saveProjects,
        getLoggedUser,
        setLoggedUser,
        logout,
        updateUser,
        updateProject,
        sendProjectMessage,
        removeProject,
        history,
        addXP,
        addXp,
        registerActivity,
        calculateLevel,
        levelInfo,
        levelRoadmap,
        badgesFor,
        checkAchievements,
        checkBadges,
        normalizeUser,
        normalizeProject,
        seed
    };

})();

LearnHubStore.seed();
