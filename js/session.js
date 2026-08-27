/* =============================================
   MÓDULO: GESTIÓN DE SESIÓN - CAPA DE COMPATIBILIDAD
   Funcionalidad principal movida a Auth (js/auth.js)
   ============================================= */

window._rehidratarSesionPromotor = function() {
    const session = Auth.leerSesion();
    if (session && session.rol === 'promotor' && session.uid) {
        return Auth._hidratarPromotorEnMemoria(session.uid);
    }
    return false;
};

window._tiendaPromotorSesion = function() {
    return Auth._tiendaPromotorSesion();
};

window._pdvsPermitidosPromotor = function() {
    if (Auth.estaSupervisorDesbloqueado()) return null;
    const session = Auth.getPromotorSession();
    if (!session) return null;
    const tienda = Auth._tiendaPromotorSesion();
    return tienda ? [tienda] : null;
};

window._pdvsZonaPromotor = function() {
    if (Auth.estaSupervisorDesbloqueado()) return null;
    const session = Auth.getPromotorSession();
    if (!session) return null;
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const zona = zonas.find(z => z.id === session.zona_principal_id);
    if (!zona) return null;
    const pdvs = (typeof DataStore !== 'undefined' && DataStore.getPDVs) ? DataStore.getPDVs() : [];
    return pdvs.filter(p => String(p.cadena || '').trim().toUpperCase() === String(zona.cadena || '').trim().toUpperCase());
};

window.SessionManager = {
    _rehidratarSesionPromotor: window._rehidratarSesionPromotor,
    _tiendaPromotorSesion: window._tiendaPromotorSesion,
    _pdvsPermitidosPromotor: window._pdvsPermitidosPromotor,
    _pdvsZonaPromotor: window._pdvsZonaPromotor
};