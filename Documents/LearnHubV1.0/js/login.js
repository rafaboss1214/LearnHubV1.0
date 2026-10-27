document
    .getElementById('loginForm')
    .addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            if (window.LearnHubAPI) {
                const button = e.target.querySelector('button[type="submit"]');
                button.disabled = true;
                try {
                    await LearnHubAPI('/login', 'POST', Object.fromEntries(new FormData(e.target)));
                    location.href = 'hub.html';
                } catch (error) { toast(error.message, true); button.disabled = false; }
                return;
            }

            let d =
                new FormData(
                    e.target
                );

            let u =
                fazerLogin(
                    d.get('email').trim(),
                    d.get('senha')
                );

            if (!u) {

                return toast(
                    'E-mail ou senha inválidos.',
                    true
                );
            }

            location.href =
                'hub.html';
        }
    );
