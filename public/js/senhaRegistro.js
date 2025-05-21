document.addEventListener('DOMContentLoaded', function () {
    function initializePasswordValidation(passwordFieldId, requirementsListSelector) {
        const passwordInput = document.getElementById(passwordFieldId);
        // Suporta selector de container para requisitos (pode ser .password-requirements ou .new-password-requirements)
        let requirementsList = null;
        if (typeof requirementsListSelector === 'string') {
            requirementsList = document.querySelector(requirementsListSelector);
        } else {
            requirementsList = requirementsListSelector;
        }

        if (!passwordInput || !requirementsList) return;

        const requirements = {
            length: requirementsList.querySelector('.requirement[data-req-type="length"]'),
            number: requirementsList.querySelector('.requirement[data-req-type="number"]'),
            special: requirementsList.querySelector('.requirement[data-req-type="special"]'),
        };

        if (!requirements.length || !requirements.number || !requirements.special) return;

        passwordInput.addEventListener('input', function () {
            const value = this.value;

            if (value.length >= 8 && value.length <= 20) {
                requirements.length.classList.remove('invalid');
                requirements.length.classList.add('valid');
            } else {
                requirements.length.classList.remove('valid');
                requirements.length.classList.add('invalid');
            }

            if (/\d/.test(value)) {
                requirements.number.classList.remove('invalid');
                requirements.number.classList.add('valid');
            } else {
                requirements.number.classList.remove('valid');
                requirements.number.classList.add('invalid');
            }

            if (/[!@#$%^&*]/.test(value)) {
                requirements.special.classList.remove('invalid');
                requirements.special.classList.add('valid');
            } else {
                requirements.special.classList.remove('valid');
                requirements.special.classList.add('invalid');
            }
        });
    }

    // Para register.ejs
    initializePasswordValidation('password', '#registerForm .password-requirements');
    // Para user-edit.ejs
    initializePasswordValidation('newPassword', '#editForm .new-password-requirements-container');
});
