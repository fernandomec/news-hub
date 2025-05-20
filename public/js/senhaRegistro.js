document.addEventListener('DOMContentLoaded', function () {
    const passwordInput = document.getElementById('password');
    const requirements = {
        length: document.querySelector('.requirement[data-req-type="length"]'),
        number: document.querySelector('.requirement[data-req-type="number"]'),
        special: document.querySelector('.requirement[data-req-type="special"]'),
    };

    if (passwordInput && requirements.length && requirements.number && requirements.special) {
        passwordInput.addEventListener('input', function () {
            const value = this.value;

            //tamanho check (8-20 characters)
            if (value.length >= 8 && value.length <= 20) {
                requirements.length.classList.remove('invalid');
                requirements.length.classList.add('valid');
            } else {
                requirements.length.classList.remove('valid');
                requirements.length.classList.add('invalid');
            }

            //numero check
            if (/\d/.test(value)) {
                requirements.number.classList.remove('invalid');
                requirements.number.classList.add('valid');
            } else {
                requirements.number.classList.remove('valid');
                requirements.number.classList.add('invalid');
            }

            //caractere especial check
            if (/[!@#$%^&*]/.test(value)) {
                requirements.special.classList.remove('invalid');
                requirements.special.classList.add('valid');
            } else {
                requirements.special.classList.remove('valid');
                requirements.special.classList.add('invalid');
            }
        });
    }
});
