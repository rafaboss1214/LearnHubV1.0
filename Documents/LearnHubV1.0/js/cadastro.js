document
    .querySelector('.register-form')
    .addEventListener(
        'submit',
        async e => {

            e.preventDefault();

            let f = e.target;

            let d =
                Object.fromEntries(
                    new FormData(f)
                );

            if (
                d.senha.length < 10
            ) {

                return toast(
                    'A senha deve ter pelo menos 10 caracteres.',
                    true
                );
            }

            if (
                d.senha !==
                d.confirmar
            ) {

                return toast(
                    'As senhas não coincidem.',
                    true
                );
            }

            if (window.LearnHubAPI) {
                const button = f.querySelector('button');
                button.disabled = true;
                try {
                    const result=await LearnHubAPI('/register', 'POST', {...d, tipo:f.dataset.type});
                    f.innerHTML='<h1>Conta criada</h1><p id="registrationMessage" role="status"></p><a class="btn btn-primary" href="login.html">Entrar na minha conta</a>';
                    document.getElementById('registrationMessage').textContent=result.message;
                } catch (error) { toast(error.message, true); button.disabled = false; }
                return;
            }

            let users =
                LearnHubStore.getUsers();

            if (
                users.some(
                    u =>
                        u.email
                            .toLowerCase() ===
                        d.email
                            .trim()
                            .toLowerCase()
                )
            ) {

                return toast(
                    'Este e-mail já está cadastrado.',
                    true
                );
            }

            let escola =
                f.dataset.type ===
                'escola';

            let u = {

                id:
                    LearnHubStore.id(
                        'user'
                    ),

                nome:
                    d.nome.trim(),

                email:
                    d.email
                        .trim()
                        .toLowerCase(),

                senha:
                    d.senha,

                tipo:
                    escola
                        ? 'escola'
                        : 'colaborador',

                foto: null,

                xp: 0,

                nivel: 1,

                emblemas: [],

                historico: [],

                dataCadastro:
                    new Date().toISOString()

            };

            u.communityType=escola?null:d.communityType;
            u.institutionStatus=escola?'nao_verificada':null;
            u.enderecoPrivado=Object.fromEntries(['cep','rua','bairro','cidade','estado','numero','complemento'].map(k=>[k,d[k]||'']));
            if (escola) {

                Object.assign(
                    u,
                    {

                        nomeEscola:
                            u.nome,

                        endereco:
                            (d.rua || '')
                                .trim(),

                        cidade:
                            d.cidade
                                .trim(),

                        estado:
                            d.estado
                                .trim()
                                .toUpperCase(),

                        projetos: [],

                        colaboradores: [],

                        projetosConcluidos: []

                    }
                );

            } else {

                Object.assign(
                    u,
                    {

                        pontos: 0,

                        projetosColaborados: [],

                        projetosConcluidos: [],

                        projetosVisualizados: []

                    }
                );
            }

            LearnHubStore.addXP(
                u,
                LearnHubStore.XP.CONTA,
                'Você criou sua conta na LearnHub.'
            );

            LearnHubStore.updateUser(
                u
            );

            toast(
                'Conta criada com sucesso! Redirecionando para o login.'
            );

            setTimeout(
                () =>
                    location.href =
                        'login.html',
                1100
            );
        }
    );
