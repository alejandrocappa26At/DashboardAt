/* =============================================
   MÓDULO DE PROMOCIONES — estructura independiente
   Colecciones Firestore:
     - promociones:            { id, nombre, estado, fecha_creacion, updatedAt }
     - registro_promociones:   { id, promotor_id, promotor_nombre, tienda, fecha, promocion, cantidad, updatedAt }
   NO se mezcla con PRODUCTOS (ventas oficiales).
   ============================================= */

const PROMOCIONES_COLLECTION = 'promociones';
const REGISTRO_PROMOCIONES_COLLECTION = 'registro_promociones';

const PROMOCIONES_INICIALES = [
    '5x5 Virtuales',
    'Bet Builder 15',
    'Free Bet Cliente Nuevo'
];

const PromocionesStore = {
    promociones: [],
    registros: [],
    initialized: false,
    _firestoreLoaded: false,
    _seeded: false,
    onUpdate: null,
    _unsubPromos: null,
    _unsubRegistros: null,

    init(callback) {
        this.onUpdate = callback || null;
        this._cargarDesdeFirestore();
        this._iniciarRealtime();
        this.initialized = true;
    },

    _genId(prefix) {
        return (prefix || 'promo') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    },

    _ahoraISO() {
        return new Date().toISOString();
    },

    _parseFechaLocal(str) {
        if (!str) return null;
        const parts = String(str).split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    _notify() {
        if (typeof this.onUpdate === 'function') {
            try { this.onUpdate(); } catch (e) {}
        }
    },

    _cargarDesdeFirestore() {
        if (typeof db === 'undefined' || !db) {
            this._sembrarIniciales();
            this._firestoreLoaded = true;
            this._notify();
            return;
        }
        try {
            db.collection(PROMOCIONES_COLLECTION).get().then(qs => {
                this.promociones = qs.docs.map(d => d.data()).filter(p => p && p.nombre);
                this.promociones.sort((a, b) => String(a.fecha_creacion || '').localeCompare(String(b.fecha_creacion || '')));
                this._sembrarIniciales();
                this._firestoreLoaded = true;
                this._notify();
            }).catch(() => {
                this._sembrarIniciales();
                this._firestoreLoaded = true;
                this._notify();
            });
        } catch (e) {
            this._sembrarIniciales();
            this._firestoreLoaded = true;
        }
    },

    _sembrarIniciales() {
        if (this._seeded) return;
        this._seeded = true;
        const existentes = new Set(this.promociones.map(p => p.nombre));
        const faltantes = PROMOCIONES_INICIALES.filter(n => !existentes.has(n));
        for (const nombre of faltantes) {
            const promo = {
                id: this._genId('promo'),
                nombre,
                estado: 'Activa',
                fecha_creacion: this._ahoraISO()
            };
            this.promociones.push(promo);
            this._persistirPromocion(promo);
        }
    },

    _iniciarRealtime() {
        if (typeof db === 'undefined' || !db) return;
        if (this._unsubPromos) this._unsubPromos();
        if (this._unsubRegistros) this._unsubRegistros();
        try {
            this._unsubPromos = db.collection(PROMOCIONES_COLLECTION).onSnapshot(qs => {
                const map = new Map();
                qs.docs.forEach(d => {
                    const data = d.data();
                    if (data && data.nombre) map.set(data.id, data);
                });
                this.promociones = [...map.values()];
                this.promociones.sort((a, b) => String(a.fecha_creacion || '').localeCompare(String(b.fecha_creacion || '')));
                this._sembrarIniciales();
                this._notify();
            }, () => {});
        } catch (e) {}
        try {
            this._unsubRegistros = db.collection(REGISTRO_PROMOCIONES_COLLECTION).onSnapshot(qs => {
                const map = new Map();
                qs.docs.forEach(d => {
                    const data = d.data();
                    if (data && data.promocion) map.set(data.id, data);
                });
                this.registros = [...map.values()];
                this._notify();
            }, () => {});
        } catch (e) {}
    },

    _persistirPromocion(promo) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection(PROMOCIONES_COLLECTION).doc(promo.id).set({
                ...promo,
                updatedAt: this._ahoraISO()
            }).catch(e => console.error('Error al guardar promoción:', e));
        } catch (e) {}
    },

    _borrarPromocion(promo) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection(PROMOCIONES_COLLECTION).doc(promo.id).delete().catch(e => console.error('Error al eliminar promoción:', e));
        } catch (e) {}
    },

    _persistirRegistro(reg) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection(REGISTRO_PROMOCIONES_COLLECTION).doc(reg.id).set({
                ...reg,
                updatedAt: this._ahoraISO()
            }).catch(e => console.error('Error al guardar registro de promoción:', e));
        } catch (e) {}
    },

    _borrarRegistro(id) {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection(REGISTRO_PROMOCIONES_COLLECTION).doc(id).delete().catch(e => console.error('Error al eliminar registro de promoción:', e));
        } catch (e) {}
    },

    /* ============ CATÁLOGO DE PROMOCIONES ============ */

    getPromociones() {
        return [...this.promociones];
    },

    getPromocionesActivas() {
        return this.promociones.filter(p => p.estado === 'Activa');
    },

    getPromocionPorNombre(nombre) {
        return this.promociones.find(p => p.nombre === nombre) || null;
    },

    crearPromocion(nombre) {
        const nombreLimpio = String(nombre || '').trim();
        if (!nombreLimpio) return null;
        if (this.promociones.some(p => p.nombre.toUpperCase() === nombreLimpio.toUpperCase())) return null;
        const promo = {
            id: this._genId('promo'),
            nombre: nombreLimpio,
            estado: 'Activa',
            fecha_creacion: this._ahoraISO()
        };
        this.promociones.push(promo);
        this._persistirPromocion(promo);
        return promo;
    },

    editarPromocion(id, nuevoNombre) {
        const nombreLimpio = String(nuevoNombre || '').trim();
        if (!nombreLimpio) return null;
        const promo = this.promociones.find(p => p.id === id);
        if (!promo) return null;
        if (this.promociones.some(p => p.id !== id && p.nombre.toUpperCase() === nombreLimpio.toUpperCase())) return null;
        const nombreAnterior = promo.nombre;
        promo.nombre = nombreLimpio;
        promo.updatedAt = this._ahoraISO();
        this._persistirPromocion(promo);
        if (nombreAnterior !== promo.nombre) {
            for (const reg of this.registros) {
                if (reg.promocion === nombreAnterior) {
                    reg.promocion = promo.nombre;
                    this._persistirRegistro(reg);
                }
            }
        }
        return promo;
    },

    setEstadoPromocion(id, estado) {
        const promo = this.promociones.find(p => p.id === id);
        if (!promo) return null;
        promo.estado = (estado === 'Activa') ? 'Activa' : 'Inactiva';
        promo.updatedAt = this._ahoraISO();
        this._persistirPromocion(promo);
        return promo;
    },

    eliminarPromocion(id) {
        const promo = this.promociones.find(p => p.id === id);
        if (!promo) return false;
        this.promociones = this.promociones.filter(p => p.id !== id);
        this._borrarPromocion(promo);
        const registrosAsociados = this.registros.filter(r => r.promocion === promo.nombre);
        this.registros = this.registros.filter(r => r.promocion !== promo.nombre);
        for (const reg of registrosAsociados) this._borrarRegistro(reg.id);
        return true;
    },

    /* ============ REGISTRO DE PROMOCIONES ============ */

    getRegistros() {
        return [...this.registros];
    },

    guardarRegistro({ fecha, tienda, promotor_id, promotor_nombre, cantidades }) {
        const fechaKey = String(fecha || '');
        if (!fechaKey) return 0;
        let guardados = 0;
        for (const item of cantidades || []) {
            const promoNombre = String(item.promocion || '').trim();
            const cantidad = Math.max(0, parseFloat(item.cantidad) || 0);
            if (!promoNombre) continue;
            const existente = this.registros.find(r =>
                r.fecha === fechaKey &&
                r.tienda === tienda &&
                r.promotor_id === promotor_id &&
                r.promocion === promoNombre
            );
            if (cantidad === 0) {
                if (existente) {
                    this.registros = this.registros.filter(r => r !== existente);
                    this._borrarRegistro(existente.id);
                }
                continue;
            }
            if (existente) {
                existente.cantidad = cantidad;
                existente.promotor_nombre = promotor_nombre;
                existente.updatedAt = this._ahoraISO();
                this._persistirRegistro(existente);
            } else {
                const reg = {
                    id: this._genId('reg'),
                    promotor_id: promotor_id || null,
                    promotor_nombre: promotor_nombre || null,
                    tienda: String(tienda || ''),
                    fecha: fechaKey,
                    promocion: promoNombre,
                    cantidad,
                    fecha_creacion: this._ahoraISO()
                };
                this.registros.push(reg);
                this._persistirRegistro(reg);
            }
            guardados++;
        }
        return guardados;
    },

    eliminarRegistro(id) {
        const reg = this.registros.find(r => r.id === id);
        if (!reg) return false;
        this.registros = this.registros.filter(r => r.id !== id);
        this._borrarRegistro(id);
        return true;
    },

    /* ============ ANALÍTICA ============ */

    _periodoEfectivo() {
        let desde = null;
        let hasta = null;
        if (typeof DataStore !== 'undefined' && DataStore.getFiltrosFecha) {
            const f = DataStore.getFiltrosFecha();
            if (f.desde && f.hasta) {
                desde = f.desde;
                hasta = f.hasta;
            }
        }
        if (!desde || !hasta) {
            const hoy = new Date();
            const d = String(hoy.getDate()).padStart(2, '0');
            const m = String(hoy.getMonth() + 1).padStart(2, '0');
            desde = hoy.getFullYear() + '-' + m + '-01';
            hasta = hoy.getFullYear() + '-' + m + '-' + d;
        }
        return { desde, hasta };
    },

    _zonaSesionSupervisor() {
        try {
            const raw = sessionStorage.getItem('auth_session');
            if (!raw) return null;
            const s = JSON.parse(raw);
            return (s && s.rol === 'supervisor' && s.zona) ? String(s.zona) : null;
        } catch (e) { return null; }
    },

    _normalizarZona(str) {
        return String(str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    },

    _tiendaEnZonaSesion(tienda) {
        const zona = this._zonaSesionSupervisor();
        if (!zona) return true;
        let cadena = '';
        if (typeof DataStore !== 'undefined' && typeof DataStore.getTiendaCadena === 'function') {
            cadena = DataStore.getTiendaCadena(tienda) || '';
        }
        return this._normalizarZona(cadena) === this._normalizarZona(zona);
    },

    getRegistrosEnRango(desde, hasta) {
        const fd = this._parseFechaLocal(desde);
        const fh = this._parseFechaLocal(hasta);
        return this.registros.filter(r => {
            const f = this._parseFechaLocal(r.fecha);
            if (!f) return false;
            if (fd && f < fd) return false;
            if (fh && f > fh) return false;
            if (!this._tiendaEnZonaSesion(r.tienda)) return false;
            return true;
        });
    },

    getTotalesPorPromocion(desde, hasta) {
        const result = {};
        const registros = this.getRegistrosEnRango(desde, hasta);
        for (const r of registros) {
            if (!result[r.promocion]) result[r.promocion] = { cantidad: 0, registros: 0, tiendas: new Set() };
            result[r.promocion].cantidad += r.cantidad;
            result[r.promocion].registros += 1;
            if (r.tienda) result[r.promocion].tiendas.add(r.tienda);
        }
        for (const key in result) {
            result[key].tiendas = result[key].tiendas.size;
        }
        return result;
    },

    getTotalesPorTienda(desde, hasta) {
        const result = {};
        const registros = this.getRegistrosEnRango(desde, hasta);
        for (const r of registros) {
            const tienda = r.tienda || 'Sin tienda';
            if (!result[tienda]) result[tienda] = { cantidad: 0, registros: 0, promociones: new Set() };
            result[tienda].cantidad += r.cantidad;
            result[tienda].registros += 1;
            if (r.promocion) result[tienda].promociones.add(r.promocion);
        }
        for (const key in result) {
            result[key].promociones = result[key].promociones.size;
        }
        return result;
    },

    getTotalesPorPromotor(desde, hasta) {
        const result = {};
        const registros = this.getRegistrosEnRango(desde, hasta);
        for (const r of registros) {
            const key = r.promotor_id || r.promotor_nombre || 'Sin promotor';
            if (!result[key]) result[key] = { cantidad: 0, registros: 0, nombre: r.promotor_nombre || null, tiendas: new Set() };
            result[key].cantidad += r.cantidad;
            result[key].registros += 1;
            if (r.tienda) result[key].tiendas.add(r.tienda);
        }
        for (const key in result) {
            result[key].tiendas = result[key].tiendas.size;
        }
        return result;
    },

    getTotalCantidad(desde, hasta) {
        return this.getRegistrosEnRango(desde, hasta).reduce((s, r) => s + r.cantidad, 0);
    },

    getRankingPromociones(desde, hasta, topN) {
        const totales = this.getTotalesPorPromocion(desde, hasta);
        const lista = Object.entries(totales)
            .map(([promocion, d]) => ({ promocion, cantidad: d.cantidad, registros: d.registros, tiendas: d.tiendas }))
            .sort((a, b) => b.cantidad - a.cantidad || b.registros - a.registros)
            .map((item, i) => ({ ...item, puesto: i + 1 }));
        if (topN && topN > 0) return lista.slice(0, topN);
        return lista;
    },

    getRankingTiendas(desde, hasta) {
        const totales = this.getTotalesPorTienda(desde, hasta);
        return Object.entries(totales)
            .map(([tienda, d]) => ({ tienda, cantidad: d.cantidad, registros: d.registros, promociones: d.promociones }))
            .sort((a, b) => b.cantidad - a.cantidad || b.registros - a.registros)
            .map((item, i) => ({ ...item, puesto: i + 1 }));
    },

    getPromocionesDestacadas(desde, hasta, topN) {
        return this.getRankingPromociones(desde, hasta, topN || 5);
    }
};

if (typeof window !== 'undefined') {
    PromocionesStore.init();
}
