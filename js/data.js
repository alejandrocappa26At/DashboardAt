const PRODUCTOS = ['Apuestas Deportivas', 'Lottingo', 'Hípica', 'Juegos Virtuales', 'Torito', 'VLT'];
const MES = 7;
const ANIO = 2026;
const DIAS_MES = 31;

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
            cuotas.push({ punto_venta: pdv, producto: prod, cuota });
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
                cuota: parseFloat(row.Cuota || row.cuota || row.CUOTA || 0)
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
    getCuotas() { return this.cuotas; },
    getPromotores() { return this.promotores; },
    getDiaActual() { return this.diaActual; },

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
        const fechas = [...new Set(this.ventas.map(v => v.fecha.toISOString().split('T')[0]))].sort();
        return fechas.map(f => new Date(f));
    },

    getVentasFiltradas({ pdv, producto, cadena, fechaDesde, fechaHasta } = {}) {
        let filtered = [...this.ventas];

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
        return this.ventas
            .filter(v => v.dia <= this.diaActual)
            .reduce((s, v) => s + v.venta, 0);
    },

    getVentaPorProducto() {
        const result = {};
        for (let prod of this.getProductos()) {
            result[prod] = this.ventas
                .filter(v => v.producto === prod && v.dia <= this.diaActual)
                .reduce((s, v) => s + v.venta, 0);
        }
        return result;
    },

    getVentaPorPDV() {
        const result = {};
        for (let pdv of this.getPDVs()) {
            result[pdv] = this.ventas
                .filter(v => v.punto_venta === pdv && v.dia <= this.diaActual)
                .reduce((s, v) => s + v.venta, 0);
        }
        return result;
    },

    getVentaDiaria() {
        const result = {};
        for (let prod of this.getProductos()) {
            result[prod] = [];
            for (let d = 1; d <= this.diaActual; d++) {
                const total = this.ventas
                    .filter(v => v.producto === prod && v.dia === d)
                    .reduce((s, v) => s + v.venta, 0);
                result[prod].push(total);
            }
        }
        return result;
    },

    getCuotaTotal() {
        return this.cuotas.reduce((s, c) => s + c.cuota, 0);
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
        for (let prod of this.getProductos()) {
            const venta = this.ventas
                .filter(v => v.producto === prod && v.dia <= this.diaActual)
                .reduce((s, v) => s + v.venta, 0);
            const cuota = this.cuotas
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
        for (let pdv of this.getPDVs()) {
            let ventaTotal = 0, cuotaTotal = 0;
            const productos = {};
            for (let prod of this.getProductos()) {
                const venta = this.ventas
                    .filter(v => v.punto_venta === pdv && v.producto === prod && v.dia <= this.diaActual && filtrarFecha(v))
                    .reduce((s, v) => s + v.venta, 0);
                const cuota = this.cuotas
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
        const diasEnviados = new Set(datos.map(d => `${d.producto}|${d.dia}`));
        const aEliminar = this.ventas.filter(v =>
            v.punto_venta === pdv &&
            v.dia <= DIAS_MES &&
            !diasEnviados.has(`${v.producto}|${v.dia}`)
        );
        for (let del of aEliminar) {
            const idx = this.ventas.indexOf(del);
            if (idx !== -1) this.ventas.splice(idx, 1);
        }

        for (let d of datos) {
            const existente = this.ventas.find(v =>
                v.punto_venta === d.pdv &&
                v.producto === d.producto &&
                v.dia === d.dia
            );
            if (existente) {
                existente.venta = d.monto;
            } else {
                this.ventas.push({
                    fecha: new Date(ANIO, MES - 1, d.dia),
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



    _iniciarFirestore() {
        db.collection('dashboard').doc('datos').get().then(snap => {
            if (snap.exists) {
                const data = snap.data();

                this.ventas = data.ventas.map(v => ({
                    ...v,
                    fecha: new Date(v.fecha)
                }));

                this.cuotas = data.cuotas;
                this.promotores = data.promotores;
                this.diaActual = data.diaActual;

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

                this.ventas = data.ventas.map(v => ({
                    ...v,
                    fecha: new Date(v.fecha)
                }));

                this.cuotas = data.cuotas;
                this.promotores = data.promotores;
                this.diaActual = data.diaActual;

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
