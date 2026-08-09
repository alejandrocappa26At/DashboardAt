/* ===== MÓDULO DE PROMOCIONES ===== */
let filtroTipoInformacion = 'productos';
let infPromTab = 'ventas';
let gestionPromocionesEditando = null;
let filtroPromo = '';

function syncTipoInfoUI() {
    const sel = document.getElementById('filtro-tipo-info');
    if (sel) sel.value = filtroTipoInformacion;
    const modo = (filtroTipoInformacion === 'promociones') ? 'promociones' : 'productos';
    const rToggle = document.getElementById('ranking-mode-toggle');
    if (rToggle) {
        rToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === modo));
    }
    const aToggle = document.getElementById('avance-mode-toggle');
    if (aToggle) {
        aToggle.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.mode === modo));
    }
}

function cambiarTipoInformacion(val) {
    filtroTipoInformacion = (val === 'promociones' || val === 'todo') ? val : 'productos';
    syncTipoInfoUI();
    reRenderCurrentPage();
}

function cambiarModoRanking(mode) {
    filtroTipoInformacion = mode === 'promociones' ? 'promociones' : 'productos';
    syncTipoInfoUI();
    renderizarRanking();
}

function cambiarModoAvance(mode) {
    filtroTipoInformacion = mode === 'promociones' ? 'promociones' : 'productos';
    syncTipoInfoUI();
    renderizarAvancePDV();
}

function reRenderCurrentPage() {
    const active = document.querySelector('.page.active');
    if (!active) return;
    const id = active.id;
    if (id === 'page-resumen') renderizarResumenEjecutivo();
    else if (id === 'page-ranking') renderizarRanking();
    else if (id === 'page-avance') renderizarAvancePDV();
    else if (id === 'page-informe-promotor') recargarInformeSiAplica();
    else if (id === 'page-vista-ejecutiva') renderizarVistaEjecutiva();
}

function _promoPct(parte, total) {
    return total > 0 ? Math.min((parte / total) * 100, 999) : 0;
}

function _promoFechaLegible(iso) {
    if (!iso) return '\u2014';
    const d = new Date(iso);
    if (isNaN(d)) return '\u2014';
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function _rankPromosFromRegs(regs) {
    const m = {};
    regs.forEach(r => { m[r.promocion] = (m[r.promocion] || 0) + r.cantidad; });
    return Object.entries(m)
        .map(([promocion, cantidad]) => ({ promocion, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function _rankTiendasFromRegs(regs) {
    const m = {};
    regs.forEach(r => { m[r.tienda] = (m[r.tienda] || 0) + r.cantidad; });
    return Object.entries(m)
        .map(([tienda, cantidad]) => ({ tienda, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
}

function cambiarFiltroPromo(val) {
    filtroPromo = val || '';
    renderizarResumenEjecutivo();
}

function renderResumenPromociones() {
    const container = document.getElementById('resumen-promociones');
    if (!container) return;
    const p = PromocionesStore._periodoEfectivo();
    const filtro = filtroPromo || '';
    const regsBase = PromocionesStore.getRegistrosEnRango(p.desde, p.hasta);
    const regs = filtro ? regsBase.filter(r => r.promocion === filtro) : regsBase;

    const total = regs.reduce((s, r) => s + r.cantidad, 0);
    const registros = regs.length;
    const activas = PromocionesStore.getPromocionesActivas().length;
    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];

    const promos = PromocionesStore.getPromociones();
    const filtroOptions = '<option value="">Todas</option>' +
        promos.map(pr => '<option value="' + ctlEsc(pr.nombre) + '"' + (filtro === pr.nombre ? ' selected' : '') + '>' + ctlEsc(pr.nombre) + '</option>').join('');
    const filtroBar = '<div class="promo-filtro-bar">' +
        '<span class="promo-filtro-label"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4" rx="1"/><rect x="5" y="12" width="14" height="8" rx="1"/><path d="M12 8V5"/></svg> Promoci\u00f3n</span>' +
        '<select class="promo-filtro-select" onchange="cambiarFiltroPromo(this.value)">' + filtroOptions + '</select>' +
        (filtro ? '<button type="button" class="promo-filtro-clear" onclick="cambiarFiltroPromo(\'\')">Limpiar</button>' : '') +
        '</div>';

    if (!PromocionesStore._firestoreLoaded) {
        container.innerHTML = '<div class="ctl-card"><div class="empty-state"><p>Cargando promociones...</p></div></div>';
        return;
    }
    if (total === 0) {
        container.innerHTML = '' +
            '<div class="resumen-promo-header">' +
                '<div class="resumen-promo-title">\ud83c\udf81 Promociones</div>' +
                '<div class="resumen-promo-stats"><span>' + activas + ' promociones activas</span></div>' +
            '</div>' +
            filtroBar +
            '<div class="resumen-promo-grid">' +
                '<div class="ctl-card"><div class="empty-state"><p>No existen registros de promociones para el periodo seleccionado.</p></div></div>' +
            '</div>';
        return;
    }

    const ranking = _rankPromosFromRegs(regs);
    const tiendas = _rankTiendasFromRegs(regs);
    const tiendaTop = tiendas[0];
    const promoTop = ranking[0];

    const destacadasRows = ranking.slice(0, 5).map((r, i) => {
        const pct = _promoPct(r.cantidad, total);
        return '<tr>' +
            '<td class="ctl-td-pos">' + (i + 1) + (i < 3 ? ' ' + medals[i] : '') + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(r.promocion) + '</td>' +
            '<td>' + r.cantidad + '</td>' +
            '<td>' + ctlBarCell(pct) + '</td>' +
            '<td>' + formatPercent(pct) + '</td>' +
            '</tr>';
    }).join('');

    const tiendasRows = tiendas.slice(0, 8).map((r) => {
        const pct = _promoPct(r.cantidad, total);
        return '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(r.tienda) + '</td>' +
            '<td>' + r.cantidad + '</td>' +
            '<td>' + registrosPorTienda(regs, r.tienda) + '</td>' +
            '<td>' + ctlBarCell(pct) + '</td>' +
            '</tr>';
    }).join('');

    const porTiendaPromo = {};
    regs.forEach(r => {
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

    const chartData = tiendas.slice(0, 10).map(t => ({ tienda: t.tienda, cantidad: t.cantidad }));

    container.innerHTML = '' +
        '<div class="resumen-promo-header">' +
            '<div class="resumen-promo-title">\ud83c\udf81 Promociones</div>' +
            '<div class="resumen-promo-stats">' +
                '<span>' + total + ' cantidades</span>' +
                '<span>' + registros + ' registros</span>' +
                '<span>' + activas + ' promociones activas</span>' +
            '</div>' +
        '</div>' +
        filtroBar +
        '<div class="resumen-promo-cards">' +
            '<div class="resumen-promo-card">' +
                '<span class="resumen-promo-card-icon">\ud83c\udfc6</span>' +
                '<span class="resumen-promo-card-label">Tienda con m\u00e1s promociones</span>' +
                '<span class="resumen-promo-card-value">' + (tiendaTop ? ctlEsc(tiendaTop.tienda) : '\u2014') + '</span>' +
                '<span class="resumen-promo-card-sub">' + (tiendaTop ? tiendaTop.cantidad + ' registros' : '') + '</span>' +
            '</div>' +
            '<div class="resumen-promo-card">' +
                '<span class="resumen-promo-card-icon">\ud83c\udf81</span>' +
                '<span class="resumen-promo-card-label">Promoci\u00f3n m\u00e1s utilizada</span>' +
                '<span class="resumen-promo-card-value">' + (promoTop ? ctlEsc(promoTop.promocion) : '\u2014') + '</span>' +
                '<span class="resumen-promo-card-sub">' + (promoTop ? promoTop.cantidad + ' registros' : '') + '</span>' +
            '</div>' +
            '<div class="resumen-promo-card">' +
                '<span class="resumen-promo-card-icon">\ud83d\udce6</span>' +
                '<span class="resumen-promo-card-label">Total registrado</span>' +
                '<span class="resumen-promo-card-value">' + total + '</span>' +
                '<span class="resumen-promo-card-sub">' + registros + ' registros</span>' +
            '</div>' +
        '</div>' +
        '<div class="resumen-promo-grid">' +
            '<div class="ctl-card">' +
                '<div class="ctl-card-header"><span class="ctl-card-title">\ud83c\udf81 Promociones Destacadas</span><span class="ctl-card-count">Top ' + ranking.slice(0, 5).length + '</span></div>' +
                '<div class="ctl-table-wrap"><table class="ctl-table">' +
                    '<thead><tr><th class="ctl-th-left">#</th><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th>Participaci\u00f3n</th><th>%</th></tr></thead>' +
                    '<tbody>' + destacadasRows + '</tbody>' +
                '</table></div>' +
            '</div>' +
            '<div class="ctl-card">' +
                '<div class="ctl-card-header"><span class="ctl-card-title">\ud83c\udf7f Registro por Tienda</span><span class="ctl-card-count">' + tiendas.length + ' tiendas</span></div>' +
                '<div class="ctl-table-wrap"><table class="ctl-table">' +
                    '<thead><tr><th class="ctl-th-left">Tienda</th><th>Cantidad</th><th>Registros</th><th>Participaci\u00f3n</th></tr></thead>' +
                    '<tbody>' + tiendasRows + '</tbody>' +
                '</table></div>' +
            '</div>' +
        '</div>' +
        '<div class="ctl-card">' +
            '<div class="ctl-card-header"><span class="ctl-card-title">\ud83d\udccd Promociones por Punto de Venta</span><span class="ctl-card-count">' + detalleRows.length + ' filas</span></div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table">' +
                '<thead><tr><th class="ctl-th-left">Tienda</th><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th class="ctl-th-left">Promotor</th></tr></thead>' +
                '<tbody>' + detalleRows + '</tbody>' +
            '</table></div>' +
        '</div>' +
        '<div class="ctl-card">' +
            '<div class="ctl-card-header"><span class="ctl-card-title">\ud83d\udcc8 Promociones por Punto de Venta</span><span class="ctl-card-count">Cantidad</span></div>' +
            '<div class="promo-chart-wrap"><canvas id="chartPromos"></canvas></div>' +
        '</div>';

    createPromosChart(chartData);
}

function registrosPorTienda(regs, tienda) {
    return regs.filter(r => r.tienda === tienda).length;
}

function renderizarRankingPromociones() {
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-ranking');
    const p = PromocionesStore._periodoEfectivo();
    const ranking = PromocionesStore.getRankingTiendas(p.desde, p.hasta);
    const total = PromocionesStore.getTotalCantidad(p.desde, p.hasta);
    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    const listEl = document.getElementById('ranking-list');
    const countEl = document.getElementById('ranking-list-count');
    const statsEl = document.getElementById('ranking-hero-stats');
    if (!listEl) return;

    destroyChart('chartRanking');

    if (!PromocionesStore._firestoreLoaded) {
        listEl.innerHTML = '<div class="empty-state"><p>Cargando promociones...</p></div>';
        if (countEl) countEl.textContent = '';
        if (statsEl) statsEl.innerHTML = '';
        return;
    }
    if (ranking.length === 0) {
        listEl.innerHTML = '<div class="empty-state"><p>No existen registros de promociones para el periodo seleccionado.</p></div>';
        if (countEl) countEl.textContent = '0 tiendas';
        if (statsEl) statsEl.innerHTML = '';
        return;
    }

    const rows = ranking.map((r, i) => {
        const pct = _promoPct(r.cantidad, total);
        const medalla = i < 3 ? ' ' + medals[i] : '';
        return '<tr>' +
            '<td class="ctl-td-pos">' + r.puesto + medalla + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlDot(pct) + ' ' + ctlEsc(r.tienda) + '</td>' +
            '<td>' + r.cantidad + '</td>' +
            '<td>' + r.promociones + '</td>' +
            '<td>' + ctlBarCell(pct) + '</td>' +
            '<td>' + formatPercent(pct) + '</td>' +
            '<td>' + ctlBadge(pct) + '</td>' +
            '</tr>';
    }).join('');

    listEl.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-table-wrap"><table class="ctl-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">#</th><th class="ctl-th-left">Tienda</th>' +
        '<th>Cantidad</th><th>Promociones</th><th>Participaci\u00f3n</th><th>%</th><th>Estado</th>' +
        '</tr></thead><tbody>' + rows + '</tbody>' +
        '</table></div></div>';

    if (countEl) countEl.textContent = ranking.length + ' tiendas';

    const promosDistintas = PromocionesStore.getRankingPromociones(p.desde, p.hasta).length;
    if (statsEl) statsEl.innerHTML = '' +
        '<div class="ranking-hero-stat">' +
            '<span class="ranking-hero-stat-value" style="color:var(--accent)">' + ranking.length + '</span>' +
            '<span class="ranking-hero-stat-label">Tiendas con registro</span>' +
        '</div>' +
        '<div class="ranking-hero-stat">' +
            '<span class="ranking-hero-stat-value" style="color:var(--warning)">' + promosDistintas + '</span>' +
            '<span class="ranking-hero-stat-label">Promociones</span>' +
        '</div>' +
        '<div class="ranking-hero-stat">' +
            '<span class="ranking-hero-stat-value" style="color:var(--danger)">' + total + '</span>' +
            '<span class="ranking-hero-stat-label">Cantidad total</span>' +
        '</div>';
}

function renderPromocionesAvancePDV(pdvSeleccionado) {
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-avance');
    const select = document.getElementById('pdv-select');
    if (!select) return;
    if (!pdvSeleccionado) pdvSeleccionado = select.value || 'todos';
    select.value = pdvSeleccionado;

    const periodoHeader = DataStore.getInfoPeriodo();
    const diaActualEl = document.getElementById('pdv-dia-actual');
    const diaTotalEl = document.getElementById('pdv-dia-total');
    if (diaActualEl) diaActualEl.textContent = periodoHeader.elapsed;
    if (diaTotalEl) diaTotalEl.textContent = '/' + periodoHeader.total;

    const container = document.getElementById('pdv-content');
    if (!container) return;
    const p = PromocionesStore._periodoEfectivo();
    if (!PromocionesStore._firestoreLoaded) {
        container.innerHTML = '<div class="empty-state"><p>Cargando promociones...</p></div>';
        return;
    }
    const registros = PromocionesStore.getRegistrosEnRango(p.desde, p.hasta);
    const total = registros.reduce((s, r) => s + r.cantidad, 0);
    if (total === 0) {
        container.innerHTML = '<div class="empty-state"><p>No existen registros de promociones para el periodo seleccionado.</p></div>';
        return;
    }

    if (pdvSeleccionado !== 'todos') {
        const promos = {};
        registros.filter(r => r.tienda === pdvSeleccionado).forEach(r => {
            promos[r.promocion] = (promos[r.promocion] || 0) + r.cantidad;
        });
        const rows = Object.entries(promos)
            .sort((a, b) => b[1] - a[1])
            .map(([promo, cant], i) => {
                const pct = _promoPct(cant, total);
                return '<tr>' +
                    '<td class="ctl-td-pos">' + (i + 1) + '</td>' +
                    '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(promo) + '</td>' +
                    '<td>' + cant + '</td>' +
                    '<td>' + ctlBarCell(pct) + '</td>' +
                    '<td>' + formatPercent(pct) + '</td>' +
                    '<td>' + ctlBadge(pct) + '</td>' +
                    '</tr>';
            }).join('');
        container.innerHTML = '' +
            '<div class="ctl-card">' +
                '<div class="ctl-card-header"><span class="ctl-card-title">\ud83c\udf81 Promociones de ' + ctlEsc(pdvSeleccionado) + '</span><span class="ctl-card-count">' + Object.keys(promos).length + ' promociones</span></div>' +
                '<div class="ctl-table-wrap"><table class="ctl-table">' +
                    '<thead><tr><th class="ctl-th-left">#</th><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th>Participaci\u00f3n</th><th>%</th><th>Estado</th></tr></thead>' +
                    '<tbody>' + rows + '</tbody>' +
                '</table></div>' +
            '</div>';
        return;
    }

    const ranking = PromocionesStore.getRankingTiendas(p.desde, p.hasta);
    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    const rows = ranking.map((r, i) => {
        const pct = _promoPct(r.cantidad, total);
        const medalla = i < 3 ? ' ' + medals[i] : '';
        const detalleId = 'promo-detalle-' + i;

        const porPromo = {};
        registros.filter(reg => reg.tienda === r.tienda).forEach(reg => {
            porPromo[reg.promocion] = (porPromo[reg.promocion] || 0) + reg.cantidad;
        });
        const detalleHtml = Object.entries(porPromo)
            .sort((a, b) => b[1] - a[1])
            .map(([promo, cant]) => {
                const dpct = _promoPct(cant, r.cantidad);
                return '<tr>' +
                    '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(promo) + '</td>' +
                    '<td>' + cant + '</td>' +
                    '<td>' + ctlBarCell(dpct) + '</td>' +
                    '<td>' + formatPercent(dpct) + '</td>' +
                    '<td>' + ctlBadge(dpct) + '</td>' +
                    '</tr>';
            }).join('');

        return '<tr class="promo-tienda-row">' +
            '<td class="ctl-td-pos">' + r.puesto + medalla + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlDot(pct) + ' ' + ctlEsc(r.tienda) + '</td>' +
            '<td>' + r.cantidad + '</td>' +
            '<td>' + r.promociones + '</td>' +
            '<td>' + ctlBarCell(pct) + '</td>' +
            '<td>' + formatPercent(pct) + '</td>' +
            '<td>' + ctlBadge(pct) + '</td>' +
            '<td><button type="button" class="promo-toggle-btn" onclick="togglePromoDetalle(\'' + detalleId + '\', this)">\u25bc Ver Promociones</button></td>' +
            '</tr>' +
            '<tr class="promo-detail-row" id="' + detalleId + '">' +
                '<td colspan="8" class="promo-detail-cell">' +
                    '<div class="promo-detail-inner">' +
                        '<div class="promo-detail-title">' + ctlEsc(r.tienda) + ' \u00b7 Total: ' + r.cantidad + ' \u00b7 ' + Object.keys(porPromo).length + ' promociones</div>' +
                        '<table class="ctl-table">' +
                            '<thead><tr><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th>Participaci\u00f3n</th><th>%</th><th>Estado</th></tr></thead>' +
                            '<tbody>' + detalleHtml + '</tbody>' +
                        '</table>' +
                    '</div>' +
                '</td>' +
            '</tr>';
    }).join('');

    container.innerHTML = '' +
        '<div class="ctl-card">' +
            '<div class="ctl-card-header"><span class="ctl-card-title">\ud83c\udf81 Avance de Promociones por Tienda</span><span class="ctl-card-count">' + ranking.length + ' tiendas</span></div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table promo-avance-table">' +
                '<thead><tr><th class="ctl-th-left">#</th><th class="ctl-th-left">Tienda</th><th>Cantidad</th><th>Promociones</th><th>Participaci\u00f3n</th><th>%</th><th>Estado</th><th>Detalle</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table></div>' +
        '</div>';
}

function togglePromoDetalle(id, btn) {
    const row = document.getElementById(id);
    if (!row) return;
    const visible = row.classList.toggle('open');
    if (btn) {
        btn.classList.toggle('open', visible);
        btn.innerHTML = (visible ? '\u25b2 Ocultar' : '\u25bc Ver') + ' Promociones';
    }
}

/* ===== INFORME POR PROMOTOR: PESTAÑA PROMOCIONES ===== */
function cambiarInfPromTab(tab) {
    infPromTab = (tab === 'promociones') ? 'promociones' : 'ventas';
    const tabs = document.getElementById('inf-promotor-tabs');
    if (tabs) tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.tab === infPromTab));
    const sel = document.getElementById('inf-promotor-select');
    if (sel && sel.value) {
        aplicarFiltrosInformePromotor();
    } else if (infPromTab === 'promociones') {
        const heroKpis = document.getElementById('inf-promotor-hero-kpis');
        if (heroKpis) heroKpis.innerHTML = '';
        const content = document.getElementById('inf-promotor-content');
        if (content) content.innerHTML = '<div class="empty-state"><p>Selecciona un promotor para ver sus promociones.</p></div>';
    } else {
        renderizarTablaPromotores();
    }
}

function renderPromocionesInformePromotor(promotor, fechaDesde, fechaHasta, tiendaFiltro) {
    let registros = PromocionesStore.getRegistrosEnRango(fechaDesde, fechaHasta);
    registros = registros.filter(r => r.promotor_id === promotor.id);
    if (tiendaFiltro) registros = registros.filter(r => r.tienda === tiendaFiltro);

    renderEncabezadoPromocionesPromotor(promotor, registros, fechaDesde, fechaHasta);

    const content = document.getElementById('inf-promotor-content');
    if (!content) return;
    const total = registros.reduce((s, r) => s + r.cantidad, 0);

    if (registros.length === 0) {
        content.innerHTML = '<div class="empty-state"><p>No existen registros de promociones para el periodo y filtros seleccionados.</p></div>';
        return;
    }

    const porPromo = {};
    registros.forEach(r => {
        porPromo[r.promocion] = (porPromo[r.promocion] || 0) + r.cantidad;
    });
    const ranking = Object.entries(porPromo)
        .map(([promo, cantidad]) => ({ promocion: promo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .map((item, i) => ({ ...item, puesto: i + 1 }));
    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    const rows = ranking.map((r, i) => {
        const pct = _promoPct(r.cantidad, total);
        const medalla = i < 3 ? ' ' + medals[i] : '';
        return '<tr>' +
            '<td class="ctl-td-pos">' + r.puesto + medalla + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(r.promocion) + '</td>' +
            '<td>' + r.cantidad + '</td>' +
            '<td>' + ctlBarCell(pct) + '</td>' +
            '<td>' + formatPercent(pct) + '</td>' +
            '<td>' + ctlBadge(pct) + '</td>' +
            '</tr>';
    }).join('');

    const detalleRows = _registrosDetallePromotor(registros);

    content.innerHTML = '' +
        '<div class="ctl-card">' +
            '<div class="ctl-card-header"><span class="ctl-card-title">\ud83c\udf81 Promociones Registradas</span><span class="ctl-card-count">' + ranking.length + ' promociones \u00b7 ' + total + ' cantidades</span></div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table">' +
                '<thead><tr><th class="ctl-th-left">#</th><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th>Participaci\u00f3n</th><th>%</th><th>Estado</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table></div>' +
        '</div>' +
        '<div class="ctl-card">' +
            '<div class="ctl-card-header"><span class="ctl-card-title">\ud83d\udccb Detalle de Registros</span><span class="ctl-card-count">' + registros.length + ' registros</span></div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table">' +
                '<thead><tr><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th class="ctl-th-left">Tienda</th><th>Fecha</th></tr></thead>' +
                '<tbody>' + detalleRows + '</tbody>' +
            '</table></div>' +
        '</div>';
}

function _registrosDetallePromotor(registros) {
    return registros
        .slice()
        .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)) || b.cantidad - a.cantidad)
        .map(r =>
            '<tr>' +
                '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(r.promocion) + '</td>' +
                '<td>' + r.cantidad + '</td>' +
                '<td class="ctl-td-left">' + ctlEsc(r.tienda) + '</td>' +
                '<td>' + (r.fecha || '\u2014') + '</td>' +
            '</tr>'
        ).join('');
}

function renderEncabezadoPromocionesPromotor(promotor, registros, fechaDesde, fechaHasta) {
    const zona = promotor.zona_principal_id ? (HorariosDataStore.zonas || []).find(z => z.id === promotor.zona_principal_id) : null;
    const tiendaNombre = zona ? zona.nombre : 'Sin tienda asignada';
    const totalCantidad = registros.reduce((s, r) => s + r.cantidad, 0);
    const promosDistintas = new Set(registros.map(r => r.promocion)).size;

    const fd = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date();
    const fh = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date();
    const op = { day: '2-digit', month: 'long', year: 'numeric' };
    const desdeStr = fd.toLocaleDateString('es-PE', op);
    const hastaStr = fh.toLocaleDateString('es-PE', op);

    const heroKpis = document.getElementById('inf-promotor-hero-kpis');
    if (heroKpis) {
        heroKpis.innerHTML = '' +
            '<div class="inf-promotor-hero-kpi" style="min-width:120px;text-align:left;">' +
                '<div style="font-size:13px;font-weight:700;color:#ffffff;line-height:1.4;">' + escHtml(promotor.nombre) + '</div>' +
                '<div style="font-size:11px;color:#727272;margin-top:2px;">' + escHtml(promotor.email || 'Sin correo') + '</div>' +
                '<div style="font-size:11px;color:#1DB954;margin-top:1px;">' + escHtml(tiendaNombre) + '</div>' +
            '</div>' +
            '<div class="inf-promotor-hero-kpi" style="min-width:90px;">' +
                '<span class="inf-promotor-hero-kpi-value" style="color:#3B82F6;">' + totalCantidad + '</span>' +
                '<span class="inf-promotor-hero-kpi-label">Cantidad Total</span>' +
            '</div>' +
            '<div class="inf-promotor-hero-kpi" style="min-width:100px;">' +
                '<span class="inf-promotor-hero-kpi-value" style="color:#1DB954;">' + promosDistintas + '</span>' +
                '<span class="inf-promotor-hero-kpi-label">Promociones</span>' +
            '</div>' +
            '<div class="inf-promotor-hero-kpi" style="min-width:120px;">' +
                '<span class="inf-promotor-hero-kpi-value" style="color:#727272;font-size:13px;font-weight:600;">' + desdeStr + ' \u2014 ' + hastaStr + '</span>' +
                '<span class="inf-promotor-hero-kpi-label">Periodo</span>' +
            '</div>';
    }
}

/* ===== MODAL: REGISTRO DE PROMOCIONES ===== */
function abrirModalPromociones() {
    initPromotorSession();
    if (!estaSupervisorDesbloqueado() && !promotorSession) {
        mostrarModalLogin();
        return;
    }
    abrirModalPromocionesConSesion();
}

function abrirModalPromocionesConSesion() {
    if (typeof PromocionesStore === 'undefined' || !PromocionesStore._firestoreLoaded) {
        mostrarNotificacion('Las promociones a\u00fan se est\u00e1n cargando. Intenta en unos segundos.', 'warning');
        return;
    }
    const supervisor = estaSupervisorDesbloqueado();
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const activos = promotores.filter(p => p.estado === 'Activo' && p.zona_principal_id && zonas.some(z => z.id === p.zona_principal_id));

    const tiendaSel = document.getElementById('promo-tienda');
    const promotorSel = document.getElementById('promo-promotor');
    const fechaInput = document.getElementById('promo-fecha');
    const sessionBar = document.getElementById('promo-session-bar');

    if (!supervisor && promotorSession) {
        const zona = zonas.find(z => z.id === promotorSession.zona_principal_id);
        tiendaSel.innerHTML = '<option value="">Seleccionar tienda...</option>' +
            (zona ? '<option value="' + escHtml(zona.nombre) + '">' + escHtml(zona.nombre) + '</option>' : '');
        if (zona) tiendaSel.value = zona.nombre;
        tiendaSel.disabled = true;
        const promo = activos.find(p => p.id === promotorSession.id);
        promotorSel.innerHTML = '<option value="' + escHtml(promotorSession.id) + '">' + escHtml(promo ? promo.nombre : promotorSession.nombre) + '</option>';
        promotorSel.disabled = true;
        if (sessionBar) {
            sessionBar.style.display = 'flex';
            sessionBar.innerHTML = '<div class="promo-session-user">\ud83d\udc64 ' + escHtml(promotorSession.nombre) + '</div>' +
                '<button type="button" class="promo-session-logout" onclick="cerrarSesionPromotorDesdePromo()">Cerrar sesi\u00f3n</button>';
        }
    } else {
        tiendaSel.disabled = false;
        promotorSel.disabled = false;
        tiendaSel.innerHTML = '<option value="">Seleccionar tienda...</option>' +
            zonas.map(z => '<option value="' + escHtml(z.nombre) + '">' + escHtml(z.nombre) + '</option>').join('');
        promotorSel.innerHTML = '<option value="">Seleccionar promotor...</option>' +
            activos.map(p => '<option value="' + p.id + '">' + escHtml(p.nombre) + (p.dni ? ' \u00b7 ' + escHtml(p.dni) : '') + '</option>').join('');
        if (sessionBar) {
            if (promotorSession) {
                sessionBar.style.display = 'flex';
                sessionBar.innerHTML = '<div class="promo-session-user">\ud83d\udc64 ' + escHtml(promotorSession.nombre) + '</div>' +
                    '<button type="button" class="promo-session-logout" onclick="cerrarSesionPromotorDesdePromo()">Cerrar sesi\u00f3n</button>';
            } else {
                sessionBar.style.display = 'none';
                sessionBar.innerHTML = '';
            }
        }
    }

    fechaInput.value = formatearFechaLocal(new Date());
    document.getElementById('modal-promociones').classList.add('open');
    cargarPromocionesTabla();
}

function cerrarSesionPromotorDesdePromo() {
    cerrarModalPromociones();
    cerrarSesionPromotor();
}

function cerrarModalPromociones() {
    document.getElementById('modal-promociones').classList.remove('open');
}

function cargarPromocionesTabla() {
    const tbody = document.getElementById('tbody-registro-promociones');
    if (!tbody) return;
    const tienda = document.getElementById('promo-tienda').value;
    const fecha = document.getElementById('promo-fecha').value;
    const promotorId = document.getElementById('promo-promotor').value;
    const totalEl = document.getElementById('promo-registro-total');

    if (typeof PromocionesStore === 'undefined' || !PromocionesStore._firestoreLoaded) {
        tbody.innerHTML = '<tr><td colspan="2"><div class="empty-state"><p>Cargando promociones...</p></div></td></tr>';
        if (totalEl) totalEl.textContent = '0 registros';
        return;
    }
    if (!tienda || !fecha || !promotorId) {
        tbody.innerHTML = '<tr><td colspan="2"><div class="empty-state"><p>Selecciona tienda, fecha y promotor para registrar promociones.</p></div></td></tr>';
        if (totalEl) totalEl.textContent = '0 registros';
        return;
    }

    const activas = PromocionesStore.getPromocionesActivas();
    const cantMap = {};
    PromocionesStore.registros.filter(r => r.tienda === tienda && r.fecha === fecha && r.promotor_id === promotorId)
        .forEach(r => { cantMap[r.promocion] = r.cantidad; });

    if (activas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2"><div class="empty-state"><p>No hay promociones activas. Solicita a tu supervisor que cree promociones.</p></div></td></tr>';
        if (totalEl) totalEl.textContent = '0 registros';
        return;
    }

    const rows = activas.map(p => {
        const cant = cantMap[p.nombre] || '';
        return '<tr>' +
            '<td class="promo-td-nombre">' + ctlDot(100) + ' ' + ctlEsc(p.nombre) + '</td>' +
            '<td><input type="number" min="0" step="1" class="promo-cant-input" data-promocion="' + escHtml(p.nombre) + '" value="' + cant + '" placeholder="0" oninput="actualizarTotalPromociones()"></td>' +
            '</tr>';
    }).join('');

    tbody.innerHTML = rows;
    actualizarTotalPromociones();
}

function actualizarTotalPromociones() {
    const inputs = document.querySelectorAll('#tbody-registro-promociones .promo-cant-input');
    let total = 0;
    let conValor = 0;
    inputs.forEach(inp => {
        const v = parseFloat(inp.value) || 0;
        if (v > 0) { total += v; conValor++; }
    });
    const totalEl = document.getElementById('promo-registro-total');
    if (totalEl) totalEl.textContent = conValor + ' registros \u00b7 ' + total + ' cantidades';
}

function guardarRegistroPromociones() {
    const tienda = document.getElementById('promo-tienda').value;
    const fecha = document.getElementById('promo-fecha').value;
    const promotorId = document.getElementById('promo-promotor').value;
    if (!tienda || !fecha || !promotorId) {
        mostrarNotificacion('Completa tienda, fecha y promotor antes de guardar.', 'warning');
        return;
    }
    const inputs = document.querySelectorAll('#tbody-registro-promociones .promo-cant-input');
    const cantidades = [];
    inputs.forEach(inp => {
        cantidades.push({ promocion: inp.getAttribute('data-promocion'), cantidad: parseFloat(inp.value) || 0 });
    });

    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const promo = promotores.find(p => p.id === promotorId);
    const guardados = PromocionesStore.guardarRegistro({
        fecha,
        tienda,
        promotor_id: promotorId,
        promotor_nombre: promo ? promo.nombre : null,
        cantidades
    });

    const algunoPositivo = cantidades.some(c => c.cantidad > 0);
    if (guardados > 0 && algunoPositivo) {
        mostrarNotificacion('Promociones registradas correctamente.', 'success');
    } else if (!algunoPositivo) {
        mostrarNotificacion('Ingresa al menos una cantidad mayor a 0.', 'warning');
    } else {
        mostrarNotificacion('Promociones registradas correctamente.', 'success');
    }
    cerrarModalPromociones();
    reRenderCurrentPage();
}

/* ===== MODAL: GESTIÓN DE PROMOCIONES (SUPERVISOR) ===== */
function abrirGestionPromociones() {
    if (!estaSupervisorDesbloqueado()) {
        abrirModalPassword();
        return;
    }
    renderGestionPromociones();
    document.getElementById('modal-gestion-promociones').classList.add('open');
}

function cerrarGestionPromociones() {
    document.getElementById('modal-gestion-promociones').classList.remove('open');
    gestionPromocionesEditando = null;
}

function renderGestionPromociones() {
    const tbody = document.getElementById('tbody-gestion-promociones');
    if (!tbody) return;
    if (typeof PromocionesStore === 'undefined' || !PromocionesStore._firestoreLoaded) {
        tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><p>Cargando promociones...</p></div></td></tr>';
        return;
    }
    const promos = PromocionesStore.getPromociones().slice().reverse();
    if (promos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><p>A\u00fan no existen promociones. Crea la primera con el formulario superior.</p></div></td></tr>';
        return;
    }

    const rows = promos.map(p => {
        const editando = gestionPromocionesEditando === p.id;
        const nombreCell = editando
            ? '<input type="text" id="gestion-editar-nombre-' + p.id + '" class="promo-gestion-edit-input" value="' + escHtml(p.nombre) + '" onkeydown="if(event.key===\'Enter\')guardarEdicionPromocion(\'' + p.id + '\')">'
            : ctlEsc(p.nombre);
        const estadoBadge = p.estado === 'Activa'
            ? '<span class="promo-estado-badge activa">Activa</span>'
            : '<span class="promo-estado-badge inactiva">Inactiva</span>';
        const acciones = editando
            ? '<button type="button" class="promo-action-btn ok" onclick="guardarEdicionPromocion(\'' + p.id + '\')">Guardar</button>' +
              '<button type="button" class="promo-action-btn cancel" onclick="cancelarEdicionPromocion()">Cancelar</button>'
            : '<button type="button" class="promo-action-btn" onclick="cambiarEstadoPromocion(\'' + p.id + '\')">' + (p.estado === 'Activa' ? 'Desactivar' : 'Activar') + '</button>' +
              '<button type="button" class="promo-action-btn" onclick="editarPromocion(\'' + p.id + '\')">Editar</button>' +
              '<button type="button" class="promo-action-btn danger" onclick="eliminarPromocion(\'' + p.id + '\')">Eliminar</button>';
        return '<tr>' +
            '<td class="promo-gestion-td-nombre">' + nombreCell + '</td>' +
            '<td>' + estadoBadge + '</td>' +
            '<td class="promo-gestion-td-fecha">' + _promoFechaLegible(p.fecha_creacion) + '</td>' +
            '<td class="promo-gestion-td-acciones">' + acciones + '</td>' +
            '</tr>';
    }).join('');

    tbody.innerHTML = rows;
}

function crearPromocion() {
    const input = document.getElementById('nueva-promocion-nombre');
    const nombre = input ? input.value.trim() : '';
    if (!nombre) {
        mostrarNotificacion('Escribe el nombre de la promoci\u00f3n.', 'warning');
        return;
    }
    const promo = PromocionesStore.crearPromocion(nombre);
    if (!promo) {
        mostrarNotificacion('La promoci\u00f3n ya existe o el nombre no es v\u00e1lido.', 'warning');
        return;
    }
    if (input) input.value = '';
    mostrarNotificacion('Promoci\u00f3n creada: ' + nombre, 'success');
    renderGestionPromociones();
    reRenderCurrentPage();
}

function editarPromocion(promoId) {
    gestionPromocionesEditando = promoId;
    renderGestionPromociones();
    const input = document.getElementById('gestion-editar-nombre-' + promoId);
    if (input) input.focus();
}

function cancelarEdicionPromocion() {
    gestionPromocionesEditando = null;
    renderGestionPromociones();
}

function guardarEdicionPromocion(promoId) {
    const input = document.getElementById('gestion-editar-nombre-' + promoId);
    const nombre = input ? input.value.trim() : '';
    if (!nombre) {
        mostrarNotificacion('El nombre no puede estar vac\u00edo.', 'warning');
        return;
    }
    const promo = PromocionesStore.editarPromocion(promoId, nombre);
    if (!promo) {
        mostrarNotificacion('No se pudo guardar. Verifica que el nombre no exista.', 'warning');
        return;
    }
    gestionPromocionesEditando = null;
    mostrarNotificacion('Promoci\u00f3n actualizada.', 'success');
    renderGestionPromociones();
    reRenderCurrentPage();
}

function cambiarEstadoPromocion(promoId) {
    const promo = PromocionesStore.promociones.find(p => p.id === promoId);
    if (!promo) return;
    const nuevoEstado = promo.estado === 'Activa' ? 'Inactiva' : 'Activa';
    PromocionesStore.setEstadoPromocion(promoId, nuevoEstado);
    mostrarNotificacion('Promoci\u00f3n ' + (nuevoEstado === 'Activa' ? 'activada' : 'desactivada') + ': ' + promo.nombre, 'success');
    renderGestionPromociones();
    reRenderCurrentPage();
}

function eliminarPromocion(promoId) {
    const promo = PromocionesStore.promociones.find(p => p.id === promoId);
    if (!promo) return;
    if (!confirm('\u00bfEliminar la promoci\u00f3n "' + promo.nombre + '"?\nTambi\u00e9n se eliminar\u00e1n sus registros asociados.')) return;
    PromocionesStore.eliminarPromocion(promoId);
    mostrarNotificacion('Promoci\u00f3n eliminada.', 'success');
    renderGestionPromociones();
    reRenderCurrentPage();
}

function renderizarResumenEjecutivo() {
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-resumen');

    const tipo = filtroTipoInformacion || 'productos';
    const mostrarProductos = tipo !== 'promociones';
    const mostrarPromos = tipo !== 'productos';

    const kpiRow = document.getElementById('kpi-row');
    const overallProgress = document.getElementById('overall-progress');
    const chartsGrid = document.querySelector('.resumen-charts-grid');
    const fullCard = document.querySelector('.resumen-chart-card-full');
    const promoSection = document.getElementById('resumen-promociones');
    if (kpiRow) kpiRow.style.display = mostrarProductos ? '' : 'none';
    if (overallProgress) overallProgress.style.display = mostrarProductos ? '' : 'none';
    if (chartsGrid) chartsGrid.style.display = mostrarProductos ? '' : 'none';
    if (fullCard) fullCard.style.display = mostrarProductos ? '' : 'none';
    if (promoSection) promoSection.style.display = mostrarPromos ? '' : 'none';

    if (!mostrarPromos && typeof destroyChart === 'function') destroyChart('chartPromos');
    if (mostrarPromos) renderResumenPromociones();
    if (!mostrarProductos) return;

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

    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
    const setCls = (id, cls) => { const el = document.getElementById(id); if (el) el.className = 'ctl-kpi-value ' + cls; };

    setText('kpi-venta-total', formatCurrency(ventaTotal));
    setText('kpi-venta-sub', 'acumulado del periodo');
    setText('kpi-meta-total', formatCurrency(cuotaTotal));
    setText('kpi-meta-sub', 'cuota asignada');

    setText('kpi-avance', formatPercent(avance));
    setCls('kpi-avance', avance >= 100 ? 'green' : avance >= 80 ? 'yellow' : 'red');
    setText('kpi-avance-sub', avance >= 100 ? 'meta alcanzada' : 'falta ' + formatPercent(100 - avance) + ' para la meta');

    setText('kpi-cumplen', pdvCumplen + ' / ' + totalPDVs);
    setText('kpi-cumplen-sub', totalPDVs > 0 ? Math.round((pdvCumplen / totalPDVs) * 100) + '% de PDVs cumplen' : '');

    setText('kpi-riesgo', pdvRiesgo);
    setText('kpi-riesgo-sub', totalPDVs > 0 ? Math.round((pdvRiesgo / totalPDVs) * 100) + '% de PDVs en riesgo' : '');

    setText('kpi-mejor-pdv', mejor ? mejor.punto_venta.replace(/^Red AT /i, '') : '-');
    setText('kpi-mejor-sub', mejor ? formatPercent(mejor.cumplimiento) : '');

    setText('kpi-peor-pdv', peor ? peor.punto_venta.replace(/^Red AT /i, '') : '-');
    setText('kpi-peor-sub', peor ? formatPercent(peor.cumplimiento) : '');

    setText('kpi-proyeccion', formatCurrency(proyeccion));
    setText('kpi-proyeccion-sub', proyeccion >= cuotaTotal ? 'supera la meta mensual' : 'por debajo de la meta');

    const opNum = document.getElementById('op-number');
    const opBar = document.getElementById('op-bar-fill');
    const opStatus = document.getElementById('op-status');
    const cls = avance >= 100 ? 'green' : avance >= 80 ? 'yellow' : 'red';
    opNum.textContent = formatPercent(avance);
    opNum.className = 'resumen-progress-number ' + cls;
    opBar.style.width = Math.min(avance, 100) + '%';
    opBar.className = 'resumen-progress-fill ' + cls;

    const badgeText = avance >= 100 ? 'Meta alcanzada' : avance >= 80 ? 'En buen camino' : 'Requiere atenci\u00f3n';
    opStatus.className = 'resumen-progress-badge ' + cls;
    opStatus.innerHTML = '<span class="resumen-progress-badge-dot"></span> ' + badgeText;

    actualizarGraficos();
}

function pdvSumItem(label, value, cls, tip) {
    return '<div class="pdv-sum-item" data-tip="' + tip + '" title="' + tip + '">' +
        '<span class="pdv-sum-label">' + label + '</span>' +
        '<span class="pdv-sum-value ' + cls + '">' + value + '</span>' +
        '</div>';
}

function renderizarAvancePDV(pdvSeleccionado) {
    if ((filtroTipoInformacion || 'productos') === 'promociones') {
        renderPromocionesAvancePDV(pdvSeleccionado);
        return;
    }
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-avance');
    const pdvs = DataStore.getPDVs();
    const select = document.getElementById('pdv-select');
    if (!select) return;

    if (!pdvSeleccionado) {
        pdvSeleccionado = select.value || 'todos';
    }
    select.value = pdvSeleccionado;

    const periodoHeader = DataStore.getInfoPeriodo();
    document.getElementById('pdv-dia-actual').textContent = periodoHeader.elapsed;
    document.getElementById('pdv-dia-total').textContent = '/' + periodoHeader.total;

    const container = document.getElementById('pdv-content');
    if (!container) return;

    if (DataStore.getInfoPeriodo().activo && !DataStore.getVentasEnRango().length) {
        container.innerHTML = '<div class="empty-state"><p>No existen registros de ventas para el periodo seleccionado.</p></div>';
        return;
    }

    const allData = DataStore.getCumplimientoPorPDV();
const listaPDVs = (pdvSeleccionado && pdvSeleccionado !== 'todos') ? [pdvSeleccionado] : pdvs;
    const periodo = DataStore.getInfoPeriodo();
    const diaActual = periodo.elapsed;
    const totalDiasMes = periodo.total || DIAS_MES;
    const diasFaltantes = Math.max(totalDiasMes - diaActual + 1, 0);
    const inicioHoy = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    const esPeriodoPasado = !!(periodo.fechaHasta && new Date(periodo.fechaHasta).getTime() < inicioHoy.getTime());

    let rowsHtml = '';
    for (let pdv of listaPDVs) {
        const d = allData[pdv];
        if (!d) continue;

        const ventaPDV = d.venta || 0;
        const cuotaPDV = d.cuota || 0;
        const faltPDV = d.diferencia || 0;
        const cumPDV = d.cumplimiento || 0;
        const cumClsPDV = cumPDV >= 100 ? 'green' : cumPDV >= 70 ? 'yellow' : 'red';
        const dotPDV = cumPDV >= 100 ? '\ud83d\udfe2' : cumPDV >= 70 ? '\ud83d\udfe1' : '\ud83d\udd34';
        let cuotaDiaPDV = '\u2014';
        if (ventaPDV >= cuotaPDV) cuotaDiaPDV = '\u2713 Meta';
        else if (esPeriodoPasado) cuotaDiaPDV = 'Fin mes';
        else if (diasFaltantes > 0) cuotaDiaPDV = formatCurrency(Math.ceil(faltPDV / diasFaltantes));

        rowsHtml += '<tr class="ctl-group-row"><td colspan="7">' +
            '<span class="ctl-group-name">' + ctlDot(d.cumplimiento) + ' ' + ctlEsc(ctlNombreCorto(pdv)) + '</span>' +
            '</td><td class="ctl-td-left">' + ctlBadge(d.cumplimiento) + '</td></tr>' +
            '<tr class="ctl-group-summary"><td colspan="8">' +
            '<div class="pdv-summary-bar">' +
            pdvSumItem('\ud83d\udcb0 Venta Total', formatCurrency(ventaPDV), 'green', 'Venta acumulada del periodo') +
            pdvSumItem('\ud83c\udfaf Cuota Total', formatCurrency(cuotaPDV), 'blue', 'Meta / cuota asignada del periodo') +
            pdvSumItem('\ud83d\udcc9 Faltante', (faltPDV <= 0 ? '\u2713 ' + formatCurrency(Math.abs(faltPDV)) : formatCurrency(faltPDV)), 'orange', 'Cuota pendiente por vender') +
            pdvSumItem('\ud83d\udcc5 Cuota x D\u00eda', cuotaDiaPDV, 'purple', 'Cuota diaria requerida para cerrar el faltante') +
            pdvSumItem('\ud83d\udcca Cumplimiento', dotPDV + ' ' + formatPercent(cumPDV), cumClsPDV, 'Cumplimiento general del punto de venta') +
            '</div>' +
            '</td></tr>';

        for (let prod of DataStore.getProductos()) {
            const p = d.productos[prod];
            if (!p) continue;
            const dif = p.cuota - p.venta;
            const proyPDV = diaActual > 0 ? (p.venta / diaActual) * periodo.total : 0;
            let cuotaDiaStr = '\u2014';
            if (p.venta >= p.cuota) cuotaDiaStr = '<span class="ctl-td-good">\u2713 Meta</span>';
            else if (esPeriodoPasado) cuotaDiaStr = '<span class="ctl-td-dim">Fin mes</span>';
            else if (diasFaltantes > 0) cuotaDiaStr = formatCurrency(Math.ceil(dif / diasFaltantes));

            rowsHtml += '<tr>' +
                '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(prod) + '</td>' +
                '<td>' + formatCurrency(p.venta) + '</td>' +
                '<td>' + formatCurrency(p.cuota) + '</td>' +
                '<td>' + ctlBarCell(p.cumplimiento) + '</td>' +
                '<td class="' + (p.venta >= p.cuota ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (p.venta >= p.cuota ? '\u2713 ' + formatCurrency(Math.abs(dif)) : formatCurrency(dif)) + '</td>' +
                '<td class="' + (proyPDV >= p.cuota ? 'ctl-td-good' : 'ctl-td-dim') + '">' + formatCurrency(proyPDV) + '</td>' +
                '<td class="ctl-td-dim">' + cuotaDiaStr + '</td>' +
                '<td>' + ctlBadge(p.cumplimiento) + '</td>' +
                '</tr>';
        }
    }

    container.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Avance por Punto de Venta</span>' +
        '<span class="ctl-card-count">' + ((pdvSeleccionado && pdvSeleccionado !== 'todos') ? ctlEsc(pdvSeleccionado) : listaPDVs.length + ' PDVs') + '</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table">' +
'<thead><tr>' +
        '<th class="ctl-th-left">Producto</th><th>Venta</th><th>Cuota</th><th>Alcance</th><th>Faltante</th><th>Proyecci\u00f3n</th><th>Cuota x D\u00eda</th><th>Estado</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody>' +
        '</table></div></div>';
}

function exportarAvancePDVExcel() {
    try {
        if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') {
            console.error('[EXPORT] ExcelJS o FileSaver no disponibles.');
            return;
        }

        const pdvSeleccionado = (document.getElementById('pdv-select') || {}).value || 'todos';
        const pdvs = DataStore.getPDVs();
        const listaPDVs = (pdvSeleccionado && pdvSeleccionado !== 'todos') ? [pdvSeleccionado] : pdvs;
        const allData = DataStore.getCumplimientoPorPDV();
        const productos = DataStore.getProductos();
        const periodo = DataStore.getInfoPeriodo();
        const diaActual = periodo.elapsed || 0;
        const totalDias = periodo.total || DataStore.diaActual || DIAS_MES;

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Avance PDV');

        const columnCount = 9;
        const columns = [
            { header: 'PUNTO DE VENTA', key: 'pdv', width: 30 },
            { header: 'PRODUCTO', key: 'producto', width: 24 },
            { header: 'VENTA (S/)', key: 'venta', width: 14 },
            { header: 'CUOTA (S/)', key: 'cuota', width: 14 },
            { header: '% ALCANCE', key: 'alcance', width: 12 },
            { header: 'FALTANTE (S/)', key: 'faltante', width: 16 },
            { header: 'PROYECCI\u00d3N (S/)', key: 'proyeccion', width: 16 },
            { header: 'CUOTA X D\u00cdA', key: 'cuotaDia', width: 14 },
            { header: 'ESTADO', key: 'estado', width: 12 }
        ];
        ws.columns = columns;

        const titleRow = ws.addRow(['Informe de Avance por Punto de Venta']);
        ws.mergeCells(titleRow.number, 1, titleRow.number, columnCount);
        titleRow.height = 28;
        titleRow.getCell(1).value = 'Informe de Avance por Punto de Venta';
        titleRow.getCell(1).font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
        titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
        for (let t = 1; t <= columnCount; t++) {
            titleRow.getCell(t).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF155a3a' } };
        }

        const periodoTexto = listaPDVs.length === 1 ? listaPDVs[0] : 'Todos los PDVs';
        const sub = ws.addRow(['Periodo: ' + periodoTexto + (totalDias ? ' \u00b7 Al d\u00eda ' + diaActual + ' de ' + totalDias + ' d\u00edas' : '')]);
        ws.mergeCells(sub.number, 1, sub.number, columnCount);
        sub.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF8A8A8A' } };
        sub.getCell(1).alignment = { vertical: 'middle' };

        const headRow = ws.addRow(columns.map(c => c.header));
        headRow.height = 22;
        headRow.eachCell(c => {
            c.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F0F0F' } };
            c.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            c.border = { bottom: { style: 'medium', color: { argb: 'FF1DB954' } } };
        });
        ws.views = [{ state: 'frozen', ySplit: headRow.number }];

        const dinero = '"S/ "#,##0.00';

        let num = 0;
        for (let pdv of listaPDVs) {
            const d = allData[pdv];
            if (!d) continue;

            const grupo = ws.addRow([pdv]);
            ws.mergeCells(grupo.number, 1, grupo.number, columnCount);
            grupo.height = 20;
            grupo.getCell(1).value = pdv;
            grupo.getCell(1).font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            grupo.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };
            for (let t = 1; t <= columnCount; t++) {
                grupo.getCell(t).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6E4D' } };
            }

            for (let prod of productos) {
                const p = d.productos[prod];
                if (!p) continue;
                num++;

                const dif = p.cuota - p.venta;
                const proyPDV = diaActual > 0 ? (p.venta / diaActual) * totalDias : 0;
                const diasFaltantes = Math.max(totalDias - diaActual + 1, 0);
                const inicioHoy = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
                const esPeriodoPasado = !!(periodo.fechaHasta && new Date(periodo.fechaHasta).getTime() < inicioHoy.getTime());
                let reqValor;
                if (p.venta >= p.cuota) reqValor = 'Meta';
                else if (esPeriodoPasado) reqValor = 'Fin mes';
                else if (diasFaltantes > 0) reqValor = Math.ceil(dif / diasFaltantes);
                else reqValor = 'Fin mes';

                const estado = p.cumplimiento >= 100 ? 'CUMPLE' : (p.cumplimiento >= 80 ? 'ALERTA' : 'CR\u00cdTICO');
                const estadoFill = p.cumplimiento >= 100 ? 'FFD4EDDA' : (p.cumplimiento >= 80 ? 'FFF3CD' : 'FFF8D7DA');
                const estadoColor = p.cumplimiento >= 100 ? 'FF155724' : (p.cumplimiento >= 80 ? 'FF856404' : 'FF721C24');

                const dataRow = ws.addRow([
                    pdv,
                    prod,
                    p.venta,
                    p.cuota,
                    p.cumplimiento / 100,
                    dif,
                    proyPDV,
                    reqValor,
                    estado
                ]);
                dataRow.getCell(1).font = { color: { argb: 'FF155724' } };
                dataRow.getCell(2).alignment = { horizontal: 'left' };
                dataRow.getCell(3).numFmt = dinero;
                dataRow.getCell(4).numFmt = dinero;
                dataRow.getCell(5).numFmt = '0.0%';
                dataRow.getCell(5).alignment = { horizontal: 'center' };
                dataRow.getCell(6).numFmt = dinero;
                dataRow.getCell(7).numFmt = dinero;
                if (typeof reqValor === 'number') {
                    dataRow.getCell(8).numFmt = dinero;
                }
                dataRow.getCell(9).font = { bold: true, color: { argb: estadoColor } };
                dataRow.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: estadoFill } };
                dataRow.getCell(9).alignment = { horizontal: 'center' };
            }
        }

        if (num === 0) {
            ws.addRow(['No existen registros para el periodo seleccionado.']);
            ws.mergeCells(ws.lastRow.number, 1, ws.lastRow.number, columnCount);
        }

        const hoy = new Date();
        const stamp = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');
        const nombreArchivo = 'Avance_PDV_' + stamp + '.xlsx';

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, nombreArchivo);
        });
    } catch (e) {
        console.error('[EXPORT] Error al generar el Excel:', e);
    }
}

function renderizarRanking() {
    if ((filtroTipoInformacion || 'productos') === 'promociones') {
        renderizarRankingPromociones();
        return;
    }
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-ranking');
    const ranking = DataStore.getRanking();
    if (!document.getElementById('page-ranking')) return;

    const noData = DataStore.getInfoPeriodo().activo && !DataStore.getVentasEnRango().length;

    if (noData) {
        destroyChart('chartRanking');
        document.getElementById('ranking-list').innerHTML =
            '<div class="empty-state"><p>No existen registros de ventas para el periodo seleccionado.</p></div>';
        document.getElementById('ranking-list-count').textContent = '0 tiendas';
        document.getElementById('ranking-hero-stats').innerHTML = '';
        return;
    }

    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    const rows = ranking.map((r, i) => {
        const proyOk = r.proyeccion >= r.cuota;
        const dif = r.cuota - r.venta_total;
        const medalla = i < 3 ? ' ' + medals[i] : '';
        return '<tr>' +
            '<td class="ctl-td-pos">' + r.puesto + medalla + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlDot(r.cumplimiento) + ' ' + ctlEsc(r.punto_venta) + '</td>' +
            '<td>' + formatCurrency(r.venta_total) + '</td>' +
            '<td>' + formatCurrency(r.cuota) + '</td>' +
            '<td>' + ctlBarCell(r.cumplimiento) + '</td>' +
            '<td class="' + (proyOk ? 'ctl-td-good' : 'ctl-td-dim') + '">' + formatCurrency(r.proyeccion) + '</td>' +
            '<td class="' + (dif <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (dif <= 0 ? 'S/ 0' : formatCurrency(dif)) + '</td>' +
            '<td>' + ctlBadge(r.cumplimiento) + '</td>' +
            '</tr>';
    }).join('');

    document.getElementById('ranking-list').innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-table-wrap"><table class="ctl-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">#</th><th class="ctl-th-left">Tienda</th>' +
        '<th>Venta</th><th>Meta</th><th>Cumplimiento</th><th>Proyecci\u00f3n</th><th>Diferencia</th><th>Estado</th>' +
        '</tr></thead><tbody>' + rows + '</tbody>' +
        '</table></div></div>';

    document.getElementById('ranking-list-count').textContent = ranking.length + ' tiendas';

    const cumplen = ranking.filter(r => r.cumplimiento >= 100).length;
    const riesgo = ranking.filter(r => r.cumplimiento < 80).length;
    document.getElementById('ranking-hero-stats').innerHTML = `
        <div class="ranking-hero-stat">
            <span class="ranking-hero-stat-value" style="color:var(--accent)">${cumplen}</span>
            <span class="ranking-hero-stat-label">Cumplen meta</span>
        </div>
        <div class="ranking-hero-stat">
            <span class="ranking-hero-stat-value" style="color:var(--warning)">${ranking.length - cumplen - riesgo}</span>
            <span class="ranking-hero-stat-label">En observaci\u00f3n</span>
        </div>
        <div class="ranking-hero-stat">
            <span class="ranking-hero-stat-value" style="color:var(--danger)">${riesgo}</span>
            <span class="ranking-hero-stat-label">En riesgo</span>
        </div>
    `;

    createRankingChart();
}

function poblarFiltros() {
    const pdvs = DataStore.getPDVs();
    console.log('[AUDITORIA] poblarFiltros pdvs:', pdvs.length, pdvs);
    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        pdvSelect.innerHTML = '<option value="todos">Todos los PDV</option>' +
            pdvs.map(p => `<option value="${p}">${p}</option>`).join('');
        console.log('[AUDITORIA] pdv-select options después de poblar:', pdvSelect.options.length);
    }
}

const reporteSort = { sortBy: 'pdv', sortDir: 'asc' };

/* ===== FILTROS DE FECHA (PERIODO ANALIZADO) ===== */
function formatearFechaCorta(iso) {
    if (!iso) return '';
    const f = DataStore._parseFechaLocal(iso);
    if (!f) return String(iso);
    const dia = String(f.getDate()).padStart(2, '0');
    const mes = String(f.getMonth() + 1).padStart(2, '0');
    return dia + '/' + mes + '/' + f.getFullYear();
}

function renderPeriodoAnalizado(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    const p = DataStore.getInfoPeriodo();
    let label;
    if (p.activo) {
        const fd = DataStore._parseFechaLocal(p.fechaDesde);
        const fh = DataStore._parseFechaLocal(p.fechaHasta);
        const ultimoDia = new Date(fh.getFullYear(), fh.getMonth() + 1, 0).getDate();
        const esMesCompleto = fd.getDate() === 1 && fh.getDate() === ultimoDia && fd.getMonth() === fh.getMonth() && fd.getFullYear() === fh.getFullYear();
        label = esMesCompleto
            ? (MESES.find(m => m.valor === fd.getMonth() + 1)?.nombre || fd.getMonth() + 1) + ' ' + fd.getFullYear()
            : 'Del ' + formatearFechaCorta(p.fechaDesde) + ' al ' + formatearFechaCorta(p.fechaHasta);
    } else {
        const nombreMes = MESES.find(m => m.valor === MES)?.nombre || MES;
        label = nombreMes + ' ' + ANIO;
    }
    el.innerHTML = `
        <span class="periodo-analizado-ico">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </span>
        <span class="periodo-analizado-text">Periodo analizado: <strong>${label}</strong></span>`;
    el.style.display = 'inline-flex';
}

function pad2(n) { return String(n).padStart(2, '0'); }
function fmtAnioMesDia(anio, mes, dia) { return anio + '-' + pad2(mes) + '-' + pad2(dia); }
function diasDelMes(anio, mes) { return new Date(anio, mes, 0).getDate(); }

function valorMesCompleto(desde, hasta) {
    const fd = DataStore._parseFechaLocal(desde);
    const fh = DataStore._parseFechaLocal(hasta);
    if (!fd || !fh) return '';
    const ultimo = new Date(fh.getFullYear(), fh.getMonth() + 1, 0).getDate();
    const esMes = fd.getDate() === 1 && fh.getDate() === ultimo && fd.getMonth() === fh.getMonth() && fd.getFullYear() === fh.getFullYear();
    return esMes ? fd.getFullYear() + '-' + pad2(fd.getMonth() + 1) : '';
}

function poblarSelectMes(modulo) {
    const sel = document.getElementById('filtro-' + modulo + '-mes');
    if (!sel) return;
    if (sel.options.length > 1) return;
    const meses = DataStore.getMesesDisponibles();
    sel.innerHTML = '<option value="">Seleccionar periodo...</option>' +
        '<option value="custom">Personalizado</option>' +
        meses.map(mm => `<option value="${mm.anio}-${pad2(mm.mes)}">${mm.nombre} ${mm.anio}</option>`).join('');
}

function sincronizarInputsFecha() {
    const filtros = DataStore.getFiltrosFecha();
    ['resumen', 'avance', 'ranking', 'informe', 'vista-ejecutiva'].forEach(modulo => {
        const desde = document.getElementById('filtro-' + modulo + '-desde');
        const hasta = document.getElementById('filtro-' + modulo + '-hasta');
        const mesSel = document.getElementById('filtro-' + modulo + '-mes');
        poblarSelectMes(modulo);
        if (desde) desde.value = filtros.desde || '';
        if (hasta) hasta.value = filtros.hasta || '';
        if (mesSel) mesSel.value = valorMesCompleto(filtros.desde, filtros.hasta);
        toggleCustomPeriodo(modulo, (filtros.desde && filtros.hasta) ? !mesSel.value : false);
    });
}

function toggleCustomPeriodo(modulo, open) {
    const custom = document.getElementById('custom-' + modulo);
    if (!custom) return;
    custom.classList.toggle('is-open', !!open);
    if (open) {
        const input = document.getElementById('filtro-' + modulo + '-desde');
        if (input) input.focus({ preventScroll: true });
    }
}

function aplicarRangoFechas(modulo, desde, hasta) {
    const d = document.getElementById('filtro-' + modulo + '-desde');
    const h = document.getElementById('filtro-' + modulo + '-hasta');
    if (d) d.value = desde;
    if (h) h.value = hasta;
    DataStore.setFiltrosFecha(desde, hasta);
    sincronizarInputsFecha();
    actualizarDatosPorSeccion(modulo);
}

function actualizarDatosPorSeccion(seccion) {
    if (seccion === 'resumen') renderizarResumenEjecutivo();
    else if (seccion === 'avance') renderizarAvancePDV();
    else if (seccion === 'ranking') renderizarRanking();
    else if (seccion === 'informe') recargarInformeSiAplica();
    else if (seccion === 'vista-ejecutiva') renderizarVistaEjecutiva();
    else recargarModulosConFiltro();
}

const RANGOS_ETIQUETA = {
    'hoy': 'Hoy',
    'esta-semana': 'Semana',
    'mes-actual': 'Mes',
    'mes-anterior': 'Mes Anterior',
    'ultimos-3': '3 Meses',
    'anio-actual': 'Año'
};

function _convContainerRango(modulo) {
    const pageId = modulo === 'informe' ? 'page-informe-promotor' : 'page-' + modulo;
    const page = document.getElementById(pageId);
    return page ? page.querySelector('.date-filter-fastrow') : null;
}

function marcarRangoActivo(modulo, tipo) {
    const fastrow = _convContainerRango(modulo);
    if (!fastrow) return;
    const etiqueta = (RANGOS_ETIQUETA[tipo] || '').toLowerCase();
    fastrow.querySelectorAll('.date-btn-quick').forEach(b => {
        b.classList.toggle('active', b.textContent.trim().toLowerCase() === etiqueta);
    });
}

function limpiarRangoActivo(modulo) {
    const fastrow = _convContainerRango(modulo);
    if (!fastrow) return;
    fastrow.querySelectorAll('.date-btn-quick').forEach(b => b.classList.remove('active'));
}

function cambiarMesFecha(modulo) {
    const sel = document.getElementById('filtro-' + modulo + '-mes');
    if (!sel) return;
const val = sel.value;
    if (!val) {
        toggleCustomPeriodo(modulo, false);
        limpiarRangoActivo(modulo);
        return;
    }
    if (val === 'custom') {
        toggleCustomPeriodo(modulo, true);
        limpiarRangoActivo(modulo);
        return;
    }
    const [anio, mes] = val.split('-').map(Number);
    const desde = fmtAnioMesDia(anio, mes, 1);
    const hasta = fmtAnioMesDia(anio, mes, diasDelMes(anio, mes));
    aplicarRangoFechas(modulo, desde, hasta);
    limpiarRangoActivo(modulo);
}

function aplicarRangoRapido(modulo, tipo) {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = hoy.getMonth() + 1;
    let desde = '';
    let hasta = '';
    if (tipo === 'hoy') {
        const hoyStr = fmtAnioMesDia(y, m, hoy.getDate());
        desde = hoyStr;
        hasta = hoyStr;
    } else if (tipo === 'esta-semana') {
        const diaSemana = hoy.getDay();
        const offsetIni = diaSemana === 0 ? 6 : diaSemana - 1;
        const ini = new Date(y, m - 1, hoy.getDate() - offsetIni);
        const fin = new Date(y, m - 1, hoy.getDate() + (6 - offsetIni));
        desde = fmtAnioMesDia(ini.getFullYear(), ini.getMonth() + 1, ini.getDate());
        hasta = fmtAnioMesDia(fin.getFullYear(), fin.getMonth() + 1, fin.getDate());
    } else if (tipo === 'mes-actual') {
        desde = fmtAnioMesDia(y, m, 1);
        hasta = fmtAnioMesDia(y, m, diasDelMes(y, m));
    } else if (tipo === 'mes-anterior') {
        const aa = m === 1 ? y - 1 : y;
        const mm = m === 1 ? 12 : m - 1;
        desde = fmtAnioMesDia(aa, mm, 1);
        hasta = fmtAnioMesDia(aa, mm, diasDelMes(aa, mm));
    } else if (tipo === 'ultimos-3') {
        let mm = m - 2;
        let aa = y;
        if (mm <= 0) { mm += 12; aa = y - 1; }
        desde = fmtAnioMesDia(aa, mm, 1);
        hasta = fmtAnioMesDia(y, m, diasDelMes(y, m));
    } else if (tipo === 'anio-actual') {
        desde = fmtAnioMesDia(y, 1, 1);
        hasta = fmtAnioMesDia(y, 12, 31);
    }
    if (desde && hasta) {
        aplicarRangoFechas(modulo, desde, hasta);
        marcarRangoActivo(modulo, tipo);
    }
}

function recargarModulosConFiltro() {
    sincronizarInputsFecha();
    ['resumen', 'avance', 'ranking', 'informe', 'vista-ejecutiva'].forEach(seccion => actualizarDatosPorSeccion(seccion));
}

function recargarInformeSiAplica() {
    const sel = document.getElementById('inf-promotor-select');
    if (sel && sel.value) aplicarFiltrosInformePromotor();
    else if (infPromTab === 'promociones') {
        const heroKpis = document.getElementById('inf-promotor-hero-kpis');
        if (heroKpis) heroKpis.innerHTML = '';
        const content = document.getElementById('inf-promotor-content');
        if (content) content.innerHTML = '<div class="empty-state"><p>Selecciona un promotor para ver sus promociones.</p></div>';
    } else renderizarTablaPromotores();
}

function aplicarFiltrosFecha(modulo, silencioso) {
    const desde = document.getElementById('filtro-' + modulo + '-desde').value;
    const hasta = document.getElementById('filtro-' + modulo + '-hasta').value;
    if (!desde && !hasta) {
        if (!silencioso) {
            DataStore.limpiarFiltrosFecha();
            sincronizarInputsFecha();
            limpiarRangoActivo(modulo);
            actualizarDatosPorSeccion(modulo);
        }
        return;
    }
    if (!desde || !hasta) {
        if (!silencioso) mostrarNotificacion('Selecciona fecha inicial y fecha final', 'error');
        return;
    }
    if (desde > hasta) {
        if (!silencioso) mostrarNotificacion('La fecha inicial no puede ser posterior a la fecha final', 'error');
        return;
    }
    DataStore.setFiltrosFecha(desde, hasta);
    sincronizarInputsFecha();
    limpiarRangoActivo(modulo);
    actualizarDatosPorSeccion(modulo);
}

function limpiarFiltrosFecha(modulo) {
    const desde = document.getElementById('filtro-' + modulo + '-desde');
    const hasta = document.getElementById('filtro-' + modulo + '-hasta');
    if (desde) desde.value = '';
    if (hasta) hasta.value = '';
    DataStore.limpiarFiltrosFecha();
    sincronizarInputsFecha();
    limpiarRangoActivo(modulo);
    actualizarDatosPorSeccion(modulo);
}

/* ===== SUPERVISOR SESSION STATE ===== */
const SUPERVISOR_PASSWORD = 'Adecco2019@';

function estaSupervisorDesbloqueado() {
    return sessionStorage.getItem('supervisor_unlocked') === 'true';
}

function desbloquearSupervisor() {
    sessionStorage.setItem('supervisor_unlocked', 'true');
    actualizarSidebarSupervisor();
    cerrarModalPassword();
    mostrarNotificacion('Modo supervisor activado', 'success');
}

function bloquearSupervisor() {
    sessionStorage.removeItem('supervisor_unlocked');
    actualizarSidebarSupervisor();
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        const id = activePage.id.replace('page-', '');
        if (id === 'resumen' || id === 'vista-ejecutiva' || id === 'horarios' || id === 'tiendas') {
            cambiarPagina('avance');
        }
    }
    mostrarNotificacion('Modo supervisor bloqueado', 'success');
}

function actualizarSidebarSupervisor() {
    const unlocked = estaSupervisorDesbloqueado();
    document.getElementById('sidebar').classList.toggle('supervisor-unlocked', unlocked);
    const lockBtn = document.getElementById('supervisor-lock-btn');
    if (lockBtn) lockBtn.style.display = unlocked ? 'flex' : 'none';

    const toggleIcon = document.getElementById('supervisor-toggle-icon');
    const toggleLabel = document.getElementById('supervisor-toggle-label');
    if (toggleIcon) {
        toggleIcon.innerHTML = unlocked
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/><circle cx="12" cy="16" r="1" fill="#1DB954"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/><circle cx="12" cy="16" r="1"/></svg>';
    }
    if (toggleLabel) {
        toggleLabel.textContent = unlocked ? 'Supervisor activo' : 'Supervisor';
    }

    if (!unlocked) {
        const activePage = document.querySelector('.page.active');
        if (activePage) {
            const id = activePage.id.replace('page-', '');
            if (id === 'resumen' || id === 'vista-ejecutiva' || id === 'horarios') {
                cambiarPagina('avance');
            }
        }
    }
}

function toggleSupervisorAcceso() {
    if (estaSupervisorDesbloqueado()) {
        bloquearSupervisor();
    } else {
        abrirModalPassword();
    }
}

function navegarACuotas() {
    if (!estaSupervisorDesbloqueado()) {
        abrirModalPassword();
        return;
    }
    abrirModalCuotasSinPassword();
}

function actualizarFechasUI() {
    const nombreMes = MESES.find(m => m.valor === MES)?.nombre || MES;
    const periodoText = nombreMes + ' ' + ANIO;
    const diaActual = DataStore.getDiaActual();

    const sidebar = document.getElementById('sidebar-periodo');
    if (sidebar) sidebar.textContent = 'Dashboard de Ventas \u00b7 ' + periodoText;

    const topBarPeriodo = document.getElementById('top-bar-periodo');
    if (topBarPeriodo) topBarPeriodo.textContent = periodoText;

    const fechaInfo = document.getElementById('dia-actual');
    if (fechaInfo) fechaInfo.textContent = diaActual;

    const diaTotal = document.getElementById('dia-actual-total');
    if (diaTotal) diaTotal.textContent = DIAS_MES;

    const pdvPeriodo = document.getElementById('pdv-date-periodo');
    if (pdvPeriodo) pdvPeriodo.textContent = periodoText;

    const pdvDiaActual = document.getElementById('pdv-dia-actual');
    if (pdvDiaActual) pdvDiaActual.textContent = diaActual;

    const pdvDiaTotal = document.getElementById('pdv-dia-total');
    if (pdvDiaTotal) pdvDiaTotal.textContent = '/' + DIAS_MES;
}

function sincronizarSelectsPeriodo() {
    const mesSelects = [document.getElementById('venta-mes'), document.getElementById('cuotas-mes')];
    mesSelects.forEach(sel => {
        if (sel) sel.value = String(MES);
    });

    const anioSelects = [document.getElementById('venta-anio'), document.getElementById('cuotas-anio')];
    anioSelects.forEach(sel => {
        if (!sel) return;
        const anioStr = String(ANIO);
        let existe = false;
        for (let i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value === anioStr) { existe = true; break; }
        }
        if (!existe) {
            const opt = document.createElement('option');
            opt.value = anioStr;
            opt.textContent = anioStr;
            sel.appendChild(opt);
        }
        sel.value = anioStr;
    });
}

function recargarDashboard() {
    if (typeof TiendasStore !== 'undefined' && !TiendasStore.initialized && typeof initGestionTiendas === 'function') {
        initGestionTiendas();
    }

    poblarFiltros();

if (typeof HorariosDataStore !== 'undefined') {
        if (!HorariosDataStore.initialized && typeof initHorarios === 'function') {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
            };
        }
        if (HorariosDataStore.initialized) {
            HorariosDataStore._sincronizarZonasConDataStore();
            const activePage = document.querySelector('.page.active');
            if (activePage && activePage.id === 'page-horarios') {
                renderHorarios();
            }
        }
    }

    poblarFiltrosInformePromotor();
    sincronizarInputsFecha();
    actualizarFechasUI();
    renderizarResumenEjecutivo();
    renderizarAvancePDV();
    renderizarRanking();
    renderizarVistaEjecutiva();

    if (typeof PromocionesStore !== 'undefined') {
        if (!PromocionesStore.initialized) {
            PromocionesStore.init();
        }
        PromocionesStore.onUpdate = function () {
            reRenderCurrentPage();
            if (typeof renderizarVistaEjecutiva === 'function') renderizarVistaEjecutiva();
        };
        syncTipoInfoUI();
    }
}

function cambiarPagina(pagina) {
    const session = leerSesion();
    if (!session || !session.rol) {
        const screen = document.getElementById('login-screen');
        if (screen) screen.classList.add('activo');
        return;
    }

    const paginasSupervisor = ['resumen', 'vista-ejecutiva', 'horarios', 'informe-promotor', 'tiendas'];
    if (session.rol === 'promotor' && paginasSupervisor.indexOf(pagina) !== -1) {
        cambiarPagina('avance');
        return;
    }

    if ((pagina === 'resumen' || pagina === 'vista-ejecutiva' || pagina === 'horarios' || pagina === 'tiendas') && !estaSupervisorDesbloqueado()) {
        abrirModalPassword();
        return;
    }

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById('page-' + pagina);
    if (pageEl) pageEl.classList.add('active');

    document.querySelectorAll(`.nav-item[data-page="${pagina}"]`).forEach(n => n.classList.add('active'));

document.getElementById('page-title').textContent =
        pagina === 'resumen' ? 'Resumen Zona' :
            pagina === 'vista-ejecutiva' ? 'Vista Ejecutiva' :
                pagina === 'avance' ? 'Avance por Punto de Venta' :
                pagina === 'ranking' ? 'Ranking de Tiendas' :
                    pagina === 'informe-promotor' ? 'Informe por Promotor' :
                        pagina === 'horarios' ? 'Gestión de Promotores' :
                    pagina === 'tiendas' ? 'Gestión de Tiendas' : 'Dashboard';

    if (pagina === 'resumen') {
        renderizarResumenEjecutivo();
    } else if (pagina === 'vista-ejecutiva') {
        renderizarVistaEjecutiva();
    } else if (pagina === 'avance') {
        renderizarAvancePDV();
    } else if (pagina === 'ranking') {
        renderizarRanking();
} else if (pagina === 'informe-promotor') {
        renderizarInformePromotor();
    } else if (pagina === 'horarios') {
        if (!HorariosDataStore.initialized) {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
            };
        }
        renderHorarios();
    } else if (pagina === 'tiendas') {
        if (typeof TiendasStore !== 'undefined' && !TiendasStore.initialized && typeof initGestionTiendas === 'function') {
            initGestionTiendas();
        } else if (typeof renderGestionTiendas === 'function') {
            renderGestionTiendas();
        }
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function mostrarNotificacion(mensaje, tipo) {
    const container = document.getElementById('notificacion-container') || (() => {
        const c = document.createElement('div');
        c.id = 'notificacion-container';
        c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(c);
        return c;
    })();

    const el = document.createElement('div');
    const bgColor = tipo === 'success' ? 'var(--success-bg)' : tipo === 'error' ? 'var(--danger-bg)' : 'var(--bg-hover)';
    const textColor = tipo === 'success' ? 'var(--accent)' : tipo === 'error' ? 'var(--danger)' : 'var(--text-primary)';
    const borderColor = tipo === 'success' ? 'var(--accent)' : tipo === 'error' ? 'var(--danger)' : 'var(--border)';

    el.style.cssText = `
        padding:14px 20px;border-radius:8px;font-size:13px;font-weight:500;
        background:${bgColor};color:${textColor};border:1px solid ${borderColor};
        box-shadow:0 8px 24px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    el.textContent = mensaje;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 4000);
}

let intentosPassword = 0;

function abrirModalPassword() {
    intentosPassword = 0;
    document.getElementById('password-error').textContent = '';
    document.getElementById('password-error').style.display = 'none';
    document.getElementById('password-input').value = '';
    document.getElementById('password-field-wrapper').classList.remove('shake');
    document.getElementById('password-input').type = 'password';
    document.getElementById('password-toggle').innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
    document.getElementById('modal-password').classList.add('open');
    setTimeout(() => document.getElementById('password-input').focus(), 300);
}

function cerrarModalPassword() {
    document.getElementById('modal-password').classList.remove('open');
}

function togglePasswordVisibility() {
    const input = document.getElementById('password-input');
    const btn = document.getElementById('password-toggle');
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>`;
    } else {
        input.type = 'password';
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
            </svg>`;
    }
}

function confirmarPassword() {
    const input = document.getElementById('password-input');
    const password = input.value;
    const btn = document.getElementById('btn-confirmar-password');
    btn.classList.add('loading');

    setTimeout(() => {
        if (password === SUPERVISOR_PASSWORD) {
            btn.classList.remove('loading');
            desbloquearSupervisor();
        } else {
            intentosPassword++;
            btn.classList.remove('loading');
            document.getElementById('password-field-wrapper').classList.add('shake');
            input.focus();
            const errorEl = document.getElementById('password-error');
            errorEl.style.display = 'flex';
            if (intentosPassword >= 3) {
                errorEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> Contrase\u00f1a incorrecta. Acceso bloqueado.';
                errorEl.style.color = '#EF4444';
                setTimeout(() => cerrarModalPassword(), 1500);
            } else {
                errorEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Contrase\u00f1a incorrecta. Intento ${intentosPassword} de 3.`;
                errorEl.style.color = '#EF4444';
            }
            setTimeout(() => document.getElementById('password-field-wrapper').classList.remove('shake'), 600);
        }
    }, 600);
}

function abrirModalCuotas() {
    if (!estaSupervisorDesbloqueado()) {
        abrirModalPassword();
        return;
    }
    abrirModalCuotasSinPassword();
}

function renderTablaCuotas(mes, anio) {
    const tbody = document.getElementById('tbody-cuotas');
    const thead = document.querySelector('#tabla-cuotas thead tr');

    const pdvs = DataStore.getPDVs();
    const productos = DataStore.getProductos();
    const cuotas = DataStore.getCuotas(mes, anio);

    let headHtml = '<th class="cuotas-th-pdv">Punto de Venta</th>';
    for (let prod of productos) {
        headHtml += `<th class="cuotas-th-prod">${prod}</th>`;
    }
    thead.innerHTML = headHtml;

    tbody.innerHTML = '';
    for (let pdv of pdvs) {
        let tr = document.createElement('tr');
        let rowHtml = `<td>${pdv}</td>`;
        for (let prod of productos) {
            const cuota = cuotas.find(c => c.punto_venta === pdv && c.producto === prod);
            const val = cuota ? cuota.cuota : 0;
            rowHtml += `<td><input class="cuotas-input" type="number" min="0" step="1" value="${val}" data-pdv="${pdv}" data-prod="${prod}"></td>`;
        }
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    }
}

function abrirModalCuotasSinPassword() {
    sincronizarSelectsPeriodo();
    const mesActual = parseInt(document.getElementById('cuotas-mes').value);
    const anioActual = parseInt(document.getElementById('cuotas-anio').value);

    renderTablaCuotas(mesActual, anioActual);

    document.getElementById('modal-cuotas').classList.add('open');
}

function cambiarMesCuotas() {
    if (!document.getElementById('modal-cuotas').classList.contains('open')) return;

    const mes = parseInt(document.getElementById('cuotas-mes').value);
    const anio = parseInt(document.getElementById('cuotas-anio').value);

    renderTablaCuotas(mes, anio);
}

function cerrarModalCuotas() {
    document.getElementById('modal-cuotas').classList.remove('open');
}

function guardarCuotas() {
    try {
        const inputs = document.querySelectorAll('.cuotas-input');
        const mes = parseInt(document.getElementById('cuotas-mes').value);
        const anio = parseInt(document.getElementById('cuotas-anio').value);
        const nuevasCuotas = [];

        inputs.forEach(inp => {
            const val = parseFloat(inp.value);
            if (!isNaN(val) && val >= 0) {
                nuevasCuotas.push({
                    punto_venta: inp.dataset.pdv,
                    producto: inp.dataset.prod,
                    cuota: val,
                    mes,
                    anio
                });
            }
        });

        if (nuevasCuotas.length === 0) {
            mostrarNotificacion('No hay cuotas para guardar', 'error');
            return;
        }

        DataStore.actualizarCuotas(nuevasCuotas, mes, anio);
        cerrarModalCuotas();
        recargarDashboard();
        mostrarNotificacion('✅ Información guardada correctamente.', 'success');
    } catch (error) {
        mostrarNotificacion('❌ Error al guardar información.\nDetalle: ' + error.message, 'error');
        console.error('Error en guardarCuotas:', error);
    }
}

let ventasModificadas = false;
let ventasFullscreen = false;
let modoVista = 'mes';
let diaSeleccionado = new Date().getDate();

function cerrarModalVenta() {
    document.getElementById('modal-venta').classList.remove('open');
    document.getElementById('modal-venta').classList.remove('ventas-fullscreen');
    const sessionBar = document.getElementById('ventas-session-bar');
    if (sessionBar) sessionBar.remove();
    const pdvSel = document.getElementById('modal-pdv');
    if (pdvSel) pdvSel.disabled = false;
    ventasFullscreen = false;
}

function toggleVentasFullscreen() {
    ventasFullscreen = !ventasFullscreen;
    document.getElementById('modal-venta').classList.toggle('ventas-fullscreen', ventasFullscreen);
    const btn = document.getElementById('ventas-expand-btn');
    if (ventasFullscreen) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 4 20 10 20"></polyline><polyline points="20 10 20 4 14 4"></polyline><line x1="14" y1="10" x2="20" y2="4"></line><line x1="4" y1="20" x2="10" y2="14"></line></svg>`;
    } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
    }
}

function cargarVentasCalendario() {
    const pdv = document.getElementById('modal-pdv').value;
    const mes = parseInt(document.getElementById('venta-mes').value);
    const anio = parseInt(document.getElementById('venta-anio').value);
    const tbody = document.getElementById('tbody-calendario');
    const thead = document.querySelector('#tabla-calendario thead tr');
const productos = DataStore.getProductos();
    const diaActual = DataStore.getDiaActual();
    const diasMes = new Date(anio, mes, 0).getDate();

    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();
    const esMesActual = mes === mesActual && anio === anioActual;
    const esMesFuturo = anio > anioActual || (anio === anioActual && mes > mesActual);
    const esMesPasado = anio < anioActual || (anio === anioActual && mes < mesActual);
    const diaMaximo = esMesActual ? diaActual : (esMesFuturo ? 0 : diasMes);

    if (diaSeleccionado > diasMes) diaSeleccionado = diasMes;

    thead.innerHTML = '<th class="calendario-th-producto">Producto</th>';
    for (let d = 1; d <= diasMes; d++) {
        const cls = d <= diaMaximo ? '' : 'style="opacity:0.4;"';
        const esHoy = esMesActual && d === diaActual;
        thead.innerHTML += `<th class="calendario-th-dia ${esHoy ? 'calendario-th-hoy' : ''}" data-dia="${d}" ${cls}>${d}</th>`;
    }
    thead.innerHTML += '<th class="calendario-th-dia">Total</th>';

    const ventas = DataStore.getVentasDelMes(mes, anio).filter(v => {
        if (v.punto_venta !== pdv || v.dia > diaMaximo) return false;
        if (promotorSession && v.promotor_id && v.promotor_id !== promotorSession.id) return false;
        return true;
    });

    tbody.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let prod of productos) {
        const tr = document.createElement('tr');
        const tdProducto = document.createElement('td');
        tdProducto.textContent = prod;
        tr.appendChild(tdProducto);

        let suma = 0;

        for (let d = 1; d <= diasMes; d++) {
            const venta = d <= diaMaximo ? ventas.find(v => v.producto === prod && v.dia === d) : null;
            const val = venta !== null && venta !== undefined ? venta.venta : '';
            suma += venta ? venta.venta : 0;

            const td = document.createElement('td');
            td.setAttribute('data-dia', d);
            if (d > diaMaximo) td.style.opacity = '0.4';

            const input = document.createElement('input');
            input.className = 'calendario-input' + (val === '' || val === 0 ? ' calendario-input-zero' : ' calendario-input-filled');
            input.type = 'number';
            input.min = '0';
            input.step = 'any';
            if (val !== '') input.value = val;
            input.dataset.prod = prod;
            input.dataset.dia = d;
            if (d > diaMaximo) input.readOnly = true;

            if (val !== '' && d > 1) {
                const cAnterior = ventas.find(v => v.producto === prod && v.dia === d - 1);
                if (cAnterior && cAnterior.venta > 0) {
                    const variacion = ((val - cAnterior.venta) / cAnterior.venta * 100).toFixed(1);
                    input.title = `Variaci\u00f3n: ${variacion > 0 ? '+' : ''}${variacion}% vs d\u00eda ${d - 1}`;
                }
            }

            td.appendChild(input);
            tr.appendChild(td);
        }

        const tdTotal = document.createElement('td');
        tdTotal.className = 'calendario-total';
        const spanTotal = document.createElement('span');
        spanTotal.className = 'total-prod';
        spanTotal.textContent = suma.toLocaleString('es-CL');
        tdTotal.appendChild(spanTotal);
        tr.appendChild(tdTotal);

        fragment.appendChild(tr);
    }

    tbody.appendChild(fragment);

    const totalRegistros = ventas.length;
    const maxRegistros = productos.length * diaMaximo;
    document.getElementById('ventas-progress-text').textContent = `${totalRegistros} / ${maxRegistros}`;

    aplicarFiltroVistaVentas(diasMes);

    document.getElementById('ventas-dia-select').innerHTML =
        Array.from({ length: diasMes }, (_, i) => `<option value="${i + 1}" ${i + 1 === diaSeleccionado ? 'selected' : ''}>Día ${i + 1}</option>`);

    initCrosshairCalendario();
}

(function() {
    document.addEventListener('input', function(e) {
        const inp = e.target.closest('.calendario-input');
        if (!inp) return;
        if (!inp.closest('#modal-venta.open')) return;
        if (inp.readOnly) return;

        ventasModificadas = true;
        const bar = document.getElementById('ventas-unsaved-bar');
        if (bar) bar.classList.add('visible');

        const val = parseFloat(inp.value);
        if (val > 0) {
            inp.classList.remove('calendario-input-zero');
            inp.classList.add('calendario-input-filled');
        } else {
            inp.classList.remove('calendario-input-filled');
            inp.classList.add('calendario-input-zero');
        }
        actualizarTotalesCalendario();
    });
})();

function cambiarModoVista(modo) {
    modoVista = modo;
    const toggleMes = document.querySelector('[data-view="mes"]');
    const toggleDia = document.querySelector('[data-view="dia"]');
    if (toggleMes) toggleMes.classList.toggle('active', modo === 'mes');
    if (toggleDia) toggleDia.classList.toggle('active', modo === 'dia');
    const diaSelect = document.getElementById('ventas-dia-select');
    if (diaSelect) diaSelect.style.display = modo === 'dia' ? '' : 'none';
    const modalEl = document.getElementById('modal-venta');
    modalEl.classList.toggle('vista-dia', modo === 'dia');
    aplicarFiltroVistaVentas();
}

function cambiarDiaSeleccionado(dia) {
    diaSeleccionado = parseInt(dia);
    aplicarFiltroVistaVentas();
}

function aplicarFiltroVistaVentas(diasMes) {
    if (!diasMes) {
        const anio = parseInt(document.getElementById('venta-anio').value);
        const mes = parseInt(document.getElementById('venta-mes').value);
        diasMes = new Date(anio, mes, 0).getDate();
    }

    const table = document.getElementById('tabla-calendario');
    if (!table) return;

    const isDia = modoVista === 'dia';
    const rows = table.querySelectorAll('tr');

    for (let r of rows) {
        for (let cell of r.cells) {
            cell.classList.remove('calendario-col-hidden', 'calendario-col-visible');
        }
    }

    if (!isDia) return;

    for (let r of rows) {
        for (let cell of r.cells) {
            const diaAttr = cell.getAttribute('data-dia');
            if (diaAttr) {
                const diaNum = parseInt(diaAttr);
                if (diaNum === diaSeleccionado) {
                    cell.classList.add('calendario-col-visible');
                } else {
                    cell.classList.add('calendario-col-hidden');
                }
            }
        }
    }
}

function initCrosshairCalendario() {
    const table = document.getElementById('tabla-calendario');
    if (!table) return;
    let currentCol = -1;
    const clearCol = () => {
        if (currentCol < 0) return;
        const rows = table.querySelectorAll('tr');
        for (let r of rows) {
            const cell = r.cells[currentCol];
            if (cell) cell.classList.remove('col-hover');
        }
        currentCol = -1;
    };
    const highlightCol = (idx) => {
        const rows = table.querySelectorAll('tr');
        for (let r of rows) {
            const cell = r.cells[idx];
            if (cell) cell.classList.add('col-hover');
        }
        currentCol = idx;
    };
    table.addEventListener('mouseover', function(e) {
        const td = e.target.closest('td, th');
        if (!td) { clearCol(); return; }
        const idx = td.cellIndex;
        if (idx === currentCol) return;
        clearCol();
        highlightCol(idx);
    });
    table.addEventListener('mouseleave', clearCol);
}

function actualizarTotalesCalendario() {
    const filas = document.querySelectorAll('#tbody-calendario tr');
    filas.forEach(tr => {
        const inputs = tr.querySelectorAll('.calendario-input');
        let suma = 0;
        inputs.forEach(inp => {
            const v = parseFloat(inp.value);
            if (!isNaN(v)) suma += v;
        });
        const totalSpan = tr.querySelector('.total-prod');
        if (totalSpan) totalSpan.textContent = suma.toLocaleString('es-CL');
    });
}

function guardarVentasCalendario() {
    const btn = document.getElementById('btn-guardar-ventas');
    if (!btn) return;
    btn.classList.add('loading');

    try {
        const pdv = document.getElementById('modal-pdv').value;
        const mes = parseInt(document.getElementById('venta-mes').value);
        const anio = parseInt(document.getElementById('venta-anio').value);
        const inputs = document.querySelectorAll('.calendario-input');
        const datos = [];

        const promoId = promotorSession ? promotorSession.id : null;
        const promoNombre = promotorSession ? promotorSession.nombre : null;
        const promoCorreo = promotorSession ? promotorSession.email : null;
        const promoDni = promotorSession ? promotorSession.dni : null;

        inputs.forEach(inp => {
            const val = parseFloat(inp.value);
            if (!isNaN(val) && val >= 0) {
                const base = {
                    pdv,
                    producto: inp.dataset.prod,
                    dia: parseInt(inp.dataset.dia),
                    monto: val,
                    mes,
                    anio
                };
                if (promoId) {
                    base.promotor_id = promoId;
                    base.promotor_nombre = promoNombre;
                    base.promotor_correo = promoCorreo;
                    base.promotor_dni = promoDni;
                }
                datos.push(base);
            }
        });

        if (datos.length === 0) {
            mostrarNotificacion('No hay ventas para guardar', 'error');
            btn.classList.remove('loading');
            return;
        }

        DataStore.actualizarVentasCalendario(pdv, datos);

        inputs.forEach(inp => {
            inp.classList.add('venta-guardada-anim');
            setTimeout(() => inp.classList.remove('venta-guardada-anim'), 500);
        });

        btn.classList.remove('loading');
        ventasModificadas = false;
        document.getElementById('ventas-unsaved-bar').classList.remove('visible');
        cerrarModalVenta();
        recargarDashboard();

        const msg = `Ventas guardadas para ${pdv} (${datos.length} registros)`;
        mostrarNotificacion('✅ Información guardada correctamente.', 'success');
    } catch (error) {
        btn.classList.remove('loading');
        mostrarNotificacion('❌ Error al guardar información.\nDetalle: ' + error.message, 'error');
        console.error('Error en guardarVentasCalendario:', error);
    }
}

/* ===== PROMOTOR AUTHENTICATION ===== */
let promotorSession = null;

function initPromotorSession() {
    if (promotorSession) return;
    const stored = localStorage.getItem('promotor_session') || sessionStorage.getItem('promotor_session');
    if (stored) {
        try {
            const data = JSON.parse(stored);
            if (data && data.email) {
                promotorSession = data;
            }
        } catch (e) {
            promotorSession = null;
        }
    }
}

function mostrarModalLogin() {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-error').textContent = '';
    document.getElementById('login-email-wrapper').classList.remove('shake');
    document.getElementById('login-password-wrapper').classList.remove('shake');
    document.getElementById('login-email-input').value = '';
    document.getElementById('login-password-input').value = '';
    document.getElementById('btn-confirmar-login').classList.remove('loading');
    document.getElementById('modal-login').classList.add('open');
    setTimeout(() => document.getElementById('login-email-input').focus(), 100);
}

function cerrarModalLogin() {
    document.getElementById('modal-login').classList.remove('open');
}

function toggleLoginPasswordVisibility() {
    const input = document.getElementById('login-password-input');
    const btn = document.getElementById('login-password-toggle');
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

async function hashPassword(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'dashboard-ventas-salt-2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.error('[LOGIN][ERROR] crypto.subtle no disponible (contexto no seguro). El login continuará con la contraseña en texto plano si existe.', e);
        return '';
    }
}

async function confirmarLogin() {
    const email = document.getElementById('login-email-input').value.trim().toLowerCase();
    const password = document.getElementById('login-password-input').value;
    const btn = document.getElementById('btn-confirmar-login');
    const errorEl = document.getElementById('login-error');

    console.log('[LOGIN] 1. Inicio de login (modal).');
    console.log('[LOGIN] 2. Correo ingresado:', email);

    btn.classList.add('loading');

    if (!email) {
        btn.classList.remove('loading');
        mostrarErrorLogin('Ingresa tu correo corporativo.');
        document.getElementById('login-email-wrapper').classList.add('shake');
        setTimeout(() => document.getElementById('login-email-wrapper').classList.remove('shake'), 600);
        return;
    }
    if (!password) {
        btn.classList.remove('loading');
        mostrarErrorLogin('Ingresa tu contrase\u00f1a.');
        document.getElementById('login-password-wrapper').classList.add('shake');
        setTimeout(() => document.getElementById('login-password-wrapper').classList.remove('shake'), 600);
        return;
    }

    try {
        const promotor = HorariosDataStore.promotores.find(p => p.email && p.email.toLowerCase() === email);

        console.log('[LOGIN] 3. Usuario encontrado:', promotor ? 'SI' : 'NO');

        if (!promotor) {
            btn.classList.remove('loading');
            mostrarErrorLogin('El correo ingresado no se encuentra registrado.');
            registrarAcceso(null, email, 'Usuario inexistente');
            document.getElementById('login-email-wrapper').classList.add('shake');
            setTimeout(() => document.getElementById('login-email-wrapper').classList.remove('shake'), 600);
            return;
        }

        const estado = promotor.estado || 'Activo';
        console.log('[LOGIN] 4. Estado:', estado, '(esperado Activo)');
        console.log('[LOGIN] 5. Password encontrado:', (promotor.password_hash || promotor.password) ? 'SI' : 'NO',
            '| password_hash:', promotor.password_hash ? 'SI' : 'NO',
            '| password (plano):', promotor.password ? 'SI' : 'NO');
        console.log('[LOGIN] 5b. Campo utilizado primero: password_hash (SI si posee valor).');

        let passwordValida = false;
        if (promotor.password_hash) {
            const passwordHash = await hashPassword(password);
            passwordValida = promotor.password_hash === passwordHash;
            console.log('[LOGIN] 5c. Comparación con password_hash -> válido:', passwordValida ? 'SI' : 'NO');
        }
        if (!passwordValida && promotor.password) {
            passwordValida = password === promotor.password;
            console.log('[LOGIN] 5d. Fallback con password (plano) -> válido:', passwordValida ? 'SI' : 'NO');
        }
        console.log('[LOGIN] 6. Password válido:', passwordValida ? 'SI' : 'NO');

        if (!passwordValida) {
            btn.classList.remove('loading');
            mostrarErrorLogin('Contrase\u00f1a incorrecta.');
            registrarAcceso(promotor, email, 'Contrase\u00f1a incorrecta');
            document.getElementById('login-password-wrapper').classList.add('shake');
            setTimeout(() => document.getElementById('login-password-wrapper').classList.remove('shake'), 600);
            return;
        }

        if (estado !== 'Activo') {
            btn.classList.remove('loading');
            mostrarErrorLogin('Su cuenta se encuentra temporalmente inhabilitada. Comun\u00edquese con su supervisor.');
            registrarAcceso(promotor, email, 'Usuario bloqueado');
            return;
        }

        if (!promotor.zona_principal_id) {
            btn.classList.remove('loading');
            mostrarErrorLogin('No tiene una tienda asignada. Comun\u00edquese con su supervisor.');
            registrarAcceso(promotor, email, 'Sin tienda asignada');
            return;
        }

        console.log('[LOGIN] 7. Inicio de carga de Dashboard...');
        const remember = document.getElementById('login-remember-check').checked;
        iniciarSesionPromotor(promotor, remember);
        registrarAcceso(promotor, email, 'Acceso correcto');

        btn.classList.remove('loading');
        cerrarModalLogin();
        abrirModalVentaConSesion();
        console.log('[LOGIN] 8. Fin de carga. Sesión iniciada para:', promotor.nombre);
    } catch (err) {
        console.error('[LOGIN][ERROR] Excepción completa en confirmarLogin:', err);
        btn.classList.remove('loading');
        mostrarErrorLogin('Error inesperado al iniciar sesión. Intenta nuevamente.');
    }
}

function mostrarErrorLogin(mensaje) {
    const errorEl = document.getElementById('login-error');
    errorEl.style.display = 'flex';
    errorEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ' + mensaje;
}

function iniciarSesionPromotor(promotor, remember) {
    promotorSession = {
        id: promotor.id,
        nombre: promotor.nombre,
        dni: promotor.dni,
        email: promotor.email,
        zona_principal_id: promotor.zona_principal_id
    };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('promotor_session', JSON.stringify(promotorSession));
}

function cerrarSesionPromotor() {
    promotorSession = null;
    localStorage.removeItem('promotor_session');
    sessionStorage.removeItem('promotor_session');
    document.getElementById('modal-venta').classList.remove('open');
    const sessionBar = document.getElementById('ventas-session-bar');
    if (sessionBar) sessionBar.remove();
    mostrarModalLogin();
    mostrarNotificacion('Sesi\u00f3n cerrada correctamente', 'success');
}

async function registrarAcceso(promotor, correo, resultado) {
    try {
        if (typeof db === 'undefined' || !db) return;
        await db.collection('historial_accesos').add({
            promotor_id: promotor ? promotor.id : null,
            nombre: promotor ? promotor.nombre : null,
            dni: promotor ? promotor.dni : null,
            correo: correo,
            fecha_hora: new Date().toISOString(),
            ip: '',
            resultado: resultado
        });
    } catch (e) {}
}

function abrirModalVenta() {
    initPromotorSession();
    if (!promotorSession) {
        mostrarModalLogin();
        return;
    }
    abrirModalVentaConSesion();
}

function abrirModalVentaConSesion() {
    const zonaId = promotorSession.zona_principal_id;
    const zona = HorariosDataStore.zonas.find(z => z.id === zonaId);

    const pdvSel = document.getElementById('modal-pdv');

    if (zona) {
        pdvSel.innerHTML = '<option value="' + escHtml(zona.nombre) + '">' + escHtml(zona.nombre) + '</option>';
        pdvSel.disabled = true;
    } else {
        pdvSel.innerHTML = '<option value="">Sin tienda asignada</option>';
        pdvSel.disabled = true;
    }

    const sessionBar = document.getElementById('ventas-session-bar');
    if (sessionBar) {
        const userDiv = sessionBar.querySelector('.ventas-session-user');
        if (userDiv) userDiv.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Bienvenido, ' + escHtml(promotorSession.nombre);
    } else {
        const header = document.querySelector('.modal-ventas .modal-header');
        if (header) {
            const bar = document.createElement('div');
            bar.id = 'ventas-session-bar';
            bar.className = 'ventas-session-bar';
            bar.innerHTML = '<div class="ventas-session-user"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>Bienvenido, ' + escHtml(promotorSession.nombre) + '</div><button class="ventas-session-logout" onclick="cerrarSesionPromotor()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Cerrar Sesi\u00f3n</button></div>';
            header.parentNode.insertBefore(bar, header.nextSibling);
        }
    }

    document.getElementById('modal-venta').classList.add('open');
    ventasModificadas = false;
    document.getElementById('ventas-unsaved-bar').classList.remove('visible');
    modoVista = 'mes';
    diaSeleccionado = new Date().getDate();
    const toggleMes = document.querySelector('[data-view="mes"]');
    const toggleDia = document.querySelector('[data-view="dia"]');
    if (toggleMes) toggleMes.classList.add('active');
    if (toggleDia) toggleDia.classList.remove('active');
    const diaSelect = document.getElementById('ventas-dia-select');
    if (diaSelect) diaSelect.style.display = 'none';
    document.getElementById('modal-venta').classList.remove('vista-dia');
    sincronizarSelectsPeriodo();
    cargarVentasCalendario();
}

/* ===== INFORME POR PROMOTOR ===== */
function poblarFiltrosInformePromotor() {
    const promotorSelect = document.getElementById('inf-promotor-select');
    const tiendaSelect = document.getElementById('inf-promotor-tienda');
    const productoSelect = document.getElementById('inf-promotor-producto');
    if (!promotorSelect) return;

    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const zonasActivas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const activos = promotores.filter(p =>
        p.estado === 'Activo' &&
        p.zona_principal_id &&
        zonasActivas.some(z => z.id === p.zona_principal_id)
    );
    promotorSelect.innerHTML = '<option value="">Seleccionar promotor...</option>' +
        activos.map(p => '<option value="' + p.id + '">' + escHtml(p.nombre) + (p.dni ? ' · ' + escHtml(p.dni) : '') + '</option>').join('');

    if (tiendaSelect) {
        const pdvs = DataStore.getPDVs();
        console.log('[AUDITORIA] poblarFiltrosInformePromotor tiendas:', pdvs.length, pdvs);
        tiendaSelect.innerHTML = '<option value="">Todas las tiendas</option>' +
            pdvs.map(p => '<option value="' + escHtml(p) + '">' + escHtml(p) + '</option>').join('');
        console.log('[AUDITORIA] inf-promotor-tienda options después de poblar:', tiendaSelect.options.length);
    }

    if (productoSelect) {
        const prods = DataStore.getProductos();
        productoSelect.innerHTML = '<option value="">Todos los productos</option>' +
            prods.map(p => '<option value="' + escHtml(p) + '">' + escHtml(p) + '</option>').join('');
    }

    sincronizarInputsFecha();
}

function fechasEfectivasInforme() {
    const filtros = DataStore.getFiltrosFecha();
    if (filtros.desde && filtros.hasta) {
        return { desde: filtros.desde, hasta: filtros.hasta };
    }
    const hoy = new Date();
    const desde = fmtAnioMesDia(hoy.getFullYear(), hoy.getMonth() + 1, 1);
    const hasta = formatearFechaLocal(hoy);
    return { desde, hasta };
}

function renderizarInformePromotor() {
    if (typeof HorariosDataStore !== 'undefined' && !HorariosDataStore.initialized) {
if (typeof initHorarios === 'function') {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
            };
        }
    }
    poblarFiltrosInformePromotor();
    renderPeriodoAnalizado('periodo-analizado-informe');
    if (infPromTab === 'promociones') {
        cambiarInfPromTab('promociones');
    } else {
        renderizarTablaPromotores();
    }
}

function renderizarTablaPromotores() {
    const content = document.getElementById('inf-promotor-content');
    if (!content) return;
    const heroKpis = document.getElementById('inf-promotor-hero-kpis');
    if (heroKpis) heroKpis.innerHTML = '';

    const fechas = fechasEfectivasInforme();
    const fechaDesde = fechas.desde;
    const fechaHasta = fechas.hasta;

    const ventas = DataStore.getVentasActivas();
    let ventasPeriodo = ventas.slice();
    if (fechaDesde) ventasPeriodo = ventasPeriodo.filter(v => new Date(v.fecha) >= new Date(fechaDesde + 'T00:00:00'));
    if (fechaHasta) ventasPeriodo = ventasPeriodo.filter(v => new Date(v.fecha) <= new Date(fechaHasta + 'T23:59:59'));

    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const zonasActivas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const activos = promotores.filter(p =>
        p.estado === 'Activo' &&
        p.zona_principal_id &&
        zonasActivas.some(z => z.id === p.zona_principal_id)
    );

    const cuotas = DataStore.getCuotasActivas();
    const productos = DataStore.getProductos();
    const fechaRef = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date();
    const mes = fechaRef.getMonth() + 1;
    const anio = fechaRef.getFullYear();

    const rows = activos.map(promotor => {
        const tienda = (typeof HorariosDataStore.zonas !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas.find(z => z.id === promotor.zona_principal_id) : null;
        const tiendaNombre = tienda ? tienda.nombre : null;

        const ventasProm = ventasPeriodo.filter(v => {
            if (v.promotor_id) return v.promotor_id === promotor.id;
            return tiendaNombre ? v.punto_venta === tiendaNombre : false;
        });

        const totalVenta = ventasProm.reduce((s, v) => s + (v.venta || 0), 0);

        let cuotaTotal = 0;
        if (tiendaNombre) {
            for (let prod of productos) {
                const cuota = cuotas.find(c => c.punto_venta === tiendaNombre && c.producto === prod && c.mes === mes && c.anio === anio);
                if (cuota) cuotaTotal += (cuota.cuota || 0);
            }
        }

        const cumplimiento = cuotaTotal > 0 ? Math.min((totalVenta / cuotaTotal) * 100, 999) : 0;

        const porProducto = {};
        ventasProm.forEach(v => {
            porProducto[v.producto] = (porProducto[v.producto] || 0) + (v.venta || 0);
        });
        const prodKeys = Object.keys(porProducto);
        let mejor = null;
        let peor = null;
        prodKeys.forEach(p => {
            if (!mejor || porProducto[p] > porProducto[mejor]) mejor = p;
            if (!peor || porProducto[p] < porProducto[peor]) peor = p;
        });

        return {
            id: promotor.id,
            nombre: promotor.nombre,
            tienda: tiendaNombre || 'Sin tienda',
            venta: totalVenta,
            cuota: cuotaTotal,
            cumplimiento: cumplimiento,
            diferencia: cuotaTotal - totalVenta,
            mejor: mejor,
            peor: peor,
            registros: ventasProm.length
        };
    });

    rows.sort((a, b) => b.venta - a.venta);

    const totalVenta = rows.reduce((s, r) => s + r.venta, 0);
    const totalCuota = rows.reduce((s, r) => s + r.cuota, 0);
    const cumplen = rows.filter(r => r.cumplimiento >= 100).length;
    const riesgo = rows.filter(r => r.cumplimiento < 80).length;

    const tbody = rows.map((r, i) => {
        const dif = r.diferencia;
        return '<tr>' +
            '<td class="ctl-td-pos">' + (i + 1) + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlDot(r.cumplimiento) + ' ' + ctlEsc(r.nombre) + '</td>' +
            '<td class="ctl-td-left">' + ctlEsc(r.tienda) + '</td>' +
            '<td>' + formatCurrency(r.venta) + '</td>' +
            '<td>' + formatCurrency(r.cuota) + '</td>' +
            '<td>' + ctlBarCell(r.cumplimiento) + '</td>' +
            '<td class="' + (dif <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (dif <= 0 ? 'S/ 0' : formatCurrency(dif)) + '</td>' +
            '<td class="ctl-td-left">' + (r.mejor ? ctlEsc(r.mejor) : '\u2014') + '</td>' +
            '<td class="ctl-td-left">' + (r.peor ? ctlEsc(r.peor) : '\u2014') + '</td>' +
            '<td>' + ctlBadge(r.cumplimiento) + '</td>' +
            '</tr>';
    }).join('');

    content.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-table-wrap"><table class="ctl-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">#</th><th class="ctl-th-left">Promotor</th><th class="ctl-th-left">Tienda</th>' +
        '<th>Venta</th><th>Meta</th><th>Cumplimiento</th><th>Diferencia</th>' +
        '<th class="ctl-th-left">Mejor Producto</th><th class="ctl-th-left">Peor Producto</th><th>Estado</th>' +
        '</tr></thead><tbody>' + tbody + '</tbody>' +
        '</table></div>' +
        '<div style="display:flex;justify-content:space-between;gap:8px;padding:8px 12px;font-size:12px;color:#727272;">' +
        '<span>' + rows.length + ' promotores · Venta total ' + formatCurrency(totalVenta) + ' · Meta total ' + formatCurrency(totalCuota) + '</span>' +
        '<span><span style="color:var(--accent)">' + cumplen + '</span> cumplen meta · <span style="color:var(--danger)">' + riesgo + '</span> en riesgo</span>' +
        '</div>' +
        '</div>';
}

/* ===== CHART REGISTRY for Informe Promotor ===== */
let infPromChartInstances = {};

function infPromDestroyChart(id) {
    if (infPromChartInstances[id]) {
        infPromChartInstances[id].destroy();
        delete infPromChartInstances[id];
    }
}

function aplicarFiltrosInformePromotor() {
    let promotorId = document.getElementById('inf-promotor-select').value;

    if (!promotorId && promotorSession && !estaSupervisorDesbloqueado()) {
        promotorId = promotorSession.id;
    }

    if (!promotorId) {
        mostrarNotificacion('Selecciona un promotor para generar el informe.', 'warning');
        return;
    }

    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const promotor = promotores.find(p => p.id === promotorId);
    if (!promotor) {
        mostrarNotificacion('Promotor no encontrado.', 'error');
        return;
    }

    const fechas = fechasEfectivasInforme();
    const fechaDesde = fechas.desde;
    const fechaHasta = fechas.hasta;
    const tiendaFiltro = document.getElementById('inf-promotor-tienda').value;
    const productFiltro = document.getElementById('inf-promotor-producto').value;

    if (infPromTab === 'promociones') {
        renderPromocionesInformePromotor(promotor, fechaDesde, fechaHasta, tiendaFiltro);
        return;
    }

    const ventas = DataStore.getVentasActivas();
    let ventasFiltradas = ventas.filter(v => {
        if (v.promotor_id && v.promotor_id !== promotorId) return false;
        if (tiendaFiltro && v.punto_venta !== tiendaFiltro) return false;
        if (productFiltro && v.producto !== productFiltro) return false;
        return true;
    });

    if (fechaDesde) {
        const fd = new Date(fechaDesde + 'T00:00:00');
        ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) >= fd);
    }
    if (fechaHasta) {
        const fh = new Date(fechaHasta + 'T23:59:59');
        ventasFiltradas = ventasFiltradas.filter(v => new Date(v.fecha) <= fh);
    }

    renderEncabezadoPromotor(promotor, ventasFiltradas, fechaDesde, fechaHasta);
    const kpis = calcularKPIsPromotor(promotor, ventasFiltradas, fechaDesde, fechaHasta);
    renderHeroKPIsPromotor(kpis);
    renderTablaProductosPromotor(promotor, ventasFiltradas, fechaDesde, fechaHasta, tiendaFiltro, productFiltro);
}

function renderEncabezadoPromotor(promotor, ventas, fechaDesde, fechaHasta) {
    const zona = promotor.zona_principal_id ? (HorariosDataStore.zonas || []).find(z => z.id === promotor.zona_principal_id) : null;
    const tiendaNombre = zona ? zona.nombre : 'Sin tienda asignada';
    const totalRegistros = ventas.length;
    const totalVenta = ventas.reduce((s, v) => s + (v.venta || 0), 0);
    const fmt = n => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

    const fd = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date();
    const fh = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date();
    const op = { day: '2-digit', month: 'long', year: 'numeric' };
    const desdeStr = fd.toLocaleDateString('es-PE', op);
    const hastaStr = fh.toLocaleDateString('es-PE', op);

    const heroKpis = document.getElementById('inf-promotor-hero-kpis');
    if (heroKpis) {
        heroKpis.innerHTML = `
            <div class="inf-promotor-hero-kpi" style="min-width:120px;text-align:left;">
                <div style="font-size:13px;font-weight:700;color:#ffffff;line-height:1.4;">${escHtml(promotor.nombre)}</div>
                <div style="font-size:11px;color:#727272;margin-top:2px;">${escHtml(promotor.email || 'Sin correo')}</div>
                <div style="font-size:11px;color:#1DB954;margin-top:1px;">${escHtml(tiendaNombre)}</div>
            </div>
            <div class="inf-promotor-hero-kpi" style="min-width:90px;">
                <span class="inf-promotor-hero-kpi-value" style="color:#3B82F6;">${totalRegistros}</span>
                <span class="inf-promotor-hero-kpi-label">Registros</span>
            </div>
            <div class="inf-promotor-hero-kpi" style="min-width:100px;">
                <span class="inf-promotor-hero-kpi-value" style="color:#1DB954;">${fmt(totalVenta)}</span>
                <span class="inf-promotor-hero-kpi-label">Venta Acumulada</span>
            </div>
            <div class="inf-promotor-hero-kpi" style="min-width:120px;">
                <span class="inf-promotor-hero-kpi-value" style="color:#727272;font-size:13px;font-weight:600;">${desdeStr} — ${hastaStr}</span>
                <span class="inf-promotor-hero-kpi-label">Periodo</span>
            </div>
        `;
    }
}

function calcularKPIsPromotor(promotor, ventas, fechaDesde, fechaHasta) {
    const totalVenta = ventas.reduce((s, v) => s + (v.venta || 0), 0);
    const productosSet = new Set(ventas.map(v => v.producto));
    const tiendasSet = new Set(ventas.map(v => v.punto_venta));
    const totalRegistros = ventas.length;

    const fechaInicio = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const mes = fechaInicio ? fechaInicio.getMonth() + 1 : new Date().getMonth() + 1;
    const anio = fechaInicio ? fechaInicio.getFullYear() : new Date().getFullYear();

    let cuotaTotal = 0;
    const productos = DataStore.getProductos();
    const cuotas = DataStore.getCuotasActivas();
    const tienda = promotor.zona_principal_id ? (HorariosDataStore.zonas || []).find(z => z.id === promotor.zona_principal_id) : null;
    const tiendaNombre = tienda ? tienda.nombre : null;

    if (tiendaNombre) {
        for (let prod of productos) {
            const cuota = cuotas.find(c => c.punto_venta === tiendaNombre && c.producto === prod && c.mes === mes && c.anio === anio);
            if (cuota) cuotaTotal += (cuota.cuota || 0);
        }
    }

    const cumplimiento = cuotaTotal > 0 ? Math.min((totalVenta / cuotaTotal) * 100, 999) : 0;

    const fechaFin = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date();
    const fechaIni = fechaInicio || new Date(fechaFin.getFullYear(), fechaFin.getMonth(), 1);
    const diffDays = Math.max(1, Math.round((fechaFin - fechaIni) / (1000 * 60 * 60 * 24)) + 1);
    const promedioDiario = diffDays > 0 ? totalVenta / diffDays : 0;
    const ticketPromedio = totalRegistros > 0 ? totalVenta / totalRegistros : 0;

    return { totalVenta, productosVendidos: productosSet.size, tiendasAtendidas: tiendasSet.size, cuotaTotal, cumplimiento, tiendaNombre, promedioDiario, ticketPromedio, totalRegistros, diffDays };
}

function renderHeroKPIsPromotor(kpis) {
    const container = document.getElementById('inf-promotor-hero-kpis');
    if (!container || container.querySelector('.inf-promotor-hero-kpi[style*="text-align:left"]')) return;

    const fmt = n => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const pct = n => Number(n).toFixed(1) + '%';

    container.innerHTML = `
        <div class="inf-promotor-hero-kpi" style="min-width:90px;">
            <span class="inf-promotor-hero-kpi-value" style="color:#1DB954;">${fmt(kpis.totalVenta)}</span>
            <span class="inf-promotor-hero-kpi-label">Venta Total</span>
        </div>
        <div class="inf-promotor-hero-kpi" style="min-width:90px;">
            <span class="inf-promotor-hero-kpi-value" style="color:#3B82F6;">${kpis.productosVendidos}</span>
            <span class="inf-promotor-hero-kpi-label">Productos</span>
        </div>
        <div class="inf-promotor-hero-kpi" style="min-width:90px;">
            <span class="inf-promotor-hero-kpi-value" style="color:#A855F7;">${fmt(kpis.promedioDiario)}</span>
            <span class="inf-promotor-hero-kpi-label">Prom. Diario</span>
        </div>
        <div class="inf-promotor-hero-kpi" style="min-width:100px;">
            <span class="inf-promotor-hero-kpi-value" style="color:#F59E0B;">${fmt(kpis.ticketPromedio)}</span>
            <span class="inf-promotor-hero-kpi-label">Ticket Prom.</span>
        </div>
        <div class="inf-promotor-hero-kpi" style="min-width:80px;">
            <span class="inf-promotor-hero-kpi-value" style="color:${kpis.cumplimiento >= 100 ? '#1DB954' : kpis.cumplimiento >= 80 ? '#F59E0B' : '#EF4444'};">${pct(kpis.cumplimiento)}</span>
            <span class="inf-promotor-hero-kpi-label">Cumplimiento</span>
        </div>
        <div class="inf-promotor-hero-kpi" style="min-width:80px;">
            <span class="inf-promotor-hero-kpi-value" style="color:#727272;">${kpis.diffDays}d</span>
            <span class="inf-promotor-hero-kpi-label">D&iacute;as</span>
        </div>
    `;
}

function renderTablaProductosPromotor(promotor, ventas, fechaDesde, fechaHasta, tiendaFiltro, productFiltro) {
    const container = document.getElementById('inf-promotor-content');
    if (!container) return;

    const productos = DataStore.getProductos();
    const cuotas = DataStore.getCuotasActivas();
    const fechaInicio = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const mes = fechaInicio ? fechaInicio.getMonth() + 1 : new Date().getMonth() + 1;
    const anio = fechaInicio ? fechaInicio.getFullYear() : new Date().getFullYear();
    const tienda = promotor.zona_principal_id ? (HorariosDataStore.zonas || []).find(z => z.id === promotor.zona_principal_id) : null;
    const tiendaNombre = tienda ? tienda.nombre : null;

    const rows = productos.map(prod => {
        if (productFiltro && prod !== productFiltro) return null;
        const ventaProd = ventas.filter(v => v.producto === prod).reduce((s, v) => s + (v.venta || 0), 0);
        const cuota = cuotas.find(c => c.punto_venta === tiendaNombre && c.producto === prod && c.mes === mes && c.anio === anio);
        const cuo = cuota ? cuota.cuota : 0;
        const cumpl = cuo > 0 ? (ventaProd / cuo) * 100 : 0;
        const dif = ventaProd - cuo;
        const estado = ventaProd === 0 ? 'riesgo' : cumpl >= 100 ? 'cumple' : cumpl >= 80 ? 'alerta' : 'riesgo';
        return { producto: prod, venta: ventaProd, cuota: cuo, cumplimiento: cumpl, diferencia: dif, estado };
    }).filter(Boolean);

    rows.sort((a, b) => b.venta - a.venta);

    const totalVenta = rows.reduce((s, r) => s + r.venta, 0);
    const totalCuota = rows.reduce((s, r) => s + r.cuota, 0);
    const dias = ventas.length > 0 ? new Set(ventas.map(v => v.fecha ? new Date(v.fecha).getDate() : null)).size : 0;

    const prodVendidos = rows.filter(r => r.venta > 0).length;
    const prodNoVendidos = rows.filter(r => r.venta === 0).length;

    if (rows.length === 0) {
        container.innerHTML = `
            <div class="inf-promotor-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <p>No se encontraron ventas para los filtros seleccionados.</p>
            </div>
        `;
        return;
    }

    const top = rows[0];
    const bottom = rows[rows.length - 1];
    const topPct = totalVenta > 0 ? ((top.venta / totalVenta) * 100).toFixed(1) : 0;
    const bottomPct = totalVenta > 0 ? ((bottom.venta / totalVenta) * 100).toFixed(1) : 0;

    const concentrados = [];
    let acum = 0;
    for (const r of rows) {
        const pct = totalVenta > 0 ? (r.venta / totalVenta) * 100 : 0;
        r.participacion = pct;
        acum += pct;
        if (acum <= 80 || concentrados.length < 2) concentrados.push(r.producto);
    }
    const concentradosStr = concentrados.slice(0, 3).join(', ');
    const ultimos = rows.filter(r => r.participacion < 5).map(r => r.producto);
    const resumenParts = [];
    if (concentrados.length >= 2) {
        resumenParts.push('El ' + acum.toFixed(0) + '% de las ventas se concentra en ' + concentradosStr + '.');
    }
    if (ultimos.length > 0) {
        const ultimosStr = ultimos.join(', ');
        resumenParts.push(ultimosStr + ' representan menos del 5% de participaci\u00f3n y requieren refuerzo comercial.');
    }
    if (totalVenta === 0) {
        resumenParts.push('No se registraron ventas en el per\u00edodo seleccionado.');
    }
    const resumenEjecutivo = resumenParts.join(' ');

    const prodVendidosPct = productos.length > 0 ? (prodVendidos / productos.length * 100).toFixed(0) : 0;

    const fechaIni = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date();
    const fechaFn = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date();
    const diffTime = Math.abs(fechaFn - fechaIni);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const trendMap = {};
    for (let d = 1; d <= diffDays; d++) {
        const date = new Date(fechaIni);
        date.setDate(date.getDate() + d - 1);
        const key = date.getDate() + '/' + (date.getMonth() + 1);
        trendMap[key] = 0;
    }
    ventas.forEach(v => {
        if (!v.fecha) return;
        const f = new Date(v.fecha);
        const key = f.getDate() + '/' + (f.getMonth() + 1);
        if (trendMap[key] !== undefined) trendMap[key] += (v.venta || 0);
    });
    const trendLabels = Object.keys(trendMap);
    const trendValues = Object.values(trendMap);

    const fmt = n => 'S/ ' + Number(n).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    const pct = n => Number(n).toFixed(1) + '%';
    const escHtml = str => String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

    const barColors = ['#1DB954','#3B82F6','#A855F7','#F59E0B','#EC4899','#14B8A6','#8B5CF6','#F97316'];

    const rankingBars = rows.map((r, i) => {
        const pctWidth = totalVenta > 0 ? (r.venta / totalVenta) * 100 : 0;
        const color = barColors[i % barColors.length];
        const estadoBadge = r.venta === 0 ? 'oportunidad' : r.cumplimiento >= 100 ? 'excelente' : r.cumplimiento >= 80 ? 'normal' : 'bajo';
        const badgeLabel = r.venta === 0 ? 'Oportunidad' : r.cumplimiento >= 100 ? 'Excelente' : r.cumplimiento >= 80 ? 'Normal' : 'Bajo';
        const badgeColor = estadoBadge === 'excelente' ? '#1DB954' : estadoBadge === 'normal' ? '#F59E0B' : '#EF4444';
        return '<div class="inf-promotor-ranking-row">' +
            '<div class="inf-promotor-ranking-pos">' + (i + 1) + '</div>' +
            '<div class="inf-promotor-ranking-info">' +
                '<div class="inf-promotor-ranking-name">' + escHtml(r.producto) + '</div>' +
                '<div class="inf-promotor-ranking-bar-track">' +
                    '<div class="inf-promotor-ranking-bar-fill" style="width:' + pctWidth + '%;background:' + color + ';"></div>' +
                '</div>' +
            '</div>' +
            '<div class="inf-promotor-ranking-data">' +
                '<div class="inf-promotor-ranking-amount">' + (r.venta > 0 ? fmt(r.venta) : '<span style="color:#727272;">\u2014</span>') + '</div>' +
                '<div class="inf-promotor-ranking-pct">' + pct(r.participacion) + '</div>' +
            '</div>' +
            '<div class="inf-promotor-ranking-badge" style="color:' + badgeColor + ';">' + badgeLabel + '</div>' +
        '</div>';
    }).join('');

    const tableHtml = rows.map((r, i) => {
        const estadoBadge = r.venta === 0 ? 'oportunidad' : r.cumplimiento >= 100 ? 'excelente' : r.cumplimiento >= 80 ? 'normal' : 'bajo';
        const badgeLabel = r.venta === 0 ? 'Oportunidad' : r.cumplimiento >= 100 ? 'Excelente' : r.cumplimiento >= 80 ? 'Normal' : 'Bajo';
        return '<tr>' +
            '<td>' + (i + 1) + '</td>' +
            '<td>' + escHtml(r.producto) + '</td>' +
            '<td style="color:' + (r.venta > 0 ? '#ffffff' : '#EF4444') + ';">' + (r.venta > 0 ? fmt(r.venta) : '\u2014') + '</td>' +
            '<td>' + pct(r.participacion) + '</td>' +
            '<td><span class="inf-promotor-badge-' + estadoBadge + '">' + badgeLabel + '</span></td>' +
        '</tr>';
    }).join('');

    container.innerHTML = '' +
        '<div class="inf-promotor-summary-cards">' +
            '<div class="inf-promotor-summary-card">' +
                '<div class="inf-promotor-summary-card-icon green"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>' +
                '<div><div class="inf-promotor-summary-card-value">' + fmt(totalVenta) + '</div><div class="inf-promotor-summary-card-label">Venta total del per\u00edodo</div></div>' +
            '</div>' +
            '<div class="inf-promotor-summary-card">' +
                '<div class="inf-promotor-summary-card-icon blue"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg></div>' +
                '<div><div class="inf-promotor-summary-card-value">' + prodVendidos + ' / ' + productos.length + '</div><div class="inf-promotor-summary-card-label">Productos con venta (' + prodVendidosPct + '%)</div></div>' +
            '</div>' +
            '<div class="inf-promotor-summary-card">' +
                '<div class="inf-promotor-summary-card-icon ' + (prodNoVendidos > 0 ? 'red' : 'green') + '"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>' +
                '<div><div class="inf-promotor-summary-card-value" style="color:' + (prodNoVendidos > 0 ? '#EF4444' : '#1DB954') + ';">' + prodNoVendidos + '</div><div class="inf-promotor-summary-card-label">Productos sin venta</div></div>' +
            '</div>' +
            '<div class="inf-promotor-summary-card">' +
                '<div class="inf-promotor-summary-card-icon purple"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg></div>' +
                '<div><div class="inf-promotor-summary-card-value">' + dias + '</div><div class="inf-promotor-summary-card-label">D\u00edas con registro</div></div>' +
            '</div>' +
        '</div>' +

        '<div class="inf-promotor-topbottom-grid">' +
            '<div class="inf-promotor-topbottom-card">' +
                '<div class="inf-promotor-topbottom-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></div>' +
                '<div class="inf-promotor-topbottom-label">Producto L\u00edder</div>' +
                '<div class="inf-promotor-topbottom-name">' + escHtml(top.producto) + '</div>' +
                '<div class="inf-promotor-topbottom-value">' + fmt(top.venta) + '</div>' +
                '<div class="inf-promotor-topbottom-pct">' + topPct + '% de participaci\u00f3n</div>' +
            '</div>' +
            '<div class="inf-promotor-topbottom-card">' +
                '<div class="inf-promotor-topbottom-icon"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round"><path d="M6 15l6-6 6 6"/></svg></div>' +
                '<div class="inf-promotor-topbottom-label">Producto con Menor Venta</div>' +
                '<div class="inf-promotor-topbottom-name">' + escHtml(bottom.producto) + '</div>' +
                '<div class="inf-promotor-topbottom-value">' + (bottom.venta > 0 ? fmt(bottom.venta) : 'Sin ventas') + '</div>' +
                '<div class="inf-promotor-topbottom-pct">' + bottomPct + '% de participaci\u00f3n</div>' +
            '</div>' +
        '</div>' +

        '<div class="inf-promotor-charts-grid">' +
            '<div class="inf-promotor-chart-card inf-promotor-chart-card-wide">' +
                '<div class="inf-promotor-chart-header"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg> Ranking de Productos por Venta</div>' +
                '<div class="inf-promotor-chart-body"><div class="inf-promotor-ranking-list">' + rankingBars + '</div></div>' +
            '</div>' +
            '<div class="inf-promotor-chart-card">' +
                '<div class="inf-promotor-chart-header"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> Tendencia de Ventas</div>' +
                '<div class="inf-promotor-chart-body"><canvas id="infPromChartTrend"></canvas></div>' +
            '</div>' +
        '</div>' +

        '<div class="inf-promotor-insight"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> ' + resumenEjecutivo + '</div>' +

        '<div class="inf-promotor-table-container" style="margin-top:20px;">' +
            '<table class="inf-promotor-table">' +
                '<thead><tr><th>#</th><th>Producto</th><th>Venta</th><th>Participaci\u00f3n</th><th>Estado</th></tr></thead>' +
                '<tbody>' + tableHtml + '</tbody>' +
            '</table>' +
        '</div>';

    if (typeof renderInfPromCharts === 'function') {
        renderInfPromCharts(trendLabels, trendValues);
    }
}

function renderInfPromCharts(trendLabels, trendValues) {
    infPromDestroyChart('infPromChartTrend');

    const canvasTrend = document.getElementById('infPromChartTrend');
    if (canvasTrend && trendLabels.length > 0) {
        infPromChartInstances['infPromChartTrend'] = new Chart(canvasTrend, {
            type: 'bar',
            data: {
                labels: trendLabels,
                datasets: [{
                    label: 'Venta del d\u00eda',
                    data: trendValues,
                    backgroundColor: trendValues.map(v => v > 0 ? 'rgba(29,185,84,0.7)' : 'rgba(239,68,68,0.4)'),
                    borderColor: trendValues.map(v => v > 0 ? '#1DB954' : '#EF4444'),
                    borderWidth: 1,
                    borderRadius: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        ticks: { color: '#727272', font: { size: 9 }, maxRotation: 45 },
                        grid: { color: 'rgba(255,255,255,0.03)' }
                    },
                    y: {
                        ticks: { color: '#727272', font: { size: 9 } },
                        grid: { color: 'rgba(255,255,255,0.05)' }
                    }
                }
            }
        });
    }
}

function renderAvisoOficial() {
    return;
}

function iniciarSidebarColapsable() {
    var btn = document.getElementById('sb-collapse-btn');
    if (!btn) return;

    var KEY = 'dashboard_sb_modo';
    var CABEZA = {
        auto: 'Fijar menú abierto',
        open: 'Fijar menú cerrado',
        closed: 'Menú automático (colapsa/expande al pasar el mouse)'
    };
    var indice = 0;
    var orden = ['auto', 'open', 'closed'];

    function aplicar(modo) {
        document.body.setAttribute('data-sb', modo);
        btn.title = CABEZA[modo] || CABEZA.auto;
        btn.setAttribute('aria-label', btn.title);
        try { localStorage.setItem(KEY, modo); } catch (e) { /* sin almacenamiento */ }
    }

    var inicial = 'auto';
    try { var guardado = localStorage.getItem(KEY); if (guardado === 'open' || guardado === 'closed' || guardado === 'auto') inicial = guardado; } catch (e) { /* sin almacenamiento */ }
    indice = orden.indexOf(inicial);
    if (indice === -1) indice = 0;
    aplicar(inicial);

    btn.addEventListener('click', function () {
        indice = (indice + 1) % orden.length;
        aplicar(orden[indice]);
    });

    document.querySelectorAll('.nav-item[data-page], .nav-item[data-action]').forEach(function (item) {
        var lab = item.querySelector('.nav-label');
        if (lab && !item.getAttribute('title')) {
            item.setAttribute('title', lab.textContent.trim());
        }
    });

    document.querySelectorAll('.nav-section-divider').forEach(function (d) {
        var tx = d.textContent.trim();
        if (tx && !d.getAttribute('title')) d.setAttribute('title', tx);
    });
}

document.addEventListener('DOMContentLoaded', function () {
    initPromotorSession();
    configurarVistaAutenticacion();
    iniciarSidebarColapsable();

    document.getElementById('mobile-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-backdrop').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('open');
    });

    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            this.style.setProperty('--ripple-x', x + '%');
            this.style.setProperty('--ripple-y', y + '%');
            cambiarPagina(this.dataset.page);
        });
    });

    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        function togglePdvClass() {
            pdvSelect.closest('.pdv-selector-wrapper').classList.toggle('has-value', pdvSelect.value !== '');
        }
        pdvSelect.addEventListener('change', function () {
            renderizarAvancePDV(this.value);
            togglePdvClass();
        });
        pdvSelect.addEventListener('focus', function () {
            this.closest('.pdv-selector-wrapper').classList.add('focused');
        });
        pdvSelect.addEventListener('blur', function () {
            this.closest('.pdv-selector-wrapper').classList.remove('focused');
        });
        togglePdvClass();
    }

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);

    recargarDashboard();
    aplicarSesionInicial();
});

/* ===== AUTENTICACIÓN ÚNICA ===== */

function escHtmlGlobal(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function configurarVistaAutenticacion() {
    const session = leerSesion();
    if (session && session.rol) {
        document.body.classList.add('rol-' + session.rol);
    }
}

function leerSesion() {
    try {
        const raw = sessionStorage.getItem('auth_session');
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

function guardarSesion(data) {
    try {
        sessionStorage.setItem('auth_session', JSON.stringify(data));
    } catch (e) {
        console.error('[LOGIN][ERROR] No se pudo registrar el historial de acceso:', e);
    }
}

function mostrarFormularioLogin(step) {
    const roles = document.getElementById('login-step-roles');
    const promo = document.getElementById('login-step-promotor');
    const sup = document.getElementById('login-step-supervisor');
    [[roles, step === 'roles'], [promo, step === 'promotor'], [sup, step === 'supervisor']].forEach(([el, on]) => {
        if (!el) return;
        if (on) {
            el.style.display = 'block';
            requestAnimationFrame(() => {
                el.classList.add('login-step-enter');
                setTimeout(() => el.classList.remove('login-step-enter'), 500);
            });
        } else {
            el.style.display = 'none';
        }
    });
    limpiarErrorLogin();
    if (step === 'promotor') {
        setTimeout(() => {
            const inp = document.getElementById('login-promotor-email');
            if (inp) inp.focus();
        }, 140);
    } else if (step === 'supervisor') {
        setTimeout(() => {
            const inp = document.getElementById('login-supervisor-password');
            if (inp) inp.focus();
        }, 140);
    }
}

function toggleLoginField(inputId, toggleId) {
    const input = document.getElementById(inputId);
    const btn = document.getElementById(toggleId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
    } else {
        input.type = 'password';
        if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    }
}

function limpiarErrorLogin() {
    const errs = document.querySelectorAll('.login-error-text');
    errs.forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
}

function setErrorLogin(selector, mensaje) {
    const el = document.getElementById(selector);
    if (!el) return;
    el.textContent = mensaje;
    el.style.display = 'block';
}

async function ingresarPromotor() {
    const email = document.getElementById('login-promotor-email').value.trim().toLowerCase();
    const password = document.getElementById('login-promotor-password').value;
    const btn = document.getElementById('login-promotor-btn');

    console.log('[LOGIN] 1. Inicio de login (pantalla Promotor).');
    console.log('[LOGIN] 2. Correo ingresado:', email);

    if (!email) { setErrorLogin('login-promotor-error', 'Ingresa tu correo electrónico.'); return; }
    if (!password) { setErrorLogin('login-promotor-error', 'Ingresa tu contraseña.'); return; }

    btn.classList.add('loading');

    try {
        if (typeof HorariosDataStore !== 'undefined' && !HorariosDataStore.initialized && typeof initHorarios === 'function') {
            console.log('[LOGIN] Inicializando HorariosDataStore antes de loguear...');
            initHorarios('supervisor');
            await new Promise(resolve => {
                const check = () => {
                    if (HorariosDataStore.initialized) resolve();
                    else setTimeout(check, 150);
                };
                check();
            });
            console.log('[LOGIN] HorariosDataStore inicializado.');
        }

        const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
        const promotor = promotores.find(p => p.email && p.email.toLowerCase() === email);

        console.log('[AUDITORIA][LOGIN] Login Promotor lee de la MISMA fuente que Gestión de Promotores: ' +
            ((typeof HorariosDataStore !== 'undefined' && HorariosDataStore._fuentePromotores) ? HorariosDataStore._fuentePromotores : 'HorariosDataStore.promotores'));
        console.log('[AUDITORIA][LOGIN] Promotores disponibles para login:', promotores.length,
            '| IDs:', promotores.map(p => p.id),
            '| Correos:', promotores.map(p => p.email || '').filter(Boolean));
        console.log('[LOGIN] 3. Usuario encontrado:', promotor ? 'SI' : 'NO');

        if (!promotor) {
            btn.classList.remove('loading');
            setErrorLogin('login-promotor-error', 'El correo ingresado no se encuentra registrado.');
            return;
        }

        const estado = promotor.estado || 'Activo';
        console.log('[LOGIN] 4. Estado:', estado, '(esperado Activo)');
        console.log('[LOGIN] 5. Password encontrado:', (promotor.password_hash || promotor.password) ? 'SI' : 'NO',
            '| password_hash:', promotor.password_hash ? 'SI' : 'NO',
            '| password (plano):', promotor.password ? 'SI' : 'NO');
        console.log('[LOGIN] 5b. Campo utilizado primero: password_hash (SI si posee valor).');

        let passwordValida = false;
        if (promotor.password_hash) {
            const passwordHash = await hashPassword(password);
            passwordValida = promotor.password_hash === passwordHash;
            console.log('[LOGIN] 5c. Comparación con password_hash -> válido:', passwordValida ? 'SI' : 'NO');
        }
        if (!passwordValida && promotor.password) {
            passwordValida = password === promotor.password;
            console.log('[LOGIN] 5d. Fallback con password (plano) -> válido:', passwordValida ? 'SI' : 'NO');
        }
        console.log('[LOGIN] 6. Password válido:', passwordValida ? 'SI' : 'NO');

        if (!passwordValida) {
            btn.classList.remove('loading');
            setErrorLogin('login-promotor-error', 'Contraseña incorrecta.');
            return;
        }

        if (estado !== 'Activo') {
            btn.classList.remove('loading');
            setErrorLogin('login-promotor-error', 'Su cuenta se encuentra temporalmente inhabilitada. Comuníquese con su supervisor.');
            return;
        }

        if (!promotor.zona_principal_id) {
            btn.classList.remove('loading');
            setErrorLogin('login-promotor-error', 'No tiene una tienda asignada. Comuníquese con su supervisor.');
            return;
        }

        console.log('[LOGIN] 7. Inicio de carga de Dashboard...');
        finishLogin({ rol: 'promotor', id: promotor.id, nombre: promotor.nombre, email: promotor.email });
        console.log('[LOGIN] 8. Fin de carga. Dashboard abierto para:', promotor.nombre);
    } catch (err) {
        console.error('[LOGIN][ERROR] Excepción completa en ingresarPromotor:', err);
        btn.classList.remove('loading');
        setErrorLogin('login-promotor-error', 'Error inesperado al iniciar sesión. Intenta nuevamente.');
    }
}

function ingresarSupervisor() {
    const password = document.getElementById('login-supervisor-password').value;
    const btn = document.getElementById('login-supervisor-submit');

    if (!password) { setErrorLogin('login-supervisor-error', 'Ingresa la contraseña de supervisor.'); return; }

    btn.classList.add('loading');

    setTimeout(() => {
        if (password === SUPERVISOR_PASSWORD) {
            btn.classList.remove('loading');
            finishSupervisorLogin();
        } else {
            btn.classList.remove('loading');
            setErrorLogin('login-supervisor-error', 'Contraseña de supervisor incorrecta.');
        }
    }, 500);
}

function finishLogin(data) {
    guardarSesion(data);
    aplicarSesionInicial();
}

function finishSupervisorLogin() {
    sessionStorage.setItem('supervisor_unlocked', 'true');
    guardarSesion({ rol: 'supervisor', nombre: 'Supervisor Activo' });
    aplicarSesionInicial();
}

function aplicarSesionInicial() {
    const screen = document.getElementById('login-screen');
    const session = leerSesion();

    if (!session || !session.rol) {
        if (screen) screen.classList.add('activo');
        return;
    }

    if (screen) screen.classList.remove('activo');

    if (session.rol === 'supervisor') {
        sessionStorage.setItem('supervisor_unlocked', 'true');
        document.body.classList.remove('rol-promotor');
        document.body.classList.add('rol-supervisor');
        actualizarSidebarSupervisor();
        mostrarCerrarSesion();
        renderSupervisorHeader();
        cambiarPagina('vista-ejecutiva');
    } else if (session.rol === 'promotor') {
        const p = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores.find(x => x.id === session.id) : null;
        document.body.classList.remove('rol-supervisor');
        document.body.classList.add('rol-promotor');
        if (p) {
            promotorSession = p;
        } else {
            promotorSession = {
                id: session.id,
                nombre: session.nombre,
                email: session.email
            };
        }
        renderPromotorHeader(session);
        mostrarCerrarSesion();
        cambiarPagina('avance');
    }
}

function renderSupervisorHeader() {
    const title = document.getElementById('page-title');
    const welcome = document.getElementById('top-bar-welcome');
    if (welcome) {
        welcome.innerHTML = '👨‍💼 Supervisor Activo';
        welcome.style.display = '';
    }
    if (title && title.textContent === 'Bienvenido:') title.textContent = 'Vista Ejecutiva';
}

function renderPromotorHeader(session) {
    const welcome = document.getElementById('top-bar-welcome');
    if (welcome) {
        welcome.innerHTML = '👤 Bienvenido: ' + escHtmlGlobal(session.nombre || 'Promotor');
        welcome.style.display = '';
    }
    const title = document.getElementById('page-title');
    if (title && title.textContent === 'Bienvenido:') title.textContent = '';
}

function cerrarSesionGlobal() {
    sessionStorage.removeItem('auth_session');
    sessionStorage.removeItem('auth_session_secreto');
    sessionStorage.removeItem('auth_session_secreto_tmp');
    sessionStorage.removeItem('supervisor_unlocked');
    localStorage.removeItem('promotor_session');
    sessionStorage.removeItem('promotor_session');
    promotorSession = null;
    document.body.classList.remove('rol-promotor', 'rol-supervisor');
    const welcome = document.getElementById('top-bar-welcome');
    if (welcome) welcome.style.display = 'none';
    const screen = document.getElementById('login-screen');
    if (screen) screen.classList.add('activo');
    mostrarFormularioLogin('roles');
    limpiarCamposLogin();
    mostrarNotificacion('Sesión cerrada correctamente', 'success');
}

function limpiarCamposLogin() {
    const email = document.getElementById('login-promotor-email');
    const pw = document.getElementById('login-promotor-password');
    const sup = document.getElementById('login-supervisor-password');
    if (email) email.value = '';
    if (pw) pw.value = '';
    if (sup) sup.value = '';
    const suBtn = document.querySelector('.sidebar .btn-sidebar-logout');
    if (suBtn) suBtn.remove();
}

function mostrarCerrarSesion() {
    const footer = document.querySelector('.sidebar-footer');
    if (!footer || footer.querySelector('.btn-sidebar-logout')) return;
    const btn = document.createElement('button');
    btn.className = 'btn-sidebar btn-sidebar-secondary btn-sidebar-logout';
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar Sesión';
    btn.onclick = cerrarSesionGlobal;
    footer.appendChild(btn);
}

function cambiarPaginaConSesion(pagina) {
    if (!leerSesion()) {
        const screen = document.getElementById('login-screen');
        if (screen) screen.classList.add('activo');
        return;
    }
    cambiarPagina(pagina);
}
