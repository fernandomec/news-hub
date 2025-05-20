document.addEventListener('DOMContentLoaded', function() {
    const toggleNav = document.getElementById('nav-toggle');
    const barraLateral = document.querySelector('.sidebar');
    const rotulotoggleNav = document.querySelector('.nav-toggle-label');

    if (toggleNav && barraLateral && rotulotoggleNav) {
        document.addEventListener('click', function(evento) {
            if (toggleNav.checked) {
                const cliqueDentroBarraLateral = barraLateral.contains(evento.target);
                const cliqueNoBotaoInterruptor = rotulotoggleNav.contains(evento.target) || evento.target === toggleNav;

                if (!cliqueDentroBarraLateral && !cliqueNoBotaoInterruptor) {
                    toggleNav.checked = false; 
                }
            }
        });
    }
});