(() => {
    const pages = new Set(['index.html','hub.html','progressao.html','perfil.html','chat.html','projeto.html','adicionar-projeto.html','login.html','cadastro.html','cadastro-escola.html','cadastro-colaborador.html','historico.html','certificado.html','conta.html','administracao.html']);
    let route = 'hub.html';
    try {
        const requested = decodeURIComponent(location.hash.slice(1));
        // Accept only sibling application pages, never arbitrary URLs or paths.
        if (pages.has(requested.split(/[?#]/)[0])) route = requested;
    } catch { /* Invalid fragments fall back to the Hub. */ }
    if (location.protocol !== 'file:') {
        location.replace(route);
        return;
    }
    document.getElementById('localApp').src = route;
})();
