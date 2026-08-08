const PRODUCTOS = ['Apuestas Deportivas', 'Lottingo', 'Hípica', 'Juegos Virtuales', 'Torito', 'VLT', 'LOTOBOLA', 'MI BILLETERA'];

function normalizarProducto(prod) {
    if (prod == null) return prod;
    const p = String(prod).trim().toLowerCase();
    if (p === 'mi_billetera' || p === 'mi billetera' || p === 'mibilletera') return 'MI BILLETERA';
    return String(prod).trim();
}
const FECHA_ACTUAL = new Date();
const MES = FECHA_ACTUAL.getMonth() + 1;
const ANIO = FECHA_ACTUAL.getFullYear();
const DIAS_MES = new Date(ANIO, MES, 0).getDate();

function formatearFechaLocal(date) {
    const d = date ? new Date(date) : new Date();
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return anio + '-' + mes + '-' + dia;
}
const MESES = [
    { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' }, { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Setiembre' }, { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' }
];

function generarMockData() {
    return { ventas: [], cuotas: [], promotores: [], diaActual: 1 };
}

const PDVS_FIJOS = [
    'RED AT ALTO SELVA ALEGRE', 'RED AT ATLAS', 'RED AT BUSTAMANTE Y RIVERO',
    'RED AT CAMANA', 'RED AT CAYMA',
    'RED AT LA JOYA', 'RED AT PROGRESO', 'RED AT REPSOL PROGRESO',
    'RED AT RIVERO'
];

const PDVS_ELIMINADOS = [
    'RED AT DOLORES'
];
console.log('[AUDITORIA] data.js v3 CARGADO, PDVS_FIJOS:', PDVS_FIJOS.length, PDVS_FIJOS);

const DataStore = {
    ventas: [],
    cuotas: [],
    promotores: [],
    diaActual: 1,
    filtrosFecha: { desde: null, hasta: null },
    initialized: false,

    init() {
        this.ventas = [];
        this.cuotas = [];
        this.promotores = PDVS_FIJOS.map(pdv => ({
            punto_venta: pdv,
            cadena: 'AREQUIPA SUR',
            num_promotores: 1
        }));
        this.diaActual = Math.min(new Date().getDate(), DIAS_MES);
        this.filtrosFecha = { desde: null, hasta: null };
        this.initialized = true;

        this._iniciarFirestore();
    },

    _iniciarFirestore() {
        if (typeof db === 'undefined' || !db) return;

        db.collection('dashboard').doc('datos').get().then(snap => {
            if (snap.exists) {
                const data = snap.data();
                console.log('[AUDITORIA] Firestore .get() data.promotores:', data.promotores?.length || 0, 'items', data.promotores?.map(p => p.punto_venta));

                if (data.ventas && data.ventas.length > 0) {
                    this.ventas = data.ventas.map(v => ({
                        ...v,
                        producto: normalizarProducto(v.producto),
                        fecha: new Date(v.fecha)
                    }));
                }
                if (data.cuotas && data.cuotas.length > 0) {
                    this.cuotas = data.cuotas.map(c => ({
                        ...c,
                        producto: normalizarProducto(c.producto),
                        mes: c.mes || MES,
                        anio: c.anio || ANIO
                    }));
                }
                if (data.promotores && data.promotores.length > 0) {
                    const pdvMap = new Map();
                    for (const p of data.promotores) {
                        if (p && p.punto_venta) pdvMap.set(p.punto_venta, p);
                    }
                    this.promotores = PDVS_FIJOS.map(pdv =>
                        pdvMap.get(pdv) || { punto_venta: pdv, cadena: 'AREQUIPA SUR', num_promotores: 1 }
                    );
                } else {
                    this.promotores = PDVS_FIJOS.map(pdv => ({
                        punto_venta: pdv, cadena: 'AREQUIPA SUR', num_promotores: 1
                    }));
                }
                if (data.diaActual) {
                    this.diaActual = Math.min(new Date().getDate(), DIAS_MES);
                }

                console.log('[VALIDACION] Ventas encontradas:', this.ventas.length, '| Fuente: dashboard/datos');

                this._mergePDVsFijos();
                this._guardarEnFirestore();

                console.log('[AUDITORIA] .get() this.promotores FINAL antes de recargarDashboard:', this.promotores.length, 'items', this.promotores.map(p => p.punto_venta));

            } else {
                this._guardarEnFirestore();
            }

            if (typeof recargarDashboard === 'function') recargarDashboard();
        }).catch(e => {
            console.error('Error al cargar datos de Firestore:', e);
            if (typeof recargarDashboard === 'function') recargarDashboard();
        });

        db.collection('dashboard').doc('datos')
            .onSnapshot(snap => {
                if (!snap.exists) return;
                const data = snap.data();
                console.log('[AUDITORIA] Firestore onSnapshot data.promotores:', data.promotores?.length || 0, 'items', data.promotores?.map(p => p.punto_venta));

                if (data.ventas && data.ventas.length > 0) {
                    this.ventas = data.ventas.map(v => ({
                        ...v,
                        producto: normalizarProducto(v.producto),
                        fecha: new Date(v.fecha)
                    }));
                } else {
                    this.ventas = [];
                }
                if (data.cuotas && data.cuotas.length > 0) {
                    this.cuotas = data.cuotas.map(c => ({
                        ...c,
                        producto: normalizarProducto(c.producto),
                        mes: c.mes || MES,
                        anio: c.anio || ANIO
                    }));
                } else {
                    this.cuotas = [];
                }
                if (data.promotores && data.promotores.length > 0) {
                    const pdvMap = new Map();
                    for (const p of data.promotores) {
                        if (p && p.punto_venta) pdvMap.set(p.punto_venta, p);
                    }
                    this.promotores = PDVS_FIJOS.map(pdv =>
                        pdvMap.get(pdv) || { punto_venta: pdv, cadena: 'AREQUIPA SUR', num_promotores: 1 }
                    );
                } else {
                    this.promotores = PDVS_FIJOS.map(pdv => ({
                        punto_venta: pdv, cadena: 'AREQUIPA SUR', num_promotores: 1
                    }));
                }
                if (data.diaActual) {
                    this.diaActual = Math.min(new Date().getDate(), DIAS_MES);
                }

                console.log('[VALIDACION] Ventas encontradas:', this.ventas.length, '| Fuente: dashboard/datos');

                this._mergePDVsFijos();
                console.log('[AUDITORIA] onSnapshot this.promotores FINAL:', this.promotores.length, 'items', this.promotores.map(p => p.punto_venta));

                if (typeof recargarDashboard === 'function') recargarDashboard();
            }, e => {
                console.error('Error en snapshot de Firestore:', e);
            });
    },

    _mergePDVsFijos() {
        const existentes = new Set((this.promotores || []).map(p => p.punto_venta));
        let modificado = false;
        for (const pdv of PDVS_FIJOS) {
            if (!existentes.has(pdv)) {
                this.promotores.push({
                    punto_venta: pdv,
                    cadena: 'AREQUIPA SUR',
                    num_promotores: 1
                });
                modificado = true;
            }
        }
        if (modificado) {
            this._guardarEnFirestore();
        }
    },

    _guardarEnFirestore() {
        if (typeof db === 'undefined' || !db) return;
        try {
            db.collection('dashboard').doc('datos').set({
                ventas: this.ventas.map(v => ({
                    ...v,
                    fecha: v.fecha instanceof Date ? v.fecha.toISOString() : v.fecha
                })),
                cuotas: this.cuotas,
                promotores: this.promotores,
                diaActual: this.diaActual
            }).catch(e => {
                console.error('Error al guardar en Firestore:', e);
            });
        } catch (e) {
            console.error('Error al guardar en Firestore:', e);
        }
    },

    getVentas() { return this.ventas; },
    esPDVActivo(pdv) {
        return !(PDVS_ELIMINADOS || []).includes(pdv);
    },
    getPDVsEliminados() { return [...PDVS_ELIMINADOS]; },
    getVentasActivas() {
        return this.ventas.filter(v => this.esPDVActivo(v.punto_venta));
    },
    getCuotasActivas() {
        return this.cuotas.filter(c => this.esPDVActivo(c.punto_venta));
    },
    getCuotas(mes, anio) {
        const filtradas = this.cuotas.filter(c => this.esPDVActivo(c.punto_venta));
        if (mes && anio) {
            return filtradas.filter(c => c.mes === mes && c.anio === anio);
        }
        return filtradas.filter(c => c.mes === MES && c.anio === ANIO);
    },
    getCuotasCompletas() { return this.cuotas; },
    getPromotores() { return this.promotores; },
    getDiaActual() { return this.diaActual; },

    _parseFechaLocal(str) {
        if (!str) return null;
        const parts = String(str).split('-').map(Number);
        if (parts.length !== 3 || parts.some(isNaN)) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    },

    setFiltrosFecha(desde, hasta) {
        this.filtrosFecha = { desde: desde || null, hasta: hasta || null };
    },

    getFiltrosFecha() {
        return { desde: this.filtrosFecha.desde, hasta: this.filtrosFecha.hasta };
    },

    limpiarFiltrosFecha() {
        this.filtrosFecha = { desde: null, hasta: null };
    },

    getVentasEnRango(fechaDesde, fechaHasta) {
        const fd = this._parseFechaLocal(fechaDesde);
        const fh = this._parseFechaLocal(fechaHasta);
        if (!fd && !fh) {
            const activo = this.filtrosFecha.desde || this.filtrosFecha.hasta;
            if (activo) return this.getVentasEnRango(this.filtrosFecha.desde, this.filtrosFecha.hasta);
            return this.getVentasDelMes();
        }
        return this.ventas.filter(v => {
            if (!this.esPDVActivo(v.punto_venta)) return false;
            if (!v.fecha) return false;
            const f = new Date(v.fecha);
            if (isNaN(f.getTime())) return false;
            const ts = new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime();
            if (fd && ts < fd.getTime()) return false;
            if (fh && ts > fh.getTime()) return false;
            return true;
        });
    },

    getMesesEnRango(fechaDesde, fechaHasta) {
        const fd = this._parseFechaLocal(fechaDesde);
        const fh = this._parseFechaLocal(fechaHasta);
        if (!fd && !fh) {
            if (this.filtrosFecha.desde || this.filtrosFecha.hasta) {
                return this.getMesesEnRango(this.filtrosFecha.desde, this.filtrosFecha.hasta);
            }
            return [{ mes: MES, anio: ANIO }];
        }
        const fin = fh || fd;
        const meses = [];
        const cursor = new Date(fd.getFullYear(), fd.getMonth(), 1);
        while (cursor <= fin) {
            meses.push({ mes: cursor.getMonth() + 1, anio: cursor.getFullYear() });
            cursor.setMonth(cursor.getMonth() + 1);
        }
        return meses;
    },

    getCuotasEnRango(fechaDesde, fechaHasta) {
        const mesesEnRango = this.getMesesEnRango(fechaDesde, fechaHasta);
        const keys = new Set(mesesEnRango.map(m => m.mes + '-' + m.anio));
        return this.cuotas.filter(c =>
            this.esPDVActivo(c.punto_venta) &&
            keys.has((c.mes || MES) + '-' + (c.anio || ANIO))
        );
    },

    getInfoPeriodo() {
        const fd = this._parseFechaLocal(this.filtrosFecha.desde);
        const fh = this._parseFechaLocal(this.filtrosFecha.hasta);
        const activo = !!(this.filtrosFecha.desde && this.filtrosFecha.hasta);
        if (!activo) {
            return { activo: false, fechaDesde: null, fechaHasta: null, total: DIAS_MES, elapsed: this.diaActual };
        }
        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
        const total = Math.round((fh - fd) / 86400000) + 1;
        const effEnd = fh.getTime() < hoy.getTime() ? fh : hoy;
        let elapsed = Math.round((effEnd - fd) / 86400000) + 1;
        elapsed = Math.max(1, Math.min(elapsed, total));
        return {
            activo: true,
            fechaDesde: this.filtrosFecha.desde,
            fechaHasta: this.filtrosFecha.hasta,
            total,
            elapsed
        };
    },
    getMesesConCuotas() {
        const meses = [...new Set(this.cuotas.map(c => `${c.mes}-${c.anio}`))];
        return meses.map(m => {
            const [mes, anio] = m.split('-').map(Number);
            return { mes, anio, nombre: MESES.find(mm => mm.valor === mes)?.nombre || mes };
        }).sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
    },

    _ventasEnPeriodo() {
        const p = this.getInfoPeriodo();
        if (!p.activo) {
            return this.getVentasDelMes().filter(v => v.dia <= this.diaActual);
        }
        const fd = this._parseFechaLocal(p.fechaDesde);
        const cutoff = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate() + (p.elapsed - 1));
        const cutoffTs = cutoff.getTime();
        return this.getVentasEnRango(p.fechaDesde, p.fechaHasta).filter(v => {
            const f = new Date(v.fecha);
            if (isNaN(f.getTime())) return false;
            return new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime() <= cutoffTs;
        });
    },

    getMesesDisponibles() {
        const set = new Set();
        for (const c of this.cuotas || []) {
            if (c.anio && c.mes) set.add(c.anio + '-' + String(c.mes).padStart(2, '0'));
        }
        for (const v of this.ventas || []) {
            if (v.fecha) {
                const f = new Date(v.fecha);
                if (!isNaN(f.getTime())) set.add(f.getFullYear() + '-' + String(f.getMonth() + 1).padStart(2, '0'));
            }
        }
        const hoy = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
            set.add(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        return [...set].sort().map(k => {
            const [anio, mes] = k.split('-').map(Number);
            return { mes, anio, nombre: MESES.find(x => x.valor === mes)?.nombre || mes };
        });
    },

    getPDVs() {
        const result = [...PDVS_FIJOS];
        console.log('[AUDITORIA] PDVs obtenidos desde configuración:', result.length, result);
        return result;
    },

    getPDVObjects() {
        const pdvs = this.getPDVs();
        return pdvs.map(pdv => {
            const promInfo = this.promotores.find(p => p.punto_venta === pdv);
            return {
                id: pdv,
                nombre: pdv,
                cadena: promInfo?.cadena || ''
            };
        });
    },

    getCadenas() {
        return [...new Set(this.promotores.map(p => p.cadena).filter(Boolean))].sort();
    },

    getProductos() {
        const productos = new Set(this.ventas.map(v => normalizarProducto(v.producto)));
        for (let p of PRODUCTOS) productos.add(p);
        return [...productos].sort();
    },

    getFechas() {
        const ventasMes = this.getVentasDelMes();
        const fechas = [...new Set(ventasMes.map(v => v.fecha.toISOString().split('T')[0]))].sort();
        return fechas.map(f => new Date(f));
    },

    getVentasDelMes(mes, anio) {
        return this.ventas.filter(v =>
            this.esPDVActivo(v.punto_venta) &&
            v.fecha.getMonth() + 1 === (mes || MES) &&
            v.fecha.getFullYear() === (anio || ANIO)
        );
    },

    getVentasFiltradas({ pdv, producto, cadena, fechaDesde, fechaHasta } = {}) {
        let filtered = this.getVentasDelMes();

        if (pdv && pdv !== 'todos') {
            filtered = filtered.filter(v => v.punto_venta === pdv);
        }
        if (producto && producto !== 'todos') {
            filtered = filtered.filter(v => v.producto === producto);
        }
        if (cadena && cadena !== 'todos') {
            const pdvsCadena = this.promotores.filter(p => p.cadena === cadena).map(p => p.punto_venta);
            filtered = filtered.filter(v => pdvsCadena.includes(v.punto_venta));
        }
        if (fechaDesde) {
            const fd = new Date(fechaDesde);
            filtered = filtered.filter(v => v.fecha >= fd);
        }
        if (fechaHasta) {
            const fh = new Date(fechaHasta);
            filtered = filtered.filter(v => v.fecha <= fh);
        }
        return filtered;
    },

    getVentaTotal() {
        return this._ventasEnPeriodo().reduce((s, v) => s + v.venta, 0);
    },

    getVentaPorProducto() {
        const result = {};
        const ventasPeriodo = this._ventasEnPeriodo();
        for (let prod of this.getProductos()) {
            result[prod] = ventasPeriodo
                .filter(v => v.producto === prod)
                .reduce((s, v) => s + v.venta, 0);
        }
        return result;
    },

    getVentaPorPDV() {
        const result = {};
        const ventasPeriodo = this._ventasEnPeriodo();
        for (let pdv of this.getPDVs()) {
            result[pdv] = ventasPeriodo
                .filter(v => v.punto_venta === pdv)
                .reduce((s, v) => s + v.venta, 0);
        }
        return result;
    },

    getVentaDiaria() {
        const result = {};
        const p = this.getInfoPeriodo();
        const ventasPeriodo = this._ventasEnPeriodo();
        const fd = p.fechaDesde
            ? this._parseFechaLocal(p.fechaDesde)
            : new Date(ANIO, MES - 1, 1);
        const elapsed = p.elapsed;
        const base = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate()).getTime();
        for (let prod of this.getProductos()) {
            result[prod] = new Array(elapsed).fill(0);
        }
        for (const v of ventasPeriodo) {
            const f = new Date(v.fecha);
            if (isNaN(f.getTime()) || !result[v.producto]) continue;
            const idx = Math.round((new Date(f.getFullYear(), f.getMonth(), f.getDate()).getTime() - base) / 86400000);
            if (idx >= 0 && idx < elapsed) result[v.producto][idx] += v.venta;
        }
        return result;
    },

    getCuotaTotal() {
        return this.getCuotasEnRango().reduce((s, c) => s + c.cuota, 0);
    },

    getAvanceGeneral() {
        const ventaTotal = this.getVentaTotal();
        const cuotaTotal = this.getCuotaTotal();
        return cuotaTotal > 0 ? (ventaTotal / cuotaTotal) * 100 : 0;
    },

    getProyeccion() {
        const ventaTotal = this.getVentaTotal();
        const p = this.getInfoPeriodo();
        if (p.elapsed === 0) return 0;
        return (ventaTotal / p.elapsed) * p.total;
    },

    getCumplimientoPorProducto() {
        const result = {};
        const cuotasFiltradas = this.getCuotasEnRango();
        const ventasPeriodo = this._ventasEnPeriodo();
        for (let prod of this.getProductos()) {
            const venta = ventasPeriodo
                .filter(v => v.producto === prod)
                .reduce((s, v) => s + v.venta, 0);
            const cuota = cuotasFiltradas
                .filter(c => c.producto === prod)
                .reduce((s, c) => s + c.cuota, 0);
            result[prod] = {
                venta,
                cuota,
                cumplimiento: cuota > 0 ? (venta / cuota) * 100 : 0
            };
        }
        return result;
    },

    getCumplimientoPorPDV(filtros = {}) {
        const result = {};
        const fechaDesde = filtros.fechaDesde || this.filtrosFecha.desde;
        const fechaHasta = filtros.fechaHasta || this.filtrosFecha.hasta;
        const ventasMes = this.getVentasEnRango(fechaDesde, fechaHasta);
        const cuotasFiltradas = this.getCuotasEnRango(fechaDesde, fechaHasta);
        const periodo = this.getInfoPeriodo();
        const totalDias = periodo.total;
        const diasTranscurridos = periodo.elapsed;
        for (let pdv of this.getPDVs()) {
            let ventaTotal = 0, cuotaTotal = 0;
            const productos = {};
            for (let prod of this.getProductos()) {
                const venta = ventasMes
                    .filter(v => v.punto_venta === pdv && v.producto === prod)
                    .reduce((s, v) => s + v.venta, 0);
                const cuota = cuotasFiltradas
                    .filter(c => c.punto_venta === pdv && c.producto === prod)
                    .reduce((s, c) => s + c.cuota, 0);
                ventaTotal += venta;
                cuotaTotal += cuota;
                productos[prod] = { venta, cuota, cumplimiento: cuota > 0 ? (venta / cuota) * 100 : 0 };
            }
            const proyeccion = diasTranscurridos > 0 ? (ventaTotal / diasTranscurridos) * totalDias : 0;
            result[pdv] = {
                venta: ventaTotal,
                cuota: cuotaTotal,
                cumplimiento: cuotaTotal > 0 ? (ventaTotal / cuotaTotal) * 100 : 0,
                proyeccion,
                diferencia: cuotaTotal - ventaTotal,
                productos,
                proyectaCumplir: proyeccion >= cuotaTotal,
                cadena: this.promotores.find(p => p.punto_venta === pdv)?.cadena || ''
            };
        }
        return result;
    },

    getRanking() {
        const pdvs = this.getCumplimientoPorPDV();
        return Object.entries(pdvs)
            .map(([pdv, data]) => ({
                punto_venta: pdv,
                puntaje: data.cumplimiento,
                cumplimiento: data.cumplimiento,
                venta_total: data.venta,
                proyeccion: data.proyeccion,
                cuota: data.cuota
            }))
            .sort((a, b) => b.puntaje - a.puntaje)
            .map((item, i) => ({ ...item, puesto: i + 1 }));
    },

    getPDVsEnRiesgo() {
        const pdvs = this.getCumplimientoPorPDV();
        return Object.values(pdvs).filter(p => p.proyeccion < p.cuota).length;
    },

    getPDVsCumplenMeta() {
        const pdvs = this.getCumplimientoPorPDV();
        return Object.values(pdvs).filter(p => p.proyeccion >= p.cuota).length;
    },

    getMejorPDV() {
        const pdvs = this.getCumplimientoPorPDV();
        return Object.entries(pdvs).sort((a, b) => b[1].cumplimiento - a[1].cumplimiento)[0]?.[0] || '';
    },

    getMayorCrecimiento() {
        const prods = this.getCumplimientoPorProducto();
        return Object.entries(prods).sort((a, b) => b[1].cumplimiento - a[1].cumplimiento)[0]?.[0] || '';
    },

    getProyeccionPDV(pdv) {
        const data = this.getCumplimientoPorPDV();
        return data[pdv] || null;
    },

    calcularVentaDiariaRequerida({ diferencia, anio, mesNumero, diaActual, totalDias }) {
        const diasDelMes = totalDias || new Date(anio, mesNumero, 0).getDate();
        const diasRestantes = Math.max(diasDelMes - diaActual, 0);
        if (diferencia <= 0) {
            return { estado: 'meta_cumplida', ventaDiariaRequerida: 0, diasRestantes: 0, diasDelMes };
        }
        if (diasRestantes <= 0) {
            return { estado: 'mes_finalizado', ventaDiariaRequerida: 0, diasRestantes: 0, diasDelMes };
        }

        return {
            estado: 'en_progreso',
            ventaDiariaRequerida: Math.round((diferencia / diasRestantes) * 100) / 100,
            diasRestantes,
            diasDelMes,
        };
    },

    getEvolucionDiaria() {
        return this.getVentaDiaria();
    },

    getParticipacionProducto() {
        const ventaTotal = this.getVentaTotal();
        const porProducto = this.getVentaPorProducto();
        for (let prod in porProducto) {
            porProducto[prod] = ventaTotal > 0 ? (porProducto[prod] / ventaTotal) * 100 : 0;
        }
        return porProducto;
    },

    getAvancePorProducto() {
        return this.getCumplimientoPorProducto();
    },

    actualizarVentasCalendario(pdv, datos) {
        const mes = datos.length > 0 ? datos[0].mes : MES;
        const anio = datos.length > 0 ? datos[0].anio : ANIO;
        const promotorId = datos.length > 0 ? datos[0].promotor_id : null;
        const key = d => `${d.producto}|${d.dia}|${d.mes || mes}|${d.anio || anio}`;
        const diasEnviados = new Set(datos.map(key));
        const aEliminar = this.ventas.filter(v =>
            v.punto_venta === pdv &&
            v.fecha.getMonth() + 1 === mes &&
            v.fecha.getFullYear() === anio &&
            v.promotor_id === promotorId &&
            !diasEnviados.has(`${v.producto}|${v.dia}|${mes}|${anio}`)
        );
        for (let del of aEliminar) {
            const idx = this.ventas.indexOf(del);
            if (idx !== -1) this.ventas.splice(idx, 1);
        }

        for (let d of datos) {
            const itemMes = d.mes || mes;
            const itemAnio = d.anio || anio;
            const existente = this.ventas.find(v =>
                v.punto_venta === d.pdv &&
                v.producto === d.producto &&
                v.dia === d.dia &&
                v.fecha.getMonth() + 1 === itemMes &&
                v.fecha.getFullYear() === itemAnio &&
                v.promotor_id === d.promotor_id
            );
            if (existente) {
                existente.venta = d.monto;
                if (d.promotor_id) {
                    existente.promotor_id = d.promotor_id;
                    existente.promotor_nombre = d.promotor_nombre;
                    existente.promotor_correo = d.promotor_correo;
                    existente.promotor_dni = d.promotor_dni;
                }
            } else {
                const ventaNueva = {
                    fecha: new Date(itemAnio, itemMes - 1, d.dia),
                    dia: d.dia,
                    punto_venta: d.pdv,
                    producto: d.producto,
                    venta: d.monto
                };
                if (d.promotor_id) {
                    ventaNueva.promotor_id = d.promotor_id;
                    ventaNueva.promotor_nombre = d.promotor_nombre;
                    ventaNueva.promotor_correo = d.promotor_correo;
                    ventaNueva.promotor_dni = d.promotor_dni;
                }
                this.ventas.push(ventaNueva);
            }
        }
        if (!this.promotores.find(p => p.punto_venta === pdv)) {
            this.promotores.push({
                punto_venta: pdv,
                cadena: 'Manual',
                num_promotores: 1
            });
        }

        this._guardarEnFirestore();

        return aEliminar.length;
    },

    actualizarCuotas(nuevasCuotas, mes, anio) {
        const otrasCuotas = this.cuotas.filter(c => c.mes !== mes || c.anio !== anio);
        this.cuotas = [...otrasCuotas, ...nuevasCuotas];
        this._guardarEnFirestore();
    },



    _iniciarFirestore() {
        db.collection('dashboard').doc('datos').get().then(snap => {
            if (snap.exists) {
                const data = snap.data();

                if (!data.ventas || data.ventas.length === 0) {
                    this.ventas = [];
                    this.cuotas = [];
                    this.diaActual = Math.min(new Date().getDate(), DIAS_MES);
                    if (typeof recargarDashboard === 'function') recargarDashboard();
                    return;
                }

                const hoy = new Date();
                const diaHoy = hoy.getDate();

                this.ventas = data.ventas.map(v => ({
                    ...v,
                    producto: normalizarProducto(v.producto),
                    fecha: new Date(v.fecha)
                }));

                let cuotasCargadas = (data.cuotas || []).map(c => ({
                    ...c,
                    producto: normalizarProducto(c.producto),
                    mes: c.mes || MES,
                    anio: c.anio || ANIO
                }));
                this.cuotas = cuotasCargadas;
                this.promotores = data.promotores;
                this.diaActual = Math.min(diaHoy, DIAS_MES);

                if (typeof recargarDashboard === 'function') recargarDashboard();
            } else {
                this._guardarEnFirestore();
            }
        });

        db.collection('dashboard').doc('datos')
            .onSnapshot(snap => {
                if (!snap.exists) return;
                const data = snap.data();

                if (!data.ventas || data.ventas.length === 0) {
                    this.ventas = [];
                    this.cuotas = [];
                    this.diaActual = Math.min(new Date().getDate(), DIAS_MES);
                    if (typeof recargarDashboard === 'function') recargarDashboard();
                    return;
                }

                const hoy = new Date();
                const hoyDia = hoy.getDate();

                this.ventas = data.ventas.map(v => ({
                    ...v,
                    producto: normalizarProducto(v.producto),
                    fecha: new Date(v.fecha)
                }));

                let cuotasCargadas = (data.cuotas || []).map(c => ({
                    ...c,
                    producto: normalizarProducto(c.producto),
                    mes: c.mes || MES,
                    anio: c.anio || ANIO
                }));
                this.cuotas = cuotasCargadas;
                this.promotores = data.promotores;
                this.diaActual = Math.min(hoyDia, DIAS_MES);

                if (typeof recargarDashboard === 'function') recargarDashboard();
            });
    },

    _guardarEnFirestore() {
        db.collection('dashboard').doc('datos').set({
            ventas: this.ventas.map(v => ({
                ...v,
                fecha: v.fecha.toISOString()
            })),
            cuotas: this.cuotas,
            promotores: this.promotores,
            diaActual: this.diaActual
        });
    }



}

DataStore.init();
