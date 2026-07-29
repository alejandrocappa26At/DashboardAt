function renderizarResumenEjecutivo() {
    renderAvisoOficial();
    const ventaTotal = DataStore.getVentaTotal();
    const cuotaTotal = DataStore.getCuotaTotal();
    const avance = DataStore.getAvanceGeneral();
    const proyeccion = DataStore.getProyeccion();
    const pdvCumplen = DataStore.getPDVsCumplenMeta();
    const totalPDVs = DataStore.getPDVs().length;
    const pdvRiesgo = DataStore.getPDVsEnRiesgo();
    const mejorPDV = DataStore.getMejorPDV();

    document.getElementById('kpi-venta-total').textContent = formatCurrency(ventaTotal);
    document.getElementById('kpi-venta-sub').textContent = 'de ' + formatCurrency(cuotaTotal) + ' meta total';
    document.getElementById('kpi-avance').textContent = formatPercent(avance);
    document.getElementById('kpi-avance-sub').textContent = avance >= 100 ? '\u00a1Meta alcanzada!' : 'Falta ' + formatPercent(100 - avance) + ' para la meta';
    document.getElementById('kpi-proyeccion').textContent = formatCurrency(proyeccion);
    document.getElementById('kpi-proyeccion-sub').textContent = proyeccion >= cuotaTotal ? 'Supera la meta mensual' : 'Por debajo de la meta';
    document.getElementById('kpi-cumplen').textContent = pdvCumplen + ' / ' + totalPDVs;
    document.getElementById('kpi-cumplen-sub').textContent = totalPDVs > 0 ? Math.round((pdvCumplen / totalPDVs) * 100) + '% de PDVs cumplen' : '';
    document.getElementById('kpi-riesgo').textContent = pdvRiesgo;
    document.getElementById('kpi-riesgo-sub').textContent = totalPDVs > 0 ? Math.round((pdvRiesgo / totalPDVs) * 100) + '% de PDVs en riesgo' : '';
    document.getElementById('kpi-mejor-pdv').textContent = mejorPDV.replace('Red AT ', '');

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

function renderizarAvancePDV(pdvSeleccionado) {
    renderAvisoOficial();
    const pdvs = DataStore.getPDVs();
    const select = document.getElementById('pdv-select');
    if (!select) return;

    if (!pdvSeleccionado) {
        pdvSeleccionado = select.value || pdvs[0];
    }
    select.value = pdvSeleccionado;

    document.getElementById('pdv-dia-actual').textContent = DataStore.getDiaActual();

    const data = DataStore.getProyeccionPDV(pdvSeleccionado);
    if (!data) {
        document.getElementById('pdv-content').innerHTML = '<div class="empty-state"><p>Selecciona un punto de venta</p></div>';
        return;
    }

    const iconMap = {
        'Apuestas Deportivas': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        'Lottingo': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
        'Hípica': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3L3 17l4 4L21 7l-4-4z"/><path d="M8 8l4-4"/><path d="M16 16l-4 4"/></svg>',
        'Juegos Virtuales': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>',
        'Torito': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>',
        'VLT': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>',
        'LOTOBOLA': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>'
    };

    const mesNumero = MES;
    const anio = ANIO;
    const diaActual = DataStore.getDiaActual();
    const diasDelMes = new Date(anio, mesNumero, 0).getDate();

    let html = '';
    for (let prod of DataStore.getProductos()) {
        const p = data.productos[prod];
        const semaforoCls = p.cumplimiento >= 100 ? 'green' : p.cumplimiento >= 80 ? 'yellow' : 'red';
        const proyPDV = diaActual > 0 ? (p.venta / diaActual) * diasDelMes : 0;
        const proyCumple = proyPDV >= p.cuota;
        const diferencia = p.cuota - p.venta;

        const vdrResult = DataStore.calcularVentaDiariaRequerida({ diferencia, anio, mesNumero, diaActual });

        let dailyRequiredDesktop = '';
        let dailyRequiredMobile = '';
        let dailyRequiredColor = '#b3b3b3';

        if (vdrResult.estado === 'meta_cumplida') {
            dailyRequiredDesktop = '<span class="pdv-daily-required" style="color:#1DB954;">✓ Meta cumplida</span>';
            dailyRequiredMobile = '<span class="pdv-daily-required-mobile" style="color:#1DB954;font-size:11px;">✓ Meta cumplida</span>';
        } else if (vdrResult.estado === 'mes_finalizado') {
            dailyRequiredDesktop = '<span class="pdv-daily-required" style="color:#5A5A5A;">Mes finalizado</span>';
            dailyRequiredMobile = '<span class="pdv-daily-required-mobile" style="color:#5A5A5A;font-size:11px;">Mes finalizado</span>';
        } else {
            const vdr = vdrResult.ventaDiariaRequerida;
            const promedioDiarioActual = diaActual > 0 ? p.venta / diaActual : 0;

            let urgenciaLabel = '';
            if (promedioDiarioActual > 0 && vdr > 0) {
                const factorUrgencia = vdr / promedioDiarioActual;
                if (factorUrgencia <= 1) {
                    dailyRequiredColor = '#1DB954';
                    urgenciaLabel = 'Ritmo actual suficiente';
                } else if (factorUrgencia <= 1.5) {
                    dailyRequiredColor = '#F5A623';
                    urgenciaLabel = 'Necesitas acelerar el ritmo';
                } else {
                    dailyRequiredColor = '#E74C3C';
                    const pctExtra = Math.round((factorUrgencia - 1) * 100);
                    urgenciaLabel = `Ritmo insuficiente, +${pctExtra}% requerido`;
                }
            }

            const tooltipText = `${formatCurrency(diferencia)} ÷ ${vdrResult.diasRestantes} días restantes${urgenciaLabel ? ' · ' + urgenciaLabel : ''}`;
            const clockIcon = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

            dailyRequiredDesktop = `<span class="pdv-daily-required" style="color:${dailyRequiredColor};" title="${tooltipText}">${clockIcon} ${formatCurrency(vdr)}/día requerido</span>`;
            dailyRequiredMobile = `<span class="pdv-daily-required-mobile" style="color:${dailyRequiredColor};font-size:11px;" title="${tooltipText}">→ ${formatCurrency(vdr)}/día para cumplir</span>`;
        }

        html += `
        <div class="pdv-card card-${semaforoCls}">
            <div class="pdv-card-header">
                <div class="pdv-card-title-group">
                    <div class="pdv-card-icon ${semaforoCls}">${iconMap[prod] || ''}</div>
                    <span class="pdv-card-title">${prod}</span>
                </div>
                <span class="pdv-pct-badge ${semaforoCls}">${formatPercent(p.cumplimiento)}</span>
            </div>

            <div class="pdv-stats-row">
                <div class="pdv-stat-card">
                    <div class="pdv-stat-label">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                        Cuota
                    </div>
                    <div class="pdv-stat-value">${formatCurrency(p.cuota)}</div>
                </div>
                <div class="pdv-stat-card">
                    <div class="pdv-stat-label">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                        Venta Acumulada
                    </div>
                    <div class="pdv-stat-value">${formatCurrency(p.venta)}</div>
                </div>
                <div class="pdv-stat-card">
                    <div class="pdv-stat-label">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        Diferencia
                    </div>
                    <div class="pdv-stat-value ${p.venta >= p.cuota ? 'green' : 'red'}">
                        ${p.venta >= p.cuota ? '\u2713 ' : ''}${formatCurrency(Math.abs(diferencia))}
                    </div>
                </div>
                <div class="pdv-stat-card">
                    <div class="pdv-stat-label">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Proyecci\u00f3n
                    </div>
                    <div class="pdv-stat-value">${formatCurrency(proyPDV)}</div>
                </div>
            </div>

            <div class="pdv-progress-section">
                <div class="pdv-progress-header">
                    <div class="pdv-progress-header-left">
                        <span class="pdv-progress-label">Avance: <strong style="color:#ffffff;">${formatPercent(p.cumplimiento)}</strong></span>
                        ${dailyRequiredDesktop}
                    </div>
                    <div class="pdv-progress-header-right">
                        <span class="pdv-progress-faltan ${semaforoCls}">${p.venta >= p.cuota ? 'Meta alcanzada \u2713' : 'Faltan: ' + formatCurrency(diferencia)}</span>
                        ${dailyRequiredMobile}
                    </div>
                </div>
                <div class="pdv-progress-track">
                    <div class="pdv-progress-fill ${semaforoCls}" style="width:${Math.min(p.cumplimiento, 100)}%;"></div>
                </div>
            </div>

            <div class="pdv-projection">
                <div class="pdv-projection-label">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
                    Proyecci\u00f3n fin de mes
                </div>
                <span class="pdv-projection-badge ${proyCumple ? 'green' : 'red'}">
                    ${proyCumple
                        ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Se proyecta cumplir la meta'
                        : '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> No se proyecta cumplir la meta'}
                </span>
                <div class="pdv-legend">
                    <div class="pdv-legend-item" title="Cumplimiento \u2265 100%">
                        <span class="pdv-legend-dot green"></span> \u2265 100%
                    </div>
                    <div class="pdv-legend-item" title="Cumplimiento entre 80% y 99%">
                        <span class="pdv-legend-dot yellow"></span> 80-99%
                    </div>
                    <div class="pdv-legend-item" title="Cumplimiento menor a 80%">
                        <span class="pdv-legend-dot red"></span> &lt; 80%
                    </div>
                </div>
            </div>
        </div>`;
    }

    document.getElementById('pdv-content').innerHTML = html;
}

function renderizarRanking() {
    renderAvisoOficial();
    const ranking = DataStore.getRanking();
    if (!document.getElementById('page-ranking')) return;

    const medals = ['\ud83e\udd47', '\ud83e\udd48', '\ud83e\udd49'];
    const podiumColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

    const top3 = ranking.slice(0, 3);
    const rest = ranking.slice(3);

    const podiumHtml = top3.map((r, i) => {
        const hue = i === 0 ? 45 : i === 1 ? 0 : 30;
        const sat = i === 0 ? 100 : i === 1 ? 40 : 60;
        const light = i === 0 ? 55 : i === 1 ? 75 : 55;
        return `
            <div class="podium-card podium-${['gold','silver','bronze'][i]}">
                <div class="podium-medal">${medals[i]}</div>
                <div class="podium-position">#${r.puesto}</div>
                <div class="podium-name">${r.punto_venta}</div>
                <div class="podium-score">${r.puntaje.toFixed(1)}%</div>
                <div class="podium-bar-track">
                    <div class="podium-bar-fill" style="width:${Math.min(r.cumplimiento, 100)}%;background:hsl(${hue},${sat}%,${light}%);"></div>
                </div>
                <div class="podium-stats">
                    <div class="podium-stat">
                        <span class="podium-stat-label">Venta</span>
                        <span class="podium-stat-value">${formatCurrency(r.venta_total)}</span>
                    </div>
                    <div class="podium-stat">
                        <span class="podium-stat-label">Proy.</span>
                        <span class="podium-stat-value">${formatCurrency(r.proyeccion)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('ranking-podium').innerHTML = podiumHtml;

    const listHtml = rest.map((r, i) => {
        const pc = r.cumplimiento;
        const barColor = pc >= 100 ? 'var(--accent)' : pc >= 80 ? 'var(--warning)' : 'var(--danger)';
        const rowClass = pc >= 100 ? 'rank-row-green' : pc >= 80 ? 'rank-row-yellow' : 'rank-row-red';
        return `
            <div class="rank-row ${rowClass}" style="animation-delay:${i * 0.04}s">
                <div class="rank-row-pos">#${r.puesto}</div>
                <div class="rank-row-info">
                    <div class="rank-row-name">${r.punto_venta}</div>
                    <div class="rank-row-bar-track">
                        <div class="rank-row-bar-fill" style="width:${Math.min(pc, 100)}%;background:${barColor};"></div>
                    </div>
                </div>
                <div class="rank-row-data">
                    <div class="rank-row-pct" style="color:${barColor}">${formatPercent(pc)}</div>
                    <div class="rank-row-sub">${formatCurrency(r.venta_total)}</div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('ranking-list').innerHTML = listHtml;
    document.getElementById('ranking-list-count').textContent = `${ranking.length} tiendas`;

    const cumplen = ranking.filter(r => r.cumplimiento >= 100).length;
    const riesgo = ranking.filter(r => r.cumplimiento < 80).length;
    document.getElementById('ranking-hero-stats').innerHTML = `
        <div class="ranking-hero-stat">
            <span class="ranking-hero-stat-value" style="color:var(--accent)">${cumplen}</span>
            <span class="ranking-hero-stat-label">Cumplen meta</span>
        </div>
        <div class="ranking-hero-stat">
            <span class="ranking-hero-stat-value" style="color:var(--warning)">${ranking.length - cumplen - riesgo}</span>
            <span class="ranking-hero-stat-label">En observación</span>
        </div>
        <div class="ranking-hero-stat">
            <span class="ranking-hero-stat-value" style="color:var(--danger)">${riesgo}</span>
            <span class="ranking-hero-stat-label">En riesgo</span>
        </div>
    `;

    createRankingChart();
}

function renderizarResumenGeneralPDV() {
    renderAvisoOficial();
    try {
        const container = document.getElementById('rpdv-hero-kpis');
        if (!container) return;

        const pdvs = DataStore.getCumplimientoPorPDV();
        const entries = Object.entries(pdvs).map(([pdv, data]) => ({
            punto_venta: pdv,
            cuota: data.cuota || 0,
            venta: data.venta || 0,
            cumplimiento: data.cumplimiento || 0,
            proyeccion: data.proyeccion || 0,
            diferencia: data.diferencia || 0,
            cadena: data.cadena || 'General'
        }));

        const cuotaGlobal = entries.reduce((s, e) => s + e.cuota, 0);
        const ventaGlobal = entries.reduce((s, e) => s + e.venta, 0);
        const cumplimientoGlobal = cuotaGlobal > 0 ? (ventaGlobal / cuotaGlobal) * 100 : 0;
        const proyeccionGlobal = entries.reduce((s, e) => s + e.proyeccion, 0);

        container.innerHTML = `
            <div class="rpdv-hero-kpi">
                <span class="rpdv-hero-kpi-value" style="color:var(--accent)">${formatCurrency(cuotaGlobal)}</span>
                <span class="rpdv-hero-kpi-label">Cuota Global</span>
            </div>
            <div class="rpdv-hero-kpi">
                <span class="rpdv-hero-kpi-value">${formatCurrency(ventaGlobal)}</span>
                <span class="rpdv-hero-kpi-label">Venta Acumulada</span>
            </div>
            <div class="rpdv-hero-kpi">
                <span class="rpdv-hero-kpi-value" style="color:${cumplimientoGlobal >= 100 ? 'var(--accent)' : cumplimientoGlobal >= 80 ? 'var(--warning)' : 'var(--danger)'}">${formatPercent(cumplimientoGlobal)}</span>
                <span class="rpdv-hero-kpi-label">Cumplimiento General</span>
            </div>
            <div class="rpdv-hero-kpi">
                <span class="rpdv-hero-kpi-value" style="color:var(--accent)">${formatCurrency(proyeccionGlobal)}</span>
                <span class="rpdv-hero-kpi-label">Proyección Global</span>
            </div>
        `;

        const cadenaSelect = document.getElementById('rpdv-filter-cadena');
        if (cadenaSelect) {
            const cadenas = [...new Set(entries.map(e => e.cadena))].sort();
            cadenaSelect.innerHTML = '<option value="all">Todas las redes</option>' +
                cadenas.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        function renderCards(data) {
            const search = (document.getElementById('rpdv-search').value || '').toLowerCase();
            const filtroCump = document.getElementById('rpdv-filter-cumplimiento').value;
            const filtroCadena = document.getElementById('rpdv-filter-cadena').value;
            const sort = document.getElementById('rpdv-sort').value;

            let filtered = data.filter(e => {
                if (search && !e.punto_venta.toLowerCase().includes(search)) return false;
                if (filtroCump === 'green' && e.cumplimiento < 100) return false;
                if (filtroCump === 'yellow' && (e.cumplimiento < 80 || e.cumplimiento >= 100)) return false;
                if (filtroCump === 'red' && e.cumplimiento >= 80) return false;
                if (filtroCadena !== 'all' && e.cadena !== filtroCadena) return false;
                return true;
            });

            const [field, dir] = sort.split('-');
            filtered.sort((a, b) => {
                const va = a[field === 'cumplimiento' ? 'cumplimiento' : field === 'venta' ? 'venta' : 'cuota'];
                const vb = b[field === 'cumplimiento' ? 'cumplimiento' : field === 'venta' ? 'venta' : 'cuota'];
                return dir === 'desc' ? vb - va : va - vb;
            });

            const countEl = document.getElementById('rpdv-count');
            if (countEl) countEl.textContent = `${filtered.length} de ${data.length} tiendas`;

            const gridEl = document.getElementById('rpdv-grid');
            if (!gridEl) return;

            gridEl.innerHTML = filtered.map((e, i) => {
                const pct = e.cumplimiento;
                const color = pct >= 100 ? 'var(--accent)' : pct >= 80 ? 'var(--warning)' : 'var(--danger)';
                const estado = pct >= 100 ? 'Cumpliendo meta' : pct >= 80 ? 'En seguimiento' : 'En riesgo';
                const colorClase = pct >= 100 ? 'green' : pct >= 80 ? 'yellow' : 'red';
                const icono = pct >= 100 ? '\u2705' : pct >= 80 ? '\ud83d\udfe1' : '\ud83d\udd34';
                return `
                    <div class="rpdv-card ${colorClase}" style="animation-delay:${i * 0.035}s">
                        <div class="rpdv-card-top">
                            <div class="rpdv-card-icon">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            </div>
                            <div class="rpdv-card-name">${e.punto_venta}</div>
                            <span class="rpdv-card-badge ${colorClase}">${formatPercent(pct)}</span>
                        </div>
                        <div class="rpdv-card-body">
                            <div class="rpdv-card-metrics">
                                <div class="rpdv-card-metric">
                                    <span class="rpdv-metric-label">Cuota Total</span>
                                    <span class="rpdv-metric-value">${formatCurrency(e.cuota)}</span>
                                </div>
                                <div class="rpdv-card-metric">
                                    <span class="rpdv-metric-label">Venta Acumulada</span>
                                    <span class="rpdv-metric-value">${formatCurrency(e.venta)}</span>
                                </div>
                                <div class="rpdv-card-metric">
                                    <span class="rpdv-metric-label">Faltante</span>
                                    <span class="rpdv-metric-value" style="color:${e.diferencia <= 0 ? 'var(--accent)' : 'var(--danger)'}">${formatCurrency(Math.max(e.diferencia, 0))}</span>
                                </div>
                                <div class="rpdv-card-metric">
                                    <span class="rpdv-metric-label">Proyecci\u00f3n</span>
                                    <span class="rpdv-metric-value" style="color:${e.proyeccion >= e.cuota ? 'var(--accent)' : 'var(--text-secondary)'}">${formatCurrency(e.proyeccion)}</span>
                                </div>
                            </div>
                            <div class="rpdv-card-bar">
                                <div class="rpdv-bar-track">
                                    <div class="rpdv-bar-fill ${colorClase}" style="width:${Math.min(pct, 100)}%"></div>
                                </div>
                                <div class="rpdv-bar-label" style="color:${color}">${formatPercent(pct)}</div>
                            </div>
                            <div class="rpdv-card-status ${colorClase}">${icono} ${estado}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        renderCards(entries);

        ['rpdv-search', 'rpdv-filter-cumplimiento', 'rpdv-filter-cadena', 'rpdv-sort'].forEach(id => {
            const el = document.getElementById(id);
            if (!el || !el.parentNode) return;
            const clone = el.cloneNode(true);
            el.parentNode.replaceChild(clone, el);
        });

        const searchInput = document.getElementById('rpdv-search');
        if (searchInput) searchInput.addEventListener('input', () => renderCards(entries));

        const filterCump = document.getElementById('rpdv-filter-cumplimiento');
        if (filterCump) filterCump.addEventListener('change', () => renderCards(entries));

        const filterCad = document.getElementById('rpdv-filter-cadena');
        if (filterCad) filterCad.addEventListener('change', () => renderCards(entries));

        const sortEl = document.getElementById('rpdv-sort');
        if (sortEl) sortEl.addEventListener('change', () => renderCards(entries));

        createResumenPDVCharts(entries);
    } catch (e) {
        console.error('Error en Resumen General PDV:', e);
    }
}

function createResumenPDVCharts(entries) {
    if (typeof Chart === 'undefined') return;
    const page = document.getElementById('page-resumen-pdv');
    if (!page || !page.classList.contains('active')) return;
    const sorted = [...entries].sort((a, b) => b.cumplimiento - a.cumplimiento);
    const top10 = sorted.slice(0, 10);
    const bottom10 = sorted.slice(-10).reverse();

    function safeDestroy(id) {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
    }

    function makeChart(id, data, colors) {
        const canvas = document.getElementById(id);
        if (!canvas || data.length === 0) return;
        const labels = data.map(e => {
            let name = e.punto_venta;
            name = name.replace(/^Red AT\s+/i, '').replace(/^Red At\s+/i, '');
            return name.length > 18 ? name.substring(0, 16) + '...' : name;
        });
        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '% Cumplimiento',
                    data: data.map(e => Math.min(Math.max(e.cumplimiento, 0), 100)),
                    backgroundColor: colors || data.map(e =>
                        e.cumplimiento >= 100 ? '#22C55E' : e.cumplimiento >= 80 ? '#F59E0B' : '#EF4444'
                    ),
                    borderRadius: 4,
                    borderSkipped: false,
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1a1a1a',
                        titleColor: '#fff',
                        bodyColor: '#b3b3b3',
                        borderColor: '#282828',
                        borderWidth: 1,
                        cornerRadius: 8,
                        padding: 12,
                        callbacks: {
                            label: ctx => 'Cumplimiento: ' + formatPercent(ctx.raw)
                        }
                    }
                },
                scales: {
                    x: {
                        max: 100,
                        grid: { color: 'rgba(255,255,255,0.04)' },
                        ticks: { color: '#727272', font: { size: 10 }, callback: v => v + '%' }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#b3b3b3', font: { size: 11, weight: '600' } }
                    }
                }
            }
        });
    }

    safeDestroy('chartTop10');
    safeDestroy('chartBottom10');
    safeDestroy('chartAllPDV');

    const allColors = sorted.map(e =>
        e.cumplimiento >= 100 ? '#22C55E' : e.cumplimiento >= 80 ? '#F59E0B' : '#EF4444'
    );

    makeChart('chartTop10', top10);
    makeChart('chartBottom10', bottom10);
    makeChart('chartAllPDV', sorted, allColors);
}

function poblarFiltros() {
    const pdvs = DataStore.getPDVs();
    console.log('[AUDITORIA] poblarFiltros pdvs:', pdvs.length, pdvs);
    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        pdvSelect.innerHTML = '<option value="">Seleccionar punto de venta...</option>' +
            pdvs.map(p => `<option value="${p}">${p}</option>`).join('');
        console.log('[AUDITORIA] pdv-select options después de poblar:', pdvSelect.options.length);
    }
}

const reporteSort = { sortBy: 'pdv', sortDir: 'asc' };

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
        if (id === 'resumen' || id === 'horarios' || id === 'horarios-view') {
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
            if (id === 'resumen' || id === 'horarios' || id === 'horarios-view') {
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

function recargarDashboard() {
    poblarFiltros();

    if (typeof HorariosDataStore !== 'undefined') {
        if (!HorariosDataStore.initialized && typeof initHorarios === 'function') {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
                renderHorariosView();
                renderizarHorariosPublic();
            };
        }
        if (HorariosDataStore.initialized) {
            HorariosDataStore._sincronizarZonasConDataStore();
            const activePage = document.querySelector('.page.active');
            if (activePage) {
                if (activePage.id === 'page-horarios') {
                    renderHorarios();
                } else if (activePage.id === 'page-horarios-view') {
                    renderHorariosView();
                } else if (activePage.id === 'page-horarios-public') {
                    renderizarHorariosPublic();
                }
            }
        }
    }

    poblarFiltrosInformePromotor();

    const fechaInfo = document.getElementById('dia-actual');
    if (fechaInfo) fechaInfo.textContent = DataStore.getDiaActual() + ' / 31';
    renderizarResumenEjecutivo();
    renderizarAvancePDV();
    renderizarRanking();
    renderizarResumenGeneralPDV();
}

function cambiarPagina(pagina) {
    if ((pagina === 'resumen' || pagina === 'horarios' || pagina === 'horarios-view') && !estaSupervisorDesbloqueado()) {
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
            pagina === 'avance' ? 'Avance por Punto de Venta' :
                pagina === 'ranking' ? 'Ranking de Tiendas' :
                    pagina === 'resumen-pdv' ? 'Resumen General PDV' :
                        pagina === 'informe-promotor' ? 'Informe por Promotor' :
                            pagina === 'horarios' ? 'Planificador Semanal' :
                                pagina === 'horarios-view' ? 'Horarios Semanales por Tienda' :
                                    pagina === 'horarios-public' ? 'Horarios Semanales' : 'Dashboard';

    if (pagina === 'resumen') {
        renderizarResumenEjecutivo();
    } else if (pagina === 'avance') {
        renderizarAvancePDV();
    } else if (pagina === 'ranking') {
        renderizarRanking();
    } else if (pagina === 'informe-promotor') {
        renderizarInformePromotor();
    } else if (pagina === 'resumen-pdv') {
        renderizarResumenGeneralPDV();
    } else if (pagina === 'horarios') {
        if (!HorariosDataStore.initialized) {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
                renderHorariosView();
                renderizarHorariosPublic();
            };
        }
        renderHorarios();
    } else if (pagina === 'horarios-view') {
        if (!HorariosDataStore.initialized) {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
                renderHorariosView();
                renderizarHorariosPublic();
            };
        }
        renderHorariosView();
    } else if (pagina === 'horarios-public') {
        if (!HorariosDataStore.initialized) {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
                renderHorariosView();
                renderizarHorariosPublic();
            };
        }
        renderizarHorariosPublic();
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

function abrirModalCuotasSinPassword() {
    const mesActual = parseInt(document.getElementById('cuotas-mes').value);
    const anioActual = parseInt(document.getElementById('cuotas-anio').value);

    const tbody = document.getElementById('tbody-cuotas');
    const thead = document.querySelector('#tabla-cuotas thead tr');

    const pdvs = DataStore.getPDVs();
    const productos = DataStore.getProductos();
    const cuotas = DataStore.getCuotas(mesActual, anioActual);

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

    document.getElementById('modal-cuotas').classList.add('open');
}

function cambiarMesCuotas() {
    if (document.getElementById('modal-cuotas').classList.contains('open')) {
        abrirModalCuotasSinPassword();
    }
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

    if (diaSeleccionado > diasMes) diaSeleccionado = diasMes;

    thead.innerHTML = '<th class="calendario-th-producto">Producto</th>';
    for (let d = 1; d <= diasMes; d++) {
        const cls = d <= diaActual ? '' : 'style="opacity:0.4;"';
        thead.innerHTML += `<th class="calendario-th-dia ${d === diaActual ? 'calendario-th-hoy' : ''}" data-dia="${d}" ${cls}>${d}</th>`;
    }
    thead.innerHTML += '<th class="calendario-th-dia">Total</th>';

    const ventas = DataStore.getVentasDelMes(mes, anio).filter(v => {
        if (v.punto_venta !== pdv || v.dia > diaActual) return false;
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
            const venta = d <= diaActual ? ventas.find(v => v.producto === prod && v.dia === d) : null;
            const val = venta !== null && venta !== undefined ? venta.venta : '';
            suma += venta ? venta.venta : 0;

            const td = document.createElement('td');
            td.setAttribute('data-dia', d);
            if (d > diaActual) td.style.opacity = '0.4';

            const input = document.createElement('input');
            input.className = 'calendario-input' + (val === '' || val === 0 ? ' calendario-input-zero' : ' calendario-input-filled');
            input.type = 'number';
            input.min = '0';
            input.step = 'any';
            if (val !== '') input.value = val;
            input.dataset.prod = prod;
            input.dataset.dia = d;
            if (d > diaActual) input.readOnly = true;

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
    const maxRegistros = productos.length * diaActual;
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

async function confirmarLogin() {
    const email = document.getElementById('login-email-input').value.trim().toLowerCase();
    const password = document.getElementById('login-password-input').value;
    const btn = document.getElementById('btn-confirmar-login');
    const errorEl = document.getElementById('login-error');

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

    const promotor = HorariosDataStore.promotores.find(p => p.email && p.email.toLowerCase() === email);

    if (!promotor) {
        btn.classList.remove('loading');
        mostrarErrorLogin('El correo ingresado no se encuentra registrado.');
        registrarAcceso(null, email, 'Usuario inexistente');
        document.getElementById('login-email-wrapper').classList.add('shake');
        setTimeout(() => document.getElementById('login-email-wrapper').classList.remove('shake'), 600);
        return;
    }

    let passwordValida = false;
    if (promotor.password_hash) {
        const passwordHash = await hashPassword(password);
        passwordValida = promotor.password_hash === passwordHash;
    }
    if (!passwordValida && promotor.password) {
        passwordValida = password === promotor.password;
    }

    if (!passwordValida) {
        btn.classList.remove('loading');
        mostrarErrorLogin('Contrase\u00f1a incorrecta.');
        registrarAcceso(promotor, email, 'Contrase\u00f1a incorrecta');
        document.getElementById('login-password-wrapper').classList.add('shake');
        setTimeout(() => document.getElementById('login-password-wrapper').classList.remove('shake'), 600);
        return;
    }

    const estado = promotor.estado || 'Activo';
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

    const remember = document.getElementById('login-remember-check').checked;
    iniciarSesionPromotor(promotor, remember);
    registrarAcceso(promotor, email, 'Acceso correcto');

    btn.classList.remove('loading');
    cerrarModalLogin();
    abrirModalVentaConSesion();
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
    cargarVentasCalendario();
}

/* ===== INFORME POR PROMOTOR ===== */
function poblarFiltrosInformePromotor() {
    const promotorSelect = document.getElementById('inf-promotor-select');
    const tiendaSelect = document.getElementById('inf-promotor-tienda');
    const productoSelect = document.getElementById('inf-promotor-producto');
    if (!promotorSelect) return;

    const promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
    const activos = promotores.filter(p => p.estado === 'Activo' && p.zona_principal_id);
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

    const hoy = new Date();
    const mes = hoy.getMonth() + 1;
    const anio = hoy.getFullYear();
    const primerDia = new Date(anio, mes - 1, 1);
    const desde = document.getElementById('inf-promotor-fecha-desde');
    const hasta = document.getElementById('inf-promotor-fecha-hasta');
    if (desde) desde.value = primerDia.toISOString().split('T')[0];
    if (hasta) hasta.value = hoy.toISOString().split('T')[0];
}

function renderizarInformePromotor() {
    if (typeof HorariosDataStore !== 'undefined' && !HorariosDataStore.initialized) {
        if (typeof initHorarios === 'function') {
            initHorarios('supervisor');
            HorariosDataStore.onUpdate = function () {
                renderHorarios();
                renderHorariosView();
                renderizarHorariosPublic();
            };
        }
    }
    poblarFiltrosInformePromotor();
    const content = document.getElementById('inf-promotor-content');
    if (content) {
        content.innerHTML = `
            <div class="inf-promotor-empty">
                <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <p>Selecciona un promotor y aplica los filtros para visualizar su informe.</p>
            </div>
        `;
    }
    const heroKpis = document.getElementById('inf-promotor-hero-kpis');
    if (heroKpis) heroKpis.innerHTML = '';
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

    const fechaDesde = document.getElementById('inf-promotor-fecha-desde').value;
    const fechaHasta = document.getElementById('inf-promotor-fecha-hasta').value;
    const tiendaFiltro = document.getElementById('inf-promotor-tienda').value;
    const productFiltro = document.getElementById('inf-promotor-producto').value;

    const ventas = DataStore.ventas || [];
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
    const cuotas = DataStore.cuotas || [];
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
    const cuotas = DataStore.cuotas || [];
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
    if (sessionStorage.getItem('aviso_oficial_oculto') === 'true') return;

    const page = document.querySelector('.page.active');
    if (!page) return;

    const existing = page.querySelector('.aviso-oficial');
    if (existing) {
        existing.classList.remove('hidden');
        return;
    }

    const titleSelectors = [
        '.resumen-header',
        '.pdv-header',
        '.ranking-hero',
        '.rpdv-hero'
    ];
    const title = page.querySelector(titleSelectors.join(','));

    const aviso = document.createElement('div');
    aviso.className = 'aviso-oficial';
    aviso.innerHTML =
        '<div class="aviso-oficial-badge">📌 Aviso Oficial</div>' +
        '<button class="aviso-oficial-close" onclick="ocultarAvisoOficial()" aria-label="Ocultar aviso" title="Ocultar aviso">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>' +
            '</svg>' +
        '</button>' +
        '<div class="aviso-oficial-icon">' +
            '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke-width="1.8" fill="rgba(245,158,11,0.1)"/>' +
                '<line x1="12" y1="9" x2="12" y2="13" stroke-width="2.5"/><line x1="12" y1="17" x2="12.01" y2="17" stroke-width="2.5"/>' +
            '</svg>' +
        '</div>' +
        '<div class="aviso-oficial-content">' +
            '<p><strong>IMPORTANTE:</strong></p>' +
            '<p>La informaci&oacute;n mostrada se actualiza manualmente con los registros ingresados por cada promotor, por lo que los resultados son referenciales y podr&iacute;an presentar variaciones respecto a los resultados oficiales.</p>' +
            '<p>Para cualquier validaci&oacute;n, se deber&aacute; considerar la informaci&oacute;n oficial compartida por el <strong>&aacute;rea de Retail</strong>, a trav&eacute;s de los <strong>supervisores</strong>.</p>' +
        '</div>';

    if (title) {
        title.parentNode.insertBefore(aviso, title.nextSibling);
    } else {
        page.insertBefore(aviso, page.firstChild);
    }
}

function ocultarAvisoOficial() {
    document.querySelectorAll('.aviso-oficial').forEach(el => el.classList.add('hidden'));
    sessionStorage.setItem('aviso_oficial_oculto', 'true');
}

function mostrarBienvenida() {
    const modal = document.getElementById('modal-bienvenida');
    if (modal) {
        modal.classList.add('open');
    }
}

function cerrarBienvenida() {
    const modal = document.getElementById('modal-bienvenida');
    if (modal) {
        modal.classList.remove('open');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initPromotorSession();
    if (!promotorSession) {
        mostrarBienvenida();
    }
    renderAvisoOficial();
    document.querySelectorAll('.nav-item').forEach(item => {
        if (!item.dataset.page) return;
        item.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            this.style.setProperty('--ripple-x', x + '%');
            this.style.setProperty('--ripple-y', y + '%');
            cambiarPagina(this.dataset.page);
        });
    });

    document.getElementById('mobile-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-backdrop').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('open');
    });

    actualizarSidebarSupervisor();

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

    recargarDashboard();
    cambiarPagina('avance');

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
});
