document.addEventListener('DOMContentLoaded', function () {
    function initializePasswordValidation(passwordFieldId, requirementsListSelector) {
        const passwordInput = document.getElementById(passwordFieldId);
        const requirementsList = document.querySelector(requirementsListSelector);

        if (!passwordInput) {
            return;
        }
        if (!requirementsList) {
            return;
        }

        const requirements = {
            length: requirementsList.querySelector('.requirement[data-req-type="length"]'),
            number: requirementsList.querySelector('.requirement[data-req-type="number"]'),
            special: requirementsList.querySelector('.requirement[data-req-type="special"]'),
        };

        if (!requirements.length || !requirements.number || !requirements.special) {
            return;
        }

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

    initializePasswordValidation('password', '#registerForm .password-requirements');
    initializePasswordValidation('newPassword', '#editForm .new-password-requirements');
});
