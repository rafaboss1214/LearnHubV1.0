// Isolated demonstration conversations: never presented as delivered to real users.
function createLocalChatAPI(user, storage = localStorage) {
    const key = `learnhub-local-chat-v1:${user.id}`;
    const contacts = ['Marina', 'Lucas', 'Beatriz'].map((name, index) => ({
        project: `local-demo-${index}`, other: `local-contact-${index}`,
        name: `${name} · Demonstração`, title: 'Conversa de teste local'
    }));
    function read() {
        const raw = storage.getItem(key);
        if (raw) {
            const data = JSON.parse(raw);
            if (!Array.isArray(data)) throw new Error('Histórico local inválido. Seus dados não foram substituídos.');
            return data;
        }
        const data = contacts.map((c, i) => ({id:`welcome-${i}`,project:c.project,sender:c.other,recipient:user.id,text:'Olá! Este perfil é fictício. Envie uma mensagem para testar. Não há respostas automáticas.',date:new Date().toISOString(),read:0}));
        storage.setItem(key, JSON.stringify(data));
        return data;
    }
    return async (route, method = 'GET', body = {}) => {
        const data = read();
        if (route === '/profile') return user;
        if (route === '/conversations') return contacts.map(c => {
            const messages = data.filter(m => m.project === c.project);
            const last = messages.at(-1);
            return {...c,last:last?.text,date:last?.date,unread:messages.filter(m=>m.recipient===user.id && !m.read).length};
        });
        const match = /^\/projects\/([^/]+)\/messages(?:\?.*)?$/.exec(route);
        const contact = match && contacts.find(c=>c.project===match[1]);
        if (!contact) throw new Error('Conversa local não encontrada.');
        if (method === 'POST') {
            const text=String(body.text || '').trim();
            if (!text || text.length>2000) throw new Error('Escreva até 2.000 caracteres.');
            data.push({id:crypto.randomUUID(),project:contact.project,sender:user.id,recipient:contact.other,text,date:new Date().toISOString(),read:0});
        } else if (method === 'PUT') {
            data.filter(m=>m.project===contact.project && m.recipient===user.id).forEach(m=>m.read=1);
        } else return data.filter(m=>m.project===contact.project);
        try { storage.setItem(key,JSON.stringify(data)); }
        catch { throw new Error('Não foi possível salvar no navegador. Libere espaço e tente novamente.'); }
        return {ok:true};
    };
}
