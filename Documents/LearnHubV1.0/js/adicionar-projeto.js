let schoolUser = verificarLogin();

if (schoolUser) {
    if (schoolUser.tipo !== 'escola' && !isAdmin(schoolUser)) {
        toast('Apenas escolas podem gerenciar projetos.', true);
        setTimeout(() => location.href = 'hub.html', 700);
    } else {
        renderNav();

        const form = document.getElementById('projectForm');
        const imageFile = document.getElementById('projectImageFile');
        const preview = document.getElementById('projectImagePreview');
        let imageChanged = false, previewUrl;
        // Local previews can also attach images; the server remains the shared storage mode.
        imageFile.disabled = false;
        function updatePreview(source) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = source instanceof File ? URL.createObjectURL(source) : null;
            const url = previewUrl || (isSafeImageSource(source) ? source : '');
            preview.hidden = !url;
            if (url) preview.src = url; else preview.removeAttribute('src');
        }
        imageFile.addEventListener('change', () => {
            const file = imageFile.files[0];
            if (!file) return;
            if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>3*1024*1024) {
                imageFile.value=''; toast('Escolha JPG, PNG ou WebP de até 3 MB.',true); return;
            }
            imageChanged=true; updatePreview(file);
        });
        form.elements.imagem.addEventListener('input', () => {
            imageChanged=true; imageFile.value=''; updatePreview(form.elements.imagem.value);
        });
        document.getElementById('removeProjectImage').addEventListener('click', () => {
            imageChanged=true; imageFile.value=''; form.elements.imagem.value=''; updatePreview('');
        });
        const editId = new URLSearchParams(location.search).get('edit');
        const originalProject = editId
            ? LearnHubStore.getProjects().find(project => project.id === editId)
            : null;

        if (editId && (!originalProject || !canManageProject(schoolUser, originalProject))) {
            toast('Você não tem permissão para editar este projeto.', true);
            setTimeout(() => location.href = 'hub.html', 850);
        } else {
            if (originalProject) {
                prepareEditMode(originalProject);
            }

            form.addEventListener('submit', saveProject);
        }

        function prepareEditMode(project) {
            document.title = `Editar ${project.titulo} | LearnHub`;
            form.querySelector('.badge').textContent = 'Gestão do projeto';
            form.querySelector('h1').textContent = 'Editar projeto';
            form.querySelector('.form-lead').textContent =
                'Mantenha as informações atualizadas para que os apoiadores entendam o momento atual da iniciativa.';
            document.getElementById('submitProject').textContent = 'Salvar alterações';
            document.getElementById('cancelProject').href =
                `projeto.html?id=${encodeURIComponent(project.id)}`;

            form.elements.titulo.value = project.titulo;
            form.elements.descricao.value = project.descricao;
            form.elements.objetivo.value = project.objetivo;
            form.elements.categoria.value = project.categoria;
            form.elements.recursos.value = project.recursos;
            form.elements.imagem.value = project.imagem?.startsWith('data:') ? '' : project.imagem || '';
            updatePreview(project.banner || project.imagem);
            form.elements.status.value = project.status;
        }

        async function saveProject(event) {
            event.preventDefault();

            const submitButton = document.getElementById('submitProject');
            submitButton.disabled = true;

            const data = Object.fromEntries(new FormData(form));
            const file = imageFile.files[0];
            if (file) {
                try {
                    data.imageData = await new Promise((resolve,reject) => {
                        const reader=new FileReader();
                        reader.onload=()=>resolve(reader.result.split(',')[1]);
                        reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));
                        reader.readAsDataURL(file);
                    });
                    data.imagem = `data:${file.type};base64,${data.imageData}`;
                } catch (error) { toast(error.message,true); submitButton.disabled=false; return; }
            } else if (!imageChanged && originalProject) {
                data.imagem = originalProject.imagem || '';
            }
            if (window.LearnHubAPI) {
                try {
                    data.keepImage = !imageChanged;
                    // Send the bytes only once, within the API's upload size limit.
                    if (file || data.keepImage) data.imagem = '';
                    const saved = await LearnHubAPI('/projects', 'POST', {...data, id:originalProject?.id});
                    location.href = `projeto.html?id=${encodeURIComponent(saved.id)}`;
                } catch (error) { toast(error.message, true); submitButton.disabled=false; }
                return;
            }
            const wasCompleted = originalProject?.status === 'Concluído';
            const nowCompleted = data.status === 'Concluído';
            const timestamp = new Date().toISOString();
            const project = LearnHubStore.normalizeProject({
                ...(originalProject || {}),
                id: originalProject?.id || LearnHubStore.id('project'),
                titulo: data.titulo.trim(),
                escolaId: originalProject?.escolaId || schoolUser.id,
                escolaNome: originalProject?.escolaNome || schoolUser.nomeEscola || schoolUser.nome,
                descricao: data.descricao.trim(),
                objetivo: data.objetivo.trim(),
                categoria: data.categoria,
                recursos: data.recursos.trim(),
                imagem: data.imagem.trim() || '✨',
                banner: imageChanged ? '' : originalProject?.banner || '',
                status: data.status,
                colaboradores: originalProject?.colaboradores || [],
                visualizacoes: originalProject?.visualizacoes || 0,
                mensagens: originalProject?.mensagens || [],
                comentarios: originalProject?.comentarios || [],
                dataCriacao: originalProject?.dataCriacao || timestamp,
                dataAtualizacao: timestamp
            });

            schoolUser.projetos = [...new Set([...(schoolUser.projetos || []), project.id])];

            if (nowCompleted) {
                schoolUser.projetosConcluidos = [
                    ...new Set([...(schoolUser.projetosConcluidos || []), project.id])
                ];
            } else {
                schoolUser.projetosConcluidos = (schoolUser.projetosConcluidos || [])
                    .filter(id => id !== project.id);
            }

            if (!originalProject) {
                LearnHubStore.addXP(
                    schoolUser,
                    LearnHubStore.XP.PUBLICAR,
                    `Você publicou o projeto ${project.titulo}.`
                );
            } else {
                LearnHubStore.history(
                    schoolUser,
                    `Você atualizou o projeto ${project.titulo}.`
                );
            }

            if (nowCompleted && !wasCompleted && !project.conclusaoRecompensada) {
                LearnHubStore.addXP(
                    schoolUser,
                    LearnHubStore.XP.CONCLUIR_PROJETO,
                    `Você concluiu o projeto ${project.titulo}.`
                );
                project.conclusaoRecompensada = true;
            }

            const achievements = LearnHubStore.checkAchievements(schoolUser);
            try { LearnHubStore.updateProject(project); }
            catch {
                toast('Não há espaço no navegador para salvar esta imagem. Use uma imagem menor ou abra http://localhost:3000 para salvar no banco.',true);
                submitButton.disabled=false;
                return;
            }
            schoolUser = LearnHubStore.updateUser(schoolUser);

            showAchievements(achievements);
            toast(originalProject ? 'Projeto atualizado com sucesso!' : 'Projeto publicado com sucesso!');

            setTimeout(() => {
                location.href = `projeto.html?id=${encodeURIComponent(project.id)}`;
            }, 700);
        }
    }
}
