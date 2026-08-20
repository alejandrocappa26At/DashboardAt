/* =============================================
   MÓDULO: GESTIÓN DE TIENDAS (perfil supervisor)
   Persistencia en Firestore: dashboard/tiendas
   Las tiendas equivalen a los Puntos de Venta (PDV):
     - DataStore.getPDVs() devuelve solo tiendas Activas.
     - DataStore.esPDVActivo() respeta el estado de la tienda.
   La "eliminación" nunca borra ventas/cuotas/registros históricos:
     si la tienda tiene información relacionada pasa a Inactiva.
   ============================================= */

const TiendasStore = {
    tiendas: [],
    initialized: false,
    _firestoreLoaded: false,
    _seeded: false,
    onUpdate: null,
    _unsub: null,

    init(callback) {
        this.onUpdate = callback || null;
        this._sembrarSiNoHay();
        this._cargarDesdeFirestore();
        this._iniciarRealtime();
        this.initialized = true;
    },

    _genId() {
        return 't' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },

    _ahoraISO() {
        return new Date().toISOString();
    },

    _normalizar(str) {
        return String(str == null ? '' : str).replace(/\s+/g, ' ').trim();
    },

    _normKey(str) {
        return this._normalizar(str).toUpperCase();
    },

    _ref() {
        return db.collection('dashboard').doc('tiendas');
    },

    _notify() {
        if (typeof this.onUpdate === 'function') {
            try { this.onUpdate(); } catch (e) {}
        }
    },

    /* ---------- Listas ---------- */
    getTiendas() {
        return [...this.tiendas].sort((a, b) => {
            const ka = a.estado === 'Activa' ? 0 : 1;
            const kb = b.estado === 'Activa' ? 0 : 1;
            if (ka !== kb) return ka - kb;
            return String(a.nombre).localeCompare(String(b.nombre), 'es');
        });
    },

    getTiendasActivas() {
        return this.getTiendas().filter(t => t.estado === 'Activa');
    },

    getTienda(nombre) {
        const key = this._normKey(nombre);
        return this.tiendas.find(t => this._normKey(t.nombre) === key) || null;
    },

    getEstadoTienda(nombre) {
        const t = this.getTienda(nombre);
        return t ? t.estado : null;
    },

    esTiendaActiva(nombre) {
        const t = this.getTienda(nombre);
        return t ? t.estado === 'Activa' : true;
    },

    /* ---------- Validaciones ---------- */
    validarNombre(nombre, exceptoId) {
        const crudo = String(nombre == null ? '' : nombre);
        if (!crudo.trim()) return { ok: false, mensaje: 'El nombre de la tienda es obligatorio.' };
        if (/\s{2,}/.test(crudo)) return { ok: false, mensaje: 'No se permiten espacios duplicados.' };
        const norm = this._normalizar(crudo);
        if (!norm) return { ok: false, mensaje: 'El nombre de la tienda es obligatorio.' };
        const key = this._normKey(norm);
        const duplicado = this.tiendas.find(t =>
            t.id !== exceptoId && this._normKey(t.nombre) === key
        );
        if (duplicado) return { ok: false, mensaje: 'La tienda ya existe.' };
        return { ok: true, valor: norm };
    },

    /* ---------- Sembrado inicial ---------- */
    _sembrarSiNoHay() {
        if (this._seeded) return;
        this._seeded = true;
        if (this.tiendas.length > 0) return;

        const names = new Map();
        if (typeof DataStore !== 'undefined' && DataStore.initialized && DataStore.promotores && DataStore.promotores.length) {
            (DataStore.promotores || []).forEach(p => {
                if (p && p.punto_venta) names.set(p.punto_venta, p.cadena || '');
            });
        }
        (PDVS_FIJOS || []).forEach(nm => { if (!names.has(nm)) names.set(nm, ''); });
        (PDVS_ELIMINADOS || []).forEach(nm => { if (!names.has(nm)) names.set(nm, ''); });

        const ahora = this._ahoraISO();
        names.forEach((cadena, nombre) => {
            const estado = (PDVS_ELIMINADOS || []).includes(nombre) ? 'Inactiva' : 'Activa';
            this.tiendas.push({
                id: this._genId(),
                nombre,
                cadena: cadena || 'AREQUIPA SUR',
                estado,
                fecha_creacion: ahora,
                fecha_actualizacion: ahora
            });
        });
    },

    _migrarDesdeDataStore() {
        if (typeof DataStore === 'undefined') return;
        let cambio = false;
        const nombres = new Set(this.tiendas.map(t => this._normKey(t.nombre)));
        (DataStore.promotores || []).forEach(p => {
            if (!p || !p.punto_venta) return;
            const key = this._normKey(p.punto_venta);
            if (!nombres.has(key)) {
                this.tiendas.push({
                    id: this._genId(),
                    nombre: p.punto_venta,
                    cadena: p.cadena || 'AREQUIPA SUR',
                    estado: (PDVS_ELIMINADOS || []).includes(p.punto_venta) ? 'Inactiva' : 'Activa',
                    fecha_creacion: this._ahoraISO(),
                    fecha_actualizacion: this._ahoraISO()
                });
                nombres.add(key);
                cambio = true;
            }
        });
        (PDVS_ELIMINADOS || []).forEach(nm => {
            const key = this._normKey(nm);
            if (!nombres.has(key)) {
                this.tiendas.push({
                    id: this._genId(),
                    nombre: nm,
                    cadena: 'AREQUIPA SUR',
                    estado: 'Inactiva',
                    fecha_creacion: this._ahoraISO(),
                    fecha_actualizacion: this._ahoraISO()
                });
                nombres.add(key);
                cambio = true;
            }
        });
        if (cambio) this._persistir();
    },

    /* ---------- Firestore ---------- */
    _persistir() {
        if (typeof db === 'undefined' || !db) return;
        try {
            this._ref().set({
                tiendas: this.tiendas,
                updatedAt: this._ahoraISO()
            }).catch(e => console.warn('[TIENDAS] No se pudo guardar en Firestore:', e));
        } catch (e) {
            console.warn('[TIENDAS] Error al guardar:', e);
        }
    },

    _cargarDesdeFirestore() {
        if (typeof db === 'undefined' || !db) {
            this._firestoreLoaded = true;
            this._notify();
            return;
        }
        try {
            this._ref().get().then(snap => {
                // AUDITORÍA: Firestore es la fuente de verdad. Si el documento existe
                // y trae un listado de tiendas (aunque sea vacío), se respeta tal cual.
                // La migración desde DataStore solo aplica la primera vez (doc inexistente),
                // para no reintroducir tiendas que el supervisor eliminó (hard delete).
                let migrar = true;
                if (snap.exists) {
                    const data = snap.data() || {};
                    if (Array.isArray(data.tiendas)) {
                        this.tiendas = data.tiendas.map(t => ({ ...t, estado: t.estado || 'Activa' }));
                        migrar = false;
                    }
                }
                this._firestoreLoaded = true;
                if (migrar) this._migrarDesdeDataStore();
                this._notify();
            }).catch(() => {
                // Fallback offline: se conserva el sembrado en memoria (PDVS_FIJOS).
                // No se migra para no reintroducir tiendas eliminadas.
                this._firestoreLoaded = true;
                this._notify();
            });
        } catch (e) {
            this._firestoreLoaded = true;
            this._notify();
        }
    },

    _iniciarRealtime() {
        if (typeof db === 'undefined' || !db) return;
        if (this._unsub) this._unsub();
        try {
            this._unsub = db.collection('dashboard').doc('tiendas').onSnapshot(snap => {
                if (!snap.exists) return;
                const data = snap.data() || {};
                if (data.tiendas && Array.isArray(data.tiendas)) {
                    this.tiendas = data.tiendas.map(t => ({ ...t, estado: t.estado || 'Activa' }));
                }
                this._firestoreLoaded = true;
                this._notify();
            }, () => {});
        } catch (e) {}
    },

    /* ---------- CRUD ---------- */
    crearTienda(nombre, cadena, estado) {
        const v = this.validarNombre(nombre);
        if (!v.ok) return { error: v.mensaje };
        const t = {
            id: this._genId(),
            nombre: v.valor,
            cadena: this._normalizar(cadena) || 'AREQUIPA SUR',
            estado: estado === 'Inactiva' ? 'Inactiva' : 'Activa',
            fecha_creacion: this._ahoraISO(),
            fecha_actualizacion: this._ahoraISO()
        };
        this.tiendas.push(t);
        this._persistir();
        this._notify();
        return { tienda: t };
    },

    /* Importación masiva desde Excel: recibe una lista ya validada
       [{ nombre, cadena, estado }] y las registra en una sola operación. */
    importarTiendas(lista) {
        if (!Array.isArray(lista) || lista.length === 0) return { creadas: [], errores: [] };
        const ahora = this._ahoraISO();
        const creadas = [];
        const errores = [];
        const existentes = new Set(this.tiendas.map(t => this._normKey(t.nombre)));
        for (const item of lista) {
            const nombre = this._normalizar(item && item.nombre);
            if (!nombre) { errores.push({ error: 'El nombre de la tienda es obligatorio.' }); continue; }
            const key = this._normKey(nombre);
            if (existentes.has(key)) { errores.push({ error: 'La tienda ya existe: ' + nombre }); continue; }
            const t = {
                id: this._genId(),
                nombre,
                cadena: this._normalizar(item && item.cadena) || 'AREQUIPA SUR',
                estado: (item && item.estado) === 'Inactiva' ? 'Inactiva' : 'Activa',
                fecha_creacion: ahora,
                fecha_actualizacion: ahora
            };
            this.tiendas.push(t);
            existentes.add(key);
            creadas.push(t);
        }
        if (creadas.length > 0) {
            this._persistir();
            this._notify();
        }
        return { creadas, errores };
    },

    editarTienda(id, cambios) {
        const t = this.tiendas.find(x => x.id === id);
        if (!t) return { error: 'Tienda no encontrada.' };
        if (cambios.nombre !== undefined) {
            const v = this.validarNombre(cambios.nombre, id);
            if (!v.ok) return { error: v.mensaje };
            const viejo = t.nombre;
            t.nombre = v.valor;
            if (viejo !== t.nombre && typeof DataStore !== 'undefined') {
                DataStore._renombrarTiendaPropagacion(viejo, t.nombre);
            }
        }
        if (cambios.cadena !== undefined) {
            const zona = this._normalizar(cambios.cadena);
            if (zona) t.cadena = zona;
            else if (!t.cadena) t.cadena = 'AREQUIPA SUR';
        }
        if (cambios.estado !== undefined) {
            t.estado = cambios.estado === 'Inactiva' ? 'Inactiva' : 'Activa';
        }
        t.fecha_actualizacion = this._ahoraISO();
        this._persistir();
        this._notify();
        return { tienda: t };
    },

    cambiarEstado(id, estado) {
        return this.editarTienda(id, { estado });
    },

    tieneInformacion(nombre) {
        const n = this._normalizar(nombre);
        let total = 0;
        if (typeof DataStore !== 'undefined') {
            total += (DataStore.ventas || []).filter(v => v.punto_venta === n).length;
            total += (DataStore.cuotas || []).filter(c => c.punto_venta === n).length;
            total += (DataStore.promotores || []).filter(p => p.punto_venta === n).length;
        }
        if (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) {
            total += HorariosDataStore.promotores.filter(p => p.zona_principal_id === n).length;
        }
        if (typeof PromocionesStore !== 'undefined' && PromocionesStore.registros) {
            total += PromocionesStore.registros.filter(r => r.tienda === n).length;
        }
        return total > 0;
    },

    eliminarTienda(id) {
        const t = this.tiendas.find(x => x.id === id);
        if (!t) return { error: 'Tienda no encontrada.' };
        if (this.tieneInformacion(t.nombre)) {
            t.estado = 'Inactiva';
            t.fecha_actualizacion = this._ahoraISO();
            this._persistir();
            this._notify();
            return { inactivada: true, tienda: t };
        }
        this.tiendas = this.tiendas.filter(x => x.id !== id);
        this._persistir();
        this._notify();
        return { eliminada: true };
    },

    cleanup() {
        if (this._unsub) {
            this._unsub();
            this._unsub = null;
        }
    }
};

/* =============================================
   UI — PANTALLA DE GESTIÓN DE TIENDAS
   ============================================= */

function _tiendasEsc(str) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(str == null ? '' : String(str)));
    return d.innerHTML;
}

function _tiendasEscAttr(str) {
    return _tiendasEsc(str).replace(/"/g, '&quot;');
}

function initGestionTiendas() {
    TiendasStore.init(function () {
        renderGestionTiendas();
        refrescarTiendasGlobal();
    });
}

function refrescarTiendasGlobal() {
    if (typeof DataStore === 'undefined') return;
    if (typeof recargarDashboard === 'function') {
        recargarDashboard();
    }
    renderGestionTiendas();
    const pg = document.querySelector('.page.active');
    if (pg && pg.id === 'page-horarios' && typeof renderHorarios === 'function') {
        renderHorarios();
    }
}

function renderGestionTiendas() {
    const container = document.getElementById('tiendas-content');
    if (!container) return;
    if (typeof TiendasStore === 'undefined') return;

    const tiendas = TiendasStore.getTiendas();
    const activas = tiendas.filter(t => t.estado === 'Activa').length;
    const rows = tiendas.map(renderFilaTienda).join('');

    container.innerHTML = `
        <div class="tiendas-header">
            <div class="tiendas-header-left">
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 9l1.5-5h15L21 9"/>
                    <path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/>
                    <path d="M9 21v-6h6v6"/>
                </svg>
                <h2>Gestión de Tiendas</h2>
            </div>
            <div class="tiendas-header-right">
                <button class="tiendas-btn-excel" onclick="descargarPlantillaTiendas()" title="Descargar plantilla Excel para carga masiva">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Descargar Plantilla Excel</span>
                </button>
                <button class="tiendas-btn-importar" onclick="abrirModalImportarTiendas()" title="Importar tiendas desde un archivo Excel">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/></svg>
                    <span>Importar Tiendas Excel</span>
                </button>
                <button class="tiendas-btn-nueva" onclick="abrirModalTienda()" title="Crear nueva tienda">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Nueva Tienda</span>
                </button>
            </div>
        </div>

        <div class="gestion-tiendas-body">
            <div class="tiendas-summary">
                <span>${tiendas.length} tienda${tiendas.length !== 1 ? 's' : ''} registrada${tiendas.length !== 1 ? 's' : ''}</span>
                <span class="tiendas-summary-dot">&middot;</span>
                <span class="tiendas-summary-activas">${activas} activas</span>
                <span class="tiendas-summary-dot">&middot;</span>
                <span class="tiendas-summary-inactivas">${tiendas.length - activas} inactivas</span>
                ${TiendasStore._firestoreLoaded ? '' : '<span class="tiendas-summary-loading">cargando&hellip;</span>'}
            </div>
            <div class="tiendas-table-scroll-area">
                <table class="tiendas-table">
                    <thead>
                        <tr>
                            <th>&#127980; Nombre de Tienda</th>
                            <th>&#128205; Zona</th>
                            <th>&#128202; Estado</th>
                            <th>&#128197; Fecha de Registro</th>
                            <th style="width:150px;">&#9881; Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows || '<tr><td colspan="5" class="tiendas-empty">No hay tiendas registradas.</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function renderFilaTienda(t) {
    const activa = t.estado !== 'Inactiva';
    const fecha = t.fecha_creacion
        ? new Date(t.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '&mdash;';
    return `
        <tr class="tienda-row" data-id="${_tiendasEscAttr(t.id)}">
            <td class="tienda-nombre-cell">
                <span class="tienda-nombre-icon">&#127980;</span>
                <span class="tienda-nombre">${_tiendasEsc(t.nombre)}</span>
            </td>
            <td><span class="tienda-zona-badge">&#128205; ${_tiendasEsc(t.cadena || 'AREQUIPA SUR')}</span></td>
            <td><span class="tienda-estado-badge ${activa ? 'activa' : 'inactiva'}">${activa ? '&#128994; Activa' : '&#128308; Inactiva'}</span></td>
            <td class="tienda-fecha">${fecha}</td>
            <td class="tienda-acciones">
                <button class="tienda-btn editar" onclick="abrirModalTienda('${_tiendasEscAttr(t.id)}')" title="Editar tienda">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
                ${activa ? `
                    <button class="tienda-btn desactivar" onclick="toggleEstadoTienda('${_tiendasEscAttr(t.id)}')" title="Desactivar tienda">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    </button>
                ` : `
                    <button class="tienda-btn activar" onclick="toggleEstadoTienda('${_tiendasEscAttr(t.id)}')" title="Activar tienda">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                    </button>
                `}
                <button class="tienda-btn eliminar" onclick="eliminarTiendaHandler('${_tiendasEscAttr(t.id)}')" title="Eliminar tienda">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                </button>
            </td>
        </tr>
    `;
}

/* ---------- Modal de creación / edición ---------- */
let tiendaModalEditandoId = null;

function abrirModalTienda(id) {
    tiendaModalEditandoId = id || null;
    const t = tiendaModalEditandoId ? TiendasStore.tiendas.find(x => x.id === tiendaModalEditandoId) : null;

    const cadenas = [...new Set(TiendasStore.tiendas.map(x => (x.cadena || '').trim()).filter(Boolean))];
    const datalistHtml = cadenas.map(c => `<option value="${_tiendasEscAttr(c)}"></option>`).join('');

    let overlay = document.getElementById('tienda-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tienda-modal-overlay';
        overlay.className = 'tienda-modal-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="tienda-modal">
            <div class="tienda-modal-header">
                <div class="tienda-modal-title">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/>
                    </svg>
                    <h3>${t ? 'Editar tienda' : 'Nueva tienda'}</h3>
                </div>
                <button class="tienda-modal-close" onclick="cerrarModalTienda()" title="Cerrar" aria-label="Cerrar">&#10005;</button>
            </div>
            <div class="tienda-modal-body">
                <label class="tienda-field">
                    <span class="tienda-field-label">&#127980; Nombre de Tienda</span>
                    <input type="text" id="tienda-input-nombre" class="tienda-input" maxlength="80"
                        value="${t ? _tiendasEscAttr(t.nombre) : ''}"
                        placeholder="Ej. RED AT CERRO COLORADO">
                    <span class="tienda-field-error" id="tienda-input-nombre-error" style="display:none;"></span>
                </label>
                <label class="tienda-field">
                    <span class="tienda-field-label">&#128205; Zona</span>
                    <input type="text" id="tienda-input-zona" class="tienda-input" maxlength="60"
                        value="${t ? _tiendasEscAttr(t.cadena || 'AREQUIPA SUR') : ''}"
                        list="tienda-zonas-list" placeholder="Ej. AREQUIPA SUR">
                    <datalist id="tienda-zonas-list">${datalistHtml}</datalist>
                </label>
                <div class="tienda-field">
                    <span class="tienda-field-label">&#128202; Estado</span>
                    <div class="tienda-estado-selector">
                        <label class="tienda-estado-opcion ${(!t || t.estado !== 'Inactiva') ? 'seleccionada' : ''}" data-estado="Activa" onclick="seleccionarEstadoTienda(this)">
                            <input type="radio" name="tienda-estado" value="Activa" ${(!t || t.estado !== 'Inactiva') ? 'checked' : ''}>
                            <span>&#128994; Activa</span>
                        </label>
                        <label class="tienda-estado-opcion ${t && t.estado === 'Inactiva' ? 'seleccionada' : ''}" data-estado="Inactiva" onclick="seleccionarEstadoTienda(this)">
                            <input type="radio" name="tienda-estado" value="Inactiva" ${t && t.estado === 'Inactiva' ? 'checked' : ''}>
                            <span>&#128308; Inactiva</span>
                        </label>
                    </div>
                </div>
            </div>
            <div class="tienda-modal-footer">
                <button class="tienda-btn-cancelar" onclick="cerrarModalTienda()">Cancelar</button>
                <button class="tienda-btn-guardar" onclick="guardarModalTienda()">${t ? 'Guardar cambios' : '&#10133; Crear tienda'}</button>
            </div>
        </div>
    `;
    overlay.classList.add('open');
    requestAnimationFrame(() => {
        const input = document.getElementById('tienda-input-nombre');
        if (input) {
            input.focus();
            if (t) input.select();
        }
    });
}

function cerrarModalTienda() {
    const overlay = document.getElementById('tienda-modal-overlay');
    if (overlay) overlay.classList.remove('open');
}

function seleccionarEstadoTienda(label) {
    const grupo = label.closest('.tienda-estado-selector');
    if (!grupo) return;
    grupo.querySelectorAll('.tienda-estado-opcion').forEach(o => o.classList.remove('seleccionada'));
    label.classList.add('seleccionada');
    const radio = label.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
}

function _mostrarErrorNombreTienda(msg) {
    const el = document.getElementById('tienda-input-nombre-error');
    const input = document.getElementById('tienda-input-nombre');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
    if (input) {
        input.classList.add('error');
        input.focus();
    }
    setTimeout(() => {
        if (el) el.style.display = 'none';
        if (input) input.classList.remove('error');
    }, 2500);
}

function guardarModalTienda() {
    const nombreEl = document.getElementById('tienda-input-nombre');
    const zonaEl = document.getElementById('tienda-input-zona');
    if (!nombreEl) return;

    const nombreCrudo = nombreEl.value || '';
    const zona = zonaEl ? zonaEl.value : '';
    const estadoRadio = document.querySelector('input[name="tienda-estado"]:checked');
    const estado = estadoRadio ? estadoRadio.value : 'Activa';

    if (!nombreCrudo.trim()) {
        _mostrarErrorNombreTienda('El nombre de la tienda es obligatorio.');
        return;
    }
    if (/\s{2,}/.test(nombreCrudo)) {
        _mostrarErrorNombreTienda('No se permiten espacios duplicados.');
        return;
    }
    const nombreNorm = nombreCrudo.replace(/\s+/g, ' ').trim();
    const duplicado = TiendasStore.tiendas.find(t =>
        t.id !== tiendaModalEditandoId && TiendasStore._normKey(t.nombre) === TiendasStore._normKey(nombreNorm)
    );
    if (duplicado) {
        _mostrarErrorNombreTienda('La tienda ya existe.');
        return;
    }

    let resultado;
    if (tiendaModalEditandoId) {
        resultado = TiendasStore.editarTienda(tiendaModalEditandoId, { nombre: nombreNorm, cadena: zona, estado });
        if (!resultado.error && typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Tienda actualizada correctamente.', 'success');
        }
    } else {
        resultado = TiendasStore.crearTienda(nombreNorm, zona, estado);
        if (!resultado.error && typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Tienda creada correctamente.', 'success');
        }
    }

    if (resultado.error) {
        _mostrarErrorNombreTienda(resultado.error);
        return;
    }

    cerrarModalTienda();
    refrescarTiendasGlobal();
}

/* =============================================
   CARGA MASIVA DESDE EXCEL
   Plantilla: NOMBRE_TIENDA | ZONA | ESTADO
   ============================================= */

function descargarPlantillaTiendas() {
    try {
        if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') {
            console.error('[TIENDAS] ExcelJS o FileSaver no disponibles.');
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('No se pudo generar la plantilla: librerías de Excel no disponibles.', 'error');
            }
            return;
        }
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Tiendas');

        const columnas = [
            { header: 'NOMBRE_TIENDA', key: 'nombre', width: 42 },
            { header: 'ZONA', key: 'zona', width: 26 },
            { header: 'ESTADO', key: 'estado', width: 14 }
        ];
        ws.columns = columnas;

        const headRow = ws.getRow(1);
        headRow.height = 24;
        headRow.eachCell(c => {
            c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6E4D' } };
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.border = { bottom: { style: 'medium', color: { argb: 'FF1DB954' } } };
        });
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        [
            ['RED AT ALTO SELVA ALEGRE', 'AREQUIPA SUR', 'ACTIVA'],
            ['RED AT ATLAS', 'AREQUIPA SUR', 'ACTIVA'],
            ['RED AT BELEN', 'CUSCO SUR', 'ACTIVA'],
            ['RED AT HUANCARO', 'CUSCO SUR', 'ACTIVA']
        ].forEach(([nombre, zona, estado]) => {
            const row = ws.addRow([nombre, zona, estado]);
            row.getCell(1).alignment = { vertical: 'middle' };
            row.getCell(2).alignment = { vertical: 'middle' };
            row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
        });

        const nota = ws.addRow(['Rellena las filas con el nombre, la zona y el estado (ACTIVA / INACTIVA). No borres los encabezados.']);
        nota.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF8A8A8A' } };
        ws.mergeCells(nota.number, 1, nota.number, 3);

        const nombreArchivo = 'Plantilla_Tiendas_DriveATSur.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, nombreArchivo);
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Plantilla Excel descargada.', 'success');
            }
        });
    } catch (e) {
        console.error('[TIENDAS] Error al generar la plantilla:', e);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error al generar la plantilla: ' + e.message, 'error');
        }
    }
}

let tiendaImportacionEnCurso = null;

function abrirModalImportarTiendas() {
    let overlay = document.getElementById('tienda-import-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tienda-import-overlay';
        overlay.className = 'tienda-import-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="tienda-import-modal">
            <div class="tienda-modal-header">
                <div class="tienda-modal-title">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/>
                    </svg>
                    <h3>Importar Tiendas desde Excel</h3>
                </div>
                <button class="tienda-modal-close" onclick="cerrarModalImportarTiendas()" title="Cerrar" aria-label="Cerrar">&#10005;</button>
            </div>
            <div class="tienda-import-body">
                <div class="tienda-import-info">
                    <p>Sube un archivo Excel con las columnas <strong>NOMBRE_TIENDA</strong>, <strong>ZONA</strong> y <strong>ESTADO</strong>.</p>
                    <p>Descarga la plantilla modelo con el bot&oacute;n «Descargar Plantilla Excel» para respetar el formato.</p>
                </div>
                <div class="tienda-import-dropzone" id="tienda-import-dropzone" onclick="document.getElementById('tienda-import-file').click()">
                    <input type="file" id="tienda-import-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style="display:none">
                    <div class="tienda-import-dropzone-icon">&#128229;</div>
                    <div class="tienda-import-dropzone-text">Haz clic para seleccionar el archivo Excel</div>
                    <div class="tienda-import-dropzone-sub">Solo archivos .xlsx &middot; NOMBRE_TIENDA | ZONA | ESTADO</div>
                </div>
                <div id="tienda-import-resultado"></div>
            </div>
            <div class="tienda-modal-footer">
                <button class="tienda-btn-cancelar" onclick="cerrarModalImportarTiendas()">Cancelar</button>
                <button class="tienda-btn-guardar" id="tienda-import-confirmar" onclick="confirmarImportacionTiendas()" style="display:none;">Confirmar importaci&oacute;n</button>
            </div>
        </div>
    `;
    overlay.classList.add('open');
    tiendaImportacionEnCurso = null;

    const fileInput = document.getElementById('tienda-import-file');
    if (fileInput) {
        fileInput.addEventListener('change', function () {
            const file = this.files && this.files[0];
            if (file) _manejarArchivoImportacion(file);
            this.value = '';
        });
    }

    const dz = document.getElementById('tienda-import-dropzone');
    if (dz) {
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
        dz.addEventListener('drop', e => {
            e.preventDefault();
            dz.classList.remove('drag');
            const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
            if (file) _manejarArchivoImportacion(file);
        });
    }
}

function cerrarModalImportarTiendas() {
    const overlay = document.getElementById('tienda-import-overlay');
    if (overlay) overlay.classList.remove('open');
    tiendaImportacionEnCurso = null;
}

async function _manejarArchivoImportacion(file) {
    const resultadoEl = document.getElementById('tienda-import-resultado');
    if (!resultadoEl) return;
    resultadoEl.innerHTML = '<div class="tienda-import-loading">Procesando archivo <strong>' + _tiendasEsc(file.name) + '</strong>&hellip;</div>';
    try {
        const filas = await _procesarArchivoTiendasExcel(file);
        const resumen = _procesarImportacionTiendas(filas);
        _renderResumenImportacion(resumen);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(
                'Archivo procesado: ' + resumen.nuevas.length + ' nueva' + (resumen.nuevas.length !== 1 ? 's' : '') + ', ' +
                resumen.duplicadas.length + ' duplicada' + (resumen.duplicadas.length !== 1 ? 's' : '') + ', ' +
                resumen.invalidas.length + ' inv\u00e1lida' + (resumen.invalidas.length !== 1 ? 's' : '') + '.',
                resumen.nuevas.length > 0 ? 'success' : 'warning'
            );
        }
    } catch (e) {
        console.error('[TIENDAS] Error al importar:', e);
        resultadoEl.innerHTML = '<div class="tienda-import-error">&#10060; ' + _tiendasEsc(e.message || 'No se pudo leer el archivo. Verifica que sea un Excel .xlsx válido.') + '</div>';
    }
}

function _normHeaderTienda(str) {
    return String(str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').trim();
}

async function _procesarArchivoTiendasExcel(file) {
    if (typeof ExcelJS === 'undefined') {
        throw new Error('La librería de Excel no está disponible. Recarga la página.');
    }
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const ws = workbook.worksheets[0];
    if (!ws) throw new Error('El archivo no contiene hojas de cálculo.');

    const filas = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const valores = [];
        for (let i = 1; i <= 5; i++) {
            valores.push(String(row.getCell(i).text == null ? '' : row.getCell(i).text).trim());
        }
        filas.push({ numero: rowNumber, valores });
    });

    let headerIndex = -1;
    let headerMap = { nombre: -1, zona: -1, estado: -1 };
    for (let i = 0; i < filas.length && i < 10; i++) {
        const cols = filas[i].valores.map(_normHeaderTienda);
        const idxNombre = cols.findIndex(c => c.indexOf('NOMBRE') !== -1 && c.indexOf('TIENDA') !== -1);
        if (idxNombre === -1) continue;
        const idxZona = cols.findIndex(c => c === 'ZONA' || c.indexOf('ZONA') !== -1);
        const idxEstado = cols.findIndex(c => c === 'ESTADO' || c.indexOf('ESTADO') !== -1);
        headerIndex = i;
        headerMap = { nombre: idxNombre, zona: idxZona, estado: idxEstado };
        break;
    }

    if (headerIndex === -1 || headerMap.nombre === -1) {
        throw new Error('Estructura no válida: se esperaban las columnas NOMBRE_TIENDA, ZONA y ESTADO.');
    }
    if (headerMap.zona === -1 || headerMap.estado === -1) {
        throw new Error('Estructura incompleta: faltan las columnas ZONA o ESTADO.');
    }

    return filas
        .slice(headerIndex + 1)
        .filter(r => r.valores.some(v => v !== ''))
        .map(r => ({
            numero: r.numero,
            nombre: r.valores[headerMap.nombre],
            zona: r.valores[headerMap.zona],
            estado: r.valores[headerMap.estado]
        }));
}

function _estadoTiendaExcel(valor) {
    const v = String(valor || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (v === '' || v === 'ACTIVA' || v === 'ACTIVO' || v === '1' || v === 'SI' || v === 'S') return 'Activa';
    return 'Inactiva';
}

function _procesarImportacionTiendas(filas) {
    const nuevas = [];
    const duplicadas = [];
    const invalidas = [];
    const vistos = new Set();

    for (const fila of filas) {
        const nombreCrudo = String(fila.nombre == null ? '' : fila.nombre);
        const zonaCruda = String(fila.zona == null ? '' : fila.zona);
        const razones = [];

        const nombre = TiendasStore._normalizar(nombreCrudo);
        if (!nombre) razones.push('Nombre vac\u00edo');
        else if (/\s{2,}/.test(nombreCrudo)) razones.push('Espacios duplicados en el nombre');

        const zona = TiendasStore._normalizar(zonaCruda);
        if (!zona) razones.push('Zona vac\u00eda');

        if (razones.length > 0) {
            invalidas.push({ numero: fila.numero, nombre, razon: razones.join(', ') });
            continue;
        }

        const key = TiendasStore._normKey(nombre);
        if (vistos.has(key)) {
            duplicadas.push({ numero: fila.numero, nombre, razon: 'Repetida en el archivo' });
            continue;
        }
        if (TiendasStore.getTienda(nombre)) {
            duplicadas.push({ numero: fila.numero, nombre, razon: 'Ya existe en el sistema' });
            continue;
        }

        vistos.add(key);
        nuevas.push({
            numero: fila.numero,
            nombre,
            cadena: zona,
            estado: _estadoTiendaExcel(fila.estado)
        });
    }

    return { nuevas, duplicadas, invalidas, total: filas.length };
}

function _renderResumenImportacion(resumen) {
    const resultadoEl = document.getElementById('tienda-import-resultado');
    const confirmarBtn = document.getElementById('tienda-import-confirmar');
    if (!resultadoEl) return;

    tiendaImportacionEnCurso = resumen;

    const cards =
        '<div class="tienda-import-summary">' +
            '<div class="tienda-import-sum-card nueva"><span class="tienda-import-sum-num">' + resumen.nuevas.length + '</span><span class="tienda-import-sum-label">Tiendas nuevas</span></div>' +
            '<div class="tienda-import-sum-card duplicada"><span class="tienda-import-sum-num">' + resumen.duplicadas.length + '</span><span class="tienda-import-sum-label">Duplicadas</span></div>' +
            '<div class="tienda-import-sum-card invalida"><span class="tienda-import-sum-num">' + resumen.invalidas.length + '</span><span class="tienda-import-sum-label">Inv\u00e1lidas</span></div>' +
        '</div>';

    let detalles = '';
    if (resumen.duplicadas.length > 0) {
        detalles += '<div class="tienda-import-detalle"><div class="tienda-import-detalle-title">Duplicadas</div><ul>' +
            resumen.duplicadas.slice(0, 20).map(d =>
                '<li>Fila ' + d.numero + ': <strong>' + _tiendasEsc(d.nombre) + '</strong> &mdash; ' + _tiendasEsc(d.razon) + '</li>'
            ).join('') +
            (resumen.duplicadas.length > 20 ? '<li class="tienda-import-mas">+ ' + (resumen.duplicadas.length - 20) + ' m&aacute;s...</li>' : '') +
            '</ul></div>';
    }
    if (resumen.invalidas.length > 0) {
        detalles += '<div class="tienda-import-detalle invalidas"><div class="tienda-import-detalle-title">Inv\u00e1lidas</div><ul>' +
            resumen.invalidas.slice(0, 20).map(d =>
                '<li>Fila ' + d.numero + ': <strong>' + _tiendasEsc(d.nombre || '(sin nombre)') + '</strong> &mdash; ' + _tiendasEsc(d.razon) + '</li>'
            ).join('') +
            (resumen.invalidas.length > 20 ? '<li class="tienda-import-mas">+ ' + (resumen.invalidas.length - 20) + ' m&aacute;s...</li>' : '') +
            '</ul></div>';
    }

    resultadoEl.innerHTML = cards + detalles;

    if (confirmarBtn) {
        if (resumen.nuevas.length > 0) {
            confirmarBtn.style.display = 'inline-flex';
            confirmarBtn.textContent = 'Importar ' + resumen.nuevas.length + ' tienda' + (resumen.nuevas.length !== 1 ? 's' : '');
        } else {
            confirmarBtn.style.display = 'none';
        }
    }
}

function confirmarImportacionTiendas() {
    if (!tiendaImportacionEnCurso) return;
    const nuevas = tiendaImportacionEnCurso.nuevas;
    if (!nuevas || nuevas.length === 0) return;

    const resultado = TiendasStore.importarTiendas(nuevas);
    if (resultado.errores && resultado.errores.length > 0) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo importar: ' + resultado.errores[0].error, 'error');
        }
        return;
    }

    const creadas = resultado.creadas.length;
    tiendaImportacionEnCurso = null;
    cerrarModalImportarTiendas();
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion(creadas + ' tienda' + (creadas !== 1 ? 's importada' : ' importada') + 's correctamente.', 'success');
    }
    refrescarTiendasGlobal();
}

/* ---------- Activar / Desactivar ---------- */
function toggleEstadoTienda(id) {
    const t = TiendasStore.tiendas.find(x => x.id === id);
    if (!t) return;
    const nuevo = t.estado === 'Activa' ? 'Inactiva' : 'Activa';
    if (nuevo === 'Inactiva') {
        if (!confirm('¿Desea desactivar esta tienda?')) return;
    }
    TiendasStore.cambiarEstado(id, nuevo);
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion('Estado actualizado a ' + nuevo + '.', 'success');
    }
    refrescarTiendasGlobal();
}

/* ---------- Eliminar (soft delete) ---------- */
let tiendaEliminarPendiente = null;

function eliminarTiendaHandler(id) {
    const t = TiendasStore.tiendas.find(x => x.id === id);
    if (!t) return;
    tiendaEliminarPendiente = id;
    const tieneInfo = TiendasStore.tieneInformacion(t.nombre);

    let overlay = document.getElementById('tienda-confirm-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'tienda-confirm-overlay';
        overlay.className = 'tienda-confirm-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="tienda-confirm">
            <div class="tienda-confirm-icon">&#128465;</div>
            <h3>¿Desea eliminar esta tienda?</h3>
            <p class="tienda-confirm-nombre">${_tiendasEsc(t.nombre)}</p>
            ${tieneInfo
                ? '<p class="tienda-confirm-nota">Esta tienda tiene informaci\u00f3n relacionada. No se eliminar\u00e1n las ventas ni los registros hist\u00f3ricos; la tienda pasar\u00e1 a estado <strong>Inactiva</strong>.</p>'
                : '<p class="tienda-confirm-nota">La tienda no tiene informaci\u00f3n asociada y ser\u00e1 eliminada del registro.</p>'}
            <div class="tienda-confirm-buttons">
                <button class="tienda-confirm-btn cancelar" onclick="cancelarEliminarTienda()">&#10005; Cancelar</button>
                <button class="tienda-confirm-btn confirmar" onclick="confirmarEliminarTienda()">&#10003; Confirmar</button>
            </div>
        </div>
    `;
    overlay.classList.add('open');
}

function confirmarEliminarTienda() {
    const overlay = document.getElementById('tienda-confirm-overlay');
    if (overlay) overlay.classList.remove('open');
    if (!tiendaEliminarPendiente) return;
    const id = tiendaEliminarPendiente;
    tiendaEliminarPendiente = null;
    const resultado = TiendasStore.eliminarTienda(id);
    if (typeof mostrarNotificacion === 'function') {
        if (resultado.inactivada) {
            mostrarNotificacion('La tienda tenía información relacionada y pasó a estado Inactiva.', 'warning');
        } else if (resultado.eliminada) {
            mostrarNotificacion('Tienda eliminada correctamente.', 'success');
        } else if (resultado.error) {
            mostrarNotificacion(resultado.error, 'error');
        }
    }
    refrescarTiendasGlobal();
}

function cancelarEliminarTienda() {
    const overlay = document.getElementById('tienda-confirm-overlay');
    if (overlay) overlay.classList.remove('open');
    tiendaEliminarPendiente = null;
}