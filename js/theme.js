(function () {
    'use strict';

    var root = document.documentElement;
    var btn = document.getElementById('theme-toggle');

    function repintarGraficos() {
        if (typeof repintarTodosLosGraficos === 'function') {
            repintarTodosLosGraficos();
        }
    }

    if (btn) {
        btn.addEventListener('click', function () {
            var actual = root.dataset.theme === 'light' ? 'dark' : 'light';
            root.dataset.theme = actual;
            try {
                localStorage.setItem('dashboard_tema', actual);
            } catch (e) { /* sin almacenamiento */ }
            repintarGraficos();
        });
    }
})();
