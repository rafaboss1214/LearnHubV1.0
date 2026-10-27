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
                    ${profileUser.tipo==='colaborador'?`<div class="key-value"><small>Identificação na comunidade</small>${({aluno:'Aluno',responsavel:'Pai/Mãe ou Responsável',comunidade:'Outro membro da comunidade'})[profileUser.communityType]||'Não informada no cadastro anterior'}</div>`:''}
                    <div class="key-value"><small>Cadastro</small>${escapeHtml(formatDate(profileUser.dataCadastro))}</div>
                    <div class="key-value"><small>Nível e XP</small>Nível ${info.level} · ${Number(profileUser.xp) || 0} XP</div>
                    ${profileUser.descricao ? `<div class="key-value"><small>Sobre</small>${escapeHtml(profileUser.descricao)}</div>` : ''}
                    <div class="key-value"><small>Localização</small>${escapeHtml([profileUser.cidade,profileUser.estado].filter(Boolean).join(' · ') || 'Ainda não informada')}</div>
                    <div class="key-value"><small>Habilidades e áreas de atuação</small>${escapeHtml(profileUser.habilidades || 'Conte à comunidade como você pode contribuir.')}</div>
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
        let pendingFile=null, previewUrl='', removePhoto=false, saving=false;
        const localPhoto=String(profileUser.foto || '').startsWith('/api/avatars/');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Editar perfil');
        modal.innerHTML = `
            <form class="form-card panel" id="profileForm">
                <h2>Editar perfil</h2>
                ${window.LearnHubAPI?`<div class="profile-photo-editor"><div id="photoPreview">${renderAvatar(profileUser)}</div><div><label>Escolher foto<input id="photoFile" type="file" accept="image/jpeg,image/png,image/webp"></label><small>JPG, PNG ou WebP · até 3 MB. A imagem será recortada em formato quadrado.</small><button class="btn" type="button" id="removePhoto">Remover foto</button></div></div>`:''}
                <label>Nome<input name="nome" maxlength="80" value="${escapeHtml(profileUser.nome)}" required></label>
                <label>Sobre você<textarea name="descricao" maxlength="280" placeholder="Conte brevemente como você participa da comunidade">${escapeHtml(profileUser.descricao || '')}</textarea></label>
                <p class="muted">Sua apresentação e foto ajudam a comunidade a conhecer você.</p>
                <label>URL da foto (opcional)<input name="foto" type="url" maxlength="2000" value="${escapeHtml(localPhoto?'':profileUser.foto || '')}" placeholder="https://..."><small>${localPhoto?'Sua foto enviada será mantida se este campo ficar vazio.':'Você também pode usar o endereço HTTPS de uma imagem.'}</small></label>
                <div class="profile-location-fields"><label>Cidade<input name="cidade" maxlength="80" value="${escapeHtml(profileUser.cidade || '')}" autocomplete="address-level2"></label><label>Estado (UF)<input name="estado" maxlength="2" pattern="[A-Za-z]{2}" value="${escapeHtml(profileUser.estado || '')}" autocomplete="address-level1" placeholder="SP"></label></div>
                <label>Habilidades e áreas de atuação<input name="habilidades" maxlength="200" value="${escapeHtml(profileUser.habilidades || '')}" placeholder="Ex.: programação, leitura, jardinagem"></label>
                <p id="profileError" role="alert" hidden></p>
                <div class="confirm-actions">
                    <button class="btn" type="button" data-cancel>Cancelar</button>
                    <button class="btn btn-primary" type="submit">Salvar alterações</button>
                </div>
            </form>
        `;

        function close() { if(saving)return; if(previewUrl) URL.revokeObjectURL(previewUrl); modal.remove(); }
        function showError(message) { const el=modal.querySelector('#profileError'); el.hidden=false; el.textContent=message; }
        modal.querySelector('[data-cancel]').addEventListener('click', close);
        modal.addEventListener('click', event => {
            if (event.target === modal) close();
        });
        const fileInput=modal.querySelector('#photoFile');
        if(fileInput) {
            fileInput.addEventListener('change',()=>{
                const file=fileInput.files[0]; if(!file)return;
                if(!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>3*1024*1024) {
                    fileInput.value=''; showError('Escolha uma foto JPG, PNG ou WebP de até 3 MB.'); return;
                }
                if(previewUrl)URL.revokeObjectURL(previewUrl);
                pendingFile=file; removePhoto=false; previewUrl=URL.createObjectURL(file);
                modal.querySelector('#photoPreview').innerHTML=`<span class="avatar avatar-image"><img alt="Prévia da nova foto"></span>`;
                modal.querySelector('#photoPreview img').src=previewUrl;
                modal.querySelector('[name="foto"]').value='';
                modal.querySelector('#profileError').hidden=true;
            });
            modal.querySelector('#removePhoto').onclick=()=>{
                pendingFile=null; removePhoto=true; fileInput.value='';
                if(previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl=''; }
                modal.querySelector('[name="foto"]').value='';
                modal.querySelector('#photoPreview').innerHTML=renderAvatar({...profileUser,foto:null});
            };
            modal.querySelector('[name="foto"]').addEventListener('input',()=>{
                pendingFile=null; fileInput.value='';
                if(previewUrl) { URL.revokeObjectURL(previewUrl); previewUrl=''; }
                modal.querySelector('#photoPreview').innerHTML=renderAvatar({...profileUser,foto:null});
            });
        }
        modal.querySelector('form').addEventListener('submit', async event => {
            event.preventDefault();
            if(saving)return;
            const data = Object.fromEntries(new FormData(event.currentTarget));
            const button=event.currentTarget.querySelector('button[type="submit"]');
            if (window.LearnHubAPI) {
                button.disabled=true; saving=true;
                const controls=[...event.currentTarget.querySelectorAll('input,textarea,button')]; controls.forEach(el=>el.disabled=true);
                modal.querySelector('#profileError').hidden=true;
                try {
                    if(pendingFile) {
                        data.photoData=await new Promise((resolve,reject)=>{
                            const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1]); reader.onerror=()=>reject(new Error('Não foi possível abrir a foto. Selecione o arquivo novamente.')); reader.readAsDataURL(pendingFile);
                        });
                        delete data.foto;
                    } else if(localPhoto && !removePhoto && !data.foto.trim()) delete data.foto;
                    const saved=await LearnHubAPI('/profile','PUT',data);
                    profileUser=LearnHubStore.updateUser({...profileUser,...saved,projetos:profileUser.projetos,projetosColaborados:profileUser.projetosColaborados});
                    saving=false; close(); renderProfile(); renderNav('perfil'); toast('Perfil salvo e atualizado para a comunidade.');
                } catch(error) {
                    const errorElement=modal.querySelector('#profileError'); errorElement.hidden=false; errorElement.textContent=error.message;
                } finally { saving=false; controls.forEach(el=>el.disabled=false); }
                return;
            }
            if (!data.nome.trim()) { toast('Informe seu nome.',true); return; }
            profileUser.cidade=data.cidade.trim();
            profileUser.estado=data.estado.trim().toUpperCase();
            profileUser.habilidades=data.habilidades.trim();
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
