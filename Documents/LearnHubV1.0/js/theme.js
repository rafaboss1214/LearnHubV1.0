(function () {

    // Reserve the authenticated layout before the first paint, not after page scripts run.
    const page = location.pathname.split('/').pop();
    // Keep file-mode navigation in one top-level document (one browser zoom context).
    if (location.protocol === 'file:' && window.top === window.self) {
        location.replace('local.html#' + encodeURIComponent(page + location.search + location.hash));
        return;
    }
    if (['hub.html','progressao.html','perfil.html','chat.html','projeto.html','adicionar-projeto.html','historico.html','certificado.html','administracao.html'].includes(page)) {
        document.documentElement.classList.add('app-layout');
        try {
            document.documentElement.classList.toggle('sidebar-hidden', localStorage.getItem('learnhub-sidebar-collapsed') === 'true');
        } catch { /* Use the default expanded layout if storage is unavailable. */ }
    }

    const STORAGE_KEY = 'theme';

    function getSavedTheme() {

        const savedTheme = localStorage.getItem(STORAGE_KEY);

        if (
            savedTheme === 'light' ||
            savedTheme === 'dark'
        ) {
            return savedTheme;
        }

        return 'dark';
    }

    function applyTheme(theme) {

        const safeTheme =
            theme === 'light'
                ? 'light'
                : 'dark';

        document.documentElement.dataset.theme = safeTheme;
        document.documentElement.style.colorScheme = safeTheme;

        document
            .querySelectorAll('[data-theme-toggle]')
            .forEach(button => {

                const isDark = safeTheme === 'dark';

                button.setAttribute(
                    'aria-label',
                    isDark
                        ? 'Ativar tema claro'
                        : 'Ativar tema escuro'
                );

                button.setAttribute(
                    'title',
                    isDark
                        ? 'Ativar tema claro'
                        : 'Ativar tema escuro'
                );

                button.innerHTML = isDark
                    ? '<span aria-hidden="true">☀</span>'
                    : '<span aria-hidden="true">☾</span>';
            });
    }

    function toggleTheme() {

        const currentTheme =
            document.documentElement.dataset.theme ||
            getSavedTheme();

        const nextTheme =
            currentTheme === 'dark'
                ? 'light'
                : 'dark';

        localStorage.setItem(STORAGE_KEY, nextTheme);
        applyTheme(nextTheme);
    }

    function bindThemeButtons() {
        document.querySelectorAll('.brand').forEach(brand=>{brand.innerHTML='<span class="brand-learn">Learn</span><span class="brand-hub">Hub</span>';brand.setAttribute('aria-label','LearnHub');});

        document
            .querySelectorAll('[data-theme-toggle]')
            .forEach(button => {

                button.onclick = toggleTheme;
            });

        applyTheme(getSavedTheme());
    }

    applyTheme(getSavedTheme());

    document.addEventListener(
        'DOMContentLoaded',
        bindThemeButtons
    );

    window.LearnHubTheme = {
        applyTheme,
        bindThemeButtons,
        getSavedTheme,
        toggleTheme
    };

})();
