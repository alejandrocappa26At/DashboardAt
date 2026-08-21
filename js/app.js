/* ===== MÓDULO DE PROMOCIONES ===== */
let filtroTipoInformacion = 'productos';
let infPromTab = 'ventas';
let gestionPromocionesEditando = null;
let filtroPromo = '';

/* ===== VISTA PROMOTOR: Mi Tienda / Mi Zona ===== */
let avanceVista = 'tienda';
let acuVista = 'tienda';

/* ===== VISTA ZONAL (SUPERVISOR / JEFE COMERCIAL) ===== */
let avanceZonalVista = 'tienda';

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
    else if (id === 'page-informe-individual') renderizarInformeIndividual();
    else if (id === 'page-acumulado-diario') renderizarAcumuladoDiario();
    else if (id === 'page-vista-ejecutiva') renderizarVistaEjecutiva();
    else if (id === 'page-corte-comercial') renderizarCorteComercial();
    else if (id === 'page-jefe-dashboard') renderJefeDashboard();
    else if (id === 'page-jefe-ranking') renderJefeRanking();
    else if (id === 'page-jefe-supervisores') renderJefeSupervisores();
    else if (id === 'page-jefe-zonas') renderJefeZonas();
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
    let ranking = PromocionesStore.getRankingTiendas(p.desde, p.hasta);
    const zonaPDVs = _pdvsZonaPromotor();
    if (zonaPDVs) {
        ranking = ranking
            .filter(r => zonaPDVs.indexOf(r.tienda) !== -1)
            .map((item, i) => ({ ...item, puesto: i + 1 }));
    }
    const total = ranking.reduce((s, r) => s + (r.cantidad || 0), 0);
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

    let promosDistintas = PromocionesStore.getRankingPromociones(p.desde, p.hasta).length;
    if (zonaPDVs) {
        promosDistintas = new Set(
            PromocionesStore.getRegistrosEnRango(p.desde, p.hasta)
                .filter(r => zonaPDVs.indexOf(r.tienda) !== -1)
                .map(r => r.promocion)
        ).size;
    }
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
    const pdvs = DataStore.getPDVs ? DataStore.getPDVs() : [];
    const tiendaPromotor = _tiendaPromotorSesion();
    const restringidos = _pdvsPermitidosPromotor();
    if (restringidos) {
        pdvSeleccionado = restringidos[0];
    } else if (!pdvSeleccionado) {
        if (tiendaPromotor && pdvs.indexOf(tiendaPromotor) !== -1) {
            pdvSeleccionado = tiendaPromotor;
        } else {
            pdvSeleccionado = select.value || 'todos';
        }
    }
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
                '<div style="font-size:13px;font-weight:700;color:var(--t-text);line-height:1.4;">' + escHtml(promotor.nombre) + '</div>' +
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

/* ===== PANEL EXPANDIBLE: REGISTRO DE VENTAS ===== */
function navegarRegistrarVentas() {
    initPromotorSession();
    if (!estaSupervisorDesbloqueado() && !promotorSession) {
        mostrarModalLogin();
        return;
    }
    cambiarPagina('avance');
    abrirPanelVentas();
}

function abrirPanelVentas() {
    initPromotorSession();
    if (!estaSupervisorDesbloqueado() && !promotorSession) {
        mostrarModalLogin();
        return;
    }
    if (document.getElementById('page-avance')) {
        document.getElementById('page-avance').classList.add('active');
        document.getElementById('page-title').textContent = 'Avance por Punto de Venta';
    }
    const promoPanel = document.getElementById('avance-panel-promociones');
    if (promoPanel) promoPanel.style.display = 'none';
    const panel = document.getElementById('avance-panel-ventas');
    if (!panel) return;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    abrirPanelVentasConSesion();
}

function cerrarPanelVentas() {
    const panel = document.getElementById('avance-panel-ventas');
    if (panel) panel.style.display = 'none';
}

function cerrarPanelPromociones() {
    const panel = document.getElementById('avance-panel-promociones');
    if (panel) panel.style.display = 'none';
}

/* ===== PANEL EXPANDIBLE: REGISTRO DE PROMOCIONES ===== */
function navegarRegistrarPromociones() {
    initPromotorSession();
    if (!estaSupervisorDesbloqueado() && !promotorSession) {
        mostrarModalLogin();
        return;
    }
    cambiarPagina('avance');
    abrirPanelPromociones();
}

function abrirPanelPromociones() {
    initPromotorSession();
    if (!estaSupervisorDesbloqueado() && !promotorSession) {
        mostrarModalLogin();
        return;
    }
    if (typeof PromocionesStore === 'undefined' || !PromocionesStore._firestoreLoaded) {
        mostrarNotificacion('Las promociones a\u00fan se est\u00e1n cargando. Intenta en unos segundos.', 'warning');
        return;
    }
    if (document.getElementById('page-avance')) {
        document.getElementById('page-avance').classList.add('active');
        document.getElementById('page-title').textContent = 'Avance por Punto de Venta';
    }
    const ventasPanel = document.getElementById('avance-panel-ventas');
    if (ventasPanel) ventasPanel.style.display = 'none';
    const panel = document.getElementById('avance-panel-promociones');
    if (!panel) return;
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    abrirPanelPromocionesConSesion();
}

function abrirPanelPromocionesConSesion() {
    const supervisor = estaSupervisorDesbloqueado();
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const activos = promotores.filter(p => p.estado === 'Activo' && p.zona_principal_id && zonas.some(z => z.id === p.zona_principal_id));

    const tiendaSel = document.getElementById('promo-tienda');
    const promotorSel = document.getElementById('promo-promotor');
    const fechaInput = document.getElementById('promo-fecha');
    const sessionBar = document.getElementById('promo-session-bar');

    if (!supervisor && promotorSession) {
        const tiendaNombre = _tiendaPromotorSesion();
        tiendaSel.innerHTML = '<option value="">Seleccionar tienda...</option>' +
            (tiendaNombre ? '<option value="' + escHtml(tiendaNombre) + '">' + escHtml(tiendaNombre) + '</option>' : '');
        if (tiendaNombre) tiendaSel.value = tiendaNombre;
        tiendaSel.disabled = true;
        const promo = activos.find(p => p.id === promotorSession.id);
        promotorSel.innerHTML = '<option value="' + escHtml(promotorSession.id) + '">' + escHtml(promo ? promo.nombre : promotorSession.nombre) + '</option>';
        promotorSel.disabled = true;
        if (sessionBar) {
            sessionBar.style.display = 'flex';
            sessionBar.innerHTML = '<div class="promo-session-user">\ud83d\udc64 ' + escHtml(promotorSession.nombre) + '</div>' +
                '<button type="button" class="promo-session-logout" onclick="cerrarSesionPromotor()">Cerrar sesi\u00f3n</button>';
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
                    '<button type="button" class="promo-session-logout" onclick="cerrarSesionPromotor()">Cerrar sesi\u00f3n</button>';
            } else {
                sessionBar.style.display = 'none';
                sessionBar.innerHTML = '';
            }
        }
    }

    logValidacionPromotor();

    fechaInput.value = formatearFechaLocal(new Date());
    cargarPromocionesTabla();
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
    cerrarPanelPromociones();
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

function _tiendaPromotorSesion() {
    if (estaSupervisorDesbloqueado()) return null;
    _rehidratarSesionPromotor();
    if (!promotorSession) return null;
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];

    const id = promotorSession.zona_principal_id;
    if (id) {
        const zona = zonas.find(z => z.id === id);
        if (zona) return zona.nombre;
        return id;
    }

    // Fallback defensivo: resolver la tienda a partir del promotor por id/correo
    // en caso de que la sesión se haya creado sin tienda (carrera de carga).
    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const p = (promotorSession.id && promotores.find(x => x.id === promotorSession.id))
        || (promotorSession.email && promotores.find(x => x.email && String(x.email).trim().toLowerCase() === String(promotorSession.email).trim().toLowerCase()))
        || null;
    const zonaNueva = (p && (p.zona_principal_id || p.tienda_asignada || p.tienda)) || null;
    if (zonaNueva) {
        promotorSession.zona_principal_id = zonaNueva;
        try { localStorage.setItem('promotor_session', JSON.stringify(promotorSession)); } catch (e) {}
    }
    const zona = zonas.find(z => z.id === zonaNueva);
    return (zona && zona.nombre) || zonaNueva || null;
}

function _esPromotorRestringido() {
    if (estaSupervisorDesbloqueado()) return false;
    _rehidratarSesionPromotor();
    return !!promotorSession;
}

function _pdvsPermitidosPromotor() {
    if (!_esPromotorRestringido()) return null;
    const tienda = _tiendaPromotorSesion();
    if (!tienda) return null;
    return [tienda];
}

function _pdvsDeZonaDeTienda(tienda) {
    if (!tienda) return [];
    if (typeof DataStore === 'undefined' || typeof DataStore.getPDVs !== 'function') return [];
    const pdvs = DataStore.getPDVs();
    if (typeof DataStore.getTiendaCadena !== 'function') {
        return (pdvs.indexOf(tienda) !== -1) ? [tienda] : [];
    }
    const norm = DataStore._normalizarZona
        ? DataStore._normalizarZona(DataStore.getTiendaCadena(tienda))
        : String(DataStore.getTiendaCadena(tienda) || '').trim().toUpperCase();
    if (!norm) {
        return (pdvs.indexOf(tienda) !== -1) ? [tienda] : [];
    }
    const igualZona = DataStore._normalizarZona
        ? p => DataStore._normalizarZona(DataStore.getTiendaCadena(p))
        : p => String(DataStore.getTiendaCadena(p) || '').trim().toUpperCase();
    const zonaPDVs = pdvs.filter(p => igualZona(p) === norm);
    return zonaPDVs.length ? zonaPDVs : (pdvs.indexOf(tienda) !== -1 ? [tienda] : []);
}

function _pdvsZonaPromotor() {
    if (!_esPromotorRestringido()) return null;
    const tienda = _tiendaPromotorSesion();
    if (!tienda) return null;
    const zonaPDVs = _pdvsDeZonaDeTienda(tienda);
    return zonaPDVs.length ? zonaPDVs : null;
}

function _getRankingRestringido() {
    if (typeof DataStore === 'undefined' || typeof DataStore.getRanking !== 'function') return [];
    const ranking = DataStore.getRanking();
    const zonaPDVs = _pdvsZonaPromotor();
    if (!zonaPDVs) return ranking;
    return ranking
        .filter(r => zonaPDVs.indexOf(r.punto_venta) !== -1)
        .map((item, i) => ({ ...item, puesto: i + 1 }));
}

function renderizarAvancePDV(pdvSeleccionado) {
    if (!_esPromotorRestringido()) {
        avanceVista = 'tienda';
    }
    syncVistaAvanceUI();
    if (avanceVista === 'zona') {
        renderAvanceZona();
        return;
    }
    const zonal = (!_esPromotorRestringido() && estaSupervisorDesbloqueado());
    if (avanceZonalVista === 'zonasur' && !esJefeComercial()) {
        avanceZonalVista = 'tienda';
    }
    syncVistaZonalUI(zonal);
    if (zonal) {
        if (avanceZonalVista === 'zonasur') {
            renderResumenZonaSur();
            return;
        }
        if (avanceZonalVista === 'diario') {
            renderResumenZonalDiario();
            return;
        }
        if (avanceZonalVista === 'acumulado') {
            renderResumenZonalAcumulado();
            return;
        }
    }
    if ((filtroTipoInformacion || 'productos') === 'promociones') {
        renderPromocionesAvancePDV(pdvSeleccionado);
        return;
    }
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-avance');
    const pdvs = DataStore.getPDVs();
    const select = document.getElementById('pdv-select');
    if (!select) return;

    const restringidos = _pdvsPermitidosPromotor();
    const tiendaPromotor = _tiendaPromotorSesion();
    if (restringidos) {
        pdvSeleccionado = restringidos[0];
    } else if (!pdvSeleccionado) {
        if (tiendaPromotor && pdvs.indexOf(tiendaPromotor) !== -1) {
            pdvSeleccionado = tiendaPromotor;
        } else {
            pdvSeleccionado = select.value || 'todos';
        }
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
        let cuotaDiaPDV = '\u2014';
        if (ventaPDV >= cuotaPDV) cuotaDiaPDV = '\u2713 Meta';
        else if (esPeriodoPasado) cuotaDiaPDV = 'Fin mes';
        else if (diasFaltantes > 0) cuotaDiaPDV = formatCurrency(Math.ceil(faltPDV / diasFaltantes));

        rowsHtml += '<tr class="ctl-group-row"><td colspan="8">' +
            '<span class="ctl-group-name">' + ctlDot(d.cumplimiento) + ' ' + ctlEsc(ctlNombreCorto(pdv)) + '</span>' +
            '</td></tr>';

        rowsHtml += '<tr class="ctl-total-row">' +
            '<td class="ctl-total-label">Total</td>' +
            '<td class="ctl-total-val">' + formatCurrency(ventaPDV) + '</td>' +
            '<td class="ctl-total-val">' + formatCurrency(cuotaPDV) + '</td>' +
            '<td class="ctl-total-val ' + (faltPDV <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (faltPDV <= 0 ? '\u2713 ' + formatCurrency(Math.abs(faltPDV)) : formatCurrency(faltPDV)) + '</td>' +
            '<td class="ctl-total-val ctl-td-dim">' + cuotaDiaPDV + '</td>' +
            '<td class="ctl-total-val">' + ctlBarCell(cumPDV) + '</td>' +
            '<td class="ctl-total-val">' + formatCurrency(d.proyeccion || 0) + '</td>' +
            '<td class="ctl-total-val">' + ctlBadge(cumPDV) + '</td>' +
            '</tr>';

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
                '<td class="' + (p.venta >= p.cuota ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (p.venta >= p.cuota ? '\u2713 ' + formatCurrency(Math.abs(dif)) : formatCurrency(dif)) + '</td>' +
                '<td class="ctl-td-dim">' + cuotaDiaStr + '</td>' +
                '<td>' + ctlBarCell(p.cumplimiento) + '</td>' +
                '<td class="' + (proyPDV >= p.cuota ? 'ctl-td-good' : 'ctl-td-dim') + '">' + formatCurrency(proyPDV) + '</td>' +
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
        '<div class="ctl-table-wrap"><table class="ctl-table ctl-table-exec">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">Producto</th><th>Venta</th><th>Cuota</th><th>Faltante</th><th>Cuota D\u00eda</th><th>Alcance</th><th>Proyecci\u00f3n</th><th>Estado</th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody>' +
'</table></div></div>';
}

function cambiarVistaAvance(vista) {
    avanceVista = (vista === 'zona') ? 'zona' : 'tienda';
    if (avanceVista === 'zona' && (filtroTipoInformacion || 'productos') === 'promociones') {
        filtroTipoInformacion = 'productos';
        syncTipoInfoUI();
    }
    renderizarAvancePDV();
}

function syncVistaAvanceUI() {
    const restringido = _esPromotorRestringido();
    const tabs = document.getElementById('avance-view-tabs');
    if (tabs) {
        tabs.style.display = restringido ? '' : 'none';
        tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.vista === avanceVista));
    }
    if (restringido) {
        const pdvWrapper = document.querySelector('#page-avance .pdv-selector-wrapper');
        if (pdvWrapper) pdvWrapper.style.display = (avanceVista === 'zona') ? 'none' : '';
        const modeToggle = document.getElementById('avance-mode-toggle');
        if (modeToggle) modeToggle.style.display = (avanceVista === 'zona') ? 'none' : '';
    }
}

function renderAvanceZona() {
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-avance');
    const periodoHeader = DataStore.getInfoPeriodo();
    const diaActualEl = document.getElementById('pdv-dia-actual');
    const diaTotalEl = document.getElementById('pdv-dia-total');
    if (diaActualEl) diaActualEl.textContent = periodoHeader.elapsed;
    if (diaTotalEl) diaTotalEl.textContent = '/' + periodoHeader.total;

    const container = document.getElementById('pdv-content');
    if (!container) return;

    const tienda = _tiendaPromotorSesion();
    const zonaPDVs = _pdvsDeZonaDeTienda(tienda);
    if (!zonaPDVs.length) {
        container.innerHTML = '<div class="empty-state"><p>No se pudo identificar los puntos de venta de tu zona.</p></div>';
        return;
    }

    const AD = 'Apuestas Deportivas';
    const JV = 'Juegos Virtuales';
    const ADn = _acuNorm(AD);
    const JVn = _acuNorm(JV);
    const allData = DataStore.getCumplimientoPorPDV();

    let rowsHtml = '';
    let totADv = 0, totADc = 0, totJVv = 0, totJVc = 0;
    for (const pdv of zonaPDVs) {
        const d = allData[pdv];
        const ad = { venta: 0, cuota: 0, cumplimiento: 0 };
        const jv = { venta: 0, cuota: 0, cumplimiento: 0 };
        if (d && d.productos) {
            for (const key of Object.keys(d.productos)) {
                const p = d.productos[key];
                const n = _acuNorm(key);
                if (n === ADn) { ad.venta = p.venta || 0; ad.cuota = p.cuota || 0; ad.cumplimiento = p.cumplimiento || 0; }
                else if (n === JVn) { jv.venta = p.venta || 0; jv.cuota = p.cuota || 0; jv.cumplimiento = p.cumplimiento || 0; }
            }
        }
        const adFalt = ad.cuota - ad.venta;
        const jvFalt = jv.cuota - jv.venta;
        totADv += ad.venta; totADc += ad.cuota;
        totJVv += jv.venta; totJVc += jv.cuota;

        rowsHtml += '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(ctlNombreCorto(pdv)) + '</td>' +
            '<td>' + formatCurrency(ad.venta) + '</td>' +
            '<td>' + formatCurrency(ad.cuota) + '</td>' +
            '<td class="' + (adFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (adFalt <= 0 ? '\u2713 0' : formatCurrency(adFalt)) + '</td>' +
            '<td>' + ctlBarCell(ad.cumplimiento) + '</td>' +
            '<td>' + formatCurrency(jv.venta) + '</td>' +
            '<td>' + formatCurrency(jv.cuota) + '</td>' +
            '<td class="' + (jvFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (jvFalt <= 0 ? '\u2713 0' : formatCurrency(jvFalt)) + '</td>' +
            '<td>' + ctlBarCell(jv.cumplimiento) + '</td>' +
            '</tr>';
    }

    const totADfalt = totADc - totADv;
    const totJVfalt = totJVc - totJVv;
    const alcAD = totADc > 0 ? (totADv / totADc) * 100 : 0;
    const alcJV = totJVc > 0 ? (totJVv / totJVc) * 100 : 0;
    const alcGen = (totADc + totJVc) > 0 ? ((totADv + totJVv) / (totADc + totJVc)) * 100 : 0;

    const totalRow = '<tr class="acu-total-row">' +
        '<td class="ctl-td-left acu-total-label">TOTAL ZONA</td>' +
        '<td class="acu-total-val">' + formatCurrency(totADv) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(totADc) + '</td>' +
        '<td class="acu-total-val ' + (totADfalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (totADfalt <= 0 ? '\u2713 0' : formatCurrency(totADfalt)) + '</td>' +
        '<td class="acu-total-val">' + formatPercent(alcAD) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(totJVv) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(totJVc) + '</td>' +
        '<td class="acu-total-val ' + (totJVfalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (totJVfalt <= 0 ? '\u2713 0' : formatCurrency(totJVfalt)) + '</td>' +
        '<td class="acu-total-val">' + formatPercent(alcJV) + '</td>' +
        '</tr>';

    const faltGen = totADfalt + totJVfalt;
    const summary = '<div class="acu-zona-resumen">' +
        '<div class="acu-zona-resumen-item"><span>Venta Total Zona</span><strong>' + formatCurrency(totADv + totJVv) + '</strong></div>' +
        '<div class="acu-zona-resumen-item"><span>Cuota Total Zona</span><strong>' + formatCurrency(totADc + totJVc) + '</strong></div>' +
        '<div class="acu-zona-resumen-item"><span>Faltante Total Zona</span><strong class="' + (faltGen <= 0 ? 'acu-var-ok' : 'acu-var-bad') + '">' + (faltGen <= 0 ? '\u2713 0' : formatCurrency(faltGen)) + '</strong></div>' +
        '<div class="acu-zona-resumen-item"><span>Alcance General</span><strong>' + formatPercent(alcGen) + '</strong></div>' +
        '</div>';

    container.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title">\ud83c\udf0e Mi Zona \u00b7 Avance por Punto de Venta</span>' +
        '<span class="ctl-card-count">' + zonaPDVs.length + ' PDVs \u00b7 Apuestas Deportivas y Juegos Virtuales</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table ctl-table-exec avance-zona-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">Punto de Venta</th>' +
        '<th>Venta AD</th><th>Cuota AD</th><th>Faltante AD</th><th>Alcance AD %</th>' +
        '<th>Venta JV</th><th>Cuota JV</th><th>Faltante JV</th><th>Alcance JV %</th>' +
        '</tr></thead><tbody>' + rowsHtml + totalRow + '</tbody>' +
        '</table></div>' +
        summary +
        '</div>';
}

/* ===== RESUMEN ZONAL (SUPERVISOR / JEFE COMERCIAL) ===== */
function zonalSem(pct) {
    if (pct >= 100) return { cls: 'ok', dot: '\ud83d\udfe2' };
    if (pct >= 70) return { cls: 'mid', dot: '\ud83d\udfe1' };
    return { cls: 'low', dot: '\ud83d\udd34' };
}

function _zonalPctCell(pct, bold) {
    const s = zonalSem(pct);
    return '<span class="zonal-sem-' + s.cls + '"' + (bold ? ' style="font-weight:800"' : '') + '>' + s.dot + ' ' + formatPercent(pct) + '</span>';
}

function _zonasDisponibles() {
    const cadenas = [];
    if (typeof DataStore !== 'undefined' && typeof DataStore.getPDVs === 'function') {
        DataStore.getPDVs().forEach(p => {
            const cadena = (typeof DataStore.getTiendaCadena === 'function') ? DataStore.getTiendaCadena(p) : '';
            if (cadena && cadenas.indexOf(cadena) === -1) cadenas.push(cadena);
        });
    }
    if (!cadenas.length && typeof ZONAS_OFICIALES !== 'undefined') {
        ZONAS_OFICIALES.forEach(z => { if (cadenas.indexOf(z) === -1) cadenas.push(z); });
    }
    return cadenas.sort();
}

function _poblarZonasAvance() {
    const sel = document.getElementById('filtro-avance-zona');
    if (!sel) return;
    const actual = sel.value;
    const zonas = _zonasDisponibles();
    sel.innerHTML = '<option value="">Todas las Zonas</option>' +
        zonas.map(z => '<option value="' + ctlEsc(z) + '">' + ctlEsc(z) + '</option>').join('');
    sel.value = actual;
}

function _zonaAvanceSeleccionada() {
    if (!esJefeComercial()) {
        return _supervisorZonaSesion() || null;
    }
    const sel = document.getElementById('filtro-avance-zona');
    const v = sel ? sel.value : '';
    return v || null;
}

function _nombreZonaSeleccionada() {
    return _zonaAvanceSeleccionada() || 'Todas las Zonas';
}

function _pdvsDeZona(nombreZona) {
    const pdvs = (typeof DataStore !== 'undefined' && typeof DataStore.getPDVs === 'function') ? DataStore.getPDVs() : [];
    if (!nombreZona) return pdvs;
    const norm = DataStore._normalizarZona ? DataStore._normalizarZona(nombreZona) : String(nombreZona || '').toUpperCase();
    return pdvs.filter(p => {
        const cadena = (typeof DataStore.getTiendaCadena === 'function') ? DataStore.getTiendaCadena(p) : '';
        const n = DataStore._normalizarZona ? DataStore._normalizarZona(cadena) : String(cadena || '').toUpperCase();
        return n === norm;
    });
}

function _zonasSur() {
    if (typeof ZONAS_OFICIALES !== 'undefined' && ZONAS_OFICIALES.length) {
        return ZONAS_OFICIALES.slice();
    }
    return _zonasDisponibles();
}

function _acumuladoZonasSurRows() {
    const zonas = _zonasSur();
    const ADn = _acuNorm('Apuestas Deportivas');
    const JVn = _acuNorm('Juegos Virtuales');
    const allData = DataStore.getCumplimientoPorPDV();
    const rows = [];
    let totADv = 0, totADc = 0, totJVv = 0, totJVc = 0;
    for (const zona of zonas) {
        let adV = 0, adC = 0, jvV = 0, jvC = 0;
        for (const pdv of _pdvsDeZona(zona)) {
            const d = allData[pdv];
            if (!d || !d.productos) continue;
            for (const key of Object.keys(d.productos)) {
                const p = d.productos[key];
                const n = _acuNorm(key);
                if (n === ADn) { adV += p.venta || 0; adC += p.cuota || 0; }
                else if (n === JVn) { jvV += p.venta || 0; jvC += p.cuota || 0; }
            }
        }
        rows.push({
            pdv: zona,
            zona,
            adVenta: adV, adCuota: adC, adFalt: adC - adV,
            alcAD: adC > 0 ? (adV / adC) * 100 : 0,
            jvVenta: jvV, jvCuota: jvC, jvFalt: jvC - jvV,
            alcJV: jvC > 0 ? (jvV / jvC) * 100 : 0,
            alcance: (adC + jvC) > 0 ? ((adV + jvV) / (adC + jvC)) * 100 : 0
        });
        totADv += adV; totADc += adC;
        totJVv += jvV; totJVc += jvC;
    }
    const totales = {
        adVenta: totADv, adCuota: totADc, adFalt: totADc - totADv,
        alcAD: totADc > 0 ? (totADv / totADc) * 100 : 0,
        jvVenta: totJVv, jvCuota: totJVc, jvFalt: totJVc - totJVv,
        alcJV: totJVc > 0 ? (totJVv / totJVc) * 100 : 0
    };
    return {
        rows,
        totales,
        alcGen: (totADc + totJVc) > 0 ? ((totADv + totJVv) / (totADc + totJVc)) * 100 : 0,
        venta: totADv + totJVv,
        cuota: totADc + totJVc,
        faltante: (totADc - totADv) + (totJVc - totJVv)
    };
}

function _ventasDelDiaGlobal(fecha) {
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    const ventas = (typeof DataStore !== 'undefined' && typeof DataStore.getVentasActivas === 'function') ? DataStore.getVentasActivas() : [];
    return ventas.filter(v => {
        if (!v || !v.punto_venta) return false;
        const f = v.fecha ? new Date(v.fecha) : null;
        if (f && !isNaN(f.getTime())) {
            return f.getFullYear() === anio && f.getMonth() + 1 === mes && f.getDate() === dia;
        }
        return v.dia === dia && (v.mes || mes) === mes && (v.anio || anio) === anio;
    });
}

function _acumuladoZonalRows(zonaPDVs) {
    const ADn = _acuNorm('Apuestas Deportivas');
    const JVn = _acuNorm('Juegos Virtuales');
    const allData = DataStore.getCumplimientoPorPDV();
    const rows = [];
    let totADv = 0, totADc = 0, totJVv = 0, totJVc = 0;
    for (const pdv of zonaPDVs) {
        const d = allData[pdv];
        const ad = { venta: 0, cuota: 0, cumplimiento: 0 };
        const jv = { venta: 0, cuota: 0, cumplimiento: 0 };
        if (d && d.productos) {
            for (const key of Object.keys(d.productos)) {
                const p = d.productos[key];
                const n = _acuNorm(key);
                if (n === ADn) { ad.venta = p.venta || 0; ad.cuota = p.cuota || 0; ad.cumplimiento = p.cumplimiento || 0; }
                else if (n === JVn) { jv.venta = p.venta || 0; jv.cuota = p.cuota || 0; jv.cumplimiento = p.cumplimiento || 0; }
            }
        }
        rows.push({
            pdv,
            adVenta: ad.venta, adCuota: ad.cuota, adFalt: ad.cuota - ad.venta,
            alcAD: ad.cuota > 0 ? (ad.venta / ad.cuota) * 100 : 0,
            jvVenta: jv.venta, jvCuota: jv.cuota, jvFalt: jv.cuota - jv.venta,
            alcJV: jv.cuota > 0 ? (jv.venta / jv.cuota) * 100 : 0,
            alcance: (ad.cuota + jv.cuota) > 0 ? ((ad.venta + jv.venta) / (ad.cuota + jv.cuota)) * 100 : 0
        });
        totADv += ad.venta; totADc += ad.cuota;
        totJVv += jv.venta; totJVc += jv.cuota;
    }
    const totales = {
        adVenta: totADv, adCuota: totADc, adFalt: totADc - totADv,
        alcAD: totADc > 0 ? (totADv / totADc) * 100 : 0,
        jvVenta: totJVv, jvCuota: totJVc, jvFalt: totJVc - totJVv,
        alcJV: totJVc > 0 ? (totJVv / totJVc) * 100 : 0
    };
    return {
        rows,
        totales,
        alcGen: (totADc + totJVc) > 0 ? ((totADv + totJVv) / (totADc + totJVc)) * 100 : 0,
        venta: totADv + totJVv,
        cuota: totADc + totJVc,
        faltante: (totADc - totADv) + (totJVc - totJVv)
    };
}

function _diarioZonalRows(zonaPDVs, fecha) {
    const ventasDia = _ventasDelDiaGlobal(fecha);
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const diasMes = new Date(anio, mes, 0).getDate();
    const ADn = _acuNorm('Apuestas Deportivas');
    const JVn = _acuNorm('Juegos Virtuales');
    const cuotasMes = (typeof DataStore !== 'undefined' && typeof DataStore.getCuotas === 'function') ? DataStore.getCuotas(mes, anio) : [];
    const rows = [];
    let totAD = 0, totJV = 0, totCuotaAD = 0, totCuotaJV = 0;
    for (const pdv of zonaPDVs) {
        let ad = 0, jv = 0;
        ventasDia.forEach(v => {
            if (v.punto_venta !== pdv) return;
            const n = _acuNorm(v.producto);
            if (n === ADn) ad += (v.venta || 0);
            else if (n === JVn) jv += (v.venta || 0);
        });
        let cuotaAD = 0, cuotaJV = 0;
        cuotasMes.forEach(c => {
            if (c.punto_venta !== pdv) return;
            const n = _acuNorm(c.producto);
            if (n === ADn) cuotaAD += (c.cuota || 0);
            else if (n === JVn) cuotaJV += (c.cuota || 0);
        });
        const cuotaADd = diasMes > 0 ? cuotaAD / diasMes : 0;
        const cuotaJVd = diasMes > 0 ? cuotaJV / diasMes : 0;
        const total = ad + jv;
        rows.push({
            pdv, ad, jv, total,
            cuotaDia: cuotaADd + cuotaJVd,
            alcance: (cuotaADd + cuotaJVd) > 0 ? (total / (cuotaADd + cuotaJVd)) * 100 : 0
        });
        totAD += ad; totJV += jv;
        totCuotaAD += cuotaADd; totCuotaJV += cuotaJVd;
    }
    const totTotal = totAD + totJV;
    const totCuota = totCuotaAD + totCuotaJV;
    return {
        rows,
        totales: { ad: totAD, jv: totJV, total: totTotal, cuota: totCuota, faltante: totCuota - totTotal },
        alcGen: totCuota > 0 ? (totTotal / totCuota) * 100 : 0,
        venta: totTotal,
        cuota: totCuota,
        faltante: totCuota - totTotal
    };
}

function _renderZonalKpis(venta, cuota, faltante, alcance, mejor, riesgo, mejorLabel, riesgoLabel) {
    mejorLabel = mejorLabel || 'Mejor PDV';
    riesgoLabel = riesgoLabel || 'PDV en Riesgo';
    const wrap = document.getElementById('zonal-kpis');
    if (!wrap) return;
    const sem = zonalSem(alcance);
    const faltOk = faltante <= 0;
    const nombre = (r) => r ? ctlEsc(ctlNombreCorto(r.pdv || r.zona || '')) : '\u2014';
    const card = (label, value, cls, sub) =>
        '<div class="zonal-kpi"><span class="zonal-kpi-label">' + label + '</span>' +
        '<span class="zonal-kpi-value ' + (cls || '') + '">' + value + '</span>' +
        (sub ? '<span class="zonal-kpi-sub">' + sub + '</span>' : '') +
        '</div>';
    wrap.innerHTML =
        card('\ud83d\udcb0 Venta Total Zona', formatCurrency(venta)) +
        card('\ud83c\udfaf Cuota Total Zona', formatCurrency(cuota)) +
        card('\ud83d\udcc9 Faltante Total Zona', (faltOk ? '\u2713 0' : formatCurrency(faltante)), (faltOk ? 'zonal-ok' : 'zonal-low')) +
        card('\ud83d\udcca Alcance General Zona', formatPercent(alcance), sem.cls === 'ok' ? 'zonal-ok' : sem.cls === 'mid' ? 'zonal-mid' : 'zonal-low') +
        card('\ud83c\udfc6 ' + mejorLabel, mejor ? nombre(mejor) : '\u2014', mejor ? 'zonal-ok' : '', mejor ? formatPercent(mejor.alcance) + ' de alcance' : '') +
        card('\u26a0\ufe0f ' + riesgoLabel, riesgo ? nombre(riesgo) : 'Ninguno', riesgo ? 'zonal-low' : 'zonal-ok', riesgo ? formatPercent(riesgo.alcance) + ' de alcance' : '');
}

function _mejorYRiesgo(rows) {
    if (!rows.length) return { mejor: null, riesgo: null };
    const conAlcance = rows.filter(r => r.alcance > 0);
    const mejor = conAlcance.length ? conAlcance.reduce((a, b) => (b.alcance > a.alcance ? b : a)) : null;
    const enRiesgo = rows.filter(r => r.alcance < 100);
    const riesgo = enRiesgo.length ? enRiesgo.reduce((a, b) => (b.alcance < a.alcance ? b : a)) : null;
    return { mejor, riesgo };
}

function cambiarZonaAvance() {
    renderizarAvancePDV();
}

function cambiarVistaZonal(vista) {
    avanceZonalVista = (vista === 'diario' || vista === 'acumulado' || vista === 'zonasur') ? vista : 'tienda';
    if (avanceZonalVista !== 'tienda' && (filtroTipoInformacion || 'productos') === 'promociones') {
        filtroTipoInformacion = 'productos';
        syncTipoInfoUI();
    }
    renderizarAvancePDV();
}

function syncVistaZonalUI(zonal) {
    _poblarZonasAvance();
    const esZonal = zonal && avanceZonalVista !== 'tienda';
    const tabs = document.getElementById('avance-zonal-tabs');
    if (tabs) {
        tabs.style.display = zonal ? '' : 'none';
        tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.vista === avanceZonalVista));
    }
    const btnSur = document.getElementById('btn-avance-zonasur');
    if (btnSur) btnSur.style.display = (zonal && esJefeComercial()) ? '' : 'none';
    if (zonal) {
        const pdvWrapper = document.querySelector('#page-avance .pdv-selector-wrapper');
        if (pdvWrapper) pdvWrapper.style.display = esZonal ? 'none' : '';
        const modeToggle = document.getElementById('avance-mode-toggle');
        if (modeToggle) modeToggle.style.display = esZonal ? 'none' : '';
        const mesWrap = document.querySelector('#page-avance .avance-filtro-mes');
        if (mesWrap) mesWrap.style.display = (esZonal && avanceZonalVista === 'diario') ? 'none' : '';
    }
    const zonaWrap = document.getElementById('avance-zona-filter');
    if (zonaWrap) zonaWrap.style.display = (esZonal && esJefeComercial() && avanceZonalVista !== 'zonasur') ? '' : 'none';
    const fechaWrap = document.getElementById('avance-filtro-fecha');
    if (fechaWrap) fechaWrap.style.display = (esZonal && avanceZonalVista === 'diario') ? '' : 'none';
    const kpis = document.getElementById('zonal-kpis');
    if (kpis) kpis.style.display = esZonal ? '' : 'none';
}

function renderResumenZonalDiario() {
    renderAvisoOficial();
    const periodoHeader = DataStore.getInfoPeriodo();
    const diaActualEl = document.getElementById('pdv-dia-actual');
    const diaTotalEl = document.getElementById('pdv-dia-total');
    if (diaActualEl) diaActualEl.textContent = periodoHeader.elapsed;
    if (diaTotalEl) diaTotalEl.textContent = '/' + periodoHeader.total;
    renderPeriodoAnalizado('periodo-analizado-avance');

    const container = document.getElementById('pdv-content');
    if (!container) return;

    const fechaInput = document.getElementById('zonal-fecha');
    const hoy = new Date();
    const hoyStr = _acuDiaStr(hoy);
    if (fechaInput) {
        if (!fechaInput.max) fechaInput.max = hoyStr;
        if (!fechaInput.value) fechaInput.value = hoyStr;
    }
    const selStr = fechaInput ? (fechaInput.value || hoyStr) : hoyStr;
    const partes = String(selStr).split('-').map(Number);
    if (partes.length !== 3 || partes.some(isNaN)) return;
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    const fecLegible = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const pill = document.getElementById('periodo-analizado-avance');
    if (pill) {
        const txt = pill.querySelector('.periodo-analizado-text');
        if (txt) {
            txt.innerHTML = 'Fecha seleccionada: <strong>' + ctlEsc(fecLegible) + '</strong>';
        }
    }

    const zona = _zonaAvanceSeleccionada();
    const zonaPDVs = _pdvsDeZona(zona);
    if (!zonaPDVs.length) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron puntos de venta para la zona seleccionada.</p></div>';
        _renderZonalKpis(0, 0, 0, 0, null, null);
        return;
    }

    const data = _diarioZonalRows(zonaPDVs, fecha);
    let rowsHtml = '';
    data.rows.forEach(r => {
        rowsHtml += '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(ctlNombreCorto(r.pdv)) + '</td>' +
            '<td>' + (r.ad > 0 ? formatCurrency(r.ad) : '\u2014') + '</td>' +
            '<td>' + (r.jv > 0 ? formatCurrency(r.jv) : '\u2014') + '</td>' +
            '<td class="ctl-td-strong">' + formatCurrency(r.total) + '</td>' +
            '</tr>';
    });

    const t = data.totales;
    const totalRow = '<tr class="acu-total-row">' +
        '<td class="ctl-td-left acu-total-label">TOTAL ZONA</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.ad) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.jv) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.total) + '</td>' +
        '</tr>';

    container.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title">\ud83c\udf0e Resumen Zonal Diario \u00b7 ' + ctlEsc(_nombreZonaSeleccionada()) + '</span>' +
        '<span class="ctl-card-count">' + fecLegible + ' \u00b7 ' + zonaPDVs.length + ' PDVs</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table ctl-table-exec">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">PDV</th>' +
        '<th>Apuestas Deportivas</th><th>Juegos Virtuales</th><th>Total D\u00eda</th>' +
        '</tr></thead><tbody>' + rowsHtml + totalRow + '</tbody>' +
        '</table></div>' +
        '</div>';

    const mr = _mejorYRiesgo(data.rows);
    _renderZonalKpis(data.venta, data.cuota, data.faltante, data.alcGen, mr.mejor, mr.riesgo);
}

function renderResumenZonalAcumulado() {
    renderAvisoOficial();
    const periodoHeader = DataStore.getInfoPeriodo();
    const diaActualEl = document.getElementById('pdv-dia-actual');
    const diaTotalEl = document.getElementById('pdv-dia-total');
    if (diaActualEl) diaActualEl.textContent = periodoHeader.elapsed;
    if (diaTotalEl) diaTotalEl.textContent = '/' + periodoHeader.total;
    renderPeriodoAnalizado('periodo-analizado-avance');

    const container = document.getElementById('pdv-content');
    if (!container) return;

    const zona = _zonaAvanceSeleccionada();
    const zonaPDVs = _pdvsDeZona(zona);
    if (!zonaPDVs.length) {
        container.innerHTML = '<div class="empty-state"><p>No se encontraron puntos de venta para la zona seleccionada.</p></div>';
        _renderZonalKpis(0, 0, 0, 0, null, null);
        return;
    }

    const data = _acumuladoZonalRows(zonaPDVs);
    let rowsHtml = '';
    data.rows.forEach(r => {
        rowsHtml += '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(ctlNombreCorto(r.pdv)) + '</td>' +
            '<td>' + formatCurrency(r.adVenta) + '</td>' +
            '<td>' + formatCurrency(r.adCuota) + '</td>' +
            '<td class="' + (r.adFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (r.adFalt <= 0 ? '\u2713 0' : formatCurrency(r.adFalt)) + '</td>' +
            '<td>' + _zonalPctCell(r.alcAD) + '</td>' +
            '<td>' + formatCurrency(r.jvVenta) + '</td>' +
            '<td>' + formatCurrency(r.jvCuota) + '</td>' +
            '<td class="' + (r.jvFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (r.jvFalt <= 0 ? '\u2713 0' : formatCurrency(r.jvFalt)) + '</td>' +
            '<td>' + _zonalPctCell(r.alcJV) + '</td>' +
            '</tr>';
    });

    const t = data.totales;
    const totalRow = '<tr class="acu-total-row">' +
        '<td class="ctl-td-left acu-total-label">TOTAL ZONA</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.adVenta) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.adCuota) + '</td>' +
        '<td class="acu-total-val ' + (t.adFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (t.adFalt <= 0 ? '\u2713 0' : formatCurrency(t.adFalt)) + '</td>' +
        '<td class="acu-total-val">' + _zonalPctCell(t.alcAD, true) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.jvVenta) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.jvCuota) + '</td>' +
        '<td class="acu-total-val ' + (t.jvFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (t.jvFalt <= 0 ? '\u2713 0' : formatCurrency(t.jvFalt)) + '</td>' +
        '<td class="acu-total-val">' + _zonalPctCell(t.alcJV, true) + '</td>' +
        '</tr>';

    container.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title">\ud83d\udcca Resumen Zonal Acumulado \u00b7 ' + ctlEsc(_nombreZonaSeleccionada()) + '</span>' +
        '<span class="ctl-card-count">' + zonaPDVs.length + ' PDVs \u00b7 Apuestas Deportivas y Juegos Virtuales</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table ctl-table-exec avance-zonal-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">PDV</th>' +
        '<th>Venta AD</th><th>Cuota AD</th><th>Faltante AD</th><th>% AD</th>' +
        '<th>Venta JV</th><th>Cuota JV</th><th>Faltante JV</th><th>% JV</th>' +
        '</tr></thead><tbody>' + rowsHtml + totalRow + '</tbody>' +
        '</table></div>' +
        '</div>';

    const mr = _mejorYRiesgo(data.rows);
    _renderZonalKpis(data.venta, data.cuota, data.faltante, data.alcGen, mr.mejor, mr.riesgo);
}

function renderResumenZonaSur() {
    renderAvisoOficial();
    const periodoHeader = DataStore.getInfoPeriodo();
    const diaActualEl = document.getElementById('pdv-dia-actual');
    const diaTotalEl = document.getElementById('pdv-dia-total');
    if (diaActualEl) diaActualEl.textContent = periodoHeader.elapsed;
    if (diaTotalEl) diaTotalEl.textContent = '/' + periodoHeader.total;
    renderPeriodoAnalizado('periodo-analizado-avance');

    const container = document.getElementById('pdv-content');
    if (!container) return;

    const zonas = _zonasSur();
    if (!zonas.length) {
        container.innerHTML = '<div class="empty-state"><p>No hay zonas configuradas.</p></div>';
        _renderZonalKpis(0, 0, 0, 0, null, null, 'Mejor Zona', 'Zona en Riesgo');
        return;
    }

    const data = _acumuladoZonasSurRows();
    let rowsHtml = '';
    data.rows.forEach(r => {
        rowsHtml += '<tr>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(r.zona) + '</td>' +
            '<td>' + formatCurrency(r.adVenta) + '</td>' +
            '<td>' + formatCurrency(r.adCuota) + '</td>' +
            '<td class="' + (r.adFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (r.adFalt <= 0 ? '\u2713 0' : formatCurrency(r.adFalt)) + '</td>' +
            '<td>' + _zonalPctCell(r.alcAD) + '</td>' +
            '<td>' + formatCurrency(r.jvVenta) + '</td>' +
            '<td>' + formatCurrency(r.jvCuota) + '</td>' +
            '<td class="' + (r.jvFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (r.jvFalt <= 0 ? '\u2713 0' : formatCurrency(r.jvFalt)) + '</td>' +
            '<td>' + _zonalPctCell(r.alcJV) + '</td>' +
            '</tr>';
    });

    const t = data.totales;
    const totalRow = '<tr class="acu-total-row">' +
        '<td class="ctl-td-left acu-total-label">TOTAL ZONAS SUR</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.adVenta) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.adCuota) + '</td>' +
        '<td class="acu-total-val ' + (t.adFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (t.adFalt <= 0 ? '\u2713 0' : formatCurrency(t.adFalt)) + '</td>' +
        '<td class="acu-total-val">' + _zonalPctCell(t.alcAD, true) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.jvVenta) + '</td>' +
        '<td class="acu-total-val">' + formatCurrency(t.jvCuota) + '</td>' +
        '<td class="acu-total-val ' + (t.jvFalt <= 0 ? 'ctl-td-good' : 'ctl-td-bad') + '">' + (t.jvFalt <= 0 ? '\u2713 0' : formatCurrency(t.jvFalt)) + '</td>' +
        '<td class="acu-total-val">' + _zonalPctCell(t.alcJV, true) + '</td>' +
        '</tr>';

    container.innerHTML = '' +
        '<div class="ctl-card">' +
        '<div class="ctl-card-header">' +
        '<span class="ctl-card-title">\ud83c\udf0e Resumen Zona Sur</span>' +
        '<span class="ctl-card-count">' + zonas.length + ' zonas \u00b7 Apuestas Deportivas y Juegos Virtuales</span>' +
        '</div>' +
        '<div class="ctl-table-wrap"><table class="ctl-table ctl-table-exec avance-zonal-table">' +
        '<thead><tr>' +
        '<th class="ctl-th-left">Zona</th>' +
        '<th>Venta AD</th><th>Cuota AD</th><th>Faltante AD</th><th>% AD</th>' +
        '<th>Venta JV</th><th>Cuota JV</th><th>Faltante JV</th><th>% JV</th>' +
        '</tr></thead><tbody>' + rowsHtml + totalRow + '</tbody>' +
        '</table></div>' +
        '</div>';

    const mr = _mejorYRiesgo(data.rows);
    _renderZonalKpis(data.venta, data.cuota, data.faltante, data.alcGen, mr.mejor, mr.riesgo, 'Mejor Zona', 'Zona en Riesgo');
}

function exportarAvancePDVExcel() {
    try {
        if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') {
            console.error('[EXPORT] ExcelJS o FileSaver no disponibles.');
            return;
        }
        if (avanceZonalVista === 'diario' || avanceZonalVista === 'acumulado' || avanceZonalVista === 'zonasur') {
            exportarZonalExcel();
            return;
        }

        const pdvSeleccionado = (document.getElementById('pdv-select') || {}).value || 'todos';
        const pdvs = DataStore.getPDVs();
        const restringidos = _pdvsPermitidosPromotor();
        let listaPDVs;
        if (avanceVista === 'zona' && _esPromotorRestringido()) {
            listaPDVs = _pdvsZonaPromotor() || [];
        } else {
            listaPDVs = (pdvSeleccionado && pdvSeleccionado !== 'todos') ? [pdvSeleccionado] : (restringidos || pdvs);
        }
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

function exportarZonalExcel() {
    try {
        if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') return;
        const esDiario = avanceZonalVista === 'diario';
        const esSur = avanceZonalVista === 'zonasur';
        const zona = _zonaAvanceSeleccionada();
        const zonaPDVs = esSur ? _pdvsDeZona(null) : _pdvsDeZona(zona);
        if (!zonaPDVs.length) {
            mostrarNotificacion('No hay PDVs para la zona seleccionada', 'warning');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet(esDiario ? 'Resumen Zonal Diario' : esSur ? 'Resumen Zona Sur' : 'Resumen Zonal Acumulado');
        const colCount = esDiario ? 4 : 9;
        const firstHead = esSur ? 'ZONA' : 'PDV';
        const columns = esDiario
            ? [
                { header: 'PDV', key: 'pdv', width: 30 },
                { header: 'APUESTAS DEPORTIVAS', key: 'ad', width: 20 },
                { header: 'JUEGOS VIRTUALES', key: 'jv', width: 20 },
                { header: 'TOTAL DIA', key: 'total', width: 18 }
            ]
            : [
                { header: firstHead, key: 'pdv', width: 30 },
                { header: 'VENTA AD', key: 'ventaAD', width: 15 },
                { header: 'CUOTA AD', key: 'cuotaAD', width: 15 },
                { header: 'FALTANTE AD', key: 'faltAD', width: 15 },
                { header: '% AD', key: 'pctAD', width: 12 },
                { header: 'VENTA JV', key: 'ventaJV', width: 15 },
                { header: 'CUOTA JV', key: 'cuotaJV', width: 15 },
                { header: 'FALTANTE JV', key: 'faltJV', width: 15 },
                { header: '% JV', key: 'pctJV', width: 12 }
            ];
        ws.columns = columns;

        const titulo = esDiario ? 'Resumen Zonal Diario' : esSur ? 'Resumen Zona Sur' : 'Resumen Zonal Acumulado';
        const titleRow = ws.addRow([titulo]);
        ws.mergeCells(titleRow.number, 1, titleRow.number, colCount);
        titleRow.height = 28;
        titleRow.getCell(1).font = { bold: true, size: 15, color: { argb: 'FFFFFFFF' } };
        for (let t = 1; t <= colCount; t++) {
            titleRow.getCell(t).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF155a3a' } };
        }

        let subLabel;
        if (esSur) {
            const mesSel = document.getElementById('filtro-avance-mes');
            subLabel = 'Periodo: ' + (mesSel && mesSel.selectedIndex > -1 ? mesSel.options[mesSel.selectedIndex].text : '');
        } else {
            subLabel = 'Zona: ' + _nombreZonaSeleccionada();
        }
        const sub = ws.addRow([subLabel]);
        ws.mergeCells(sub.number, 1, sub.number, colCount);
        sub.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF8A8A8A' } };

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

        if (esDiario) {
            const fechaInput = document.getElementById('zonal-fecha');
            const selStr = fechaInput ? fechaInput.value : '';
            const partes = String(selStr).split('-').map(Number);
            const fecha = (partes.length === 3 && !partes.some(isNaN)) ? new Date(partes[0], partes[1] - 1, partes[2]) : new Date();
            const data = _diarioZonalRows(zonaPDVs, fecha);
            data.rows.forEach(r => {
                const row = ws.addRow([r.pdv, r.ad, r.jv, r.total]);
                row.getCell(1).alignment = { horizontal: 'left' };
                for (let c = 2; c <= 4; c++) {
                    row.getCell(c).numFmt = dinero;
                    row.getCell(c).alignment = { horizontal: 'center' };
                }
            });
            const t = data.totales;
            const tr = ws.addRow(['TOTAL ZONA', t.ad, t.jv, t.total]);
            for (let c = 1; c <= 4; c++) {
                tr.getCell(c).font = { bold: true };
                tr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCF3E5' } };
                if (c > 1) tr.getCell(c).numFmt = dinero;
                tr.getCell(c).alignment = { horizontal: 'center' };
            }
        } else {
            const data = esSur ? _acumuladoZonasSurRows() : _acumuladoZonalRows(zonaPDVs);
            data.rows.forEach(r => {
                const row = ws.addRow([r.pdv, r.adVenta, r.adCuota, r.adFalt, r.alcAD, r.jvVenta, r.jvCuota, r.jvFalt, r.alcJV]);
                row.getCell(1).alignment = { horizontal: 'left' };
                for (let c = 2; c <= 4; c++) row.getCell(c).numFmt = dinero;
                for (let c = 6; c <= 8; c++) row.getCell(c).numFmt = dinero;
                row.getCell(5).numFmt = '0.0%';
                row.getCell(9).numFmt = '0.0%';
                row.getCell(5).value = r.alcAD / 100;
                row.getCell(9).value = r.alcJV / 100;
                const semAD = zonalSem(r.alcAD);
                const semJV = zonalSem(r.alcJV);
                const colAD = semAD.cls === 'ok' ? 'FF1DB954' : semAD.cls === 'mid' ? 'FFF59E0B' : 'FFEF4444';
                const colJV = semJV.cls === 'ok' ? 'FF1DB954' : semJV.cls === 'mid' ? 'FFF59E0B' : 'FFEF4444';
                row.getCell(5).font = { bold: true, color: { argb: colAD } };
                row.getCell(9).font = { bold: true, color: { argb: colJV } };
                row.getCell(5).alignment = { horizontal: 'center' };
                row.getCell(9).alignment = { horizontal: 'center' };
            });
            const t = data.totales;
            const tr = ws.addRow([esSur ? 'TOTAL ZONAS SUR' : 'TOTAL ZONA', t.adVenta, t.adCuota, t.adFalt, t.alcAD / 100, t.jvVenta, t.jvCuota, t.jvFalt, t.alcJV / 100]);
            for (let c = 1; c <= 9; c++) {
                tr.getCell(c).font = { bold: true };
                tr.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCF3E5' } };
                tr.getCell(c).alignment = { horizontal: 'center' };
            }
            tr.getCell(2).numFmt = dinero; tr.getCell(3).numFmt = dinero; tr.getCell(4).numFmt = dinero;
            tr.getCell(6).numFmt = dinero; tr.getCell(7).numFmt = dinero; tr.getCell(8).numFmt = dinero;
            tr.getCell(5).numFmt = '0.0%';
            tr.getCell(9).numFmt = '0.0%';
        }

        const hoy = new Date();
        const stamp = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');
        const nombreArchivo = 'Resumen_' + (esDiario ? 'Zonal_Diario' : esSur ? 'Zona_Sur' : 'Zonal_Acumulado') + '_' + stamp + '.xlsx';

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, nombreArchivo);
        });
    } catch (e) {
        console.error('[EXPORT][ZONAL] Error al generar el Excel:', e);
    }
}

function renderizarRanking() {
    if ((filtroTipoInformacion || 'productos') === 'promociones') {
        renderizarRankingPromociones();
        return;
    }
    renderAvisoOficial();
    renderPeriodoAnalizado('periodo-analizado-ranking');
    const ranking = _getRankingRestringido();
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
    const restringidos = _pdvsPermitidosPromotor();
    const lista = restringidos || pdvs;
    console.log('[AUDITORIA] poblarFiltros pdvs:', lista.length, lista);
    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        const wrapper = pdvSelect.closest('.pdv-selector-wrapper');
        if (restringidos) {
            pdvSelect.innerHTML = '<option value="' + escHtml(restringidos[0]) + '">' + escHtml(restringidos[0]) + '</option>';
            pdvSelect.value = restringidos[0];
            pdvSelect.disabled = true;
            if (wrapper) wrapper.classList.add('is-readonly', 'has-value');
        } else {
            pdvSelect.innerHTML = '<option value="todos">Todos los PDV</option>' +
                pdvs.map(p => `<option value="${p}">${p}</option>`).join('');
            pdvSelect.disabled = false;
            if (wrapper) wrapper.classList.remove('is-readonly');
            const tiendaPromotor = _tiendaPromotorSesion();
            if (tiendaPromotor && pdvs.indexOf(tiendaPromotor) !== -1) {
                pdvSelect.value = tiendaPromotor;
                if (wrapper) wrapper.classList.add('has-value');
            }
        }
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
    const custom = document.getElementById('custom-' + modulo);
    sel.innerHTML = '<option value="">Seleccionar periodo...</option>' +
        (custom ? '<option value="custom">Personalizado</option>' : '') +
        meses.map(mm => `<option value="${mm.anio}-${pad2(mm.mes)}">${mm.nombre} ${mm.anio}</option>`).join('');
}

function sincronizarInputsFecha() {
    const filtros = DataStore.getFiltrosFecha();
['resumen', 'avance', 'ranking', 'informe', 'vista-ejecutiva', 'individual', 'jefe', 'jefe-ranking'].forEach(modulo => {
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
    else if (seccion === 'individual') renderizarInformeIndividual();
    else if (seccion === 'vista-ejecutiva') renderizarVistaEjecutiva();
    else if (seccion === 'jefe' || seccion === 'jefe-ranking') {
        const active = document.querySelector('.page.active');
        const id = active ? active.id : '';
        if (id === 'page-jefe-dashboard') renderJefeDashboard();
        else if (id === 'page-jefe-ranking') renderJefeRanking();
        else if (id === 'page-jefe-supervisores') renderJefeSupervisores();
        else if (id === 'page-jefe-zonas') renderJefeZonas();
    }
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
    const mapa = { informe: 'page-informe-promotor', individual: 'page-informe-individual', jefe: 'page-jefe-dashboard' };
    const pageId = mapa[modulo] || 'page-' + modulo;
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
    ['resumen', 'avance', 'ranking', 'informe', 'individual', 'vista-ejecutiva'].forEach(seccion => actualizarDatosPorSeccion(seccion));
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
function esJefeComercial() {
    const session = leerSesion();
    return !!(session && session.rol === 'jefe');
}

function _supervisorZonaSesion() {
    const s = leerSesion();
    return (s && s.rol === 'supervisor' && s.zona) ? String(s.zona) : null;
}

function _pdvEnZonaSesion(pdv) {
    const zona = _supervisorZonaSesion();
    if (!zona) return true;
    let cadena = '';
    if (typeof DataStore !== 'undefined' && typeof DataStore.getTiendaCadena === 'function') {
        cadena = DataStore.getTiendaCadena(pdv) || '';
    }
    return _normalizarZonaCuotas(cadena) === _normalizarZonaCuotas(zona);
}

function _promotorEnZonaSesion(promotor) {
    const zona = _supervisorZonaSesion();
    if (!zona) return true;
    if (!promotor || !promotor.zona_principal_id) return false;
    const tienda = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas)
        ? HorariosDataStore.zonas.find(z => z.id === promotor.zona_principal_id)
        : null;
    const tiendaNombre = (tienda && tienda.nombre) || promotor.zona_principal_id;
    return _pdvEnZonaSesion(tiendaNombre);
}

function estaSupervisorDesbloqueado() {
    if (esJefeComercial()) return true;
    return sessionStorage.getItem('supervisor_unlocked') === 'true';
}

function bloquearSupervisor() {
    if (esJefeComercial()) return;
    sessionStorage.removeItem('supervisor_unlocked');
    actualizarSidebarSupervisor();
    const activePage = document.querySelector('.page.active');
    if (activePage) {
        const id = activePage.id.replace('page-', '');
        if (id === 'resumen' || id === 'vista-ejecutiva' || id === 'horarios' || id === 'tiendas' || id === 'corte-comercial') {
            cambiarPagina('avance');
        }
    }
    poblarFiltros();
    renderizarAvancePDV();
    mostrarNotificacion('Modo supervisor bloqueado', 'success');
}

function actualizarSidebarSupervisor() {
    const unlocked = estaSupervisorDesbloqueado();
    document.getElementById('sidebar').classList.toggle('supervisor-unlocked', unlocked);
    // El botón de "bloquear supervisor" queda sin uso: el menú ahora se renderiza
    // únicamente según el rol autenticado.
    const lockBtn = document.getElementById('supervisor-lock-btn');
    if (lockBtn) lockBtn.style.display = 'none';

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
            if (id === 'resumen' || id === 'vista-ejecutiva' || id === 'horarios' || id === 'corte-comercial') {
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

function iniciarReloj() {
    const relojEl = document.getElementById('hora-actual');
    if (!relojEl) return;
    function actualizar() {
        const ahora = new Date();
        const hh = String(ahora.getHours()).padStart(2, '0');
        const mm = String(ahora.getMinutes()).padStart(2, '0');
        const ss = String(ahora.getSeconds()).padStart(2, '0');
        relojEl.textContent = hh + ':' + mm + ':' + ss;
    }
    actualizar();
    setInterval(actualizar, 1000);
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
    renderizarCorteComercial();

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

    const paginasSupervisor = ['resumen', 'vista-ejecutiva', 'horarios', 'informe-promotor', 'tiendas', 'corte-comercial'];
    if (session.rol === 'promotor' && paginasSupervisor.indexOf(pagina) !== -1) {
        cambiarPagina('avance');
        return;
    }

    if ((pagina === 'resumen' || pagina === 'vista-ejecutiva' || pagina === 'horarios' || pagina === 'tiendas' || pagina === 'corte-comercial') && !estaSupervisorDesbloqueado()) {
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
                    pagina === 'informe-individual' ? 'Informe Individual' :
                    pagina === 'acumulado-diario' ? 'Acumulado Diario' :
                        pagina === 'horarios' ? 'Gestión de Promotores' :
                    pagina === 'tiendas' ? 'Gestión de Tiendas' :
                        pagina === 'corte-comercial' ? 'Corte Comercial' :
                        pagina === 'jefe-dashboard' ? 'Dashboard General' :
                            pagina === 'jefe-ranking' ? 'Ranking de Supervisores' :
                            pagina === 'jefe-supervisores' ? 'Gestión de Supervisores' :
                            pagina === 'jefe-zonas' ? 'Gestión de Zonas' : 'Dashboard';

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
    } else if (pagina === 'informe-individual') {
        renderizarInformeIndividual();
    } else if (pagina === 'acumulado-diario') {
        renderizarAcumuladoDiario();
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
    } else if (pagina === 'corte-comercial') {
        renderizarCorteComercial();
    } else if (pagina === 'jefe-dashboard') {
        if (typeof renderJefeDashboard === 'function') renderJefeDashboard();
    } else if (pagina === 'jefe-ranking') {
        if (typeof renderJefeRanking === 'function') renderJefeRanking();
    } else if (pagina === 'jefe-supervisores') {
        if (typeof renderJefeSupervisores === 'function') renderJefeSupervisores();
    } else if (pagina === 'jefe-zonas') {
        if (typeof renderJefeZonas === 'function') renderJefeZonas();
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
    const emailInput = document.getElementById('password-email');
    if (emailInput) emailInput.value = '';
    document.getElementById('password-input').value = '';
    document.getElementById('password-field-wrapper').classList.remove('shake');
    document.getElementById('password-input').type = 'password';
    document.getElementById('password-toggle').innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>`;
    document.getElementById('modal-password').classList.add('open');
    setTimeout(() => {
        const f = emailInput || document.getElementById('password-input');
        if (f) f.focus();
    }, 300);
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

async function confirmarPassword() {
    const emailInput = document.getElementById('password-email');
    const email = emailInput ? emailInput.value.trim().toLowerCase() : '';
    const input = document.getElementById('password-input');
    const password = input.value;
    const btn = document.getElementById('btn-confirmar-password');
    btn.classList.add('loading');

    try {
        const res = await autenticarSupervisor(email, password);
        btn.classList.remove('loading');
        if (res.ok) {
            finishSupervisorLogin(res.sup);
            return;
        }
        intentosPassword++;
        document.getElementById('password-field-wrapper').classList.add('shake');
        input.focus();
        const errorEl = document.getElementById('password-error');
        errorEl.style.display = 'flex';
        if (intentosPassword >= 3) {
            errorEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> ' + (res.error || 'Acceso denegado') + '. Acceso bloqueado.';
            errorEl.style.color = '#EF4444';
            setTimeout(() => cerrarModalPassword(), 1800);
        } else {
            errorEl.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${res.error || 'Acceso denegado'}. Intento ${intentosPassword} de 3.`;
            errorEl.style.color = '#EF4444';
        }
        setTimeout(() => document.getElementById('password-field-wrapper').classList.remove('shake'), 600);
    } catch (err) {
        console.error('Error en confirmarPassword:', err);
        btn.classList.remove('loading');
        const errorEl = document.getElementById('password-error');
        errorEl.style.display = 'flex';
        errorEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Error inesperado. Intenta nuevamente.';
        errorEl.style.color = '#EF4444';
    }
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

    const zonaSel = document.getElementById('cuotas-zona');
    const zona = zonaSel ? zonaSel.value : '';
    const zonaNorm = _normalizarZonaCuotas(zona);
    const pdvsVisibles = zonaNorm
        ? pdvs.filter(pdv => _normalizarZonaCuotas(_getZonaPDVCuotas(pdv)) === zonaNorm)
        : pdvs;

    const infoNombre = document.getElementById('cuotas-zona-nombre');
    if (infoNombre) infoNombre.textContent = zona || 'Todas las Zonas';
    const infoTiendas = document.getElementById('cuotas-zona-tiendas');
    if (infoTiendas) infoTiendas.textContent = String(pdvsVisibles.length);

    let headHtml = '<th class="cuotas-th-pdv">Punto de Venta</th>';
    for (let prod of productos) {
        headHtml += `<th class="cuotas-th-prod">${prod}</th>`;
    }
    thead.innerHTML = headHtml;

    tbody.innerHTML = '';
    for (let pdv of pdvsVisibles) {
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

function _normalizarZonaCuotas(str) {
    return String(str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function _getZonaPDVCuotas(pdv) {
    if (typeof TiendasStore !== 'undefined' && TiendasStore.getTienda) {
        const t = TiendasStore.getTienda(pdv);
        if (t && t.cadena) return t.cadena;
    }
    if (typeof DataStore !== 'undefined' && typeof DataStore.getTiendaCadena === 'function') {
        const cadena = DataStore.getTiendaCadena(pdv);
        if (cadena) return cadena;
    }
    return '';
}

function cambiarZonaCuotas() {
    if (!document.getElementById('modal-cuotas').classList.contains('open')) return;

    const mes = parseInt(document.getElementById('cuotas-mes').value);
    const anio = parseInt(document.getElementById('cuotas-anio').value);

    renderTablaCuotas(mes, anio);
}

function abrirModalCuotasSinPassword() {
    sincronizarSelectsPeriodo();
    const zonaSup = _supervisorZonaSesion();
    if (zonaSup) {
        const zonaSel = document.getElementById('cuotas-zona');
        if (zonaSel) zonaSel.value = zonaSup;
    }
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
    cerrarPanelVentas();
    const sessionBar = document.getElementById('ventas-session-bar');
    if (sessionBar) {
        sessionBar.style.display = 'none';
        sessionBar.innerHTML = '';
    }
    const pdvSel = document.getElementById('modal-pdv');
    if (pdvSel) pdvSel.disabled = false;
    ventasFullscreen = false;
}

function toggleVentasFullscreen() {
    ventasFullscreen = !ventasFullscreen;
    const panelEl = document.getElementById('avance-panel-ventas');
    if (panelEl) panelEl.classList.toggle('ventas-fullscreen', ventasFullscreen);
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
        if (!inp.closest('#avance-panel-ventas')) return;
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
    const panelEl = document.getElementById('avance-panel-ventas');
    if (panelEl) panelEl.classList.toggle('vista-dia', modo === 'dia');
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

function _zonaIdSeguro(nueva, previa) {
    const valida = (v) => v && String(v) !== '' && String(v) !== 'Sin tienda asignada';
    if (valida(nueva)) return nueva;
    if (valida(previa)) return previa;
    return null;
}

function _rehidratarSesionPromotor() {
    const sesion = leerSesion();
    if (!sesion || sesion.rol !== 'promotor') return null;
    const actual = promotorSession || (function () {
        try {
            const raw = localStorage.getItem('promotor_session') || sessionStorage.getItem('promotor_session');
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    })();
    if (!actual) return null;

    const id = actual.id || sesion.id || null;
    const email = String(actual.email || sesion.email || '').trim().toLowerCase();

    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    let p = null;
    if (id) p = promotores.find(x => x.id === id);
    if (!p && email) {
        p = promotores.find(x => x.email && String(x.email).trim().toLowerCase() === email) || null;
    }

    const zonaNueva = (p && (p.zona_principal_id || p.tienda_asignada || p.tienda)) || null;
    const zonaPrevia = actual.zona_principal_id || null;
    const zonaId = _zonaIdSeguro(zonaNueva, zonaPrevia);

    promotorSession = {
        id: id || sesion.id,
        nombre: (p && p.nombre) || actual.nombre || sesion.nombre || '',
        dni: (p && p.dni) || actual.dni || null,
        email: (p && p.email) || actual.email || sesion.email || null,
        zona_principal_id: zonaId
    };

    // PROTECCIÓN: solo se persiste la sesión cuando existe tienda asignada,
    // para que la tienda jamás se sobrescriba por null/cadena vacía.
    if (promotorSession.zona_principal_id) {
        try { localStorage.setItem('promotor_session', JSON.stringify(promotorSession)); } catch (e) {}
    }
    return promotorSession;
}

function initPromotorSession() {
    if (!promotorSession) {
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
    // AUDITORÍA: re-hidratar la tienda asignada en cada acceso por si la sesión
    // se creó sin ella (carrera de carga) o el promotor aún no existía en la lista.
    _rehidratarSesionPromotor();
}

function logValidacionPromotor() {
    const p = promotorSession;
    if (!p) return;
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const zona = zonas.find(z => z.id === p.zona_principal_id);
    const tienda = (zona && zona.nombre) || p.zona_principal_id || 'Sin tienda asignada';
    const ventasCargadas = (typeof DataStore !== 'undefined' && DataStore.ventas) ? DataStore.ventas.length : 0;
    const promosCargadas = (typeof PromocionesStore !== 'undefined' && PromocionesStore.promociones) ? PromocionesStore.promociones.length : 0;
    console.log('[VALIDACION] Promotor autenticado:', p.nombre || '');
    console.log('[VALIDACION] Correo:', p.email || '');
    console.log('[VALIDACION] Tienda encontrada:', tienda);
    console.log('[VALIDACION] Promociones cargadas:', promosCargadas);
    console.log('[VALIDACION] Ventas cargadas:', ventasCargadas);
    console.log('Usuario autenticado:\n' + (p.nombre || ''));
    console.log('Correo:\n' + (p.email || ''));
    console.log('Tienda asignada:\n' + tienda);
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
        abrirModalVenta();
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
        zona_principal_id: _zonaIdSeguro(promotor.zona_principal_id || promotor.tienda_asignada || promotor.tienda, null)
    };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('promotor_session', JSON.stringify(promotorSession));
}

function cerrarSesionPromotor() {
    promotorSession = null;
    localStorage.removeItem('promotor_session');
    sessionStorage.removeItem('promotor_session');
    cerrarPanelVentas();
    cerrarPanelPromociones();
    const sessionBar = document.getElementById('ventas-session-bar');
    if (sessionBar) sessionBar.style.display = 'none';
    const promoBar = document.getElementById('promo-session-bar');
    if (promoBar) promoBar.style.display = 'none';
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
    cambiarPagina('avance');
    poblarFiltros();
    abrirPanelVentas();
}

function abrirPanelVentasConSesion() {
    const pdvSel = document.getElementById('modal-pdv');
    const pdvs = DataStore.getPDVs();

    if (!estaSupervisorDesbloqueado() && promotorSession) {
        const tiendaNombre = _tiendaPromotorSesion();
        if (tiendaNombre) {
            pdvSel.innerHTML = '<option value="' + escHtml(tiendaNombre) + '">' + escHtml(tiendaNombre) + '</option>';
            pdvSel.disabled = true;
        } else {
            pdvSel.innerHTML = '<option value="">Sin tienda asignada</option>';
            pdvSel.disabled = true;
        }
        logValidacionPromotor();
    } else {
        pdvSel.disabled = false;
        pdvSel.innerHTML = '<option value="">Seleccionar punto de venta...</option>' +
            pdvs.map(p => '<option value="' + escHtml(p) + '">' + escHtml(p) + '</option>').join('');
        const tiendaPromotor = _tiendaPromotorSesion();
        if (!estaSupervisorDesbloqueado() && tiendaPromotor && pdvs.indexOf(tiendaPromotor) !== -1) pdvSel.value = tiendaPromotor;
    }

    const sessionBar = document.getElementById('ventas-session-bar');
    if (!estaSupervisorDesbloqueado() && promotorSession) {
        if (sessionBar) {
            sessionBar.style.display = 'flex';
            sessionBar.innerHTML = '<div class="ventas-session-user"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>Bienvenido, ' + escHtml(promotorSession.nombre) + '</div>' +
                '<button class="ventas-session-logout" onclick="cerrarSesionPromotor()"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>Cerrar Sesi\u00f3n</button>';
        }
    } else if (sessionBar) {
        sessionBar.style.display = 'none';
        sessionBar.innerHTML = '';
    }

    ventasModificadas = false;
    const unsaved = document.getElementById('ventas-unsaved-bar');
    if (unsaved) unsaved.classList.remove('visible');
    modoVista = 'mes';
    diaSeleccionado = new Date().getDate();
    const toggleMes = document.querySelector('[data-view="mes"]');
    const toggleDia = document.querySelector('[data-view="dia"]');
    if (toggleMes) toggleMes.classList.add('active');
    if (toggleDia) toggleDia.classList.remove('active');
    const diaSelect = document.getElementById('ventas-dia-select');
    if (diaSelect) diaSelect.style.display = 'none';
    const panelEl = document.getElementById('avance-panel-ventas');
    if (panelEl) panelEl.classList.remove('vista-dia');
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
        zonasActivas.some(z => z.id === p.zona_principal_id) &&
        _promotorEnZonaSesion(p)
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
        zonasActivas.some(z => z.id === p.zona_principal_id) &&
        _promotorEnZonaSesion(p)
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
                <div style="font-size:13px;font-weight:700;color:var(--t-text);line-height:1.4;">${escHtml(promotor.nombre)}</div>
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
                        ticks: { color: () => temaCss('--chart-tick'), font: { size: 9 }, maxRotation: 45 },
                        grid: { color: () => temaCss('--chart-grid3') }
                    },
                    y: {
                        ticks: { color: () => temaCss('--chart-tick'), font: { size: 9 } },
                        grid: { color: () => temaCss('--chart-grid2') }
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
    iniciarReloj();

    document.getElementById('mobile-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-backdrop').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('open');
    });

    // Delegación de clics en el menú: el menú se reconstruye por rol, por lo que
    // los ítems no llevan listeners individuales (los inline onclick sí se conservan).
    const sidebarNav = document.querySelector('.sidebar-nav');
    if (sidebarNav) {
        sidebarNav.addEventListener('click', function (e) {
            const item = e.target.closest('.nav-item[data-page]');
            if (!item) return;
            const rect = item.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            item.style.setProperty('--ripple-x', x + '%');
            item.style.setProperty('--ripple-y', y + '%');
            cambiarPagina(item.dataset.page);
        });
    }

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
    const jefe = document.getElementById('login-step-jefe');
    [[roles, step === 'roles'], [promo, step === 'promotor'], [sup, step === 'supervisor'], [jefe, step === 'jefe']].forEach(([el, on]) => {
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
            const inp = document.getElementById('login-supervisor-email');
            if (inp) inp.focus();
        }, 140);
    } else if (step === 'jefe') {
        setTimeout(() => {
            const inp = document.getElementById('login-jefe-usuario');
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
        const zonaLogin = _zonaIdSeguro(promotor.zona_principal_id || promotor.tienda_asignada || promotor.tienda, null);
        finishLogin({ rol: 'promotor', id: promotor.id, nombre: promotor.nombre, email: promotor.email, zona_principal_id: zonaLogin });
        console.log('[LOGIN] 8. Fin de carga. Dashboard abierto para:', promotor.nombre);
    } catch (err) {
        console.error('[LOGIN][ERROR] Excepción completa en ingresarPromotor:', err);
        btn.classList.remove('loading');
        setErrorLogin('login-promotor-error', 'Error inesperado al iniciar sesión. Intenta nuevamente.');
    }
}

async function ingresarSupervisor() {
    const email = document.getElementById('login-supervisor-email').value.trim().toLowerCase();
    const password = document.getElementById('login-supervisor-password').value;
    const btn = document.getElementById('login-supervisor-submit');

    if (!email) { setErrorLogin('login-supervisor-error', 'Ingresa tu correo electrónico.'); return; }
    if (!password) { setErrorLogin('login-supervisor-error', 'Ingresa tu contraseña.'); return; }

    btn.classList.add('loading');

    try {
        const res = await autenticarSupervisor(email, password);
        btn.classList.remove('loading');
        if (!res.ok) {
            setErrorLogin('login-supervisor-error', res.error);
            return;
        }
        finishSupervisorLogin(res.sup);
    } catch (err) {
        console.error('[LOGIN][ERROR] Error en ingresarSupervisor:', err);
        btn.classList.remove('loading');
        setErrorLogin('login-supervisor-error', 'Error inesperado al iniciar sesión. Intenta nuevamente.');
    }
}

async function autenticarSupervisor(email, password) {
    const emailNorm = String(email || '').trim().toLowerCase();
    if (!emailNorm) return { ok: false, error: 'Ingresa tu correo electrónico.' };
    if (!password) return { ok: false, error: 'Ingresa tu contraseña.' };

    let lista = [];
    if (typeof db !== 'undefined' && db) {
        try {
            const qs = await db.collection(SUPERVISORES_COLLECTION).get();
            lista = qs.docs.map(d => Object.assign({ id: d.id }, d.data()));
        } catch (e) {
            lista = (typeof JefeComercialStore !== 'undefined') ? JefeComercialStore.supervisores : [];
        }
    } else {
        lista = (typeof JefeComercialStore !== 'undefined') ? JefeComercialStore.supervisores : [];
    }

    const sup = lista.find(s => s && s.email && String(s.email).trim().toLowerCase() === emailNorm) || null;
    if (!sup) return { ok: false, error: 'El correo ingresado no se encuentra registrado.' };

    let valida = false;
    if (sup.password_hash) {
        const hash = await hashPassword(password);
        valida = hash ? sup.password_hash === hash : false;
    }
    if (!valida && sup.password) valida = password === sup.password;
    if (!valida) return { ok: false, error: 'Contraseña incorrecta.' };

    if (String(sup.estado || 'Activo').toLowerCase() !== 'activo') {
        return { ok: false, error: 'Su cuenta se encuentra inhabilitada. Comuníquese con el Jefe Comercial.' };
    }

    const zona = String(sup.zona || (sup.zonas && sup.zonas[0]) || '').trim();
    if (!zona) {
        return { ok: false, error: 'Su cuenta no tiene una zona asignada. Comuníquese con el Jefe Comercial.' };
    }

    return { ok: true, sup: { id: sup.id, nombre: sup.nombre || sup.id, email: sup.email || '', zona } };
}

function finishLogin(data) {
    guardarSesion(data);
    aplicarSesionInicial();
}

function finishSupervisorLogin(sup) {
    sessionStorage.setItem('supervisor_unlocked', 'true');
    guardarSesion({ rol: 'supervisor', id: sup.id, nombre: sup.nombre || 'Supervisor', email: sup.email || '', zona: sup.zona || '' });
    aplicarSesionInicial();
    if (typeof poblarFiltros === 'function') {
        poblarFiltros();
        renderizarAvancePDV();
    }
}

/* ===== MENÚ DINÁMICO POR ROL ===== */
/* El menú lateral se construye únicamente con los módulos permitidos para el rol
   autenticado. No se ocultan opciones con CSS: los ítems que no corresponden se
   eliminan del DOM. Cada ítem/separador declara su rol con data-role. */
const MENU_POR_ROL = {
    promotor: ['promotor'],
    supervisor: ['supervisor', 'gestion'],
    jefe: ['supervisor', 'gestion', 'jefe']
};
let _navOriginalHTML = null;

function aplicarPermisosMenu() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) return;

    if (_navOriginalHTML === null) {
        _navOriginalHTML = nav.innerHTML;
    }
    // Restaurar el menú completo antes de aplicar el rol: permite cambiar de rol
    // en la misma sesión (cerrar sesión → iniciar sesión con otro rol) sin recargar.
    nav.innerHTML = _navOriginalHTML;

    const session = leerSesion();
    const rol = (session && session.rol) || '';
    const permitidos = MENU_POR_ROL[rol] || [];

    nav.querySelectorAll('.nav-item, .nav-section-divider').forEach(el => {
        const roles = (el.getAttribute('data-role') || '').split(/\s+/).filter(Boolean);
        const permitido = roles.some(r => permitidos.indexOf(r) !== -1);
        if (!permitido) el.remove();
    });

    // Re-aplicar tooltips en el menú restaurado
    nav.querySelectorAll('.nav-item[data-page], .nav-item[data-action]').forEach(item => {
        const lab = item.querySelector('.nav-label');
        if (lab && !item.getAttribute('title')) item.setAttribute('title', lab.textContent.trim());
    });
    nav.querySelectorAll('.nav-section-divider').forEach(d => {
        const tx = d.textContent.trim();
        if (tx && !d.getAttribute('title')) d.setAttribute('title', tx);
    });

    // El mecanismo heredado de "supervisor desbloqueado" queda descartado:
    // la visibilidad depende únicamente del rol autenticado.
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        if (rol === 'supervisor' || rol === 'jefe') sidebar.classList.add('supervisor-unlocked');
        else sidebar.classList.remove('supervisor-unlocked');
    }
    const lockBtn = document.getElementById('supervisor-lock-btn');
    if (lockBtn) lockBtn.style.display = 'none';
}

function aplicarSesionInicial() {
    const screen = document.getElementById('login-screen');
    const session = leerSesion();

    if (!session || !session.rol) {
        aplicarPermisosMenu();
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
    } else if (session.rol === 'jefe') {
        sessionStorage.setItem('supervisor_unlocked', 'true');
        document.body.classList.remove('rol-promotor', 'rol-supervisor');
        document.body.classList.add('rol-jefe');
        actualizarSidebarSupervisor();
        mostrarCerrarSesion();
        renderJefeHeader();
        if (typeof JefeComercialStore !== 'undefined' && typeof JefeComercialStore.init === 'function') JefeComercialStore.init();
        cambiarPagina('jefe-dashboard');
    } else if (session.rol === 'promotor') {
        // Separación total de roles: un promotor nunca conserva el flag heredado
        // de "supervisor desbloqueado" de una sesión previa en la misma pestaña.
        sessionStorage.removeItem('supervisor_unlocked');
        const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
        let p = session.id ? promotores.find(x => x.id === session.id) : null;
        if (!p && session.email) {
            const emailLogin = String(session.email).trim().toLowerCase();
            p = promotores.find(x => x.email && String(x.email).trim().toLowerCase() === emailLogin) || null;
        }
        let almacenada = null;
        try {
            const raw = localStorage.getItem('promotor_session') || sessionStorage.getItem('promotor_session');
            if (raw) almacenada = JSON.parse(raw);
        } catch (e) { almacenada = null; }
        document.body.classList.remove('rol-supervisor');
        document.body.classList.add('rol-promotor');
        const zonaPromotor = (p && (p.zona_principal_id || p.tienda_asignada || p.tienda)) || null;
        const zonaPrevia = (almacenada && (almacenada.zona_principal_id || almacenada.tienda_asignada)) || null;
        const zonaId = _zonaIdSeguro(zonaPromotor, _zonaIdSeguro(session.zona_principal_id, zonaPrevia));
        promotorSession = {
            id: session.id,
            nombre: (p && p.nombre) || (almacenada && almacenada.nombre) || session.nombre || 'Promotor',
            dni: (p && p.dni) || (almacenada && almacenada.dni) || null,
            email: (p && p.email) || (almacenada && almacenada.email) || session.email || null,
            zona_principal_id: zonaId
        };
        // PROTECCIÓN: persistir la sesión completa (con tienda asignada) para que
        // ninguna recarga posterior pierda la asociación promotor ↔ tienda.
        if (promotorSession.zona_principal_id) {
            try { localStorage.setItem('promotor_session', JSON.stringify(promotorSession)); } catch (e) {}
        }
        renderPromotorHeader(session);
        mostrarCerrarSesion();
        cambiarPagina('avance');
    }

    aplicarPermisosMenu();
}

function renderSupervisorHeader() {
    const title = document.getElementById('page-title');
    const welcome = document.getElementById('top-bar-welcome');
    const s = leerSesion();
    const nombre = (s && s.nombre) || 'Supervisor';
    const zona = (s && s.zona) || '';
    if (welcome) {
        welcome.innerHTML = '👨‍💼 ' + escHtmlGlobal(nombre) + (zona ? ' · ' + escHtmlGlobal(zona) : '');
        welcome.style.display = '';
    }
    if (title && title.textContent === 'Bienvenido:') title.textContent = 'Vista Ejecutiva';
}

function renderJefeHeader() {
    const welcome = document.getElementById('top-bar-welcome');
    if (welcome) {
        welcome.innerHTML = '🏢 Jefe Comercial';
        welcome.style.display = '';
    }
    const title = document.getElementById('page-title');
    if (title && title.textContent === 'Bienvenido:') title.textContent = 'Dashboard General';
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
    document.body.classList.remove('rol-promotor', 'rol-supervisor', 'rol-jefe');
    const welcome = document.getElementById('top-bar-welcome');
    if (welcome) welcome.style.display = 'none';
    const screen = document.getElementById('login-screen');
    if (screen) screen.classList.add('activo');
    mostrarFormularioLogin('roles');
    limpiarCamposLogin();
    aplicarPermisosMenu();
    mostrarNotificacion('Sesión cerrada correctamente', 'success');
}

function limpiarCamposLogin() {
    const email = document.getElementById('login-promotor-email');
    const pw = document.getElementById('login-promotor-password');
    const supE = document.getElementById('login-supervisor-email');
    const sup = document.getElementById('login-supervisor-password');
    const jefeU = document.getElementById('login-jefe-usuario');
    const jefeP = document.getElementById('login-jefe-password');
    if (email) email.value = '';
    if (pw) pw.value = '';
    if (supE) supE.value = '';
    if (sup) sup.value = '';
    if (jefeU) jefeU.value = '';
    if (jefeP) jefeP.value = '';
    const pwdEmail = document.getElementById('password-email');
    if (pwdEmail) pwdEmail.value = '';
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

/* ===== INFORME INDIVIDUAL (PROMOTOR) ===== */
let infIndTab = 'desempeno';
let infIndFechas = { desde: null, hasta: null };
let infIndChartInstances = {};

function infIndEsc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function infIndMoneda(n) {
    return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function infIndPctStr(n) {
    return Number(n || 0).toFixed(1) + '%';
}

function obtenerPromotorSesionInforme() {
    initPromotorSession();
    const sesion = leerSesion();
    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    let candidato = promotorSession || null;
    if (!candidato && sesion && sesion.rol === 'promotor') {
        candidato = { id: sesion.id, nombre: sesion.nombre, email: sesion.email, zona_principal_id: sesion.zona_principal_id || null };
    }
    if (!candidato) return null;

    const id = candidato.id || null;
    const correo = String(candidato.email || '').trim().toLowerCase();

    let promotor = null;
    if (id) promotor = promotores.find(p => p.id === id);
    if (!promotor && correo) {
        promotor = promotores.find(p => p.email && String(p.email).trim().toLowerCase() === correo);
    }
    if (promotor) return promotor;

    if (id) {
        return {
            id: id,
            nombre: candidato.nombre || '',
            dni: candidato.dni || null,
            email: candidato.email || null,
            zona_principal_id: _zonaIdSeguro(candidato.zona_principal_id || candidato.tienda_asignada, null)
        };
    }
    return null;
}

function _ventasDelPromotor(promotor, ventas) {
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const tienda = promotor.zona_principal_id ? zonas.find(z => z.id === promotor.zona_principal_id) : null;
    const tiendaNombre = tienda ? tienda.nombre : null;
    const correo = String(promotor.email || '').trim().toLowerCase();
    const nombre = String(promotor.nombre || '').trim().toLowerCase();

    return ventas.filter(v => {
        if (v.promotor_id && promotor.id) return v.promotor_id === promotor.id;
        if (v.promotor_correo && correo) return String(v.promotor_correo).trim().toLowerCase() === correo;
        if (v.promotor_nombre && nombre) return String(v.promotor_nombre).trim().toLowerCase() === nombre;
        return tiendaNombre ? v.punto_venta === tiendaNombre : false;
    });
}

function _tiendaNombrePromotor(promotor) {
    if (!promotor) return null;
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const zona = promotor.zona_principal_id ? zonas.find(z => z.id === promotor.zona_principal_id) : null;
    return zona ? zona.nombre : (promotor.zona_principal_id || null);
}

function _calcularRankingPromotores(ventas, fechaDesde, fechaHasta) {
    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const activos = promotores.filter(p =>
        p.estado === 'Activo' &&
        p.zona_principal_id &&
        zonas.some(z => z.id === p.zona_principal_id)
    );
    const fd = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const fh = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;

    const filas = activos.map(p => {
        let filtradas = _ventasDelPromotor(p, ventas);
        if (fd) filtradas = filtradas.filter(v => new Date(v.fecha) >= fd);
        if (fh) filtradas = filtradas.filter(v => new Date(v.fecha) <= fh);
        const venta = filtradas.reduce((s, v) => s + (v.venta || 0), 0);
        return { promotorId: p.id, venta };
    });
    filas.sort((a, b) => b.venta - a.venta);
    return filas;
}

function _promedioDiarioVentas(ventas) {
    if (!ventas || !ventas.length) return 0;
    const dias = _diasConVentas(ventas);
    const total = ventas.reduce((s, v) => s + (v.venta || 0), 0);
    return dias.size > 0 ? total / dias.size : 0;
}

function _diasConVentas(ventas) {
    const dias = new Set();
    (ventas || []).forEach(v => {
        if (!v || !v.fecha) return;
        const d = new Date(v.fecha);
        if (isNaN(d)) return;
        dias.add(d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate());
    });
    return dias;
}

function _ventasTiendaEnRango(tiendaNombre, ventas, fechaDesde, fechaHasta) {
    let filtradas = ventas.filter(v => v.punto_venta === tiendaNombre);
    const fd = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : null;
    const fh = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : null;
    if (fd) filtradas = filtradas.filter(v => new Date(v.fecha) >= fd);
    if (fh) filtradas = filtradas.filter(v => new Date(v.fecha) <= fh);
    return filtradas;
}

function infIndDestroyCharts() {
    Object.keys(infIndChartInstances).forEach(k => {
        if (infIndChartInstances[k]) { infIndChartInstances[k].destroy(); delete infIndChartInstances[k]; }
    });
}

function renderizarInformeIndividual() {
    const page = document.getElementById('page-informe-individual');
    if (!page) return;

    if (typeof HorariosDataStore !== 'undefined' && !HorariosDataStore.initialized && typeof initHorarios === 'function') {
        initHorarios('supervisor');
        HorariosDataStore.onUpdate = function () { renderHorarios(); };
    }

    poblarSelectMes('individual');
    sincronizarInputsFecha();
    renderPeriodoAnalizado('periodo-analizado-individual');

    const warning = document.getElementById('inf-ind-session-warning');
    const dashboard = document.getElementById('inf-ind-dashboard');
    const heroUser = document.getElementById('inf-ind-hero-user');

    const promotor = obtenerPromotorSesionInforme();
    if (!promotor) {
        infIndDestroyCharts();
        if (warning) {
            warning.style.display = 'flex';
            warning.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> <div><strong>Inicia sesi&oacute;n como promotor</strong><span>Este informe es exclusivo para el promotor autenticado con su propia sesi&oacute;n.</span></div>';
        }
        if (dashboard) dashboard.style.display = 'none';
        if (heroUser) heroUser.innerHTML = '';
        return;
    }

    if (warning) warning.style.display = 'none';
    if (dashboard) dashboard.style.display = '';
    if (heroUser) heroUser.innerHTML = renderHeroUsuarioInforme(promotor);

    const fechas = fechasEfectivasInforme();
    infIndFechas = { desde: fechas.desde, hasta: fechas.hasta };

    const ventas = DataStore.getVentasActivas();
    let ventasProm = _ventasDelPromotor(promotor, ventas);
    if (fechas.desde) ventasProm = ventasProm.filter(v => new Date(v.fecha) >= new Date(fechas.desde + 'T00:00:00'));
    if (fechas.hasta) ventasProm = ventasProm.filter(v => new Date(v.fecha) <= new Date(fechas.hasta + 'T23:59:59'));

    const totalVenta = ventasProm.reduce((s, v) => s + (v.venta || 0), 0);
    const tiendaNombre = _tiendaNombrePromotor(promotor);
    const ranking = _calcularRankingPromotores(ventas, fechas.desde, fechas.hasta);
    const idxProm = ranking.findIndex(r => r.promotorId === promotor.id);
    const puesto = idxProm >= 0 ? idxProm + 1 : '—';
    const totalProm = ranking.length;

    document.getElementById('inf-ind-venta').textContent = infIndMoneda(totalVenta);

    document.getElementById('inf-ind-posicion').textContent = puesto;
    document.getElementById('inf-ind-pos-total').textContent = totalProm;
    document.getElementById('inf-ind-pos-venta').textContent = infIndMoneda(totalVenta);

    const promedio = _promedioDiarioVentas(ventasProm);
    document.getElementById('inf-ind-promedio').textContent = infIndMoneda(promedio);
    const diasConVentas = _diasConVentas(ventasProm).size;
    document.getElementById('inf-ind-promedio-sub').textContent = diasConVentas + ' d\u00edas con ventas';

    let aportePct = 0;
    if (tiendaNombre) {
        const ventasTienda = _ventasTiendaEnRango(tiendaNombre, ventas, fechas.desde, fechas.hasta);
        const totalTienda = ventasTienda.reduce((s, v) => s + (v.venta || 0), 0);
        aportePct = totalTienda > 0 ? (totalVenta / totalTienda) * 100 : 0;
    }
    document.getElementById('inf-ind-aporte-pct').textContent = infIndPctStr(aportePct);
    document.getElementById('inf-ind-aporte-tienda').textContent = tiendaNombre ? 'del total de ' + tiendaNombre : 'del total de la tienda';

    const trend = _evolucionDiariaVentas(ventasProm, fechas.desde, fechas.hasta);
    const productoRows = _desempenoPorProducto(ventasProm);
    renderTablaProductosInforme(productoRows);
    renderTopBottomProductos(productoRows);
    renderInfIndCharts(trend, productoRows);

    if (infIndTab === 'promociones') {
        renderPromocionesInformeIndividual();
    }
}

/* ===== ACUMULADO DIARIO ===== */
const ACU_PRODUCTOS = ['Apuestas Deportivas', 'Hípica', 'Juegos Virtuales', 'Lotobola', 'Lottingo', 'Mi Billetera', 'Torito', 'VLT'];

function _acuNorm(s) {
    if (s == null) return '';
    return String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function _acuDiaStr(fecha) {
    const d = fecha ? new Date(fecha) : new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _acuVentasDelDia(tienda, fecha) {
    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    const ventas = (typeof DataStore !== 'undefined' && typeof DataStore.getVentasActivas === 'function') ? DataStore.getVentasActivas() : [];
    return ventas.filter(v => {
        if (!v || v.punto_venta !== tienda) return false;
        const f = v.fecha ? new Date(v.fecha) : null;
        if (f && !isNaN(f.getTime())) {
            return f.getFullYear() === anio && f.getMonth() + 1 === mes && f.getDate() === dia;
        }
        return v.dia === dia && (v.mes || mes) === mes && (v.anio || anio) === anio;
    });
}

function _acuCuotasTienda(tienda, mes, anio) {
    if (typeof DataStore === 'undefined' || typeof DataStore.getCuotas !== 'function') return [];
    return DataStore.getCuotas(mes, anio).filter(c => c && c.punto_venta === tienda);
}

function _acuSem(pct) {
    if (pct >= 100) return 'ok';
    if (pct >= 70) return 'mid';
    return 'low';
}

function renderizarAcumuladoDiario() {
    const page = document.getElementById('page-acumulado-diario');
    if (!page) return;

    if (typeof HorariosDataStore !== 'undefined' && !HorariosDataStore.initialized && typeof initHorarios === 'function') {
        initHorarios('supervisor');
        HorariosDataStore.onUpdate = function () { renderHorarios(); };
    }

    const warning = document.getElementById('acu-session-warning');
    const dashboard = document.getElementById('acu-dashboard');
    const heroUser = document.getElementById('acu-hero-user');

    const promotor = obtenerPromotorSesionInforme();
    if (!promotor) {
        if (warning) {
            warning.style.display = 'flex';
            warning.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> <div><strong>Inicia sesi&oacute;n como promotor</strong><span>Este m&oacute;dulo es exclusivo para el promotor autenticado con su propia sesi&oacute;n.</span></div>';
        }
        if (dashboard) dashboard.style.display = 'none';
        if (heroUser) heroUser.innerHTML = '';
        const tabsAcu1 = document.getElementById('acu-view-tabs');
        if (tabsAcu1) tabsAcu1.style.display = 'none';
        return;
    }

    if (warning) warning.style.display = 'none';
    if (dashboard) dashboard.style.display = '';
    if (heroUser) heroUser.innerHTML = renderHeroUsuarioInforme(promotor);

    const tienda = _tiendaNombrePromotor(promotor);
    if (!tienda) {
        if (warning) {
            warning.style.display = 'flex';
            warning.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg> <div><strong>Sin tienda asignada</strong><span>El promotor no tiene una tienda asignada para consultar su acumulado diario.</span></div>';
        }
        if (dashboard) dashboard.style.display = 'none';
        const tabsAcu2 = document.getElementById('acu-view-tabs');
        if (tabsAcu2) tabsAcu2.style.display = 'none';
        return;
    }

    const hoy = new Date();
    const hoyStr = _acuDiaStr(hoy);
    const fechaInput = document.getElementById('acu-fecha');
    if (fechaInput) {
        if (!fechaInput.max) fechaInput.max = hoyStr;
        if (!fechaInput.value) fechaInput.value = hoyStr;
    }
    const selStr = fechaInput ? (fechaInput.value || hoyStr) : hoyStr;
    const partes = String(selStr).split('-').map(Number);
    if (partes.length !== 3 || partes.some(isNaN)) return;
    const fecha = new Date(partes[0], partes[1] - 1, partes[2]);
    syncVistaAcuUI();
    const zonaContainer = document.getElementById('acu-zona');
    if (acuVista === 'zona') {
        if (zonaContainer) zonaContainer.style.display = '';
        renderAcumuladoZona(fecha, tienda);
        return;
    }
    if (zonaContainer) zonaContainer.style.display = 'none';
    const mes = fecha.getMonth() + 1;
    const anio = fecha.getFullYear();
    const diasMes = new Date(anio, mes, 0).getDate();

    const ventasDia = _acuVentasDelDia(tienda, fecha);
    const cuotas = _acuCuotasTienda(tienda, mes, anio);

    const ventaPorProd = {};
    ventasDia.forEach(v => {
        const n = _acuNorm(v.producto);
        ventaPorProd[n] = (ventaPorProd[n] || 0) + (v.venta || 0);
    });
    const cuotaPorProd = {};
    cuotas.forEach(c => {
        const n = _acuNorm(c.producto);
        cuotaPorProd[n] = (cuotaPorProd[n] || 0) + (c.cuota || 0);
    });

    const rows = ACU_PRODUCTOS.map(nombre => {
        const n = _acuNorm(nombre);
        const ventaDia = ventaPorProd[n] || 0;
        const metaDia = diasMes > 0 ? (cuotaPorProd[n] || 0) / diasMes : 0;
        const alcance = metaDia > 0 ? (ventaDia / metaDia) * 100 : 0;
        return { nombre, ventaDia, metaDia, alcance };
    });

    const totalVentaDia = rows.reduce((s, r) => s + r.ventaDia, 0);
    const totalMetaDia = rows.reduce((s, r) => s + r.metaDia, 0);
    const totalAlcance = totalMetaDia > 0 ? (totalVentaDia / totalMetaDia) * 100 : 0;
    const faltanteDia = totalMetaDia - totalVentaDia;

    const fecLegible = fecha.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
    document.getElementById('acu-venta-dia').textContent = infIndMoneda(totalVentaDia);
    document.getElementById('acu-venta-dia-sub').textContent = fecLegible + ' \u00b7 ' + tienda;
    document.getElementById('acu-meta-dia').textContent = infIndMoneda(totalMetaDia);
    document.getElementById('acu-meta-dia-sub').textContent = 'Cuota mensual del mes \u00b7 ' + diasMes + ' d\u00edas';

    const alcEl = document.getElementById('acu-alcance-dia');
    alcEl.textContent = infIndPctStr(totalAlcance);
    alcEl.className = 'inf-ind-venta-big acu-sem-' + _acuSem(totalAlcance);

    const faltEl = document.getElementById('acu-faltante-dia');
    faltEl.className = 'inf-ind-venta-big ' + (faltanteDia <= 0 ? 'acu-var-ok' : 'acu-var-bad');
    faltEl.textContent = faltanteDia <= 0 ? '\u2713 0' : infIndMoneda(faltanteDia);

    const ayer = new Date(anio, mes - 1, fecha.getDate() - 1);
    const ventasAyer = _acuVentasDelDia(tienda, ayer);
    const ventaAyer = ventasAyer.reduce((s, v) => s + (v.venta || 0), 0);
    const varPct = ventaAyer > 0 ? ((totalVentaDia - ventaAyer) / ventaAyer) * 100 : (totalVentaDia > 0 ? 100 : 0);
    document.getElementById('acu-comp-hoy').textContent = infIndMoneda(totalVentaDia);
    document.getElementById('acu-comp-ayer').textContent = infIndMoneda(ventaAyer);
    const varEl = document.getElementById('acu-comp-var');
    varEl.textContent = (varPct >= 0 ? '+' : '') + infIndPctStr(varPct);
    varEl.className = varPct >= 0 ? 'acu-var-ok' : 'acu-var-bad';

    const tbody = document.getElementById('acu-tabla');
    if (!tbody) return;
    const prodRows = rows.map(r => {
        const sem = _acuSem(r.alcance);
        const pctStr = r.metaDia > 0 ? infIndPctStr(r.alcance) : '\u2014';
        return '<tr>' +
            '<td class="inf-ind-th-left">' + infIndEsc(r.nombre) + '</td>' +
            '<td class="inf-ind-num ' + (r.ventaDia > 0 ? '' : 'inf-ind-vacio') + '">' + (r.ventaDia > 0 ? infIndMoneda(r.ventaDia) : '\u2014') + '</td>' +
            '<td class="inf-ind-num">' + (r.metaDia > 0 ? infIndMoneda(r.metaDia) : '\u2014') + '</td>' +
            '<td class="acu-sem-' + sem + '"><span class="acu-sem-dot"></span>' + pctStr + '</td>' +
            '</tr>';
    }).join('');

    const totSem = _acuSem(totalAlcance);
    const totalRow = '<tr class="acu-total-row">' +
        '<td class="inf-ind-th-left acu-total-label">TOTAL DEL D\u00cdA</td>' +
        '<td class="inf-ind-num acu-total-val">' + infIndMoneda(totalVentaDia) + '</td>' +
        '<td class="inf-ind-num acu-total-val">' + infIndMoneda(totalMetaDia) + '</td>' +
        '<td class="acu-sem-' + totSem + '"><span class="acu-sem-dot"></span>' + infIndPctStr(totalAlcance) + '</td>' +
        '</tr>';

    tbody.innerHTML = prodRows + totalRow;
}

function cambiarVistaAcumulado(vista) {
    acuVista = (vista === 'zona') ? 'zona' : 'tienda';
    renderizarAcumuladoDiario();
}

function syncVistaAcuUI() {
    const tabs = document.getElementById('acu-view-tabs');
    if (tabs) {
        tabs.style.display = 'flex';
        tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.vista === acuVista));
    }
}

function renderAcumuladoZona(fecha, tienda) {
    const tbody = document.getElementById('acu-zona-tabla');
    if (!tbody) return;
    const zonaPDVs = _pdvsDeZonaDeTienda(tienda);
    if (!zonaPDVs.length) {
        tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state"><p>No se pudo identificar los puntos de venta de tu zona.</p></div></td></tr>';
        return;
    }

    const anio = fecha.getFullYear();
    const mes = fecha.getMonth() + 1;
    const dia = fecha.getDate();
    const ventas = (typeof DataStore !== 'undefined' && typeof DataStore.getVentasActivas === 'function') ? DataStore.getVentasActivas() : [];
    const ADn = _acuNorm('Apuestas Deportivas');
    const JVn = _acuNorm('Juegos Virtuales');

    const ventasDia = ventas.filter(v => {
        if (!v || !v.punto_venta) return false;
        const f = v.fecha ? new Date(v.fecha) : null;
        if (f && !isNaN(f.getTime())) {
            return f.getFullYear() === anio && f.getMonth() + 1 === mes && f.getDate() === dia;
        }
        return v.dia === dia && (v.mes || mes) === mes && (v.anio || anio) === anio;
    });

    let rowsHtml = '';
    let totAD = 0, totJV = 0;
    for (const pdv of zonaPDVs) {
        let ad = 0, jv = 0;
        ventasDia.forEach(v => {
            if (v.punto_venta !== pdv) return;
            const n = _acuNorm(v.producto);
            if (n === ADn) ad += (v.venta || 0);
            else if (n === JVn) jv += (v.venta || 0);
        });
        const total = ad + jv;
        totAD += ad; totJV += jv;
        rowsHtml += '<tr>' +
            '<td class="inf-ind-th-left">' + infIndEsc(pdv) + '</td>' +
            '<td class="inf-ind-num ' + (ad > 0 ? '' : 'inf-ind-vacio') + '">' + (ad > 0 ? infIndMoneda(ad) : '\u2014') + '</td>' +
            '<td class="inf-ind-num ' + (jv > 0 ? '' : 'inf-ind-vacio') + '">' + (jv > 0 ? infIndMoneda(jv) : '\u2014') + '</td>' +
            '<td class="inf-ind-num ' + (total > 0 ? '' : 'inf-ind-vacio') + '">' + (total > 0 ? infIndMoneda(total) : '\u2014') + '</td>' +
            '</tr>';
    }

    const totTotal = totAD + totJV;
    const totalRow = '<tr class="acu-total-row">' +
        '<td class="inf-ind-th-left acu-total-label">TOTAL ZONA</td>' +
        '<td class="inf-ind-num acu-total-val">' + infIndMoneda(totAD) + '</td>' +
        '<td class="inf-ind-num acu-total-val">' + infIndMoneda(totJV) + '</td>' +
        '<td class="inf-ind-num acu-total-val">' + infIndMoneda(totTotal) + '</td>' +
        '</tr>';

    tbody.innerHTML = rowsHtml + totalRow;
}

function renderHeroUsuarioInforme(promotor) {
    const zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
    const zona = promotor.zona_principal_id ? zonas.find(z => z.id === promotor.zona_principal_id) : null;
    const tienda = zona ? zona.nombre : 'Sin tienda asignada';
    return '' +
        '<div class="inf-ind-user-avatar"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>' +
        '<div class="inf-ind-user-data">' +
            '<div class="inf-ind-user-name">' + infIndEsc(promotor.nombre) + '</div>' +
            '<div class="inf-ind-user-mail">' + infIndEsc(promotor.email || 'Sin correo') + '</div>' +
            '<div class="inf-ind-user-tienda">' + infIndEsc(tienda) + '</div>' +
        '</div>';
}

function _evolucionDiariaVentas(ventas, fechaDesde, fechaHasta) {
    const fechaIni = fechaDesde ? new Date(fechaDesde + 'T00:00:00') : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const fechaFin = fechaHasta ? new Date(fechaHasta + 'T23:59:59') : new Date();
    const diffTime = Math.abs(fechaFin - fechaIni);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const map = {};
    const labels = [];
    for (let d = 1; d <= diffDays; d++) {
        const date = new Date(fechaIni);
        date.setDate(date.getDate() + d - 1);
        const key = date.getDate() + '/' + (date.getMonth() + 1);
        map[key] = 0;
        labels.push(key);
    }
    ventas.forEach(v => {
        if (!v.fecha) return;
        const f = new Date(v.fecha);
        const key = f.getDate() + '/' + (f.getMonth() + 1);
        if (map[key] !== undefined) map[key] += (v.venta || 0);
    });
    const valores = labels.map(l => map[l]);
    return { labels, valores };
}

function _desempenoPorProducto(ventas) {
    const productos = DataStore.getProductos();

    const filas = productos.map(prod => {
        const venta = ventas.filter(v => v.producto === prod).reduce((s, x) => s + (x.venta || 0), 0);
        return { producto: prod, venta };
    });
    filas.sort((a, b) => b.venta - a.venta);
    const totalVenta = filas.reduce((s, r) => s + r.venta, 0);
    filas.forEach(r => { r.participacion = totalVenta > 0 ? (r.venta / totalVenta) * 100 : 0; });
    return filas;
}

function renderTablaProductosInforme(rows) {
    const tbody = document.getElementById('inf-ind-tabla-productos');
    if (!tbody) return;
    if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#727272;padding:24px;">Sin datos de productos para el periodo.</td></tr>';
        return;
    }
    tbody.innerHTML = rows.map(r => {
        return '' +
            '<tr>' +
                '<td class="inf-ind-th-left">' + infIndEsc(r.producto) + '</td>' +
                '<td class="inf-ind-num ' + (r.venta > 0 ? '' : 'inf-ind-vacio') + '">' + (r.venta > 0 ? infIndMoneda(r.venta) : '\u2014') + '</td>' +
                '<td>' +
                    '<div class="inf-ind-bar-track"><div class="inf-ind-bar-fill cumple" style="width:' + Math.min(r.participacion, 100) + '%;"></div></div>' +
                    '<span class="inf-ind-bar-pct cumple">' + infIndPctStr(r.participacion) + '</span>' +
                '</td>' +
            '</tr>';
    }).join('');
}

function renderTopBottomProductos(rows) {
    const mejor = rows[0];
    const peor = rows[rows.length - 1];
    const totalVenta = rows.reduce((s, r) => s + r.venta, 0);

    const setCard = (idName, idValor, idPct) => (r) => {
        document.getElementById(idName).textContent = r ? r.producto : '\u2014';
        document.getElementById(idValor).textContent = r && r.venta > 0 ? infIndMoneda(r.venta) : 'Sin ventas';
        document.getElementById(idPct).textContent = totalVenta > 0 && r ? infIndPctStr((r.venta / totalVenta) * 100) + ' de participaci\u00f3n' : '\u2014';
    };
    const rellenarMejor = setCard('inf-ind-mejor', 'inf-ind-mejor-valor', 'inf-ind-mejor-pct');
    const rellenarPeor = setCard('inf-ind-peor', 'inf-ind-peor-valor', 'inf-ind-peor-pct');
    if (mejor) rellenarMejor(mejor);
    if (peor) rellenarPeor(peor);
    else {
        document.getElementById('inf-ind-mejor').textContent = '\u2014';
        document.getElementById('inf-ind-mejor-valor').textContent = 'Sin ventas';
        document.getElementById('inf-ind-mejor-pct').textContent = '\u2014';
        document.getElementById('inf-ind-peor').textContent = '\u2014';
        document.getElementById('inf-ind-peor-valor').textContent = 'Sin ventas';
        document.getElementById('inf-ind-peor-pct').textContent = '\u2014';
    }
}

function renderInfIndCharts(trend, productoRows) {
    infIndDestroyCharts();

    const canvasEvo = document.getElementById('infIndChartEvolucion');
    if (canvasEvo && trend.labels.length > 0) {
        const ctx = canvasEvo.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 0, 260);
        grad.addColorStop(0, 'rgba(29,185,84,0.30)');
        grad.addColorStop(1, 'rgba(29,185,84,0)');
        infIndChartInstances['evolucion'] = new Chart(canvasEvo, {
            type: 'line',
            data: {
                labels: trend.labels,
                datasets: [{
                    label: 'Venta del d\u00eda',
                    data: trend.valores,
                    borderColor: '#1DB954',
                    backgroundColor: grad,
                    fill: true,
                    tension: 0.35,
                    borderWidth: 2,
                    pointRadius: 2,
                    pointHoverRadius: 4,
                    pointBackgroundColor: '#1DB954'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: () => temaCss('--chart-tooltip2'),
                        titleColor: () => temaCss('--t-text'),
                        bodyColor: () => temaCss('--chart-tick'),
                        borderColor: () => temaCss('--chart-tooltip-border'),
                        borderWidth: 1,
                        callbacks: {
                            label: c => infIndMoneda(c.parsed.y)
                        }
                    }
                },
                scales: {
                    x: { ticks: { color: () => temaCss('--chart-tick'), font: { size: 9 }, maxRotation: 45 }, grid: { color: () => temaCss('--chart-grid3') } },
                    y: { beginAtZero: true, ticks: { color: () => temaCss('--chart-tick'), font: { size: 9 }, callback: v => 'S/ ' + v }, grid: { color: () => temaCss('--chart-grid2') } }
                }
            }
        });
    }

    const canvasProd = document.getElementById('infIndChartProductos');
    if (canvasProd && productoRows.length > 0) {
        const labels = productoRows.map(r => r.producto);
        const valores = productoRows.map(r => r.venta);
        const colores = productoRows.map(r => r.venta > 0 ? '#1DB954' : '#6B7280');
        infIndChartInstances['productos'] = new Chart(canvasProd, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Venta',
                    data: valores,
                    backgroundColor: colores.map(c => c + 'CC'),
                    borderColor: colores,
                    borderWidth: 1,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: () => temaCss('--chart-tooltip2'),
                        titleColor: () => temaCss('--t-text'),
                        bodyColor: () => temaCss('--chart-tick'),
                        borderColor: () => temaCss('--chart-tooltip-border'),
                        borderWidth: 1,
                        callbacks: { label: c => infIndMoneda(c.parsed.x) }
                    }
                },
                scales: {
                    x: { beginAtZero: true, ticks: { color: () => temaCss('--chart-tick'), font: { size: 9 }, callback: v => 'S/ ' + v }, grid: { color: () => temaCss('--chart-grid2') } },
                    y: { ticks: { color: () => temaCss('--chart-tick2'), font: { size: 10 } }, grid: { display: false } }
                }
            }
        });
    }
}

function cambiarTabInformeIndividual(tab) {
    infIndTab = tab === 'promociones' ? 'promociones' : 'desempeno';
    const tabs = document.getElementById('inf-ind-tabs');
    if (tabs) tabs.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.indtab === infIndTab));
    const d = document.getElementById('inf-ind-tab-desempeno');
    const p = document.getElementById('inf-ind-tab-promociones');
    if (d) d.style.display = infIndTab === 'desempeno' ? '' : 'none';
    if (p) p.style.display = infIndTab === 'promociones' ? '' : 'none';
    if (infIndTab === 'promociones') renderPromocionesInformeIndividual();
    else if (d && p) {
        p.innerHTML = '';
    }
}

function renderPromocionesInformeIndividual() {
    const cont = document.getElementById('inf-ind-tab-promociones');
    if (!cont) return;

    const promotor = obtenerPromotorSesionInforme();
    if (!promotor) {
        cont.innerHTML = '<div class="inf-ind-card"><div class="empty-state"><p>Inicia sesi\u00f3n como promotor.</p></div></div>';
        return;
    }

    if (typeof PromocionesStore === 'undefined' || !PromocionesStore._firestoreLoaded) {
        cont.innerHTML = '<div class="inf-ind-card"><div class="empty-state"><p>Cargando promociones...</p></div></div>';
        return;
    }

    let registros = PromocionesStore.getRegistrosEnRango(infIndFechas.desde, infIndFechas.hasta);
    registros = registros.filter(r => r && r.promotor_id === promotor.id);

    const total = registros.reduce((s, r) => s + (r.cantidad || 0), 0);

    if (registros.length === 0) {
        cont.innerHTML = '<div class="inf-ind-card"><div class="empty-state"><p>No existen registros de promociones para el periodo seleccionado.</p></div></div>';
        return;
    }

    const porPromo = {};
    registros.forEach(r => {
        porPromo[r.promocion] = (porPromo[r.promocion] || 0) + (r.cantidad || 0);
    });
    const ranking = Object.entries(porPromo)
        .map(([promocion, cantidad]) => ({ promocion, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);
    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];

    const rows = ranking.map((r, i) => {
        const pct = _promoPct(r.cantidad, total);
        const medalla = i < 3 ? ' ' + medals[i] : '';
        return '<tr>' +
            '<td class="ctl-td-pos">' + (i + 1) + medalla + '</td>' +
            '<td class="ctl-td-left ctl-td-strong">' + ctlEsc(r.promocion) + '</td>' +
            '<td>' + r.cantidad + '</td>' +
            '<td>' + ctlBarCell(pct) + '</td>' +
            '<td>' + formatPercent(pct) + '</td>' +
            '</tr>';
    }).join('');

    cont.innerHTML = '' +
        '<div class="inf-ind-card">' +
            '<div class="inf-ind-card-title">&#127873; Mis Promociones</div>' +
            '<div class="inf-ind-promo-total">' + total + ' cantidades registradas \u00b7 ' + ranking.length + ' promociones</div>' +
            '<div class="ctl-table-wrap"><table class="ctl-table">' +
                '<thead><tr><th class="ctl-th-left">#</th><th class="ctl-th-left">Promoci\u00f3n</th><th>Cantidad</th><th>Participaci\u00f3n</th><th>%</th></tr></thead>' +
                '<tbody>' + rows + '</tbody>' +
            '</table></div>' +
        '</div>';
}
