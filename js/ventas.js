/* =============================================
   MÓDULO: REGISTRO Y GESTIÓN DE VENTAS
   ============================================= */

const VentasModule = {
    init() {
        this._cache = new Map();
    },

    abrirPanelVentasConSesion() {
        const supervisor = typeof Auth !== 'undefined' ? Auth.estaSupervisorDesbloqueado() : window.estaSupervisorDesbloqueado?.();
        const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
        const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
        const activos = promotores.filter(p => p.estado === 'Activo' && p.zona_principal_id && zonas.some(z => z.id === p.zona_principal_id));

        const tiendaSel = document.getElementById('venta-tienda');
        const promotorSel = document.getElementById('venta-promotor');
        const fechaInput = document.getElementById('venta-fecha');
        const sessionBar = document.getElementById('venta-session-bar');
        const promotorSession = window.promotorSession;

        if (!supervisor && promotorSession) {
            const tiendaNombre = this._tiendaPromotorSesion();
            tiendaSel.innerHTML = '<option value="">Seleccionar tienda...</option>' +
                (tiendaNombre ? '<option value="' + this._escHtml(tiendaNombre) + '">' + this._escHtml(tiendaNombre) + '</option>' : '');
            if (tiendaNombre) tiendaSel.value = tiendaNombre;
            tiendaSel.disabled = true;
            const promo = activos.find(p => p.id === promotorSession.id);
            promotorSel.innerHTML = '<option value="' + this._escHtml(promotorSession.id) + '">' + this._escHtml(promo ? promo.nombre : promotorSession.nombre) + '</option>';
            promotorSel.disabled = true;
            if (sessionBar) {
                sessionBar.style.display = 'flex';
                sessionBar.innerHTML = '<div class="venta-session-user">👤 ' + this._escHtml(promotorSession.nombre) + '</div>' +
                    '<button type="button" class="venta-session-logout" onclick="cerrarSesionPromotor()">Cerrar sesión</button>';
            }
        } else {
            tiendaSel.disabled = false;
            promotorSel.disabled = false;
            tiendaSel.innerHTML = '<option value="">Seleccionar tienda...</option>' +
                zonas.map(z => '<option value="' + this._escHtml(z.nombre) + '">' + this._escHtml(z.nombre) + '</option>').join('');
            promotorSel.innerHTML = '<option value="">Seleccionar promotor...</option>' +
                activos.map(p => '<option value="' + p.id + '">' + this._escHtml(p.nombre) + (p.dni ? ' · ' + this._escHtml(p.dni) : '') + '</option>').join('');
            if (sessionBar) {
                if (promotorSession) {
                    sessionBar.style.display = 'flex';
                    sessionBar.innerHTML = '<div class="venta-session-user">👤 ' + this._escHtml(promotorSession.nombre) + '</div>' +
                        '<button type="button" class="venta-session-logout" onclick="cerrarSesionPromotor()">Cerrar sesión</button>';
                } else {
                    sessionBar.style.display = 'none';
                    sessionBar.innerHTML = '';
                }
            }
        }

        if (typeof window.logValidacionPromotor === 'function') window.logValidacionPromotor();

        fechaInput.value = this._formatearFechaLocal(new Date());
        this.cargarVentasCalendario();
    },

    _tiendaPromotorSesion() {
        if (typeof SessionManager !== 'undefined' && typeof SessionManager._tiendaPromotorSesion === 'function') {
            return SessionManager._tiendaPromotorSesion();
        }
        return null;
    },

    _formatearFechaLocal(date) {
        const d = date ? new Date(date) : new Date();
        const anio = d.getFullYear();
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const dia = String(d.getDate()).padStart(2, '0');
        return anio + '-' + mes + '-' + dia;
    },

    _escHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&').replace(/</g, '<')
            .replace(/>/g, '>').replace(/"/g, '"')
            .replace(/'/g, '\x27');
    },

    cargarVentasCalendario() {
        console.log('[VENTAS] Cargando calendario de ventas');
    },

    guardarRegistroVentas() {
        console.log('[VENTAS] Guardando registro de ventas');
    }
};

window.VentasModule = VentasModule;
