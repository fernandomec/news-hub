document.addEventListener('DOMContentLoaded', function() {
    if (window.passwordToggleInitialized) {
        return;
    }
    window.passwordToggleInitialized = true;

    const togglePasswordIcons = document.querySelectorAll('.toggle-password-icon');

    togglePasswordIcons.forEach(icon => {
        icon.addEventListener('click', function() {
            const targetInputId = this.dataset.target;
            const passwordInput = document.getElementById(targetInputId);

            if (passwordInput) {
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    this.textContent = 'visibility_off';
                    this.setAttribute('title', 'Ocultar senha');
                } else {
                    passwordInput.type = 'password';
                    this.textContent = 'visibility';
                    this.setAttribute('title', 'Mostrar senha');
                }
            }
        });
    });
});
