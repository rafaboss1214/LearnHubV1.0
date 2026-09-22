const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const values = new Map();
const context = {
    console,
    localStorage: {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    }
};

vm.createContext(context);
vm.runInContext(
    `${fs.readFileSync('js/storage.js', 'utf8')}\nglobalThis.store = LearnHubStore;`,
    context
);

const store = context.store;
const school = store.updateUser({ id: 'school', nome: 'Escola', email: 'school@test.local', tipo: 'escola' });
const supporter = store.updateUser({ id: 'supporter', nome: 'Apoiador', email: 'support@test.local', tipo: 'colaborador' });
const outsider = store.updateUser({ id: 'outsider', nome: 'Visitante', email: 'visitor@test.local', tipo: 'colaborador' });

store.updateProject({
    id: 'project',
    titulo: 'Projeto de teste',
    escolaId: school.id,
    escolaNome: school.nome,
    colaboradores: [supporter.id]
});

assert.ok(store.sendProjectMessage('project', supporter.id, school.id, 'Quero ajudar.'));
assert.ok(store.sendProjectMessage('project', school.id, supporter.id, 'Vamos conversar.'));
assert.equal(store.sendProjectMessage('project', outsider.id, school.id, 'Mensagem indevida'), null);
assert.equal(store.sendProjectMessage('project', supporter.id, outsider.id, 'Mensagem indevida'), null);
assert.equal(
    JSON.stringify(store.getProjects().find(project => project.id === 'project').mensagens.map(message => message.texto)),
    JSON.stringify(['Quero ajudar.', 'Vamos conversar.'])
);

const roadmap = store.levelRoadmap(school);
assert.equal(roadmap.length, 7);
assert.equal(roadmap[0].current, true);
assert.equal(roadmap[0].title, 'Escola Iniciante');

const project = store.getProjects().find(item => item.id === 'project');
project.titulo = 'Projeto atualizado';
store.updateProject(project);
assert.equal(store.getProjects().find(item => item.id === 'project').titulo, 'Projeto atualizado');

school.projetos = ['project'];
school.colaboradores = ['supporter'];
supporter.projetosColaborados = ['project'];
store.updateUser(school);
store.updateUser(supporter);

assert.equal(store.removeProject('project'), true);
assert.equal(store.getProjects().find(item => item.id === 'project'), undefined);
assert.equal(store.getUsers().find(user => user.id === 'school').projetos.length, 0);
assert.equal(store.getUsers().find(user => user.id === 'school').colaboradores.length, 0);
assert.equal(store.getUsers().find(user => user.id === 'supporter').projetosColaborados.length, 0);
assert.equal(store.removeProject('project'), false);

console.log('storage.test.js: ok');
