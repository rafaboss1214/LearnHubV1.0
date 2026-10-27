(async () => {
    const me=obterUsuarioLogado(); if(!me)return;
    const history=document.getElementById('collaborationHistory');
    const projectId=new URLSearchParams(location.search).get('id');
    const project=LearnHubStore.getProjects().find(p=>p.id===projectId);
    const root=history||document.createElement('section');root.classList.add('panel','proposals-section');root.id=history?'collaborationHistory':'propostas';
    if(!history)document.getElementById('detail')?.append(root);
    const join=document.getElementById('join');if(join){const a=document.createElement('a');a.href='#propostas';a.className=join.className;a.textContent='Solicitar colaboração';join.replaceWith(a);}
    if(!window.LearnHubOnline){root.innerHTML='<h2>Solicitações e histórico</h2><p>O modo local é apenas demonstração. Aceites, certificados e verificações reais exigem o servidor.</p><a class="btn" href="http://localhost:3000/hub.html" target="_top">Abrir versão conectada</a>';return;}
    const labels={pendente:'Pendente',aceita:'Aceita',recusada:'Recusada',concluida:'Concluída'};
    root.innerHTML=`<div class="proposals-heading"><div><span class="proposal-kicker">Participação de verdade</span><h2>${history?'Histórico de colaborações':'Solicitações de colaboração'}</h2><p>O chat é liberado somente após o aceite. A escola confirma a entrega antes dos pontos e do certificado.</p></div><button class="btn" id="reloadRequests">Atualizar</button></div><div id="requestComposer"></div><label>Filtrar situação <select id="requestFilter"><option value="">Todas</option>${Object.entries(labels).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><p id="requestNotice" role="status"></p><div id="requests"></div>`;
    let rows=[],busy=false;
    const notice=root.querySelector('#requestNotice');
    const endpoint=history?'/collaborations':`/projects/${encodeURIComponent(projectId)}/proposals`;
    function composer(){
        const el=root.querySelector('#requestComposer');
        if(history||me.tipo!=='colaborador'||!project||project.status==='Concluído'||rows.some(r=>['pendente','aceita'].includes(r.status))){el.innerHTML='';return;}
        if(el.querySelector('form'))return;
        el.innerHTML=`<form class="proposal-form"><label>Tipo de apoio<select name="kind" required>${['Materiais','Voluntariado','Conhecimento','Serviços','Outro'].map(k=>`<option>${k}</option>`).join('')}</select></label><label>Disponibilidade<input name="availability" maxlength="200" placeholder="Dias, horários ou prazo de entrega"></label><label class="full">Como você pretende ajudar?<textarea name="description" required maxlength="1500" placeholder="Descreva materiais, serviços ou tempo que deseja oferecer."></textarea></label><div class="full"><button class="btn btn-primary">Enviar solicitação</button><p>Enviar não concede pontos nem libera o chat. Aguarde a decisão da escola.</p></div></form>`;
        el.querySelector('form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const btn=e.target.querySelector('button');btn.disabled=true;try{await LearnHubAPI(endpoint,'POST',Object.fromEntries(new FormData(e.target)));el.innerHTML='';await load();}catch(err){notice.textContent=err.message;}finally{busy=false;btn.disabled=false;}};
    }
    function render(){
        composer();const filter=root.querySelector('#requestFilter').value;
        root.querySelector('#requests').innerHTML=rows.filter(r=>!filter||filter===r.status).map(r=>{
            const owner=r.school===me.id,s=r.snapshot;
            return `<article class="proposal-card"><div class="proposal-top">${renderAvatar(r.person)}<div><h3>${escapeHtml(s.project)}</h3><p>${escapeHtml(s.school)} · ${escapeHtml(s.supporter)}</p></div><span class="badge">${labels[r.status]}</span></div><p><strong>${escapeHtml(r.kind)}</strong> · ${escapeHtml(r.availability||'A combinar')}</p><p class="proposal-description">${escapeHtml(r.description)}</p><p class="muted">Solicitada: ${formatDate(r.created)} · Atualizada: ${formatDate(r.updated)}${r.accepted?' · Aceita: '+formatDate(r.accepted):''}${r.completed?' · Concluída: '+formatDate(r.completed):''}</p>${r.reason?`<p><strong>Motivo da recusa:</strong> ${escapeHtml(r.reason)}</p>`:''}${r.legacy?'<p class="muted">Registro migrado do fluxo anterior; o histórico foi preservado.</p>':''}<div class="proposal-actions">${owner&&r.status==='pendente'?`<button class="btn btn-primary" data-id="${r.id}" data-action="aceita">Aceitar</button><button class="btn" data-id="${r.id}" data-action="recusada">Recusar com motivo</button>`:''}${owner&&r.status==='aceita'?`<button class="btn btn-primary" data-id="${r.id}" data-action="concluida">Confirmar realização</button>`:''}${['aceita','concluida'].includes(r.status)?`<a class="btn" href="chat.html?project=${encodeURIComponent(r.project)}&request=${encodeURIComponent(r.id)}">Chat privado</a>`:'<span class="muted">Chat indisponível até o aceite.</span>'}${r.certificate?`<a class="btn" href="certificado.html?code=${encodeURIComponent(r.certificate)}">Ver certificado</a>`:owner&&r.status==='concluida'?`<button class="btn" data-id="${r.id}" data-action="certificate">Emitir certificado</button>`:''}</div></article>`;
        }).join('')||'<p>Nenhuma solicitação nesta situação.</p>';
        root.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=()=>change(btn));
    }
    function reasonDialog(){return new Promise(resolve=>{const dialog=document.createElement('dialog');dialog.className='request-dialog';dialog.innerHTML='<form><h2>Motivo da recusa</h2><p>Este motivo será mostrado ao colaborador.</p><label>Explique a decisão<textarea name="reason" required maxlength="1000"></textarea></label><div class="proposal-actions"><button type="button" class="btn" data-cancel>Cancelar</button><button class="btn btn-primary">Confirmar recusa</button></div></form>';document.body.append(dialog);const finish=value=>{dialog.close();dialog.remove();resolve(value);};dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const reason=dialog.querySelector('textarea').value.trim();if(reason)finish(reason);};dialog.querySelector('[data-cancel]').onclick=()=>finish(null);dialog.oncancel=e=>{e.preventDefault();finish(null);};dialog.showModal();});}
    async function change(btn){if(busy)return;busy=true;btn.disabled=true;try{const {id,action}=btn.dataset;let reason;
        if(action==='recusada'){reason=await reasonDialog();if(!reason)return;}
        if(action==='concluida'&&!await confirmAction('Confirma que a contribuição descrita foi realizada? Esta ação registra a conclusão e concede 20 XP uma única vez.','Confirmar realização'))return;
        await LearnHubAPI(`/proposals/${encodeURIComponent(id)}${action==='certificate'?'/certificate':''}`,action==='certificate'?'POST':'PUT',{status:action,reason});await load();
    }catch(e){notice.textContent=e.message;}finally{busy=false;btn.disabled=false;}}
    async function load(){try{rows=await LearnHubAPI(endpoint);render();notice.textContent=`${rows.length} solicitação(ões). Enviadas e concluídas são contabilizadas separadamente.`;}catch(e){notice.textContent=e.message;}}
    root.querySelector('#reloadRequests').onclick=load;root.querySelector('#requestFilter').onchange=render;await load();
})();
