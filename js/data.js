const PRODUCTOS = ['Apuestas Deportivas', 'Lottingo', 'Hípica', 'Juegos Virtuales', 'Torito', 'VLT', 'LOTOBOLA'];
const MES = 7;
const ANIO = 2026;
const DIAS_MES = 31;
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
    'RED AT CAMANA', 'RED AT CAYMA', 'RED AT DOLORES',
    'RED AT LA JOYA', 'RED AT PROGRESO', 'RED AT REPSOL PROGRESO',
    'RED AT RIVERO'
];
console.log('[AUDITORIA] data.js v3 CARGADO, PDVS_FIJOS:', PDVS_FIJOS.length, PDVS_FIJOS);

const DataStore = {
    ventas: [],
    cuotas: [],
    promotores: [],
    diaActual: 1,
    initialized: false,

    init() {
        this.ventas = [];
        this.cuotas = [];
        this.promotores = PDVS_FIJOS.map(pdv => ({
            punto_venta: pdv,
            cadena: 'AREQUIPA SUR',
            num_promotores: 1
        }));
        this.diaActual = 1;
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
                        fecha: new Date(v.fecha)
                    }));
                }
                if (data.cuotas && data.cuotas.length > 0) {
                    this.cuotas = data.cuotas.map(c => ({
                        ...c,
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
                    const hoy = new Date();
                    const mesHoy = hoy.getMonth() + 1;
                    const anioHoy = hoy.getFullYear();
                    this.diaActual = (mesHoy === MES && anioHoy === ANIO)
                        ? Math.max(data.diaActual, Math.min(hoy.getDate(), DIAS_MES))
                        : data.diaActual;
                }

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
                        fecha: new Date(v.fecha)
                    }));
                } else {
                    this.ventas = [];
                }
                if (data.cuotas && data.cuotas.length > 0) {
                    this.cuotas = data.cuotas.map(c => ({
                        ...c,
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
                    const hoy = new Date();
                    const hoyDia = Math.min(hoy.getDate(), DIAS_MES);
                    const hoyMes = hoy.getMonth() + 1;
                    const hoyAnio = hoy.getFullYear();
                    this.diaActual = (hoyMes === MES && hoyAnio === ANIO)
                        ? Math.max(data.diaActual, hoyDia)
                        : data.diaActual;
                }

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

    parseExcel(data) {
        const workbook = XLSX.read(data, { type: 'array' });

        if (workbook.SheetNames.includes('JULIO DATA')) {
            const sheet = workbook.Sheets['JULIO DATA'];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
            this.ventas = json.map(row => ({
                fecha: new Date(row.Fecha || row.fecha || row.FECHA),
                dia: parseInt(row.Día || row.dia || row.DIA || row.Día),
                punto_venta: row['Punto de Venta'] || row.punto_venta || row['PUNTO DE VENTA'],
                producto: row.Producto || row.producto || row.PRODUCTO,
                venta: parseFloat(row.Venta || row.venta || row.VENTA || 0)
            }));
        }

        if (workbook.SheetNames.includes('CUOTAS')) {
            const sheet = workbook.Sheets['CUOTAS'];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
            this.cuotas = json.map(row => ({
                punto_venta: row['Punto de Venta'] || row.punto_venta,
                producto: row.Producto || row.producto,
                cuota: parseFloat(row.Cuota || row.cuota || row.CUOTA || 0),
                mes: parseInt(row.Mes || row.mes || row.MES || MES),
                anio: parseInt(row.Año || row.anio || row.ANIO || row['A\u00f1o'] || ANIO)
            }));
        }

        if (workbook.SheetNames.includes('PROMOTORES')) {
            const sheet = workbook.Sheets['PROMOTORES'];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: 0 });
            this.promotores = json.map(row => ({
                punto_venta: row['Punto de Venta'] || row.punto_venta,
                cadena: row.Cadena || row.cadena || row.CADENA || 'AREQUIPA SUR',
                num_promotores: parseInt(row['N° Promotores'] || row.num_promotores || 1)
            }));
        }

        const existentes = new Set(this.promotores.map(p => p.punto_venta));
        for (const pdv of PDVS_FIJOS) {
            if (!existentes.has(pdv)) {
                this.promotores.push({
                    punto_venta: pdv,
                    cadena: 'AREQUIPA SUR',
                    num_promotores: 1
                });
            }
        }

        const hoy = new Date();
        this.diaActual = Math.min(hoy.getDate(), DIAS_MES);

        this._guardarEnFirestore();
    },

    getVentas() { return this.ventas; },
    getCuotas(mes, anio) {
        if (mes && anio) {
            return this.cuotas.filter(c => c.mes === mes && c.anio === anio);
        }
        return this.cuotas.filter(c => c.mes === MES && c.anio === ANIO);
    },
    getCuotasCompletas() { return this.cuotas; },
    getPromotores() { return this.promotores; },
    getDiaActual() { return this.diaActual; },
    getMesesConCuotas() {
        const meses = [...new Set(this.cuotas.map(c => `${c.mes}-${c.anio}`))];
        return meses.map(m => {
            const [mes, anio] = m.split('-').map(Number);
            return { mes, anio, nombre: MESES.find(mm => mm.valor === mes)?.nombre || mes };
        }).sort((a, b) => a.anio !== b.anio ? a.anio - b.anio : a.mes - b.mes);
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
        const productos = new Set(this.ventas.map(v => v.producto));
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
        return this.getVentasDelMes()
            .filter(v => v.dia <= this.diaActual)
            .reduce((s, v) => s + v.venta, 0);
    },

    getVentaPorProducto() {
        const result = {};
        const ventasMes = this.getVentasDelMes();
        for (let prod of this.getProductos()) {
            result[prod] = ventasMes
                .filter(v => v.producto === prod && v.dia <= this.diaActual)
                .reduce((s, v) => s + v.venta, 0);
        }
        return result;
    },

    getVentaPorPDV() {
        const result = {};
        const ventasMes = this.getVentasDelMes();
        for (let pdv of this.getPDVs()) {
            result[pdv] = ventasMes
                .filter(v => v.punto_venta === pdv && v.dia <= this.diaActual)
                .reduce((s, v) => s + v.venta, 0);
        }
        return result;
    },

    getVentaDiaria() {
        const result = {};
        const ventasMes = this.getVentasDelMes();
        for (let prod of this.getProductos()) {
            result[prod] = [];
            for (let d = 1; d <= this.diaActual; d++) {
                const total = ventasMes
                    .filter(v => v.producto === prod && v.dia === d)
                    .reduce((s, v) => s + v.venta, 0);
                result[prod].push(total);
            }
        }
        return result;
    },

    getCuotaTotal() {
        const cuotasFiltradas = this.getCuotas();
        return cuotasFiltradas.reduce((s, c) => s + c.cuota, 0);
    },

    getAvanceGeneral() {
        const ventaTotal = this.getVentaTotal();
        const cuotaTotal = this.getCuotaTotal();
        return cuotaTotal > 0 ? (ventaTotal / cuotaTotal) * 100 : 0;
    },

    getProyeccion() {
        const ventaTotal = this.getVentaTotal();
        if (this.diaActual === 0) return 0;
        return (ventaTotal / this.diaActual) * DIAS_MES;
    },

    getCumplimientoPorProducto() {
        const result = {};
        const cuotasFiltradas = this.getCuotas();
        const ventasMes = this.getVentasDelMes();
        for (let prod of this.getProductos()) {
            const venta = ventasMes
                .filter(v => v.producto === prod && v.dia <= this.diaActual)
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
        const diaDesde = filtros.fechaDesde ? new Date(filtros.fechaDesde).getDate() : 1;
        const diaHasta = filtros.fechaHasta ? new Date(filtros.fechaHasta).getDate() : this.diaActual;
        const filtrarFecha = v => v.dia >= diaDesde && v.dia <= diaHasta;
        const cuotasFiltradas = this.getCuotas();
        const ventasMes = this.getVentasDelMes();
        for (let pdv of this.getPDVs()) {
            let ventaTotal = 0, cuotaTotal = 0;
            const productos = {};
            for (let prod of this.getProductos()) {
                const venta = ventasMes
                    .filter(v => v.punto_venta === pdv && v.producto === prod && v.dia <= this.diaActual && filtrarFecha(v))
                    .reduce((s, v) => s + v.venta, 0);
                const cuota = cuotasFiltradas
                    .filter(c => c.punto_venta === pdv && c.producto === prod)
                    .reduce((s, c) => s + c.cuota, 0);
                ventaTotal += venta;
                cuotaTotal += cuota;
                productos[prod] = { venta, cuota, cumplimiento: cuota > 0 ? (venta / cuota) * 100 : 0 };
            }
            const proyeccion = this.diaActual > 0 ? (ventaTotal / this.diaActual) * DIAS_MES : 0;
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

    calcularVentaDiariaRequerida({ diferencia, anio, mesNumero, diaActual }) {
        const diasDelMes = new Date(anio, mesNumero, 0).getDate();
        const diasRestantes = diasDelMes - diaActual + 1;

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
                    this.diaActual = 1;
                    if (typeof recargarDashboard === 'function') recargarDashboard();
                    return;
                }

                const hoy = new Date();
                const diaHoy = Math.min(hoy.getDate(), DIAS_MES);
                const mesHoy = hoy.getMonth() + 1;
                const anioHoy = hoy.getFullYear();

                this.ventas = data.ventas.map(v => ({
                    ...v,
                    fecha: new Date(v.fecha)
                }));

                let cuotasCargadas = (data.cuotas || []).map(c => ({
                    ...c,
                    mes: c.mes || MES,
                    anio: c.anio || ANIO
                }));
                this.cuotas = cuotasCargadas;
                this.promotores = data.promotores;
                this.diaActual = (mesHoy === MES && anioHoy === ANIO) ? Math.max(data.diaActual, diaHoy) : data.diaActual;

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
                    this.diaActual = 1;
                    if (typeof recargarDashboard === 'function') recargarDashboard();
                    return;
                }

                const hoy = new Date();
                const hoyDia = Math.min(hoy.getDate(), DIAS_MES);
                const hoyMes = hoy.getMonth() + 1;
                const hoyAnio = hoy.getFullYear();

                this.ventas = data.ventas.map(v => ({
                    ...v,
                    fecha: new Date(v.fecha)
                }));

                let cuotasCargadas = (data.cuotas || []).map(c => ({
                    ...c,
                    mes: c.mes || MES,
                    anio: c.anio || ANIO
                }));
                this.cuotas = cuotasCargadas;
                this.promotores = data.promotores;
                this.diaActual = (hoyMes === MES && hoyAnio === ANIO) ? Math.max(data.diaActual, hoyDia) : data.diaActual;

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
