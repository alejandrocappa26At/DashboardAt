const PRODUCTOS = ['Apuestas Deportivas', 'Lottingo', 'Hípica', 'Juegos Virtuales', 'Torito', 'VLT'];
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
    const pdvs = [
        'Red At La Joya', 'Red AT Cayma', 'Red AT Repsol Progreso',
        'Red AT Atlas', 'Red AT Progreso', 'Red AT Bustamante y Rivero',
        'Red AT Alto Selva Alegre', 'Red AT Dolores', 'Red AT Rivero', 'Red At Camaná'
    ];
    const cadenas = {
        'Red At La Joya': 'Principal',
        'Red AT Cayma': 'Principal',
        'Red AT Repsol Progreso': 'Secundaria',
        'Red AT Atlas': 'Secundaria',
        'Red AT Progreso': 'Premium',
        'Red AT Bustamante y Rivero': 'Express',
        'Red AT Alto Selva Alegre': 'Premium',
        'Red AT Dolores': 'Deportes',
        'Red AT Rivero': 'Premium',
        'Red At Camaná': 'Secundaria'
    };

    const ventas = [];
    const hoy = new Date();
    const diaActual = hoy.getDate() > DIAS_MES ? DIAS_MES : hoy.getDate();

    for (let pdv of pdvs) {
        for (let prod of PRODUCTOS) {
            const baseVenta = Math.random() * 5000 + 500;
            for (let d = 1; d <= DIAS_MES; d++) {
                const factor = 1 + (Math.random() - 0.5) * 0.4;
                const ventaDiaria = Math.round(baseVenta * factor * (1 + d / 100));
                ventas.push({
                    fecha: new Date(ANIO, MES - 1, d),
                    dia: d,
                    punto_venta: pdv,
                    producto: prod,
                    venta: ventaDiaria
                });
            }
        }
    }

    const cuotas = [];
    for (let pdv of pdvs) {
        for (let prod of PRODUCTOS) {
            const totalVentas = ventas
                .filter(v => v.punto_venta === pdv && v.producto === prod)
                .reduce((s, v) => s + v.venta, 0);
            const cuota = Math.round(totalVentas * (0.85 + Math.random() * 0.3));
            cuotas.push({ punto_venta: pdv, producto: prod, cuota, mes: MES, anio: ANIO });
        }
    }

    const promotores = pdvs.map(pdv => ({
        punto_venta: pdv,
        cadena: cadenas[pdv],
        num_promotores: Math.floor(Math.random() * 5) + 1
    }));

    return { ventas, cuotas, promotores, diaActual };
}

const DataStore = {
    ventas: [],
    cuotas: [],
    promotores: [],
    diaActual: 1,
    initialized: false,

    init() {
        const mock = generarMockData();
        this.ventas = mock.ventas;
        this.cuotas = mock.cuotas;
        this.promotores = mock.promotores;
        this.diaActual = mock.diaActual;
        this.initialized = true;
        this._iniciarFirestore();
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
                cadena: row.Cadena || row.cadena || row.CADENA || '',
                num_promotores: parseInt(row['N° Promotores'] || row.num_promotores || 0)
            }));
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
        return [...new Set(this.ventas.map(v => v.punto_venta))].sort();
    },

    getCadenas() {
        return [...new Set(this.promotores.map(p => p.cadena).filter(Boolean))].sort();
    },

    getProductos() {
        return [...new Set(this.ventas.map(v => v.producto))].sort();
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
        const key = d => `${d.producto}|${d.dia}|${d.mes || mes}|${d.anio || anio}`;
        const diasEnviados = new Set(datos.map(key));
        const aEliminar = this.ventas.filter(v =>
            v.punto_venta === pdv &&
            v.fecha.getMonth() + 1 === mes &&
            v.fecha.getFullYear() === anio &&
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
                v.fecha.getFullYear() === itemAnio
            );
            if (existente) {
                existente.venta = d.monto;
            } else {
                this.ventas.push({
                    fecha: new Date(itemAnio, itemMes - 1, d.dia),
                    dia: d.dia,
                    punto_venta: d.pdv,
                    producto: d.producto,
                    venta: d.monto
                });
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

                if (typeof recargarDashboard === 'function') {
                    recargarDashboard();
                }
            } else {
                this._guardarEnFirestore();
            }
        });

        db.collection('dashboard').doc('datos')
            .onSnapshot(snap => {
                if (!snap.exists) return;

                const data = snap.data();
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

                if (typeof recargarDashboard === 'function') {
                    recargarDashboard();
                }
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
