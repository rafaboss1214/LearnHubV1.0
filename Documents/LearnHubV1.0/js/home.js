const featuredContainer = document.getElementById('featuredProjects');
const homeUser = obterUsuarioLogado();

if (homeUser) {
    const publicHeader = document.querySelector('.landing-header');

    if (publicHeader) {
        publicHeader.outerHTML = '<div data-nav></div>';
        renderNav('home');
    }

    document
        .querySelectorAll('a[href="login.html"]')
        .forEach(link => {
            link.href = 'perfil.html';
            link.textContent = 'Minha conta';
        });
}

if (featuredContainer) {

    const projects = LearnHubStore
        .getProjects()
        .sort((first, second) =>
            new Date(second.dataAtualizacao) -
            new Date(first.dataAtualizacao)
        )
        .slice(0, 3);

    if (projects.length) {

        featuredContainer.innerHTML = projects
            .map(project => `
                <article class="featured-card panel">
                    <div class="featured-cover">
                        ${renderProjectMedia(
                            project,
                            `Banner do projeto ${project.titulo}`
                        )}
                    </div>

                    <div class="featured-content">
                        <div class="featured-meta">
                            <span
                                class="badge status-${slugify(project.status)}"
                            >
                                ${escapeHtml(project.status)}
                            </span>

                            <span>${escapeHtml(project.categoria)}</span>
                        </div>

                        <h3>${escapeHtml(project.titulo)}</h3>

                        <p>${escapeHtml(project.descricao)}</p>

                        <div class="featured-footer">
                            <small>
                                ${escapeHtml(project.escolaNome)}
                            </small>

                            <a
                                class="text-link"
                                href="${
                                    homeUser
                                        ? `projeto.html?id=${encodeURIComponent(project.id)}`
                                        : 'login.html'
                                }"
                            >
                                Conhecer projeto →
                            </a>
                        </div>
                    </div>
                </article>
            `)
            .join('');

    } else {

        featuredContainer.innerHTML = `
            <div class="empty panel">
                Novos projetos aparecerão aqui em breve.
            </div>
        `;
    }
}
