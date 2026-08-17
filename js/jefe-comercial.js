/* =============================================
   MÓDULO: JEFE COMERCIAL
   Rol jerárquico superior al Supervisor.
   - Gestión de Supervisores
   - Gestión de Zonas
   - Dashboard General
   - Ranking de Supervisores
   ============================================= */

const SUPERVISORES_COLLECTION = 'supervisores';
const ZONAS_COMERCIALES_COLLECTION = 'zonas_comerciales';
const JEFE_COMERCIAL_USUARIO = 'jefe';
const JEFE_COMERCIAL_PASSWORD = 'Adecco2019@';

function jefeEsc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function jefeMoneda(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function jefePct(n) {
    return Number(n || 0).toFixed(1) + '%';
}

function jefeEsActivo(estado) {
    return !String(estado || 'Activo').toLowerCase().startsWith('inact');
}

/* =============================================
   STORE: datos de supervisores, zonas y jefe
   ============================================= */

const JefeComercialStore = {
    supervisores: [],
    zonas: [],
    initialized: false,
    _firestoreLoaded: false,
    _unsubSup: null,
    _unsubZonas: null,
    onUpdate: null,

    init() {
        if (this.initialized) return;
        this.initialized = true;
        this._cargarSupervisores();
        this._cargarZonas();
    },

    _cargarSupervisores() {
        if (typeof db === 'undefined' || !db) return;
        if (this._unsubSup) this._unsubSup();
        this._unsubSup = db.collection(SUPERVISORES_COLLECTION).onSnapshot(snap => {
            this.supervisores = [];
            snap.forEach(doc => {
                const d = doc.data() || {};
                this.supervisores.push(Object.assign({ id: d.id || doc.id }, d));
            });
            this._firestoreLoaded = true;
            if (typeof this.onUpdate === 'function') this.onUpdate();
        }, () => {});
    },

    _cargarZonas() {
        if (typeof db === 'undefined' || !db) return;
        if (this._unsubZonas) this._unsubZonas();
        this._unsubZonas = db.collection(ZONAS_COMERCIALES_COLLECTION).onSnapshot(snap => {
            this.zonas = [];
            snap.forEach(doc => {
                const d = doc.data() || {};
                this.zonas.push(Object.assign({ id: d.id || doc.id }, d));
            });
            if (typeof this.onUpdate === 'function') this.onUpdate();
        }, () => {});
    },

    getSupervisoresActivos() {
        return this.supervisores.filter(s => jefeEsActivo(s.estado));
    },

    getZonasActivas() {
        return this.zonas.filter(z => jefeEsActivo(z.estado));
    },

    crearSupervisor(datos) {
        const id = String(datos.id || '').trim();
        if (!id) return Promise.reject(new Error('Ingresa el nombre de usuario del supervisor.'));
        const doc = {
            id: id,
            nombre: datos.nombre || '',
            email: datos.email || '',
            password: datos.password || '',
            password_hash: datos.password_hash || '',
            telefono: datos.telefono || '',
            zonas: Array.isArray(datos.zonas) ? datos.zonas : [],
            estado: datos.estado || 'Activo',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        return db.collection(SUPERVISORES_COLLECTION).doc(id).set(doc);
    },

    editarSupervisor(id, cambios) {
        const upd = Object.assign({ updatedAt: new Date().toISOString() }, cambios);
        return db.collection(SUPERVISORES_COLLECTION).doc(id).update(upd).catch(() =>
            db.collection(SUPERVISORES_COLLECTION).doc(id).set(Object.assign({ id: id }, upd))
        );
    },

    cambiarContrasenaSupervisor(id, password) {
        const promesaHash = (typeof hashPassword === 'function')
            ? hashPassword(password)
            : Promise.resolve('');
        return promesaHash.then(hash => {
            return db.collection(SUPERVISORES_COLLECTION).doc(id).update({
                password: password,
                password_hash: hash || '',
                updatedAt: new Date().toISOString()
            });
        });
    },

    eliminarSupervisor(id) {
        return db.collection(SUPERVISORES_COLLECTION).doc(id).delete();
    },

    crearZona(nombre) {
        const n = String(nombre || '').trim();
        if (!n) return Promise.reject(new Error('Ingresa el nombre de la zona.'));
        const id = n.toUpperCase();
        return db.collection(ZONAS_COMERCIALES_COLLECTION).doc(id).set({
            id: id,
            nombre: n,
            pdvs: [],
            estado: 'Activa',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    },

    editarZona(id, cambios) {
        const upd = Object.assign({ updatedAt: new Date().toISOString() }, cambios);
        return db.collection(ZONAS_COMERCIALES_COLLECTION).doc(id).update(upd).catch(() =>
            db.collection(ZONAS_COMERCIALES_COLLECTION).doc(id).set(Object.assign({ id: id }, upd))
        );
    },

    eliminarZona(id) {
        const promesas = [];
        promesas.push(db.collection(ZONAS_COMERCIALES_COLLECTION).doc(id).delete());
        const zonales = this.supervisores.filter(s => (s.zonas || []).indexOf(id) !== -1);
        zonales.forEach(s => {
            const nuevas = (s.zonas || []).filter(z => z !== id);
            promesas.push(this.editarSupervisor(s.id, { zonas: nuevas }));
        });
        return Promise.all(promesas);
    }
};

/* =============================================
   AUTENTICACIÓN DEL JEFE COMERCIAL
   Usuario + Contraseña. Acceso independiente.
   ============================================= */

async function ingresarJefeComercial() {
    const usuario = document.getElementById('login-jefe-usuario').value.trim().toLowerCase();
    const password = document.getElementById('login-jefe-password').value;
    const btn = document.getElementById('login-jefe-submit');

    if (!usuario) { setErrorLogin('login-jefe-error', 'Ingresa tu usuario.'); return; }
    if (!password) { setErrorLogin('login-jefe-error', 'Ingresa tu contraseña.'); return; }

    btn.classList.add('loading');

    let config = null;
    if (typeof db !== 'undefined' && db) {
        try {
            const snap = await db.collection('config_jefe').doc('credenciales').get();
            config = snap.exists ? snap.data() : null;
        } catch (e) { config = null; }
    }

    const usuarioOk = config && config.usuario
        ? String(config.usuario).trim().toLowerCase() === usuario
        : String(JEFE_COMERCIAL_USUARIO).trim().toLowerCase() === usuario;

    let passwordOk = false;
    if (config && config.usuario) {
        if (config.password_hash) {
            const hash = await hashPassword(password);
            passwordOk = hash ? config.password_hash === hash : config.password === password;
        } else {
            passwordOk = config.password === password;
        }
    } else {
        passwordOk = password === JEFE_COMERCIAL_PASSWORD;
    }

    btn.classList.remove('loading');

    if (!usuarioOk || !passwordOk) {
        setErrorLogin('login-jefe-error', 'Usuario o contraseña incorrectos.');
        return;
    }

    sessionStorage.setItem('supervisor_unlocked', 'true');
    guardarSesion({ rol: 'jefe', nombre: 'Jefe Comercial' });
    if (typeof JefeComercialStore !== 'undefined' && typeof JefeComercialStore.init === 'function') JefeComercialStore.init();
    aplicarSesionInicial();
}

/* =============================================
   HELPERS DE PERIODO / AGREGACIÓN
   ============================================= */

function jefePeriodoEfectivo() {
    let desde = null;
    let hasta = null;
    if (typeof DataStore !== 'undefined' && DataStore.getFiltrosFecha) {
        const f = DataStore.getFiltrosFecha();
        if (f.desde && f.hasta) { desde = f.desde; hasta = f.hasta; }
    }
    if (!desde || !hasta) {
        const hoy = new Date();
        const m = String(hoy.getMonth() + 1).padStart(2, '0');
        const d = String(hoy.getDate()).padStart(2, '0');
        desde = hoy.getFullYear() + '-' + m + '-01';
        hasta = hoy.getFullYear() + '-' + m + '-' + d;
    }
    return { desde, hasta };
}

function jefeVentasPeriodo() {
    const p = jefePeriodoEfectivo();
    return typeof DataStore !== 'undefined' && DataStore.getVentasEnRango
        ? DataStore.getVentasEnRango(p.desde, p.hasta)
        : [];
}

function jefeCuotasPeriodo() {
    const p = jefePeriodoEfectivo();
    return typeof DataStore !== 'undefined' && DataStore.getCuotasEnRango
        ? DataStore.getCuotasEnRango(p.desde, p.hasta)
        : [];
}

function jefePDVsDeZona(zona) {
    const asignados = (zona && zona.pdvs || []).map(x => String(x)).filter(Boolean);
    if (asignados.length > 0) return asignados;

    // Fallback por cadena: si la zona coincide con una cadena comercial,
    // agrupa todas las tiendas de esa cadena (ej. "AREQUIPA SUR").
    const nombre = String(zona && zona.nombre || '').trim();
    if (nombre && typeof DataStore !== 'undefined' && DataStore.getPDVObjects) {
        const todos = DataStore.getPDVObjects();
        const match = todos
            .filter(t => String(t.cadena || '').trim().toUpperCase() === nombre.toUpperCase())
            .map(t => t.nombre);
        if (match.length > 0) return match;
    }
    return [];
}

function jefeStatsZona(zona, ventas, cuotas) {
    const pdvs = jefePDVsDeZona(zona);
    const set = new Set(pdvs);
    let venta = 0;
    let meta = 0;
    ventas.forEach(v => { if (set.has(v.punto_venta)) venta += (v.venta || 0); });
    cuotas.forEach(c => { if (set.has(c.punto_venta)) meta += (c.cuota || 0); });
    const cumplimiento = meta > 0 ? (venta / meta) * 100 : 0;
    return { zona: zona, pdvs: pdvs, venta: venta, meta: meta, cumplimiento: cumplimiento };
}

function jefeStatsSupervisor(sup, ventas, cuotas, zonasById) {
    const supZonas = (sup.zonas || []).map(z => String(z));
    const pdvsSet = new Set();
    supZonas.forEach(zid => {
        const zona = zonasById.get(zid);
        if (zona) jefePDVsDeZona(zona).forEach(p => pdvsSet.add(p));
    });
    let venta = 0;
    let meta = 0;
    ventas.forEach(v => { if (pdvsSet.has(v.punto_venta)) venta += (v.venta || 0); });
    cuotas.forEach(c => { if (pdvsSet.has(c.punto_venta)) meta += (c.cuota || 0); });
    const cumplimiento = meta > 0 ? (venta / meta) * 100 : 0;
    return { sup: sup, venta: venta, meta: meta, cumplimiento: cumplimiento, zonas: supZonas };
}

function jefeRenderGuard(contenedorId) {
    if (!leerSesion() || leerSesion().rol !== 'jefe') return false;
    const el = document.getElementById(contenedorId);
    return !!el;
}

/* =============================================
   DASHBOARD GENERAL
   Venta Total · Venta por Zona · Meta por Zona ·
   Ranking de Zonas · Ranking de Supervisores ·
   Mejor Zona · Zona en Riesgo
   ============================================= */

let jefeChartZonas = null;

function jefeDestroyChartZonas() {
    if (jefeChartZonas) {
        jefeChartZonas.destroy();
        jefeChartZonas = null;
    }
}

function renderJefeDashboard() {
    if (!jefeRenderGuard('page-jefe-dashboard')) return;
    if (typeof JefeComercialStore !== 'undefined' && !JefeComercialStore.initialized) JefeComercialStore.init();

    renderPeriodoAnalizado('periodo-analizado-jefe');
    poblarSelectMes('jefe');
    sincronizarInputsFecha();

    const ventas = jefeVentasPeriodo();
    const cuotas = jefeCuotasPeriodo();
    const zonas = JefeComercialStore.zonas;
    const supervisores = JefeComercialStore.supervisores;

    const kpiContainer = document.getElementById('jefe-kpis');
    const rankZonas = document.getElementById('jefe-ranking-zonas');
    const rankSup = document.getElementById('jefe-ranking-supervisores');

    if (!JefeComercialStore._firestoreLoaded || zonas.length === 0) {
        if (kpiContainer) kpiContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:20px;"><p>Cargando datos de zonas y supervisores...</p></div>';
        if (rankZonas) rankZonas.innerHTML = '<div class="ctl-card"><div class="empty-state"><p>Cargando zonas...</p></div></div>';
        if (rankSup) rankSup.innerHTML = '';
        return;
    }

    const zonasById = new Map(zonas.map(z => [z.id, z]));
    const zonasStats = zonas.map(z => jefeStatsZona(z, ventas, cuotas));
    zonasStats.sort((a, b) => b.venta - a.venta);

    const supStats = supervisores.map(s => jefeStatsSupervisor(s, ventas, cuotas, zonasById));
    supStats.sort((a, b) => b.venta - a.venta);

    const ventaTotal = zonasStats.reduce((s, z) => s + z.venta, 0);
    const metaTotal = zonasStats.reduce((s, z) => s + z.meta, 0);
    const cumplimientoTotal = metaTotal > 0 ? (ventaTotal / metaTotal) * 100 : 0;

    const zonasConMeta = zonasStats.filter(z => z.meta > 0);
    const mejorZona = zonasStats.length > 0 ? zonasStats[0] : null;
    const zonaRiesgo = zonasConMeta.length > 0
        ? zonasConMeta.reduce((a, b) => a.cumplimiento <= b.cumplimiento ? a : b)
        : null;

    if (kpiContainer) {
        kpiContainer.innerHTML =
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Venta Total</span><span class="ctl-kpi-value green">' + jefeMoneda(ventaTotal) + '</span><span class="ctl-kpi-sub">acumulado del periodo</span></div>' +
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Meta Total</span><span class="ctl-kpi-value blue">' + jefeMoneda(metaTotal) + '</span><span class="ctl-kpi-sub">cuota asignada</span></div>' +
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Cumplimiento</span><span class="ctl-kpi-value ' + (cumplimientoTotal >= 80 ? 'green' : cumplimientoTotal >= 50 ? 'yellow' : 'red') + '">' + jefePct(cumplimientoTotal) + '</span><span class="ctl-kpi-sub">avance general</span></div>' +
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Mejor Zona</span><span class="ctl-kpi-value yellow">' + (mejorZona ? jefeEsc(mejorZona.zona.nombre) : '\u2014') + '</span><span class="ctl-kpi-sub">mayor venta</span></div>' +
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Zona en Riesgo</span><span class="ctl-kpi-value red">' + (zonaRiesgo ? jefeEsc(zonaRiesgo.zona.nombre) : '\u2014') + '</span><span class="ctl-kpi-sub">menor cumplimiento</span></div>' +
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Supervisores</span><span class="ctl-kpi-value purple">' + supervisores.length + '</span><span class="ctl-kpi-sub">' + JefeComercialStore.getSupervisoresActivos().length + ' activos</span></div>' +
            '<div class="ctl-kpi"><span class="ctl-kpi-label">Zonas</span><span class="ctl-kpi-value purple">' + zonas.length + '</span><span class="ctl-kpi-sub">' + JefeComercialStore.getZonasActivas().length + ' activas</span></div>';
    }

    jefeRenderRankingZonas(rankZonas, zonasStats);
    jefeRenderRankingSupervisores(rankSup, supStats, zonasById);
    jefeRenderChartZonas(ventas, zonasById, zonasStats);
}

function jefeRenderRankingZonas(container, zonasStats) {
    if (!container) return;
    if (zonasStats.length === 0) {
        container.innerHTML = '<div class="ctl-card"><div class="empty-state"><p>No existen zonas comerciales registradas.</p></div></div>';
        return;
    }
    const filas = zonasStats.map((z, i) => {
        const badge = jefeSemaforoBadge(z.cumplimiento);
        return '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + (i + 1) + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + jefeEsc(z.zona.nombre) + '</td>' +
            '<td>' + z.pdvs.length + '</td>' +
            '<td>' + jefeMoneda(z.venta) + '</td>' +
            '<td>' + jefeMoneda(z.meta) + '</td>' +
            '<td>' + ctlBarCell(z.cumplimiento) + '</td>' +
            '<td>' + badge + '</td>' +
            '</tr>';
    }).join('');

    container.innerHTML =
        '<div class="ctl-card">' +
            '<div class="ctl-card-title">\ud83c\udf10 Ranking de Zonas</div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table">' +
                '<thead><tr>' +
                    '<th class="ctl-th-left">#</th>' +
                    '<th class="ctl-th-left">Zona</th>' +
                    '<th>PDVs</th>' +
                    '<th>Venta</th>' +
                    '<th>Meta</th>' +
                    '<th>Cumplimiento</th>' +
                    '<th>Estado</th>' +
                '</tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table></div>' +
        '</div>';
}

function jefeRenderRankingSupervisores(container, supStats, zonasById) {
    if (!container) return;
    if (supStats.length === 0) {
        container.innerHTML = '<div class="ctl-card"><div class="empty-state"><p>No existen supervisores registrados.</p></div></div>';
        return;
    }
    const filas = supStats.map((s, i) => {
        const nombresZonas = s.zonas
            .map(zid => { const z = zonasById.get(zid); return z ? z.nombre : zid; })
            .filter(Boolean)
            .join(', ');
        const badge = jefeSemaforoBadge(s.cumplimiento);
        return '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + (i + 1) + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + jefeEsc(s.sup.nombre || s.sup.id) + '</td>' +
            '<td class="ctl-td-left">' + jefeEsc(nombresZonas || '\u2014') + '</td>' +
            '<td>' + jefeMoneda(s.venta) + '</td>' +
            '<td>' + jefeMoneda(s.meta) + '</td>' +
            '<td>' + ctlBarCell(s.cumplimiento) + '</td>' +
            '<td>' + badge + '</td>' +
            '</tr>';
    }).join('');

    container.innerHTML =
        '<div class="ctl-card">' +
            '<div class="ctl-card-title">\ud83c\udfc6 Ranking de Supervisores</div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table">' +
                '<thead><tr>' +
                    '<th class="ctl-th-left">Pos.</th>' +
                    '<th class="ctl-th-left">Supervisor</th>' +
                    '<th class="ctl-th-left">Zona</th>' +
                    '<th>Venta</th>' +
                    '<th>Meta</th>' +
                    '<th>Cumplimiento</th>' +
                    '<th>Estado</th>' +
                '</tr></thead>' +
                '<tbody>' + filas + '</tbody>' +
            '</table></div>' +
        '</div>';
}

function jefeSemaforoBadge(pct) {
    const estado = pct >= 100 ? 'Cumple' : pct >= 80 ? 'Riesgo' : pct >= 50 ? 'Alerta' : 'Cr\u00edtico';
    const cls = pct >= 100 ? 'cumple' : pct >= 80 ? 'riesgo' : pct >= 50 ? 'alerta' : 'critico';
    return '<span class="ctl-semaforo ' + cls + '"><span class="dot"></span>' + estado + '</span>';
}

function jefeRenderChartZonas(ventas, zonasById, zonasStats) {
    const canvas = document.getElementById('jefeChartZonas');
    if (!canvas || typeof Chart === 'undefined') return;
    jefeDestroyChartZonas();

    const labels = zonasStats.map(z => z.zona.nombre);
    const valores = zonasStats.map(z => z.venta);
    const colores = zonasStats.map(z => z.cumplimiento >= 80 ? '#1DB954' : z.cumplimiento >= 50 ? '#F59E0B' : '#EF4444');

    const ctx = canvas.getContext('2d');
    jefeChartZonas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Venta',
                data: valores,
                backgroundColor: colores.map(c => c + 'CC'),
                borderColor: colores,
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: () => (typeof temaCss === 'function') ? temaCss('--chart-tooltip2') : '#1e1e2f',
                    titleColor: () => (typeof temaCss === 'function') ? temaCss('--t-text') : '#fff',
                    bodyColor: () => (typeof temaCss === 'function') ? temaCss('--chart-tick') : '#ccc',
                    borderColor: () => (typeof temaCss === 'function') ? temaCss('--chart-tooltip-border') : '#333',
                    borderWidth: 1,
                    callbacks: { label: c => jefeMoneda(c.parsed.y) }
                }
            },
            scales: {
                x: {
                    ticks: { color: () => (typeof temaCss === 'function') ? temaCss('--chart-tick') : '#999', font: { size: 10 } },
                    grid: { display: false }
                },
                y: {
                    beginAtZero: true,
                    ticks: { color: () => (typeof temaCss === 'function') ? temaCss('--chart-tick') : '#999', font: { size: 10 }, callback: v => 'S/ ' + v },
                    grid: { color: () => (typeof temaCss === 'function') ? temaCss('--chart-grid2') : '#333' }
                }
            }
        }
    });
}

/* =============================================
   RANKING DE SUPERVISORES (página dedicada)
   ============================================= */

function renderJefeRanking() {
    if (!jefeRenderGuard('page-jefe-ranking')) return;
    if (typeof JefeComercialStore !== 'undefined' && !JefeComercialStore.initialized) JefeComercialStore.init();

    renderPeriodoAnalizado('periodo-analizado-jefe-ranking');
    poblarSelectMes('jefe-ranking');
    sincronizarInputsFecha();

    const ventas = jefeVentasPeriodo();
    const cuotas = jefeCuotasPeriodo();
    const supervisores = JefeComercialStore.supervisores;
    const zonasById = new Map(JefeComercialStore.zonas.map(z => [z.id, z]));

    const heroStats = document.getElementById('jefe-ranking-hero-stats');
    if (heroStats) {
        heroStats.innerHTML = '' +
            '<div class="ranking-hero-stat"><span class="ranking-hero-stat-label">Supervisores</span><span class="ranking-hero-stat-value">' + supervisores.length + '</span></div>' +
            '<div class="ranking-hero-stat"><span class="ranking-hero-stat-label">Activos</span><span class="ranking-hero-stat-value">' + JefeComercialStore.getSupervisoresActivos().length + '</span></div>';
    }

    const tbody = document.getElementById('jefe-ranking-tbody');
    if (!tbody) return;
    if (supervisores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state"><p>No existen supervisores registrados.</p></div></td></tr>';
        return;
    }

    const supStats = supervisores.map(s => jefeStatsSupervisor(s, ventas, cuotas, zonasById));
    supStats.sort((a, b) => b.venta - a.venta);

    tbody.innerHTML = supStats.map((s, i) => {
        const nombresZonas = s.zonas
            .map(zid => { const z = zonasById.get(zid); return z ? z.nombre : zid; })
            .filter(Boolean)
            .join(', ');
        const medalla = i < 3 ? ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'][i] : '';
        return '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + (i + 1) + ' ' + medalla + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + jefeEsc(s.sup.nombre || s.sup.id) + '</td>' +
            '<td class="ctl-td-left">' + jefeEsc(nombresZonas || '\u2014') + '</td>' +
            '<td>' + jefeMoneda(s.venta) + '</td>' +
            '<td>' + jefeMoneda(s.meta) + '</td>' +
            '<td>' + ctlBarCell(s.cumplimiento) + '</td>' +
            '</tr>';
    }).join('');
}

/* =============================================
   GESTIÓN DE SUPERVISORES
   ============================================= */

function renderJefeSupervisores() {
    if (!jefeRenderGuard('page-jefe-supervisores')) return;
    if (typeof JefeComercialStore !== 'undefined' && !JefeComercialStore.initialized) JefeComercialStore.init();

    const tbody = document.getElementById('jefe-tabla-supervisores');
    if (!tbody) return;

    const zonasById = new Map(JefeComercialStore.zonas.map(z => [z.id, z]));
    const supervisores = JefeComercialStore.supervisores;

    if (!JefeComercialStore._firestoreLoaded || supervisores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state"><p>' +
            (JefeComercialStore._firestoreLoaded ? 'No existen supervisores registrados. Crea el primero con el bot&oacute;n «Nuevo Supervisor».' : 'Cargando supervisores...') +
            '</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = supervisores.map(s => {
        const nombresZonas = (s.zonas || [])
            .map(zid => { const z = zonasById.get(zid); return z ? z.nombre : zid; })
            .filter(Boolean)
            .join(', ');
        const activo = jefeEsActivo(s.estado);
        const estadoBadge = '<span class="promo-estado-badge ' + (activo ? 'activa' : 'inactiva') + '">' + (activo ? 'Activo' : 'Inactivo') + '</span>';
        return '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + jefeEsc(s.nombre || s.id) + '</td>' +
            '<td class="ctl-td-left">' + jefeEsc(s.email || '\u2014') + '</td>' +
            '<td class="ctl-td-left">' + jefeEsc(s.telefono || '\u2014') + '</td>' +
            '<td class="ctl-td-left">' + jefeEsc(nombresZonas || '\u2014') + '</td>' +
            '<td>' + estadoBadge + '</td>' +
            '<td class="jefe-actions-cell">' +
                '<button class="jefe-btn-action" title="Editar supervisor" onclick="jefeAbrirModalSupervisor(\'' + jefeEsc(s.id) + '\')">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
                '</button>' +
                '<button class="jefe-btn-action" title="Cambiar contrase\u00f1a" onclick="jefeAbrirModalPassword(\'' + jefeEsc(s.id) + '\')">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' +
                '</button>' +
                (activo
                    ? '<button class="jefe-btn-action jefe-btn-pause" title="Desactivar" onclick="jefeToggleSupervisorEstado(\'' + jefeEsc(s.id) + '\')">' +
                        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
                      '</button>'
                    : '<button class="jefe-btn-action jefe-btn-react" title="Activar" onclick="jefeToggleSupervisorEstado(\'' + jefeEsc(s.id) + '\')">' +
                        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
                      '</button>') +
                '<button class="jefe-btn-action jefe-btn-delete" title="Eliminar" onclick="jefeEliminarSupervisor(\'' + jefeEsc(s.id) + '\')">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                '</button>' +
            '</td>' +
            '</tr>';
    }).join('');
}

function jefeAbrirModalSupervisor(id) {
    const sup = id ? JefeComercialStore.supervisores.find(s => s.id === id) : null;
    const zonas = JefeComercialStore.zonas;
    const supZonas = new Set((sup && sup.zonas || []).map(String));

    const zonaChecks = zonas.length > 0
        ? zonas.map(z => {
            const checked = supZonas.has(z.id) ? ' checked' : '';
            return '<label class="jefe-check"><input type="checkbox" name="jefe-sup-zonas" value="' + jefeEsc(z.id) + '"' + checked + '>' + jefeEsc(z.nombre) + '</label>';
        }).join('')
        : '<p class="jefe-form-aviso">A&uacute;n no existen zonas. Crea una zona antes de asignarla.</p>';

    const titulo = sup ? 'Editar Supervisor' : 'Nuevo Supervisor';
    jefeAbrirModal(
        titulo,
        '<div class="jefe-form-grid">' +
            '<div class="jefe-form-group"><label class="jefe-form-label">Usuario *</label>' +
                '<input type="text" id="jefe-sup-id" class="jefe-form-input" value="' + jefeEsc(sup ? sup.id : '') + '"' + (sup ? ' disabled' : '') + ' placeholder="ej. juan.supervisor">' +
            '</div>' +
            '<div class="jefe-form-group"><label class="jefe-form-label">Nombre *</label>' +
                '<input type="text" id="jefe-sup-nombre" class="jefe-form-input" value="' + jefeEsc(sup ? sup.nombre : '') + '" placeholder="Nombre completo">' +
            '</div>' +
            '<div class="jefe-form-group"><label class="jefe-form-label">Correo *</label>' +
                '<input type="email" id="jefe-sup-email" class="jefe-form-input" value="' + jefeEsc(sup ? sup.email : '') + '" placeholder="correo@empresa.com">' +
            '</div>' +
            '<div class="jefe-form-group"><label class="jefe-form-label">Tel&eacute;fono</label>' +
                '<input type="tel" id="jefe-sup-telefono" class="jefe-form-input" value="' + jefeEsc(sup ? sup.telefono : '') + '" placeholder="999 999 999">' +
            '</div>' +
            '<div class="jefe-form-group"><label class="jefe-form-label">Contrase&ntilde;a ' + (sup ? '(dejar vac&iacute;o para mantenerla)' : '*') + '</label>' +
                '<input type="password" id="jefe-sup-password" class="jefe-form-input" placeholder="********">' +
            '</div>' +
            '<div class="jefe-form-group"><label class="jefe-form-label">Estado</label>' +
                '<select id="jefe-sup-estado" class="jefe-form-input">' +
                    '<option value="Activo"' + (!sup || sup.estado === 'Activo' ? ' selected' : '') + '>Activo</option>' +
                    '<option value="Inactivo"' + (sup && sup.estado === 'Inactivo' ? ' selected' : '') + '>Inactivo</option>' +
                '</select>' +
            '</div>' +
            '<div class="jefe-form-group jefe-form-full"><label class="jefe-form-label">Zona(s) asignada(s)</label>' +
                '<div class="jefe-checks">' + zonaChecks + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary" onclick="jefeCerrarModal()">Cancelar</button>' +
            '<button type="button" class="btn btn-primary" onclick="jefeGuardarSupervisor(' + (sup ? "'" + jefeEsc(sup.id) + "'" : 'null') + ')">Guardar</button>' +
        '</div>'
    );
}

async function jefeGuardarSupervisor(id) {
    const nombre = document.getElementById('jefe-sup-nombre').value.trim();
    const email = document.getElementById('jefe-sup-email').value.trim().toLowerCase();
    const telefono = document.getElementById('jefe-sup-telefono').value.trim();
    const password = document.getElementById('jefe-sup-password').value;
    const estado = document.getElementById('jefe-sup-estado').value;
    const zonas = Array.from(document.querySelectorAll('input[name="jefe-sup-zonas"]:checked')).map(c => c.value);

    if (!nombre) { mostrarNotificacion('Ingresa el nombre del supervisor.', 'error'); return; }
    if (!email) { mostrarNotificacion('Ingresa el correo del supervisor.', 'error'); return; }
    if (email.indexOf('@') === -1) { mostrarNotificacion('Correo inv\u00e1lido.', 'error'); return; }
    if (!id && !password) { mostrarNotificacion('Ingresa una contrase\u00f1a para el nuevo supervisor.', 'error'); return; }

    const cambios = { nombre: nombre, email: email, telefono: telefono, zonas: zonas, estado: estado };
    if (password) {
        const hash = (typeof hashPassword === 'function') ? await hashPassword(password) : '';
        cambios.password = password;
        cambios.password_hash = hash || '';
    }

    try {
        if (id) {
            await JefeComercialStore.editarSupervisor(id, cambios);
        } else {
            const uid = document.getElementById('jefe-sup-id').value.trim();
            if (!uid) { mostrarNotificacion('Ingresa el usuario del supervisor.', 'error'); return; }
            cambios.id = uid;
            cambios.password = cambios.password || password;
            await JefeComercialStore.crearSupervisor(cambios);
        }
        jefeCerrarModal();
        mostrarNotificacion('Supervisor guardado correctamente.', 'success');
        renderJefeSupervisores();
    } catch (e) {
        console.error('Error al guardar supervisor:', e);
        mostrarNotificacion('No se pudo guardar el supervisor. Verifica que el usuario no est\u00e9 repetido.', 'error');
    }
}

function jefeAbrirModalPassword(id) {
    const sup = JefeComercialStore.supervisores.find(s => s.id === id);
    if (!sup) return;
    jefeAbrirModal(
        'Cambiar Contrase\u00f1a \u00b7 ' + (sup.nombre || sup.id),
        '<div class="jefe-form-grid">' +
            '<div class="jefe-form-group jefe-form-full"><label class="jefe-form-label">Nueva contrase\u00f1a *</label>' +
                '<input type="password" id="jefe-pwd-nueva" class="jefe-form-input" placeholder="Nueva contrase\u00f1a">' +
            '</div>' +
            '<div class="jefe-form-group jefe-form-full"><label class="jefe-form-label">Confirmar contrase\u00f1a *</label>' +
                '<input type="password" id="jefe-pwd-confirmar" class="jefe-form-input" placeholder="Repite la contrase\u00f1a">' +
            '</div>' +
        '</div>' +
        '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary" onclick="jefeCerrarModal()">Cancelar</button>' +
            '<button type="button" class="btn btn-primary" onclick="jefeGuardarPassword(\'' + jefeEsc(id) + '\')">Guardar contrase\u00f1a</button>' +
        '</div>'
    );
}

async function jefeGuardarPassword(id) {
    const nueva = document.getElementById('jefe-pwd-nueva').value;
    const confirmar = document.getElementById('jefe-pwd-confirmar').value;
    if (!nueva || nueva.length < 4) { mostrarNotificacion('La contrase\u00f1a debe tener al menos 4 caracteres.', 'error'); return; }
    if (nueva !== confirmar) { mostrarNotificacion('Las contrase\u00f1as no coinciden.', 'error'); return; }
    try {
        await JefeComercialStore.cambiarContrasenaSupervisor(id, nueva);
        jefeCerrarModal();
        mostrarNotificacion('Contrase\u00f1a actualizada correctamente.', 'success');
    } catch (e) {
        console.error('Error al cambiar contrase\u00f1a:', e);
        mostrarNotificacion('No se pudo actualizar la contrase\u00f1a.', 'error');
    }
}

function jefeToggleSupervisorEstado(id) {
    const sup = JefeComercialStore.supervisores.find(s => s.id === id);
    if (!sup) return;
    const nuevo = jefeEsActivo(sup.estado) ? 'Inactivo' : 'Activo';
    JefeComercialStore.editarSupervisor(id, { estado: nuevo })
        .then(() => mostrarNotificacion('Supervisor ' + (nuevo === 'Activo' ? 'activado' : 'desactivado') + '.', 'success'))
        .catch(() => mostrarNotificacion('No se pudo actualizar el estado.', 'error'));
}

function jefeEliminarSupervisor(id) {
    const sup = JefeComercialStore.supervisores.find(s => s.id === id);
    if (!sup) return;
    if (!confirm('¿Eliminar al supervisor «' + (sup.nombre || sup.id) + '»? Esta acci\u00f3n no se puede deshacer.')) return;
    JefeComercialStore.eliminarSupervisor(id)
        .then(() => mostrarNotificacion('Supervisor eliminado.', 'success'))
        .catch(() => mostrarNotificacion('No se pudo eliminar el supervisor.', 'error'));
}

/* =============================================
   GESTIÓN DE ZONAS
   ============================================= */

function renderJefeZonas() {
    if (!jefeRenderGuard('page-jefe-zonas')) return;
    if (typeof JefeComercialStore !== 'undefined' && !JefeComercialStore.initialized) JefeComercialStore.init();

    const tbody = document.getElementById('jefe-tabla-zonas');
    if (!tbody) return;

    const zonas = JefeComercialStore.zonas;

    if (!JefeComercialStore._firestoreLoaded || zonas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5"><div class="empty-state"><p>' +
            (JefeComercialStore._firestoreLoaded ? 'No existen zonas registradas. Crea la primera con el bot&oacute;n «Nueva Zona».' : 'Cargando zonas...') +
            '</p></div></td></tr>';
        return;
    }

    tbody.innerHTML = zonas.map(z => {
        const activa = jefeEsActivo(z.estado);
        const estadoBadge = '<span class="promo-estado-badge ' + (activa ? 'activa' : 'inactiva') + '">' + (activa ? 'Activa' : 'Inactiva') + '</span>';
        const nPdvs = (z.pdvs || []).length;
        return '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + jefeEsc(z.nombre || z.id) + '</td>' +
            '<td>' + nPdvs + '</td>' +
            '<td class="ctl-td-left">' + jefeEsc((z.pdvs || []).slice(0, 5).join(', ') + (nPdvs > 5 ? '...' : '')) + '</td>' +
            '<td>' + estadoBadge + '</td>' +
            '<td class="jefe-actions-cell">' +
                '<button class="jefe-btn-action" title="Editar zona" onclick="jefeAbrirModalZona(\'' + jefeEsc(z.id) + '\')">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>' +
                '</button>' +
                (activa
                    ? '<button class="jefe-btn-action jefe-btn-pause" title="Desactivar" onclick="jefeToggleZonaEstado(\'' + jefeEsc(z.id) + '\')">' +
                        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' +
                      '</button>'
                    : '<button class="jefe-btn-action jefe-btn-react" title="Activar" onclick="jefeToggleZonaEstado(\'' + jefeEsc(z.id) + '\')">' +
                        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
                      '</button>') +
                '<button class="jefe-btn-action jefe-btn-delete" title="Eliminar" onclick="jefeEliminarZona(\'' + jefeEsc(z.id) + '\')">' +
                    '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
                '</button>' +
            '</td>' +
            '</tr>';
    }).join('');
}

function jefeAbrirModalZona(id) {
    const zona = id ? JefeComercialStore.zonas.find(z => z.id === id) : null;
    const pdvs = (typeof DataStore !== 'undefined' && DataStore.getPDVs) ? DataStore.getPDVs() : [];
    const asignados = new Set((zona && zona.pdvs || []).map(x => String(x)));

    const pdvChecks = pdvs.length > 0
        ? pdvs.map(p => {
            const checked = asignados.has(p) ? ' checked' : '';
            return '<label class="jefe-check"><input type="checkbox" name="jefe-zona-pdvs" value="' + jefeEsc(p) + '"' + checked + '>' + jefeEsc(p) + '</label>';
        }).join('')
        : '<p class="jefe-form-aviso">No se encontraron puntos de venta disponibles.</p>';

    const titulo = zona ? 'Editar Zona' : 'Nueva Zona';
    jefeAbrirModal(
        titulo,
        '<div class="jefe-form-grid">' +
            '<div class="jefe-form-group jefe-form-full"><label class="jefe-form-label">Nombre de la zona *</label>' +
                '<input type="text" id="jefe-zona-nombre" class="jefe-form-input" value="' + jefeEsc(zona ? zona.nombre : '') + '" placeholder="ej. AREQUIPA SUR" oninput="this.value=this.value.toUpperCase()">' +
            '</div>' +
            '<div class="jefe-form-group jefe-form-full"><label class="jefe-form-label">Estado</label>' +
                '<select id="jefe-zona-estado" class="jefe-form-input">' +
                    '<option value="Activa"' + (!zona || zona.estado === 'Activa' ? ' selected' : '') + '>Activa</option>' +
                    '<option value="Inactiva"' + (zona && zona.estado === 'Inactiva' ? ' selected' : '') + '>Inactiva</option>' +
                '</select>' +
            '</div>' +
            '<div class="jefe-form-group jefe-form-full"><label class="jefe-form-label">Puntos de venta de la zona</label>' +
                '<div class="jefe-checks jefe-checks-grid">' + pdvChecks + '</div>' +
            '</div>' +
        '</div>' +
        '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary" onclick="jefeCerrarModal()">Cancelar</button>' +
            '<button type="button" class="btn btn-primary" onclick="jefeGuardarZona(' + (zona ? "'" + jefeEsc(zona.id) + "'" : 'null') + ')">Guardar</button>' +
        '</div>'
    );
}

function jefeGuardarZona(id) {
    const nombre = document.getElementById('jefe-zona-nombre').value.trim();
    const estado = document.getElementById('jefe-zona-estado').value;
    const pdvs = Array.from(document.querySelectorAll('input[name="jefe-zona-pdvs"]:checked')).map(c => c.value);

    if (!nombre) { mostrarNotificacion('Ingresa el nombre de la zona.', 'error'); return; }

    if (id) {
        JefeComercialStore.editarZona(id, { nombre: nombre, estado: estado, pdvs: pdvs })
            .then(() => { jefeCerrarModal(); mostrarNotificacion('Zona actualizada correctamente.', 'success'); renderJefeZonas(); })
            .catch(() => mostrarNotificacion('No se pudo actualizar la zona.', 'error'));
    } else {
        JefeComercialStore.crearZona(nombre)
            .then(() => {
                jefeCerrarModal();
                mostrarNotificacion('Zona creada correctamente.', 'success');
                renderJefeZonas();
            })
            .catch(e => mostrarNotificacion('No se pudo crear la zona. ' + (e.message || ''), 'error'));
    }
}

function jefeToggleZonaEstado(id) {
    const zona = JefeComercialStore.zonas.find(z => z.id === id);
    if (!zona) return;
    const nuevo = jefeEsActivo(zona.estado) ? 'Inactiva' : 'Activa';
    JefeComercialStore.editarZona(id, { estado: nuevo })
        .then(() => mostrarNotificacion('Zona ' + (nuevo === 'Activa' ? 'activada' : 'desactivada') + '.', 'success'))
        .catch(() => mostrarNotificacion('No se pudo actualizar el estado.', 'error'));
}

function jefeEliminarZona(id) {
    const zona = JefeComercialStore.zonas.find(z => z.id === id);
    if (!zona) return;
    if (!confirm('¿Eliminar la zona «' + (zona.nombre || zona.id) + '»? Se quitar\u00e1 de los supervisores asignados.')) return;
    JefeComercialStore.eliminarZona(id)
        .then(() => mostrarNotificacion('Zona eliminada.', 'success'))
        .catch(() => mostrarNotificacion('No se pudo eliminar la zona.', 'error'));
}

/* =============================================
   MODAL GENÉRICO DEL JEFE COMERCIAL
   ============================================= */

function jefeAbrirModal(titulo, contenido) {
    jefeCerrarModal();
    const overlay = document.createElement('div');
    overlay.id = 'jefe-modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.setAttribute('data-visible', '1');
    overlay.onclick = function (e) { if (e.target === this) jefeCerrarModal(); };

    overlay.innerHTML =
        '<div class="modal modal-lg">' +
            '<div class="modal-header">' +
                '<div class="modal-header-left"><h3>' + titulo + '</h3></div>' +
                '<button class="modal-close" onclick="jefeCerrarModal()" aria-label="Cerrar">&times;</button>' +
            '</div>' +
            '<div class="jefe-modal-body">' + contenido + '</div>' +
        '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
}

function jefeCerrarModal() {
    const overlay = document.getElementById('jefe-modal-overlay');
    if (overlay) overlay.remove();
}

/* =============================================
   ENLACE EN VIVO: refrescar la página jefe activa
   ============================================= */

JefeComercialStore.onUpdate = function () {
    const active = document.querySelector('.page.active');
    if (!active) return;
    const id = active.id;
    if (id === 'page-jefe-supervisores') renderJefeSupervisores();
    else if (id === 'page-jefe-zonas') renderJefeZonas();
    else if (id === 'page-jefe-ranking') renderJefeRanking();
    else if (id === 'page-jefe-dashboard') renderJefeDashboard();
};
