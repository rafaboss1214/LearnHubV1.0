const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {DatabaseSync} = require('node:sqlite');
const {serverConfig, dataDirectory} = require('../config');
const {backup} = require('../scripts/backup');

test('hospedagem usa IP e porta fornecidos, mantendo o modo local', () => {
    assert.equal(serverConfig({}).host, '127.0.0.1');
    assert.equal(serverConfig({IP:'::1', HOST:'127.0.0.1', PORT:'8100'}).host, '::1');
    assert.equal(serverConfig({PORT:'8100'}).port, 8100);
    assert.throws(() => serverConfig({PORT:'invalid'}));
    const env = {NODE_ENV:'production', APP_URL:'https://test.alwaysdata.net', SECURE_COOKIE:'1', DATA_DIR:os.tmpdir()};
    assert.equal(serverConfig(env).dataDir, os.tmpdir());
    assert.throws(() => serverConfig({...env, APP_URL:'http://example.org'}));
    assert.throws(() => serverConfig({...env, SECURE_COOKIE:'0'}));
    assert.throws(() => serverConfig({...env, DATA_DIR:'relative'}));
    assert.equal(dataDirectory({}), path.resolve(__dirname, '../data'));
});

test('backup inclui WAL, é legível, não sobrescreve e não cria banco ausente', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'learnhub-backup-'));
    const snapshots = path.join(root, 'backups');
    const db = new DatabaseSync(path.join(root, 'learnhub.sqlite'));
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE example(value TEXT); INSERT INTO example VALUES ('preservado');");
    const first = backup(root, snapshots);
    const second = backup(root, snapshots);
    assert.notEqual(first, second);
    const restored = new DatabaseSync(first, {readOnly:true});
    assert.equal(restored.prepare('SELECT value FROM example').get().value, 'preservado');
    assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
    restored.close(); db.close();
    assert.throws(() => backup(path.join(root,'missing'), snapshots));
    assert.equal(fs.existsSync(path.join(root,'missing')), false);
});
