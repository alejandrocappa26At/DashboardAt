/* =============================================
   CORTE COMERCIAL — Seguimiento diario por PDV
   Cortes acumulativos 06:00 AM → 11:30 / 3:30 / 6:30 PM
   Las ventas se registran a nivel de día; la venta
   acumulada a cada hora se simula por proporción del día
   (referencial). Diseño ejecutivo tipo tablero gerencial.
   ============================================= */

const CORTES_COMERCIALES = [
    { id: '1130', label: '11:30 AM', hora: '11:30', pct: 0.46, rango: '06:00 AM a 11:30 AM', icon: '\ud83c\udf05' },
    { id: '1530', label: '3:30 PM', hora: '15:30', pct: 0.60, rango: '06:00 AM a 3:30 PM', icon: '\u2600\ufe0f' },
    { id: '1830', label: '6:30 PM', hora: '18:30', pct: 0.78, rango: '06:00 AM a 6:30 PM', icon: '\ud83c\udf06' }
];

const CorteComercial = {
    corteId: '1830',
    fecha: null,
    inicializado: false
};

function corteObtenerCorte() {
    return CORTES_COMERCIALES.find(c => c.id === CorteComercial.corteId) || CORTES_COMERCIALES[CORTES_COMERCIALES.length - 1];
}

function corteAutoseleccionar() {
    const ahora = new Date();
    const mins = ahora.getHours() * 60 + ahora.getMinutes();
    let sel = CORTES_COMERCIALES[0];
    for (const c of CORTES_COMERCIALES) {
        const p = c.hora.split(':').map(Number);
        if (mins >= p[0] * 60 + p[1]) sel = c;
    }
    CorteComercial.corteId = sel.id;
}

function corteSeleccionar(id) {
    CorteComercial.corteId = id;
    renderizarCorteComercial();
}

function corteCambiarFecha(val) {
    CorteComercial.fecha = val || formatearFechaLocal(new Date());
    renderizarCorteComercial();
}

function corteEstado(corte, fecha) {
    const hoy = formatearFechaLocal(new Date());
    if (fecha !== hoy) return { txt: 'Hist\u00f3rico', cls: 'hist' };
    const ahora = new Date();
    const mins = ahora.getHours() * 60 + ahora.getMinutes();
    const p = corte.hora.split(':').map(Number);
    const corteMins = p[0] * 60 + p[1];
    if (mins < corteMins) return { txt: 'Pr\u00f3ximo corte', cls: 'pend' };
    return { txt: 'Corte en curso', cls: 'live' };
}

function corteComputar() {
    const fecha = CorteComercial.fecha || formatearFechaLocal(new Date());
    const corte = corteObtenerCorte();
    const pct = corte.pct;
    const f = new Date(fecha + 'T00:00:00');
    const anio = f.getFullYear();
    const mes = f.getMonth() + 1;
    const totalDiasMes = new Date(anio, mes, 0).getDate();

    const productos = DataStore.getProductos();
    const pdvs = DataStore.getPDVs();

    /* Ventas del día (se suman todos los registros del PDV + producto) */
    const ventaDia = {};
    for (const v of DataStore.ventas) {
        if (!DataStore.esPDVActivo(v.punto_venta)) continue;
        if (!v.fecha) continue;
        const vf = new Date(v.fecha);
        if (isNaN(vf.getTime())) continue;
        if (vf.getFullYear() !== anio || vf.getMonth() !== mes - 1 || vf.getDate() !== f.getDate()) continue;
        const key = v.punto_venta + '\u0001' + v.producto;
        ventaDia[key] = (ventaDia[key] || 0) + (v.venta || 0);
    }

    /* Cuota del mes vigente */
    const cuotaMes = {};
    for (const c of DataStore.getCuotas(mes, anio)) {
        const key = c.punto_venta + '\u0001' + c.producto;
        cuotaMes[key] = (cuotaMes[key] || 0) + (c.cuota || 0);
    }

    /* Filas por PDV: venta y meta proporcional al corte */
    const filas = pdvs.map(pdv => {
        const productosArr = productos.map(prod => {
            const key = pdv + '\u0001' + prod;
            const ventaDiaX = ventaDia[key] || 0;
            const cuotaDiaX = totalDiasMes > 0 ? (cuotaMes[key] || 0) / totalDiasMes : 0;
            const venta = ventaDiaX * pct;
            const meta = cuotaDiaX * pct;
            return {
                producto: prod,
                venta,
                meta,
                alcance: meta > 0 ? (venta / meta) * 100 : 0
            };
        });
        const ventaTotal = productosArr.reduce((s, p) => s + p.venta, 0);
        const metaTotal = productosArr.reduce((s, p) => s + p.meta, 0);
        return {
            pdv,
            productos: productosArr,
            venta: ventaTotal,
            meta: metaTotal,
            alcance: metaTotal > 0 ? (ventaTotal / metaTotal) * 100 : 0
        };
    }).sort((a, b) => b.alcance - a.alcance);

    const ventaGlobal = filas.reduce((s, f) => s + f.venta, 0);
    const metaGlobal = filas.reduce((s, f) => s + f.meta, 0);
    const alcanceGlobal = metaGlobal > 0 ? (ventaGlobal / metaGlobal) * 100 : 0;

    /* Comparación entre cortes (crecimiento durante el día) */
    const totalVentaDia = Object.keys(ventaDia).reduce((s, k) => s + ventaDia[k], 0);
    const totalCuotaDia = Object.keys(cuotaMes).reduce((s, k) => s + (cuotaMes[k] || 0), 0) / totalDiasMes;
    const cortesData = CORTES_COMERCIALES.map(c => {
        const venta = totalVentaDia * c.pct;
        const meta = totalCuotaDia * c.pct;
        return {
            corte: c,
            venta,
            meta,
            alcance: meta > 0 ? (venta / meta) * 100 : 0
        };
    });

    const pdvsRiesgo = filas.filter(f => f.alcance < 80);
    const mejorPdv = filas[0] || null;

    /* Totales por producto para la fila final */
    const totalesProducto = productos.map(prod => {
        let venta = 0, meta = 0;
        for (const f of filas) {
            const p = f.productos.find(x => x.producto === prod);
            if (p) { venta += p.venta; meta += p.meta; }
        }
        return {
            producto: prod,
            venta,
            meta,
            alcance: meta > 0 ? (venta / meta) * 100 : 0
        };
    });

    return {
        fecha,
        corte,
        productos,
        filas,
        ventaGlobal,
        metaGlobal,
        alcanceGlobal,
        cortesData,
        pdvsRiesgo,
        mejorPdv,
        totalesProducto
    };
}

function buildCorteKpis(res) {
    const avCls = res.alcanceGlobal >= 100 ? 'green' : res.alcanceGlobal >= 80 ? 'yellow' : 'red';
    const kpi = (label, value, cls, sub) =>
        '<div class="ctl-kpi"><span class="ctl-kpi-label">' + label + '</span>' +
        '<span class="ctl-kpi-value ' + cls + '">' + value + '</span>' +
        (sub ? '<span class="ctl-kpi-sub">' + sub + '</span>' : '') + '</div>';

    return kpi('Venta acumulada', formatCurrency(res.ventaGlobal), 'green', 'hasta ' + res.corte.label) +
        kpi('Meta acumulada', formatCurrency(res.metaGlobal), 'blue', 'meta proporcional al corte') +
        kpi('Alcance general', formatPercent(res.alcanceGlobal), avCls, res.alcanceGlobal >= 100 ? 'meta alcanzada' : 'falta ' + formatPercent(100 - res.alcanceGlobal)) +
        kpi('Mejor PDV', res.mejorPdv ? ctlNombreCorto(res.mejorPdv.pdv) : '-', 'yellow', res.mejorPdv ? formatPercent(res.mejorPdv.alcance) + ' de alcance' : 'sin datos') +
        kpi('PDV en riesgo', res.pdvsRiesgo.length + ' de ' + res.filas.length, 'red', 'alcance menor a 80%');
}

function buildCorteComparacion(res) {
    const cards = res.cortesData.map((cd, i) => {
        const prev = i > 0 ? res.cortesData[i - 1] : null;
        let delta = '';
        if (prev && prev.venta > 0) {
            const pctDelta = ((cd.venta - prev.venta) / prev.venta) * 100;
            delta = '<span class="cc-delta up">\u25B2 ' + formatPercent(pctDelta) + ' vs ' + prev.corte.label + '</span>';
        }
        const al = cd.alcance >= 100 ? 'green' : cd.alcance >= 80 ? 'yellow' : 'red';
        return '<div class="cc-corte-card' + (cd.corte.id === res.corte.id ? ' activo' : '') + '">' +
            '<div class="cc-corte-icon">' + cd.corte.icon + '</div>' +
            '<div class="cc-corte-label">Corte ' + cd.corte.label + '</div>' +
            '<div class="cc-corte-value">' + formatCurrency(cd.venta) + '</div>' +
            '<div class="cc-corte-meta">Meta ' + formatCurrency(cd.meta) + '</div>' +
            '<div class="cc-corte-alcance ' + al + '">' + formatPercent(cd.alcance) + '</div>' +
            delta +
            '</div>';
    }).join('');

    const riesgo = res.pdvsRiesgo.slice(0, 5).map(f =>
        '<div class="cc-riesgo-item">' +
        '<span class="cc-riesgo-name">' + ctlDot(f.alcance) + ' ' + ctlEsc(ctlNombreCorto(f.pdv)) + '</span>' +
        '<span class="cc-riesgo-pct red">' + formatPercent(f.alcance) + '</span>' +
        '</div>'
    ).join('');

    return '' +
        '<div class="ctl-card cc-compare-chart">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>Crecimiento entre cortes</span>' +
        '<span class="ctl-card-count">acumulado del d\u00eda</span>' +
        '</div>' +
        '<div class="cc-chart-body"><canvas id="chartCorteComercial"></canvas></div>' +
        '</div>' +
        '<div class="cc-side">' +
        '<div class="cc-corte-grid">' + cards + '</div>' +
        (riesgo ? '<div class="ctl-panel cc-riesgo-panel">' +
            '<div class="ctl-panel-header"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>PDV en riesgo</div>' +
            '<div class="cc-riesgo-list">' + riesgo + '</div>' +
            '</div>' : '') +
        '</div>';
}

function buildCorteTabla(res) {
    const productos = res.productos;
    const filas = res.filas;

    let theadTop = '<th rowspan="2" class="cc-th-pdv">Punto de Venta</th>';
    for (const prod of productos) theadTop += '<th colspan="3">' + ctlEsc(prod) + '</th>';
    theadTop += '<th colspan="3" class="cc-th-total">Total PDV</th>';

    let theadSub = '';
    for (const prod of productos) theadSub += '<th>Venta</th><th>Meta</th><th>Alcance</th>';
    theadSub += '<th>Venta</th><th>Meta</th><th>Alcance</th>';

    let rows = '';
    for (const f of filas) {
        let tds = '<td class="ctl-td-left ctl-td-strong cc-pdv-cell">' + ctlDot(f.alcance) + ' ' + ctlEsc(ctlNombreCorto(f.pdv)) + '</td>';
        for (const p of f.productos) {
            tds += '<td>' + formatCurrency(p.venta) + '</td>' +
                '<td>' + formatCurrency(p.meta) + '</td>' +
                '<td>' + ctlBarCell(p.alcance) + '</td>';
        }
        tds += '<td class="cc-cell-total">' + formatCurrency(f.venta) + '</td>' +
            '<td class="cc-cell-total">' + formatCurrency(f.meta) + '</td>' +
            '<td class="cc-cell-total">' + ctlBarCell(f.alcance) + '</td>';
        rows += '<tr>' + tds + '</tr>';
    }

    let footTds = '<td class="ctl-td-left ctl-td-strong cc-foot-label">TOTAL</td>';
    for (const t of res.totalesProducto) {
        footTds += '<td class="cc-cell-total">' + formatCurrency(t.venta) + '</td>' +
            '<td class="cc-cell-total">' + formatCurrency(t.meta) + '</td>' +
            '<td class="cc-cell-total">' + ctlBarCell(t.alcance) + '</td>';
    }
    footTds += '<td class="cc-cell-total cc-foot-total">' + formatCurrency(res.ventaGlobal) + '</td>' +
        '<td class="cc-cell-total cc-foot-total">' + formatCurrency(res.metaGlobal) + '</td>' +
        '<td class="cc-cell-total cc-foot-total">' + ctlBarCell(res.alcanceGlobal) + '</td>';

    return '' +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Corte por Punto de Venta y Producto</span>' +
        '<span class="ctl-card-count">' + res.corte.rango + ' \u00b7 ' + filas.length + ' PDVs \u00b7 ' + productos.length + ' productos</span>' +
        '</div>' +
        '<div class="ctl-table-wrap cc-table-wrap"><table class="ctl-table cc-table">' +
        '<thead><tr>' + theadTop + '</tr><tr>' + theadSub + '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
        '<tfoot>' + '<tr class="cc-row-total">' + footTds + '</tr>' + '</tfoot>' +
        '</table></div>' +
        '</div>';
}

function crearGraficoCortes(res) {
    const id = 'chartCorteComercial';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const labels = res.cortesData.map(cd => cd.corte.label);
    const ventas = res.cortesData.map(cd => Math.round(cd.venta));
    const metas = res.cortesData.map(cd => Math.round(cd.meta));

    chartInstances[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Venta acumulada',
                    data: ventas,
                    backgroundColor: 'rgba(29, 185, 84, 0.85)',
                    hoverBackgroundColor: '#1ED760',
                    borderRadius: 6,
                    borderSkipped: false,
                    maxBarThickness: 42,
                    yAxisID: 'y'
                },
                {
                    label: 'Meta acumulada',
                    data: metas,
                    type: 'line',
                    borderColor: '#3B82F6',
                    backgroundColor: '#3B82F6',
                    borderWidth: 2.5,
                    borderDash: [6, 4],
                    tension: 0.25,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3B82F6',
                    pointBorderWidth: 2,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900, easing: 'easeOutQuart' },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: () => temaCss('--chart-tick2'),
                        boxWidth: 14,
                        boxHeight: 4,
                        usePointStyle: true,
                        font: { size: 10, family: 'Inter', weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: () => temaCss('--chart-tooltip'),
                    titleColor: () => temaCss('--t-text'),
                    bodyColor: () => temaCss('--chart-tick2'),
                    borderColor: 'rgba(29, 185, 84, 0.35)',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: ctx => {
                            const idx = ctx.dataIndex;
                            if (ctx.dataset.label === 'Meta acumulada') {
                                const alcanze = res.cortesData[idx].alcance;
                                return ['Meta: ' + formatCurrency(ctx.raw), 'Alcance: ' + formatPercent(alcanze)];
                            }
                            const prev = idx > 0 ? ventas[idx - 1] : null;
                            let delta = '';
                            if (prev && prev > 0) {
                                const d = ((ctx.raw - prev) / prev) * 100;
                                delta = '  (' + (d >= 0 ? '+' : '') + d.toFixed(1) + '%)';
                            }
                            return 'Venta: ' + formatCurrency(ctx.raw) + delta;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: () => temaCss('--chart-grid'), drawBorder: false, borderDash: [3, 3] },
                    ticks: {
                        color: () => temaCss('--chart-tick'),
                        font: { size: 10, family: 'Inter' },
                        callback: v => {
                            if (Math.abs(v) >= 1000) return 'S/ ' + (v / 1000) + 'k';
                            return 'S/ ' + v;
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: () => temaCss('--chart-tick2'),
                        font: { size: 11.5, family: 'Inter', weight: '600' }
                    }
                }
            }
        }
    });
}

function renderizarCorteComercial() {
    const page = document.getElementById('page-corte-comercial');
    if (!page || !page.classList.contains('active')) return;

    if (!CorteComercial.inicializado) {
        CorteComercial.fecha = formatearFechaLocal(new Date());
        corteAutoseleccionar();
        CorteComercial.inicializado = true;
    }

    const res = corteComputar();

    /* Controles */
    const fechaInput = document.getElementById('cc-fecha');
    if (fechaInput) fechaInput.value = res.fecha;
    document.querySelectorAll('.cc-chip').forEach(ch => {
        ch.classList.toggle('active', ch.dataset.corte === res.corte.id);
    });
    const rango = document.getElementById('cc-rango');
    if (rango) rango.textContent = res.corte.icon + ' Corte ' + res.corte.label + ' \u00b7 ' + res.corte.rango;
    const estado = document.getElementById('cc-estado');
    if (estado) {
        const e = corteEstado(res.corte, res.fecha);
        estado.textContent = e.txt;
        estado.className = 'cc-estado ' + e.cls;
    }

    /* KPIs */
    const kpis = document.getElementById('cc-kpis');
    if (kpis) kpis.innerHTML = buildCorteKpis(res);

    /* Comparación */
    const comparacion = document.getElementById('cc-comparacion');
    if (comparacion) comparacion.innerHTML = buildCorteComparacion(res);

    /* Tabla */
    const tabla = document.getElementById('cc-tabla');
    if (tabla) {
        if (res.ventaGlobal === 0 && res.metaGlobal === 0) {
            tabla.innerHTML = '<div class="ctl-card"><div class="empty-state" style="padding:32px;"><p>No existen registros de ventas ni cuotas para la fecha seleccionada.</p></div></div>';
        } else {
            tabla.innerHTML = buildCorteTabla(res);
        }
    }

    crearGraficoCortes(res);
}
