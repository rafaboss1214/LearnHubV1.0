(function(root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.SupportCategories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
    const labels = ['Mão de obra', 'Recursos materiais', 'Conhecimento', 'Serviços', 'Outros'];
    const aliases = {Voluntariado:'Mão de obra', Materiais:'Recursos materiais', Outro:'Outros'};
    const normalize = value => labels.includes(value) ? value : aliases[value] || '';
    // Older projects remain open to all support types until the school edits them.
    const forProject = project => Array.isArray(project?.supportCategories)
        ? [...new Set(project.supportCategories.map(normalize).filter(Boolean))] : [...labels];
    function validate(values) {
        if (!Array.isArray(values) || !values.length || values.length > labels.length || values.some(v => typeof v !== 'string' || !normalize(v)))
            throw new Error('Selecione pelo menos uma categoria de apoio válida.');
        return [...new Set(values.map(normalize))];
    }
    return {labels, normalize, forProject, validate};
});
