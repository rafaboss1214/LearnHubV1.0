const path = require('node:path');

function dataDirectory(env = process.env) {
    return env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(__dirname, 'data');
}

function serverConfig(env = process.env) {
    const port = Number(env.PORT || 3000);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
    if (env.NODE_ENV === 'production') {
        let url;
        try { url = new URL(env.APP_URL); } catch { throw new Error('Configure APP_URL com o endereço HTTPS público.'); }
        if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('APP_URL deve ser uma origem HTTPS, sem caminho ou credenciais.');
        if (env.SECURE_COOKIE !== '1') throw new Error('Configure SECURE_COOKIE=1 em produção.');
        if (!env.DATA_DIR || !path.isAbsolute(env.DATA_DIR)) throw new Error('Configure DATA_DIR com um caminho absoluto persistente.');
    }
    return {port, host: env.IP || env.HOST || '127.0.0.1', dataDir: dataDirectory(env)};
}

module.exports = {dataDirectory, serverConfig};
