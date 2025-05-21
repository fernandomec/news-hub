// Formatar telefone para +00 (00) 0000-0000 ou +00 (00) 00000-0000 e validar requisitos visuais
document.addEventListener('DOMContentLoaded', function () {
    const telInput = document.querySelector('input[name="tel"]');
    if (!telInput) return;

    const reqCel = document.querySelector('.requirement:not([data-req-type])'); //assume que o primeiro é celular
    const reqFixo = reqCel ? reqCel.parentElement.querySelectorAll('.requirement')[1] : null;

    function formatTelefone(value) {
        //remove tudo que não é dígito
        value = value.replace(/\D/g, '');
        //limita a 13 dígitos: 2 (país) + 2 (DDD) + 9 (número)
        value = value.slice(0, 13);

        let formatted = '';
        if (value.length > 0) {
            formatted += '+' + value.substring(0, 2);
        }
        if (value.length >= 3) {
            formatted += ' (' + value.substring(2, 4);
        }
        if (value.length >= 4) {
            formatted += ') ';
            if (value.length === 13) {
                // +00 (00) 00000-0000 (celular 9 dígitos)
                formatted += value.substring(4, 9) + '-' + value.substring(9, 13);
            } else if (value.length >= 8) {
                // +00 (00) 0000-0000 (fixo 8 dígitos ou incompleto)
                formatted += value.substring(4, 8);
                if (value.length >= 9) {
                    formatted += '-' + value.substring(8, 12);
                }
            } else if (value.length > 4) {
                formatted += value.substring(4);
            }
        }
        return formatted.trim();
    }

    function validarTelefone(valor) {
        const celPattern = /^\+\d{2} \(\d{2}\) \d{5}-\d{4}$/;
        const fixoPattern = /^\+\d{2} \(\d{2}\) \d{4}-\d{4}$/;
        return {
            cel: celPattern.test(valor),
            fixo: fixoPattern.test(valor)
        };
    }

    telInput.addEventListener('input', function () {
        const formatted = formatTelefone(this.value);
        this.value = formatted;

        //validação visual dos requisitos (verde e vermelho)
        if (reqCel && reqFixo) {
            const valid = validarTelefone(this.value);
            if (valid.cel) {
                reqCel.classList.remove('invalid');
                reqCel.classList.add('valid');
            } else {
                reqCel.classList.remove('valid');
                reqCel.classList.add('invalid');
            }
            if (valid.fixo) {
                reqFixo.classList.remove('invalid');
                reqFixo.classList.add('valid');
            } else {
                reqFixo.classList.remove('valid');
                reqFixo.classList.add('invalid');
            }
        }
    });

    telInput.addEventListener('keydown', function (e) {
        //impede digitação além do limite
        const val = this.value.replace(/\D/g, '');
        if (val.length >= 13 && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key) && this.selectionStart === this.selectionEnd) {
            e.preventDefault();
        }
    });

    //validação inicial ao carregar a página (caso já tenha valor)
    if (telInput.value) {
        const event = new Event('input', { bubbles: true });
        telInput.dispatchEvent(event);
    }
});