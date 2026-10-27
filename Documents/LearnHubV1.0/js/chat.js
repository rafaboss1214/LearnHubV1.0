(async () => {
    const status=document.getElementById('connectionStatus');
    const localMode = !window.LearnHubOnline;
    const localUser = localMode ? verificarLogin() : null;
    if (localMode && !localUser) return;
    const LearnHubAPI = localMode ? createLocalChatAPI(localUser) : window.LearnHubAPI;
    let user;
    try {
        user=await LearnHubAPI('/profile');
    } catch (error) {
        status.textContent=error.status===401?'Entre na sua conta pelo servidor para acessar suas conversas.':error.message;
        const link=document.createElement('a');
        link.className='btn'; link.href=error.status===401?'login.html':'http://localhost:3000/chat.html';
        link.textContent=error.status===401?'Entrar na conta':'Abrir chat no servidor';
        status.append(link);
        return;
    }
    renderNav('chat');
    const list=document.getElementById('conversations'), messages=document.getElementById('messages');
    const form=document.getElementById('messageForm'), input=document.getElementById('messageText');
    const search=document.getElementById('conversationSearch');
    let conversations=[], selected=null, signature='', busy=false;
    const drafts=new Map();
    const key=c=>c.request || c.project+':'+c.other;
    const seen=new Set();
    let listSignature='', sending=false;
    const clock=value=>new Date(value).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    function avatar(name, photo='') {
        const initials=String(name).trim().split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase();
        return `<span class="chat-avatar" aria-hidden="true">${escapeHtml(initials)}${photo && isSafeImageSource(photo)?`<img src="${escapeHtml(photo)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:''}</span>`;
    }
    function bindAvatars(root) { root.querySelectorAll('.chat-avatar img').forEach(img=>{img.onerror=()=>img.remove();}); }
    function resizeComposer() {
        input.style.height='44px';
        input.style.height=Math.min(140,Math.max(44,input.scrollHeight))+'px';
        document.getElementById('characterCount').textContent=`${input.value.length.toLocaleString('pt-BR')} / 2.000`;
    }
    function renderList() {
        const filtered=conversations.filter(c=>(c.name+' '+c.title).toLowerCase().includes(search.value.toLowerCase()));
        const markup=filtered.length?filtered.map(c=>`<button type="button" class="conversation-item ${selected && key(c)===key(selected)?'active':''}" data-key="${escapeHtml(key(c))}" aria-pressed="${Boolean(selected && key(c)===key(selected))}">${avatar(c.name,c.photo)}<span class="conversation-copy"><span class="conversation-top"><strong>${escapeHtml(c.name)}</strong><time>${escapeHtml(clock(c.date))}</time></span><span class="project-name">${escapeHtml(c.title)}</span><small>${escapeHtml(c.last || 'Comece a conversa')}</small></span>${c.unread?`<span class="unread-pill" aria-label="${c.unread} mensagens não lidas">${c.unread}</span>`:''}</button>`).join(''):'<p class="chat-empty">Nenhuma conversa encontrada. <a href="hub.html">Explorar projetos</a></p>';
        if (markup===listSignature) return;
        listSignature=markup; list.innerHTML=markup; bindAvatars(list);
        list.querySelectorAll('button').forEach(button=>button.onclick=()=>select(conversations.find(c=>key(c)===button.dataset.key)));
    }
    function renderHeader(c) {
        document.getElementById('conversationHeader').innerHTML=`${avatar(c.name,c.photo)}<div class="chat-person"><h2>${escapeHtml(c.name)}</h2><a href="projeto.html?id=${encodeURIComponent(c.project)}">${escapeHtml(c.title)} ↗</a></div><span class="conversation-tag">CONEXÃO DO PROJETO</span>`;
        bindAvatars(document.getElementById('conversationHeader'));
        if (localMode) {
            const link=document.querySelector('#conversationHeader a');
            link.removeAttribute('href'); link.textContent=c.title;
            document.querySelector('.conversation-tag').textContent='DEMONSTRAÇÃO LOCAL';
        }
    }
    function select(c) {
        if (selected) drafts.set(key(selected),input.value);
        selected=c; signature=''; seen.clear(); input.value=drafts.get(key(c)) || ''; form.hidden=false; resizeComposer();
        renderHeader(c);
        messages.textContent='Carregando conversa…'; renderList(); refresh();
    }
    async function refresh() {
        if (busy) return;
        busy=true;
        try {
            conversations=await LearnHubAPI('/conversations');
            if (selected && !conversations.some(c=>key(c)===key(selected))) { selected=null; form.hidden=true; messages.textContent='Esta conversa não está mais disponível.'; }
            if (selected) {
                const latest=conversations.find(c=>key(c)===key(selected));
                if(latest && (latest.photo!==selected.photo || latest.name!==selected.name || latest.title!==selected.title)) {
                    selected=latest; renderHeader(selected); signature='';
                }
            }
            renderList();
            if (!selected) {
                const project=new URLSearchParams(location.search).get('project');
                const other=new URLSearchParams(location.search).get('with');
                const request=new URLSearchParams(location.search).get('request');
                const initial=conversations.find(c=>(request?c.request===request:c.project===project && (!other || c.other===other))) || ((localMode || !project) && conversations[0]);
                if (initial) { busy=false; select(initial); return; }
            }
            if (selected) {
                const current=key(selected), endpoint=`/projects/${encodeURIComponent(selected.project)}/messages?with=${encodeURIComponent(selected.other)}&request=${encodeURIComponent(selected.request||'')}`;
                const data=await LearnHubAPI(endpoint);
                if (selected && key(selected)===current) {
                    const next=JSON.stringify(data);
                    if (next!==signature) {
                        const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<80 || !signature;
                        let previousDay='';
                        const initial=signature==='';
                        messages.innerHTML=data.length?data.map(m=>{
                            const day=new Date(m.date).toLocaleDateString('pt-BR');
                            const divider=day!==previousDay?`<div class="day-divider">${day===new Date().toLocaleDateString('pt-BR')?'Hoje':escapeHtml(day)}</div>`:'';
                            previousDay=day;
                            const mine=m.sender===user.id;
                            const animate=!initial && !seen.has(m.id); seen.add(m.id);
                            return `${divider}<div class="message-row ${mine?'mine':''} ${animate?'new-message':''}">${!mine?avatar(selected.name,selected.photo):''}<div class="chat-bubble"><div class="message-body">${escapeHtml(m.text)}</div><small><time datetime="${escapeHtml(m.date)}">${escapeHtml(clock(m.date))}</time>${mine?`<span class="read-status" aria-label="${m.read?'Lida':'Enviada'}" title="${m.read?'Lida':'Enviada'}">${m.read?'✓✓':'✓'}</span>`:''}</small></div></div>`;
                        }).join(''):'<div class="chat-empty"><strong>Toda colaboração começa com um olá.</strong>Apresente-se e combine como você pode ajudar.</div>';
                        bindAvatars(messages);
                        signature=next; if (atBottom) messages.scrollTop=messages.scrollHeight;
                    }
                    if (!document.hidden && document.hasFocus() && data.some(m=>m.recipient===user.id && !m.read)) await LearnHubAPI(endpoint,'PUT',{});
                }
            }
            status.textContent=localMode?'Demonstração local · salvo apenas neste navegador, sem envio a pessoas reais e sem respostas automáticas.':'Conectado · mensagens atualizadas automaticamente';
            status.dataset.connected='true';
        } catch(error) { status.dataset.connected='false'; status.textContent=error.message+' Tentaremos reconectar automaticamente.'; }
        finally { busy=false; }
    }
    form.addEventListener('submit',async event=>{
        event.preventDefault(); if (!selected || !input.value.trim() || sending) return;
        const target={...selected}, text=input.value.trim(), button=form.querySelector('button'); button.disabled=true; sending=true;
        button.classList.add('is-sending'); button.setAttribute('aria-label','Enviando mensagem'); button.querySelector('.send-label').textContent='Enviando';
        try {
            await LearnHubAPI(`/projects/${encodeURIComponent(target.project)}/messages`,'POST',{recipient:target.other,request:target.request,text});
            drafts.delete(key(target));
            if (selected && key(selected)===key(target) && input.value.trim()===text) { input.value=''; resizeComposer(); input.focus(); }
            await refresh();
        } catch(error) { toast(error.message+' Sua mensagem foi mantida para tentar novamente.',true); }
        finally { button.disabled=false; sending=false; button.classList.remove('is-sending'); button.setAttribute('aria-label','Enviar mensagem'); button.querySelector('.send-label').textContent='Enviar'; }
    });
    input.addEventListener('input',resizeComposer);
    input.addEventListener('keydown',event=>{
        if(event.key==='Enter' && !event.shiftKey && !event.isComposing && !matchMedia('(pointer: coarse)').matches) { event.preventDefault(); form.requestSubmit(); }
    });
    search.addEventListener('input',renderList);
    const timer=setInterval(()=>{if(!document.hidden) refresh();},2500);
    window.addEventListener('pagehide',()=>clearInterval(timer));
    document.addEventListener('visibilitychange',()=>{if(!document.hidden) refresh();});
    refresh();
})();
