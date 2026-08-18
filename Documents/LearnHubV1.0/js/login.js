document
    .getElementById('loginForm')
    .addEventListener(
        'submit',
        e => {

            e.preventDefault();

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