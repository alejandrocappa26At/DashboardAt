/* =============================================
   CENTRO DE CONTROL COMERCIAL — Vista Ejecutiva
   Helpers compartidos + renderizado de la vista ejecutiva
   ============================================= */

function ctlSemaforo(pct) {
    if (pct >= 100) return { cls: 'cumple', label: 'Cumple' };
    if (pct >= 80) return { cls: 'riesgo', label: 'Riesgo' };
    return { cls: 'critico', label: 'Cr\u00edtico' };
}

function ctlBadge(pct) {
    const s = ctlSemaforo(pct);
    return '<span class="ctl-semaforo ' + s.cls + '"><span class="dot"></span>' + s.label + '</span>';
}

function ctlDot(pct) {
    const s = ctlSemaforo(pct);
    return '<span class="ctl-dot ' + s.cls + '" title="' + s.label + '"></span>';
}

function ctlBarCell(pct) {
    const s = ctlSemaforo(pct);
    return '<span class="ctl-cell-bar"><span class="ctl-cell-bar-track"><span class="ctl-cell-bar-fill ' + s.cls + '" style="width:' + Math.min(pct, 100) + '%"></span></span><strong class="ctl-td-' + (s.cls === 'cumple' ? 'good' : s.cls === 'riesgo' ? 'warn' : 'bad') + '">' + formatPercent(pct) + '</strong></span>';
}

function ctlNombreCorto(pdv) {
    return String(pdv || '').replace(/^RED AT\s+/i, '').replace(/^Red AT\s+/i, '');
}

function ctlEsc(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* =============================================
   VISTA EJECUTIVA — una pantalla, todo visible
   ============================================= */

function renderizarVistaEjecutiva() {
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-vista-ejecutiva');

    const noData = DataStore.getInfoPeriodo().activo && !DataStore.getVentasEnRango().length;

    /* ---- KPI strip ---- */
    const kpiContainer = document.getElementById('ve-kpis');
    if (kpiContainer) {
        if (noData) {
            kpiContainer.innerHTML = '<div class="empty-state" style="grid-column:1/-1;padding:20px;"><p>No existen registros de ventas para el periodo seleccionado.</p></div>';
        } else {
            kpiContainer.innerHTML = buildCtlKpiStrip();
        }
    }

    const main = document.getElementById('ve-main');
    const side = document.getElementById('ve-side');
    if (!main || !side) return;

    if (noData) {
        main.innerHTML = '<div class="ctl-card"><div class="empty-state"><p>No existen registros de ventas para el periodo seleccionado.</p></div></div>';
        side.innerHTML = '';
        return;
    }

    /* ---- Tabla consolidada (todas las tiendas) ---- */
    main.innerHTML = buildCtlTablaPDVs() + buildCtlPromociones();

    /* ---- Ranking + Alertas ---- */
    side.innerHTML = buildCtlRanking() + buildCtlAlertas();
}

function buildCtlPromociones() {
    if (typeof PromocionesStore === 'undefined' || !PromocionesStore.initialized || !PromocionesStore._firestoreLoaded) return '';
    const p = PromocionesStore._periodoEfectivo();
    const registros = PromocionesStore.getRegistrosEnRango(p.desde, p.hasta);
    const ranking = PromocionesStore.getRankingPromociones(p.desde, p.hasta);
    const tiendas = PromocionesStore.getRankingTiendas(p.desde, p.hasta);
    const total = PromocionesStore.getTotalCantidad(p.desde, p.hasta);
    if (ranking.length === 0 || total === 0) return '';

    const tiendaTop = tiendas[0];
    const promoTop = ranking[0];

    const topCards = '<div class="resumen-promo-cards">' +
        '<div class="resumen-promo-card">' +
            '<span class="resumen-promo-card-icon">\ud83c\udfc6</span>' +
            '<span class="resumen-promo-card-label">Tienda con m\u00e1s promociones</span>' +
            '<span class="resumen-promo-card-value">' + ctlEsc(tiendaTop.tienda) + '</span>' +
            '<span class="resumen-promo-card-sub">' + tiendaTop.cantidad + ' registros</span>' +
        '</div>' +
        '<div class="resumen-promo-card">' +
            '<span class="resumen-promo-card-icon">\ud83c\udf81</span>' +
            '<span class="resumen-promo-card-label">Promoci\u00f3n m\u00e1s utilizada</span>' +
            '<span class="resumen-promo-card-value">' + ctlEsc(promoTop.promocion) + '</span>' +
            '<span class="resumen-promo-card-sub">' + promoTop.cantidad + ' registros</span>' +
        '</div>' +
        '<div class="resumen-promo-card">' +
            '<span class="resumen-promo-card-icon">\ud83d\udce6</span>' +
            '<span class="resumen-promo-card-label">Total registrado</span>' +
            '<span class="resumen-promo-card-value">' + total + '</span>' +
            '<span class="resumen-promo-card-sub">' + registros.length + ' registros</span>' +
        '</div>' +
    '</div>';

    const items = ranking.slice(0, 5).map((r, i) => {
        const pct = total > 0 ? Math.min((r.cantidad / total) * 100, 100) : 0;
        return '<div class="ctl-rank-item">' +
            '<div class="ctl-rank-pos ' + (i < 3 ? 'top-' + (i + 1) : '') + '">' + (i + 1) + '</div>' +
            '<div class="ctl-rank-info">' +
            '<div class="ctl-rank-name">' + ctlEsc(r.promocion) + '</div>' +
            '<div class="ctl-rank-bar"><div class="ctl-rank-bar-fill" style="width:' + pct + '%;background:#3B82F6;"></div></div>' +
            '</div>' +
            '<div><div class="ctl-rank-value" style="color:#3B82F6;">' + r.cantidad + '</div>' +
            '<div class="ctl-rank-sub">' + formatPercent(pct) + '</div></div>' +
            '</div>';
    }).join('');

    const porTiendaPromo = {};
    registros.forEach(r => {
        const key = r.tienda + '\u0001' + r.promocion;
        if (!porTiendaPromo[key]) porTiendaPromo[key] = { tienda: r.tienda, promocion: r.promocion, cantidad: 0, promotores: new Set() };
        porTiendaPromo[key].cantidad += r.cantidad;
        if (r.promotor_nombre) porTiendaPromo[key].promotores.add(r.promotor_nombre);
    });
    const detalleRows = Object.values(porTiendaPromo)
        .sort((a, b) => b.cantidad - a.cantidad)
        .map(item => {
            const promotores = [...item.promotores].join(', ');
            return '<tr>' +
                '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(item.tienda) + '</td>' +
                '<td class="ctl-td-left">' + ctlEsc(item.promocion) + '</td>' +
                '<td>' + item.cantidad + '</td>' +
                '<td class="ctl-td-left">' + ctlEsc(promotores || '\u2014') + '</td>' +
                '</tr>';
        }).join('');

    const detalleTabla = '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Promociones por Punto de Venta</span>' +
        '<span class="ctl-card-count">' + Object.keys(porTiendaPromo).length + ' filas</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table">' +
        '<thead><tr><th class="ctl-th-left">Tienda</th><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th class="ctl-th-left">Promotor</th></tr></thead>' +
        '<tbody>' + detalleRows + '</tbody>' +
        '</table></div>' +
        '</div>';

    return topCards +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 8V5"/><path d="M7 8V6"/><path d="M17 8V6"/></svg>Promociones Destacadas</span>' +
        '<span class="ctl-card-count">' + total + ' cantidades</span>' +
        '</div>' +
        '<div class="ctl-rank-list">' + items + '</div>' +
        '</div>' +
        detalleTabla;
}

function buildCtlKpiStrip() {
    const ventaTotal = DataStore.getVentaTotal();
    const cuotaTotal = DataStore.getCuotaTotal();
    const avance = DataStore.getAvanceGeneral();
    const proyeccion = DataStore.getProyeccion();
    const ranking = DataStore.getRanking();
    const totalPDVs = ranking.length;
    const pdvCumplen = ranking.filter(r => r.cumplimiento >= 100).length;
    const pdvRiesgo = ranking.filter(r => r.cumplimiento < 80).length;
    const mejor = ranking[0];
    const peor = ranking[ranking.length - 1];
    const avCls = avance >= 100 ? 'green' : avance >= 80 ? 'yellow' : 'red';

    const kpi = (label, value, cls, sub) =>
        '<div class="ctl-kpi"><span class="ctl-kpi-label">' + label + '</span>' +
        '<span class="ctl-kpi-value ' + cls + '">' + value + '</span>' +
        (sub ? '<span class="ctl-kpi-sub">' + sub + '</span>' : '') + '</div>';

    return kpi('Venta Total', formatCurrency(ventaTotal), 'green', 'acumulado del periodo') +
        kpi('Meta Total', formatCurrency(cuotaTotal), 'blue', 'cuota asignada') +
        kpi('Cumplimiento', formatPercent(avance), avCls, avance >= 100 ? 'meta alcanzada' : 'falta ' + formatPercent(100 - avance)) +
        kpi('PDVs Cumpliendo', pdvCumplen + ' / ' + totalPDVs, 'green', 'cumplen meta') +
        kpi('PDVs en Riesgo', pdvRiesgo, 'red', 'proyectan no cumplir') +
        kpi('Mejor PDV', mejor ? ctlNombreCorto(mejor.punto_venta) : '-', 'yellow', mejor ? formatPercent(mejor.cumplimiento) : '') +
        kpi('Peor PDV', peor ? ctlNombreCorto(peor.punto_venta) : '-', 'red', peor ? formatPercent(peor.cumplimiento) : '') +
        kpi('Proyecci\u00f3n', formatCurrency(proyeccion), 'purple', proyeccion >= cuotaTotal ? 'supera la meta' : 'por debajo de la meta');
}

function buildCtlTablaPDVs() {
    const ranking = DataStore.getRanking();
    const entries = DataStore.getCumplimientoPorPDV();

    const rows = ranking.map((r, i) => {
        const d = entries[r.punto_venta] || {};
        const proy = d.proyeccion || 0;
        const dif = d.diferencia || 0;
        const proyOk = proy >= (d.cuota || 0);
        return '<tr>' +
            '<td class="ctl-td-pos">' + (i + 1) + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlDot(r.cumplimiento) + ' ' + ctlNombreCorto(r.punto_venta) + '</td>' +
            '<td>' + formatCurrency(r.venta_total) + '</td>' +
            '<td>' + formatCurrency(r.cuota) + '</td>' +
            '<td>' + ctlBarCell(r.cumplimiento) + '</td>' +
            '<td class="' + (proyOk ? 'ctl-td-good' : 'ctl-td-dim') + '">' + formatCurrency(proy) + '</td>' +
            '<td class="' + (dif <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (dif <= 0 ? 'S/ 0' : formatCurrency(dif)) + '</td>' +
            '<td>' + ctlBadge(r.cumplimiento) + '</td>' +
            '</tr>';
    }).join('');

    return '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>Consolidado por PDV</span>' +
        '<span class="ctl-card-count">' + ranking.length + ' tiendas</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">#</th><th class="ctl-th-left">Tienda</th>' +
        '<th>Venta</th><th>Cuota</th><th>Cumplimiento</th><th>Proyecci\u00f3n</th><th>Faltante</th><th>Estado</th>' +
        '</tr></thead><tbody>' + rows + '</tbody>' +
        '</table></div></div>';
}

function buildCtlRanking() {
    const ranking = DataStore.getRanking();
    const top = ranking.slice(0, 8);

    const items = top.map((r, i) => {
        const s = ctlSemaforo(r.cumplimiento);
        return '<div class="ctl-rank-item">' +
            '<div class="ctl-rank-pos ' + (i < 3 ? 'top-' + (i + 1) : '') + '">' + (i + 1) + '</div>' +
            '<div class="ctl-rank-info">' +
            '<div class="ctl-rank-name">' + ctlNombreCorto(r.punto_venta) + '</div>' +
            '<div class="ctl-rank-bar"><div class="ctl-rank-bar-fill" style="width:' + Math.min(r.cumplimiento, 100) + '%;background:' + (r.cumplimiento >= 100 ? '#1DB954' : r.cumplimiento >= 80 ? '#F59E0B' : '#EF4444') + ';"></div></div>' +
            '</div>' +
            '<div><div class="ctl-rank-value" style="color:' + (r.cumplimiento >= 100 ? '#1DB954' : r.cumplimiento >= 80 ? '#F59E0B' : '#EF4444') + ';">' + formatPercent(r.cumplimiento) + '</div>' +
            '<div class="ctl-rank-sub">' + formatCurrency(r.venta_total) + '</div></div>' +
            '</div>';
    }).join('');

    return '<div class="ctl-panel">' +
        '<div class="ctl-panel-header"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 22V12"/><path d="M14 22V12"/><path d="M12 22V2"/></svg>Ranking de Tiendas</div>' +
        '<div class="ctl-rank-list">' + items + '</div>' +
        '</div>';
}

function buildCtlAlertas() {
    const ranking = DataStore.getRanking();
    const enRiesgo = ranking.filter(r => r.cumplimiento < 80);
    const enSeguimiento = ranking.filter(r => r.cumplimiento >= 80 && r.cumplimiento < 100);

    const list = ranking.filter(r => r.cumplimiento < 100).map(r => {
        const critico = r.cumplimiento < 80;
        const entries = DataStore.getCumplimientoPorPDV();
        const d = entries[r.punto_venta] || {};
        const dif = d.diferencia || 0;
        return '<div class="ctl-alert-item ' + (critico ? '' : 'warn') + '">' +
            '<div class="ctl-alert-icon">' +
            (critico
                ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
                : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>') +
            '</div>' +
            '<div class="ctl-alert-info">' +
            '<div class="ctl-alert-name">' + ctlNombreCorto(r.punto_venta) + '</div>' +
            '<div class="ctl-alert-sub">' + (critico ? 'Cr\u00edtico' : 'En seguimiento') + ' \u00b7 ' + formatPercent(r.cumplimiento) + '</div>' +
            '</div>' +
            '<div class="ctl-alert-value">-' + formatCurrency(Math.abs(dif)) + '</div>' +
            '</div>';
    }).join('');

    const sinAlerta = ranking.length - enRiesgo.length - enSeguimiento.length;

    return '<div class="ctl-panel">' +
        '<div class="ctl-panel-header"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>Alertas de Cumplimiento</div>' +
        '<div class="ctl-alert-list">' +
        (list || '<div class="empty-state" style="padding:20px;"><p>Todas las tiendas cumplen la meta.</p></div>') +
        '</div>' +
        '<div class="ctl-panel-header" style="border-top:1px solid rgba(255,255,255,0.06);border-bottom:none;"><span style="flex:1;">Resumen</span><span style="color:#1DB954;">' + sinAlerta + ' OK</span><span style="color:#F59E0B;">' + enSeguimiento + ' riesgo</span><span style="color:#EF4444;">' + enRiesgo.length + ' cr\u00edtico</span></div>' +
        '</div>';
}
