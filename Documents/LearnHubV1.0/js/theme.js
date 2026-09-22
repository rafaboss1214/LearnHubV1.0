(function () {

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
