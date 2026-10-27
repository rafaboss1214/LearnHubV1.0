(() => {
    const me=obterUsuarioLogado();if(!me)return;
    const section=document.createElement('section');section.className='panel content-card';
    section.innerHTML=`<h2>Segurança e participação</h2><p>E-mail: ${me.emailVerifiedAt?'confirmado':'não confirmado'}</p><a class="btn" href="historico.html">Histórico e certificados</a>`;
    if(me.tipo==='escola'){
        const states={aprovada:'Verificada pelo administrador',pendente:'Em análise',recusada:'Verificação recusada',nao_verificada:'Não verificada'};
        section.innerHTML+=`<p>Situação institucional: <strong>${states[me.institutionStatus]||states.nao_verificada}</strong></p>${me.institutionReason?`<p>Parecer: ${escapeHtml(me.institutionReason)}</p>`:''}<form id="institutionForm"><label>Identificação e vínculo com a instituição<textarea name="institutionEvidence" required maxlength="1000" placeholder="Código INEP ou CNPJ, site e contato oficial">${escapeHtml(me.institutionEvidence||'')}</textarea></label><button class="btn">Enviar para análise</button></form><p id="institutionMessage" role="status"></p>`;
    }
    section.classList.add('container');
    document.getElementById('profile').after(section);
    section.querySelector('form')?.addEventListener('submit',async e=>{e.preventDefault();const msg=section.querySelector('#institutionMessage');if(!window.LearnHubOnline){msg.textContent='A análise institucional exige o servidor. Nenhuma aprovação é simulada no protótipo.';return;}const btn=e.target.querySelector('button');btn.disabled=true;try{await LearnHubAPI('/institution','POST',Object.fromEntries(new FormData(e.target)));location.reload();}catch(err){msg.textContent=err.message;}finally{btn.disabled=false;}});
})();
