window.LearnHubAPI = async function (path, method = 'GET', body) {
    const response = await fetch('/api' + path, {
        method, credentials:'same-origin', headers: {'Content-Type':'application/json'},
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.headers.get('content-type')?.includes('application/json')) {
        throw new Error('Este endereço não está servindo a API do LearnHub. Abra http://localhost:3000/chat.html com o servidor do projeto iniciado.');
    }
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || 'Não foi possível conectar.');
        error.status = response.status;
        throw error;
    }
    return data;
};
