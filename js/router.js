/* =============================================
   MÓDULO: ROUTER Y NAVEGACIÓN
   ============================================= */

const Router = {
    currentPage: 'resumen',
    pageHistory: [],

    init() {
        window.addEventListener('hashchange', () => this._onHashChange());
        this._onHashChange();
    },

    _onHashChange() {
        const hash = window.location.hash.slice(1) || 'resumen';
        this.navigateTo(hash);
    },

    navigateTo(pageId) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(p => p.classList.remove('active'));

        const targetPage = document.getElementById('page-' + pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
            this.pageHistory.push(pageId);
            if (this.pageHistory.length > 10) this.pageHistory.shift();
            this._updateSidebarActive(pageId);
            this._onPageChange(pageId);
        }
    },

    _updateSidebarActive(pageId) {
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            item.classList.toggle('active', item.dataset.page === pageId);
        });
    },

    _onPageChange(pageId) {
        if (typeof window['render' + this._capitalize(pageId)] === 'function') {
            window['render' + this._capitalize(pageId)]();
        }
    },

    _capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    getCurrentPage() {
        return this.currentPage;
    },

    goBack() {
        if (this.pageHistory.length > 1) {
            this.pageHistory.pop();
            const prev = this.pageHistory[this.pageHistory.length - 1];
            this.navigateTo(prev);
        }
    }
};

window.Router = Router;

// Funciones globales para compatibilidad
window.cambiarPagina = (pageId) => Router.navigateTo(pageId);