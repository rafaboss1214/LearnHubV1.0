// A consistent SQLite snapshot, including committed WAL data; never copies a live DB file.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {DatabaseSync} = require('node:sqlite');
const {dataDirectory} = require('../config');

function backup(directory = dataDirectory(), destination = process.env.BACKUP_DIR) {
    const source = path.join(directory, 'learnhub.sqlite');
    if (!fs.existsSync(source)) throw new Error('Banco não encontrado. Nenhum banco vazio foi criado.');
    if (!destination || !path.isAbsolute(destination)) throw new Error('Informe BACKUP_DIR absoluto e privado.');
    fs.mkdirSync(destination, {recursive:true, mode:0o700});
    const target = path.join(destination, `learnhub-${Date.now()}-${crypto.randomUUID()}.sqlite`);
    const db = new DatabaseSync(source, {readOnly:true});
    try { db.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`); }
    finally { db.close(); }
    fs.chmodSync(target, 0o600);
    return target;
}
if (require.main === module) console.log('Backup criado:', backup());
module.exports = {backup};
