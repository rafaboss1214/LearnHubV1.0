(() => {
    const form=document.querySelector('.register-form');if(!form)return;
    form.querySelectorAll('input[type=password]').forEach(input=>{input.minLength=10;input.maxLength=128;input.autocomplete='new-password';});
    const extra=document.createElement('div');
    if(form.dataset.type==='colaborador')extra.innerHTML='<label>Como você participa da comunidade?<select name="communityType" required><option value="">Selecione</option><option value="aluno">Aluno</option><option value="responsavel">Pai/Mãe ou Responsável</option><option value="comunidade">Outro membro da comunidade</option></select></label>';
    else extra.innerHTML='<label>Identificação institucional (opcional)<textarea name="institutionEvidence" maxlength="1000" placeholder="Código INEP ou CNPJ, site e contato da escola"></textarea></label><p class="muted">Após o cadastro, você já pode entrar e criar projetos, sem autorização do administrador. O cadastro não concede um selo de escola verificada.</p>';
    extra.innerHTML+='<fieldset><legend>Endereço (privado para colaboradores)</legend><label>CEP<input name="cep" inputmode="numeric" maxlength="9" autocomplete="postal-code" placeholder="00000-000"></label><button class="btn" type="button" id="lookupCep">Consultar CEP</button><p id="cepStatus" role="status"></p><label>Rua<input name="rua" maxlength="100" autocomplete="address-line1"></label><label>Bairro<input name="bairro" maxlength="100"></label><div class="two"><label>Número<input name="numero" maxlength="100"></label><label>Complemento<input name="complemento" maxlength="120"></label></div></fieldset>';
    if(!form.elements.cidade)extra.querySelector('fieldset').innerHTML+='<div class="two"><label>Cidade<input name="cidade" maxlength="100"></label><label>Estado<input name="estado" maxlength="2"></label></div>';
    const old=form.elements.endereco;if(old){old.required=false;old.closest('label').remove();}
    form.querySelector('button').before(extra);
    const input=form.elements.cep,status=extra.querySelector('#cepStatus'),btn=extra.querySelector('#lookupCep');
    const fields={rua:'logradouro',bairro:'bairro',cidade:'localidade',estado:'uf'};
    let timer,controller,version=0;
    status.textContent='Digite o CEP: o endereço será consultado automaticamente. Número e complemento são manuais.';
    async function lookup(){
        clearTimeout(timer);controller?.abort();const current=++version;
        const cep=input.value.replace(/\D/g,'');
        if(!/^\d{8}$/.test(cep)){btn.disabled=false;status.textContent='Informe um CEP com 8 dígitos.';return;}
        controller=new AbortController();const requestController=controller;
        const timeout=setTimeout(()=>requestController.abort(),6000);
        const before=Object.fromEntries(Object.keys(fields).map(key=>[key,form.elements[key].value]));
        btn.disabled=true;status.textContent='Consultando ViaCEP…';
        try{
            const response=await fetch(`https://viacep.com.br/ws/${cep}/json/`,{signal:requestController.signal});
            if(!response.ok)throw new Error();const data=await response.json();
            if(current!==version||input.value.replace(/\D/g,'')!==cep)return;
            if(data.erro){status.textContent='CEP não encontrado. Confira ou preencha o endereço manualmente.';return;}
            for(const [field,key]of Object.entries(fields))if(form.elements[field].value===before[field])form.elements[field].value=data[key]||'';
            status.textContent='Endereço consultado. Confira os campos e informe número e complemento.';
        }catch{if(current===version)status.textContent='Consulta indisponível. Você pode preencher todos os campos manualmente.';}
        finally{clearTimeout(timeout);if(current===version)btn.disabled=false;}
    }
    input.addEventListener('input',()=>{
        clearTimeout(timer);controller?.abort();++version;btn.disabled=false;
        const cep=input.value.replace(/\D/g,'');
        status.textContent=cep.length===8?'Consultando endereço…':'Digite um CEP com 8 dígitos ou preencha o endereço manualmente.';
        if(cep.length===8)timer=setTimeout(lookup,350);
    });
    btn.onclick=lookup;
})();
