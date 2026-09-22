function verificarLogin() {

    const user = LearnHubStore.getLoggedUser();

    if (!user) {

        location.href = 'login.html';

        return null;
    }

    const unlocked = LearnHubStore.checkAchievements(user);

    if (unlocked.length) {
        LearnHubStore.updateUser(user);
    }

    return user;
}

function obterUsuarioLogado() {

    return LearnHubStore.getLoggedUser();
}

function fazerLogin(email, senha) {

    const normalizedEmail = email.trim().toLowerCase();

    const user = LearnHubStore
        .getUsers()
        .find(item =>
            item.email.toLowerCase() === normalizedEmail &&
            item.senha === senha
        );

    if (user) {

        LearnHubStore.setLoggedUser(user.id);

        const unlocked = LearnHubStore.checkAchievements(user);

        if (unlocked.length) {
            LearnHubStore.updateUser(user);
        }
    }

    return user;
}

function fazerLogout() {

    LearnHubStore.logout();

    location.href = 'login.html';
}

function atualizarUsuario(user) {

    return LearnHubStore.updateUser(user);
}

function isAdmin(user) {

    return Boolean(
        user &&
        (
            user.tipo === 'admin' ||
            user.tipo === 'administrador'
        )
    );
}

function canManageProject(user, project) {

    if (!user || !project) {
        return false;
    }

    return (
        user.id === project.escolaId ||
        isAdmin(user)
    );
}

function escapeHtml(value) {

    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function slugify(value) {

    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function isSafeImageSource(value) {

    const source = String(value || '').trim();

    if (!source) {
        return false;
    }

    return /^(https?:\/\/|data:image\/|\.\.\/|\.\/|assets\/|images\/)/i
        .test(source);
}

function renderProjectMedia(project, altText = '') {

    const source =
        project.banner ||
        project.imagem ||
        '';

    if (isSafeImageSource(source)) {

        return `
            <img
                src="${escapeHtml(source)}"
                alt="${escapeHtml(altText || project.titulo)}"
                loading="lazy"
            >
        `;
    }

    return `
        <span class="cover-symbol" aria-hidden="true">
            ${escapeHtml(source || '✨')}
        </span>
    `;
}

function renderAvatar(user, className = 'avatar') {

    const name = user.nome || 'Usuário LearnHub';

    if (isSafeImageSource(user.foto)) {

        return `
            <span class="${escapeHtml(className)} avatar-image">
                <img
                    src="${escapeHtml(user.foto)}"
                    alt="Foto de ${escapeHtml(name)}"
                    loading="lazy"
                >
            </span>
        `;
    }

    return `
        <span
            class="${escapeHtml(className)}"
            aria-hidden="true"
        >
            ${escapeHtml(name.charAt(0).toUpperCase())}
        </span>
    `;
}

function formatDate(value, includeTime = false) {

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Data não informada';
    }

    return includeTime
        ? date.toLocaleString('pt-BR')
        : date.toLocaleDateString('pt-BR');
}

function toast(message, error = false) {

    const element = document.createElement('div');

    element.className = `toast ${error ? 'error' : ''}`;
    element.setAttribute('role', error ? 'alert' : 'status');
    element.textContent = message;

    document.body.append(element);

    setTimeout(
        () => element.remove(),
        3400
    );
}

function renderNav(active = '') {

    const user = obterUsuarioLogado();

    if (!user) {
        return;
    }

    const firstName = escapeHtml(
        user.nome.split(' ')[0]
    );

    document
        .querySelectorAll('[data-nav]')
        .forEach(element => {

            element.innerHTML = `
                <header class="app-header">
                    <nav
                        class="nav container"
                        aria-label="Navegação principal"
                    >
                        <a class="brand" href="index.html">
                            LearnHub
                        </a>

                        <div class="nav-links">
                            <a
                                class="${active === 'home' ? 'active' : ''}"
                                href="index.html"
                            >
                                Início
                            </a>

                            <a
                                class="${active === 'hub' ? 'active' : ''}"
                                href="hub.html"
                            >
                                Projetos
                            </a>

                            <a
                                class="${active === 'progressao' ? 'active' : ''}"
                                href="progressao.html"
                            >
                                Progressão
                            </a>

                            <a
                                class="${active === 'perfil' ? 'active' : ''}"
                                href="perfil.html"
                            >
                                Perfil
                            </a>
                        </div>

                        <div class="nav-actions">
                            ${
                                user.tipo === 'escola'
                                    ? `
                                        <a
                                            class="btn btn-primary nav-create"
                                            href="adicionar-projeto.html"
                                        >
                                            Novo projeto
                                        </a>
                                    `
                                    : ''
                            }

                            <button
                                class="theme-toggle"
                                type="button"
                                data-theme-toggle
                            ></button>

                            <span class="user-name muted">
                                Olá, ${firstName}
                            </span>

                            <button
                                class="btn btn-compact"
                                type="button"
                                onclick="fazerLogout()"
                            >
                                Sair
                            </button>

                            <button
                                class="nav-toggle"
                                type="button"
                                aria-label="Abrir menu"
                                aria-expanded="false"
                            >
                                <span aria-hidden="true">☰</span>
                            </button>
                        </div>
                    </nav>
                </header>
            `;
        });

    if (window.LearnHubTheme) {
        window.LearnHubTheme.bindThemeButtons();
    }

    document.querySelectorAll('.app-header').forEach(header => {
        const toggle = header.querySelector('.nav-toggle');
        const links = header.querySelector('.nav-links');

        if (!toggle || !links) {
            return;
        }

        toggle.addEventListener('click', () => {
            const isOpen = links.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
            toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
            toggle.querySelector('span').textContent = isOpen ? '×' : '☰';
        });
    });
}

function showAchievements(items) {

    items.forEach((badge, index) => {

        setTimeout(() => {

            const modal = document.createElement('div');

            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute(
                'aria-label',
                'Nova conquista desbloqueada'
            );

            modal.innerHTML = `
                <div class="achievement panel">
                    <div class="emoji" aria-hidden="true">
                        ${escapeHtml(badge.icon)}
                    </div>

                    <h2>Nova conquista</h2>

                    <p>
                        Você desbloqueou
                        <strong>${escapeHtml(badge.nome)}</strong>.
                    </p>

                    <span class="badge badge-xp">
                        +${badge.xp} XP
                    </span>

                    <button class="btn btn-primary" type="button">
                        Continuar
                    </button>
                </div>
            `;

            const button = modal.querySelector('button');

            button.onclick = () => modal.remove();

            document.body.append(modal);
            button.focus();

        }, index * 450);
    });
}

function confirmAction(message, confirmLabel = 'Confirmar') {

    return new Promise(resolve => {

        const modal = document.createElement('div');

        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Confirmação');

        modal.innerHTML = `
            <div class="confirm-card panel">
                <h2>Confirmar ação</h2>
                <p>${escapeHtml(message)}</p>

                <div class="confirm-actions">
                    <button
                        class="btn"
                        type="button"
                        data-cancel
                    >
                        Cancelar
                    </button>

                    <button
                        class="btn btn-danger"
                        type="button"
                        data-confirm
                    >
                        ${escapeHtml(confirmLabel)}
                    </button>
                </div>
            </div>
        `;

        function finish(result) {

            modal.remove();
            resolve(result);
        }

        modal.querySelector('[data-cancel]').onclick = () =>
            finish(false);

        modal.querySelector('[data-confirm]').onclick = () =>
            finish(true);

        modal.onclick = event => {

            if (event.target === modal) {
                finish(false);
            }
        };

        document.body.append(modal);
        modal.querySelector('[data-cancel]').focus();
    });
}
