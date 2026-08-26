/* =============================================
   MÓDULO: AUTENTICACIÓN Y SESIÓN
   ============================================= */

const Auth = {
    perfilLoginActual: 'promotor',
    supervisorDesbloqueado: false,
    promotorSession: null,

    init() {
        this._restaurarSesion();
    },

    _restaurarSesion() {
        try {
            const raw = sessionStorage.getItem('auth_session');
            if (raw) {
                const s = JSON.parse(raw);
                if (s && s.rol) {
                    if (s.rol === 'supervisor') {
                        this.supervisorDesbloqueado = true;
                        sessionStorage.setItem('supervisor_unlocked', 'true');
                    } else if (s.rol === 'jefe') {
                        this.supervisorDesbloqueado = true;
                        sessionStorage.setItem('supervisor_unlocked', 'true');
                    }
                }
            }
        } catch (e) {}
    },

    getPerfilLoginActual() {
        return this.perfilLoginActual;
    },

    setPerfilLoginActual(perfil) {
        this.perfilLoginActual = perfil;
    },

    estaSupervisorDesbloqueado() {
        return this.supervisorDesbloqueado || sessionStorage.getItem('supervisor_unlocked') === 'true';
    },

    setSupervisorDesbloqueado(valor) {
        this.supervisorDesbloqueado = valor;
        if (valor) {
            sessionStorage.setItem('supervisor_unlocked', 'true');
        } else {
            sessionStorage.removeItem('supervisor_unlocked');
        }
    },

    getPromotorSession() {
        return this.promotorSession;
    },

    setPromotorSession(session) {
        this.promotorSession = session;
    },

    async ingresarPromotor(email, password) {
        if (typeof HorariosDataStore === 'undefined' || !HorariosDataStore.initialized) {
            if (typeof initHorarios === 'function') {
                initHorarios('supervisor');
                await new Promise(resolve => {
                    const check = () => {
                        if (HorariosDataStore.initialized) resolve();
                        else setTimeout(check, 150);
                    };
                    check();
                });
            }
        }

        const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
        const promotor = promotores.find(p => p.email && p.email.toLowerCase() === email);

        if (!promotor) {
            return { ok: false, error: 'El correo ingresado no se encuentra registrado.' };
        }

        const estado = promotor.estado || 'Activo';
        if (estado !== 'Activo') {
            return { ok: false, error: 'Tu cuenta se encuentra temporalmente suspendida. Comunícate con tu supervisor.' };
        }

        if (!promotor.zona_principal_id) {
            return { ok: false, error: 'No tienes una tienda asignada. Comunícate con tu supervisor.' };
        }

        let passwordValida = false;
        if (promotor.password_hash) {
            const passwordHash = await hashPassword(password);
            passwordValida = promotor.password_hash === passwordHash;
        }
        if (!passwordValida && promotor.password) {
            passwordValida = password === promotor.password;
        }

        if (!passwordValida) {
            return { ok: false, error: 'Contraseña incorrecta.' };
        }

        const session = {
            id: promotor.id,
            nombre: promotor.nombre,
            dni: promotor.dni || '',
            email: promotor.email,
            zona_principal_id: promotor.zona_principal_id,
            rol: 'promotor'
        };

        this.promotorSession = session;
        this._guardarSesionPromotor(session);

        return { ok: true, session };
    },

    async ingresarSupervisor(email, password) {
        const emailNorm = String(email || '').trim().toLowerCase();
        if (!emailNorm) return { ok: false, error: 'Ingresa tu correo electrónico.' };
        if (!password) return { ok: false, error: 'Ingresa tu contraseña.' };

        let lista = [];
        if (typeof db !== 'undefined' && db) {
            try {
                const qs = await db.collection('supervisores').get();
                lista = qs.docs.map(d => Object.assign({ id: d.id }, d.data()));
            } catch (e) {
                lista = (typeof JefeComercialStore !== 'undefined') ? JefeComercialStore.supervisores : [];
            }
        } else {
            lista = (typeof JefeComercialStore !== 'undefined') ? JefeComercialStore.supervisores : [];
        }

        const sup = lista.find(s => s && s.email && String(s.email).trim().toLowerCase() === emailNorm) || null;
        if (!sup) return { ok: false, error: 'El correo ingresado no se encuentra registrado.' };

        let valida = false;
        if (sup.password_hash) {
            const hash = await hashPassword(password);
            valida = hash ? sup.password_hash === hash : false;
        }
        if (!valida && sup.password) valida = password === sup.password;
        if (!valida) return { ok: false, error: 'Contraseña incorrecta.' };

        if (String(sup.estado || 'Activo').toLowerCase() !== 'activo') {
            return { ok: false, error: 'Su cuenta se encuentra inhabilitada. Comuníquese con el Jefe Comercial.' };
        }

        const zona = String(sup.zona || (sup.zonas && sup.zonas[0]) || '').trim();
        if (!zona) {
            return { ok: false, error: 'Su cuenta no tiene una zona asignada. Comuníquese con el Jefe Comercial.' };
        }

        this.supervisorDesbloqueado = true;
        sessionStorage.setItem('supervisor_unlocked', 'true');

        const session = {
            rol: 'supervisor',
            id: sup.id,
            nombre: sup.nombre || sup.id,
            email: sup.email || '',
            zona: zona
        };

        this._guardarSesion(session);
        return { ok: true, session };
    },

    async ingresarJefeComercial(usuario, password) {
        let config = null;
        if (typeof db !== 'undefined' && db) {
            try {
                const snap = await db.collection('config_jefe').doc('credenciales').get();
                config = snap.exists ? snap.data() : null;
            } catch (e) { config = null; }
        }

        if (!config || !config.usuario) {
            return { ok: false, error: 'Configuración de acceso no encontrada. Contacte al administrador.' };
        }

        const usuarioOk = String(config.usuario).trim().toLowerCase() === usuario.trim().toLowerCase();

        let passwordOk = false;
        if (config.password_hash) {
            const hash = await hashPassword(password);
            passwordOk = hash ? config.password_hash === hash : false;
        } else {
            passwordOk = config.password === password;
        }

        if (!usuarioOk || !passwordOk) {
            return { ok: false, error: 'Usuario o contraseña incorrectos.' };
        }

        this.supervisorDesbloqueado = true;
        sessionStorage.setItem('supervisor_unlocked', 'true');

        const session = {
            rol: 'jefe',
            nombre: 'Jefe Comercial'
        };

        this._guardarSesion(session);
        return { ok: true, session };
    },

    _guardarSesion(data) {
        sessionStorage.setItem('auth_session', JSON.stringify(data));
    },

    _guardarSesionPromotor(session) {
        try {
            localStorage.setItem('promotor_session', JSON.stringify(session));
            sessionStorage.setItem('auth_session', JSON.stringify({ ...session, rol: 'promotor' }));
        } catch (e) {}
    },

    cerrarSesionPromotor() {
        this.promotorSession = null;
        try {
            localStorage.removeItem('promotor_session');
            sessionStorage.removeItem('auth_session');
        } catch (e) {}
    },

    bloquearSupervisor() {
        this.supervisorDesbloqueado = false;
        sessionStorage.removeItem('supervisor_unlocked');
    },

    leerSesion() {
        try {
            const raw = sessionStorage.getItem('auth_session');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    guardarSesion(data) {
        this._guardarSesion(data);
    },

    aplicarSesionInicial() {
        const stored = this.leerSesion();
        const promotorStored = this._leerSesionPromotor();

        if (stored && stored.rol === 'supervisor') {
            this.supervisorDesbloqueado = true;
            sessionStorage.setItem('supervisor_unlocked', 'true');
        } else if (stored && stored.rol === 'jefe') {
            this.supervisorDesbloqueado = true;
            sessionStorage.setItem('supervisor_unlocked', 'true');
        }

        if (promotorStored) {
            this.promotorSession = { ...promotorStored };
        }
    },

    _leerSesionPromotor() {
        try {
            const raw = localStorage.getItem('promotor_session');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    getSupervisorZona() {
        try {
            const raw = sessionStorage.getItem('auth_session');
            if (!raw) return null;
            const s = JSON.parse(raw);
            return (s && s.rol === 'supervisor' && s.zona) ? String(s.zona) : null;
        } catch (e) {
            return null;
        }
    },

    isJefeComercial() {
        try {
            const raw = sessionStorage.getItem('auth_session');
            if (!raw) return false;
            const s = JSON.parse(raw);
            return s && s.rol === 'jefe';
        } catch (e) {
            return false;
        }
    },

    logValidacionPromotor() {
        if (!this.promotorSession) return;
        const tienda = this._tiendaPromotorSesion();
        console.log('[VALIDACION] Promotor autenticado:', this.promotorSession.nombre);
        console.log('[VALIDACION] Correo:', this.promotorSession.email);
        console.log('[VALIDACION] Tienda encontrada:', tienda || 'Sin tienda asignada');
    },

    _tiendaPromotorSesion() {
        if (this.estaSupervisorDesbloqueado()) return null;
        if (!this.promotorSession) return null;
        const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
        const id = this.promotorSession.zona_principal_id;
        if (id) {
            const zona = zonas.find(z => z.id === id);
            if (zona) return zona.nombre;
            return id;
        }
        return null;
    }
};

window.Auth = Auth;