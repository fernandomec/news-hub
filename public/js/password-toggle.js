document.addEventListener('DOMContentLoaded', function() {
    if (window.passwordToggleInitialized) {
        return;
    }
    window.passwordToggleInitialized = true;

    // Corrige para funcionar com múltiplos campos (ex: user-edit) e não duplicar olhos
    document.querySelectorAll('.password-input-container').forEach(container => {
        const input = container.querySelector('input[type="password"], input[type="text"]');
        let icon = container.querySelector('.toggle-password-icon');
        if (!input) return;

        // Remove ícones duplicados
        container.querySelectorAll('.toggle-password-icon').forEach((el, idx) => {
            if (idx > 0) el.remove();
        });
        icon = container.querySelector('.toggle-password-icon');

        if (!icon) {
            // Cria o ícone se não existir
            const newIcon = document.createElement('span');
            newIcon.className = 'material-symbols-outlined toggle-password-icon';
            newIcon.dataset.target = input.id;
            newIcon.textContent = 'visibility';
            newIcon.title = 'Mostrar senha';
            container.appendChild(newIcon);
            icon = newIcon;
        }

        icon.onclick = function() {
            if (input.type === 'password') {
                input.type = 'text';
                icon.textContent = 'visibility_off';
                icon.title = 'Ocultar senha';
            } else {
                input.type = 'password';
                icon.textContent = 'visibility';
                icon.title = 'Mostrar senha';
            }
        };
    });
});
