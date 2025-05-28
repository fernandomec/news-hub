//header fixo ao rolar tela
document.addEventListener('DOMContentLoaded', function() {
    var header = document.querySelector('.site-header');
    var headerHeight = header.offsetHeight;
    var lastFixed = false;

    function fixHeaderOnScroll() {
        if (window.scrollY > headerHeight) {
            if (!lastFixed) {
                header.style.position = 'fixed';
                header.style.top = '0';
                header.style.left = '0';
                header.style.width = '100%';
                header.style.zIndex = '1000';
                document.body.style.paddingTop = headerHeight + 'px';
                lastFixed = true;
            }
        } else {
            if (lastFixed) {
                header.style.position = '';
                header.style.top = '';
                header.style.left = '';
                header.style.width = '';
                header.style.zIndex = '';
                header.classList.remove('header-fixed');
                document.body.style.paddingTop = '';
                lastFixed = false;
            }
        }
    }

    window.addEventListener('scroll', fixHeaderOnScroll);
    window.addEventListener('resize', function() {
        headerHeight = header.offsetHeight;
        fixHeaderOnScroll();
    });
});