(() => {
    const form=document.querySelector('.register-form');if(!form)return;
    form.querySelectorAll('input[type=password]').forEach(input=>{input.minLength=10;input.maxLength=128;input.autocomplete='new-password';});
    const extra=document.createElement('div');
    if(form.dataset.type==='colaborador')extra.innerHTML='<label>Como você participa da comunidade?<select name="communityType" required><option value="">Selecione</option><option value="aluno">Aluno</option><option value="responsavel">Pai/Mãe ou Responsável</option><option value="comunidade">Outro membro da comunidade</option></select></label>';
    else extra.innerHTML='<label>Identificação institucional<textarea name="institutionEvidence" required maxlength="1000" placeholder="Código INEP ou CNPJ, site oficial e contato institucional para análise do administrador"></textarea></label><p class="muted">Preencher o cadastro não verifica a escola. A publicação exige e-mail confirmado e aprovação do administrador.</p>';
    extra.innerHTML+='<fieldset><legend>Endereço (privado para colaboradores)</legend><label>CEP<input name="cep" inputmode="numeric" maxlength="9" autocomplete="postal-code" placeholder="00000-000"></label><button class="btn" type="button" id="lookupCep">Consultar CEP</button><p id="cepStatus" role="status"></p><label>Rua<input name="rua" maxlength="100" autocomplete="address-line1"></label><label>Bairro<input name="bairro" maxlength="100"></label><div class="two"><label>Número<input name="numero" maxlength="100"></label><label>Complemento<input name="complemento" maxlength="120"></label></div></fieldset>';
    if(!form.elements.cidade)extra.querySelector('fieldset').innerHTML+='<div class="two"><label>Cidade<input name="cidade" maxlength="100"></label><label>Estado<input name="estado" maxlength="2"></label></div>';
    const old=form.elements.endereco;if(old){old.required=false;old.closest('label').remove();}
    form.querySelector('button').before(extra);
    extra.querySelector('#lookupCep').onclick=async()=>{
        const cep=form.elements.cep.value.replace(/\D/g,''),status=extra.querySelector('#cepStatus'),btn=extra.querySelector('#lookupCep');
        if(!/^\d{8}$/.test(cep)){status.textContent='Informe um CEP com 8 dígitos.';return;}btn.disabled=true;status.textContent='Consultando ViaCEP…';
        try{const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:AbortSignal.timeout(6000)});if(!response.ok)throw new Error();const data=await response.json();if(form.elements.cep.value.replace(/\D/g,'')!==cep)return;if(data.erro){status.textContent='CEP não encontrado. Confira ou preencha o endereço manualmente.';return;}for(const [field,key]of Object.entries({rua:'logradouro',bairro:'bairro',cidade:'localidade',estado:'uf'}))form.elements[field].value=data[key]||'';status.textContent='Endereço preenchido. Confira e informe número e complemento.';}catch{status.textContent='Consulta indisponível. Você pode preencher todos os campos manualmente.';}finally{btn.disabled=false;}
    };
})();
