//js para verificar se o cep é valido, preencehr outras informações e formatar para 00000-000

document.addEventListener('DOMContentLoaded', function () {
    const cepInput = document.getElementById('cep');
    const bairroInput = document.getElementById('bairro');
    const enderecoInput = document.getElementById('endereco');
    const cepRequirement = document.querySelector('.cep-requirements .requirement[data-req-type="cepLength"]');

    if (!cepInput) return;

    function formatCep(value) {
        value = value.replace(/\D/g, '').slice(0, 8);
        if (value.length > 5) {
            value = value.replace(/^(\d{5})(\d{0,3})/, '$1-$2');
        }
        return value;
    }

    async function buscarCep(cep) {
        try {
            const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await res.json();
            if (!data.erro) {
                if (bairroInput) bairroInput.value = data.bairro || '';
                if (enderecoInput) enderecoInput.value = data.logradouro || '';
            }
        } catch (e) {
            //faz nada
        }
    }

    //ao carregar a página(caso já tenha valor)
    if (cepInput.value) {
        cepInput.value = formatCep(cepInput.value);
        if (cepInput.value.replace(/\D/g, '').length === 8) {
            cepRequirement && cepRequirement.classList.remove('invalid');
            cepRequirement && cepRequirement.classList.add('valid');
            buscarCep(cepInput.value.replace(/\D/g, ''));
        } else {
            cepRequirement && cepRequirement.classList.remove('valid');
            cepRequirement && cepRequirement.classList.add('invalid');
        }
    }

    cepInput.addEventListener('input', function () {
        this.value = formatCep(this.value);

        if (this.value.replace(/\D/g, '').length === 8) {
            cepRequirement && cepRequirement.classList.remove('invalid');
            cepRequirement && cepRequirement.classList.add('valid');
            buscarCep(this.value.replace(/\D/g, ''));
        } else {
            cepRequirement && cepRequirement.classList.remove('valid');
            cepRequirement && cepRequirement.classList.add('invalid');
        }
    });

    cepInput.addEventListener('keydown', function (e) {
        //impede digitação além do limite
        const val = this.value.replace(/\D/g, '');
        if (val.length >= 8 && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && this.selectionStart === this.selectionEnd) {
            e.preventDefault();
        }
    });
});