let profileUser = verificarLogin();

if (profileUser) {
    renderNav('perfil');
    renderProfile();

    function renderProfile() {
        const projects = LearnHubStore.getProjects();
        const relatedProjects = profileUser.tipo === 'escola'
            ? projects.filter(project => project.escolaId === profileUser.id)
            : projects.filter(project => (profileUser.projetosColaborados || []).includes(project.id));
        const info = LearnHubStore.levelInfo(profileUser);

        document.getElementById('profile').innerHTML = `
            <section class="profile-hero panel">
                ${renderAvatar(profileUser)}
                <div>
                    <h1>${escapeHtml(profileUser.nome)}</h1>
                    <p class="muted">${profileUser.tipo === 'escola' ? 'Escola' : 'Apoiador'} · ${escapeHtml(info.title)}</p>
                </div>
                <button class="btn edit-btn" id="edit" type="button">Editar perfil</button>
            </section>

            <div class="profile-grid">
                <section class="side-card panel">
                    <h2>Informações</h2>
                    <div class="key-value"><small>E-mail</small>${escapeHtml(profileUser.email)}</div>
                    <div class="key-value"><small>Tipo de conta</small>${profileUser.tipo === 'escola' ? 'Escola' : 'Apoiador'}</div>
                    <div class="key-value"><small>Cadastro</small>${escapeHtml(formatDate(profileUser.dataCadastro))}</div>
                    <div class="key-value"><small>Nível e XP</small>Nível ${info.level} · ${Number(profileUser.xp) || 0} XP</div>
                    ${profileUser.descricao ? `<div class="key-value"><small>Sobre</small>${escapeHtml(profileUser.descricao)}</div>` : ''}
                </section>

                <section class="content-card panel">
                    <h2>${profileUser.tipo === 'escola' ? 'Meus projetos' : 'Projetos que estou apoiando'}</h2>
                    ${relatedProjects.length
                        ? relatedProjects.map(project => `
                            <a class="list-item" href="projeto.html?id=${encodeURIComponent(project.id)}">
                                <strong>${escapeHtml(project.titulo)}</strong>
                                <span class="muted">${escapeHtml(project.escolaNome)} · ${escapeHtml(project.status)}</span>
                            </a>
                        `).join('')
                        : `<div class="empty">${profileUser.tipo === 'escola'
                            ? 'Você ainda não publicou nenhum projeto.'
                            : 'Você ainda não apoia nenhum projeto. Explore o Hub e encontre uma iniciativa.'}</div>`}
                </section>
            </div>
        `;

        document.getElementById('edit').addEventListener('click', openEditProfile);
    }

    function openEditProfile() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Editar perfil');
        modal.innerHTML = `
            <form class="form-card panel" id="profileForm">
                <h2>Editar perfil</h2>
                <label>Nome<input name="nome" maxlength="80" value="${escapeHtml(profileUser.nome)}" required></label>
                <label>Sobre você<textarea name="descricao" maxlength="280" placeholder="Conte brevemente como você participa da comunidade">${escapeHtml(profileUser.descricao || '')}</textarea></label>
                <label>URL da foto (opcional)<input name="foto" type="url" value="${escapeHtml(profileUser.foto || '')}" placeholder="https://..."></label>
                <div class="confirm-actions">
                    <button class="btn" type="button" data-cancel>Cancelar</button>
                    <button class="btn btn-primary" type="submit">Salvar alterações</button>
                </div>
            </form>
        `;

        modal.querySelector('[data-cancel]').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', event => {
            if (event.target === modal) modal.remove();
        });
        modal.querySelector('form').addEventListener('submit', event => {
            event.preventDefault();
            const data = Object.fromEntries(new FormData(event.currentTarget));
            profileUser.nome = data.nome.trim();
            profileUser.descricao = data.descricao.trim();
            profileUser.foto = data.foto.trim() || null;
            if (profileUser.tipo === 'escola') profileUser.nomeEscola = profileUser.nome;
            profileUser = LearnHubStore.updateUser(profileUser);
            modal.remove();
            renderProfile();
            toast('Perfil atualizado.');
        });

        document.body.append(modal);
        modal.querySelector('input').focus();
    }
}
