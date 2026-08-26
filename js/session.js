/* =============================================
   MÓDULO: GESTIÓN DE SESIÓN PROMOTOR
   ============================================= */

const SessionManager = {
    _rehidratarSesionPromotor() {
        const stored = this._leerSesionPromotor();
        if (stored) {
            window.promotorSession = { ...stored };
            return true;
        }
        return false;
    },

    _leerSesionPromotor() {
        try {
            const raw = localStorage.getItem('promotor_session');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    _tiendaPromotorSesion() {
        if (typeof Auth !== 'undefined' && Auth.estaSupervisorDesbloqueado()) return null;
        _rehidratarSesionPromotor();
        if (!window.promotorSession) return null;
        const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
        const id = window.promotorSession.zona_principal_id;
        if (id) {
            const zona = zonas.find(z => z.id === id);
            if (zona) return zona.nombre;
            return id;
        }
        const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
        const p = (window.promotorSession.id && promotores.find(x => x.id === window.promotorSession.id))
            || (window.promotorSession.email && promotores.find(x => x.email && String(x.email).trim().toLowerCase() === String(window.promotorSession.email).trim().toLowerCase()))
            || null;
        const zonaNueva = (p && (p.zona_principal_id || p.tienda_asignada || p.tienda)) || null;
        if (zonaNueva) {
            window.promotorSession.zona_principal_id = zonaNueva;
            try { localStorage.setItem('promotor_session', JSON.stringify(window.promotorSession)); } catch (e) {}
        }
        return null;
    },

    _pdvsPermitidosPromotor() {
        if (typeof Auth !== 'undefined' && Auth.estaSupervisorDesbloqueado()) return null;
        _rehidratarSesionPromotor();
        if (!window.promotorSession) return null;
        const tienda = _tiendaPromotorSesion();
        return tienda ? [tienda] : null;
    },

    _pdvsZonaPromotor() {
        if (typeof Auth !== 'undefined' && Auth.estaSupervisorDesbloqueado()) return null;
        _rehidratarSesionPromotor();
        if (!window.promotorSession) return null;
        const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
        const zona = zonas.find(z => z.id === window.promotorSession.zona_principal_id);
        if (!zona) return null;
        const pdvs = (typeof DataStore !== 'undefined' && DataStore.getPDVs) ? DataStore.getPDVs() : [];
        return pdvs.filter(p => String(p.cadena || '').trim().toUpperCase() === String(zona.cadena || '').trim().toUpperCase());
    }
};

window.SessionManager = SessionManager;

// Funciones globales para compatibilidad
window._rehidratarSesionPromotor = SessionManager._rehidratarSesionPromotor.bind(SessionManager);
window._tiendaPromotorSesion = SessionManager._tiendaPromotorSesion.bind(SessionManager);
window._pdvsPermitidosPromotor = SessionManager._pdvsPermitidosPromotor.bind(SessionManager);
window._pdvsZonaPromotor = SessionManager._pdvsZonaPromotor.bind(SessionManager);