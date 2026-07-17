function renderizarResumenEjecutivo() {
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

function poblarFiltros() {
    const pdvs = DataStore.getPDVs();
    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        pdvSelect.innerHTML = '<option value="">Seleccionar punto de venta...</option>' +
            pdvs.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

const reporteSort = { sortBy: 'pdv', sortDir: 'asc' };

function recargarDashboard() {
    poblarFiltros();
    const fechaInfo = document.getElementById('dia-actual');
    if (fechaInfo) fechaInfo.textContent = DataStore.getDiaActual() + ' / 31';
    renderizarResumenEjecutivo();
    renderizarAvancePDV();
    renderizarRanking();
}

function cambiarPagina(pagina) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById('page-' + pagina);
    if (pageEl) pageEl.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-page="${pagina}"]`);
    if (navItem) navItem.classList.add('active');

    document.getElementById('page-title').textContent =
        pagina === 'resumen' ? 'Resumen Zona' :
            pagina === 'avance' ? 'Avance por Punto de Venta' :
                pagina === 'ranking' ? 'Ranking de Tiendas' : 'Dashboard';

    if (pagina === 'resumen') {
        renderizarResumenEjecutivo();
    } else if (pagina === 'avance') {
        renderizarAvancePDV();
    } else if (pagina === 'ranking') {
        renderizarRanking();
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
        if (password === 'Adecco2019@') {
            btn.classList.remove('loading');
            cerrarModalPassword();
            abrirModalCuotasSinPassword();
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
    abrirModalPassword();
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
    const nombreMes = MESES.find(m => m.valor === mes)?.nombre || mes;
    mostrarNotificacion(`Cuotas de ${nombreMes} ${anio} actualizadas (${nuevasCuotas.length} registros)`, 'success');
}

let ventasModificadas = false;
let ventasFullscreen = false;

function abrirModalVenta() {
    const pdvSel = document.getElementById('modal-pdv');
    pdvSel.innerHTML = DataStore.getPDVs().map(p => `<option value="${p}">${p}</option>`).join('');
    document.getElementById('modal-venta').classList.add('open');
    ventasModificadas = false;
    document.getElementById('ventas-unsaved-bar').classList.remove('visible');
    cargarVentasCalendario();
}

function cerrarModalVenta() {
    document.getElementById('modal-venta').classList.remove('open');
    document.getElementById('modal-venta').classList.remove('ventas-fullscreen');
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

    thead.innerHTML = '<th class="calendario-th-producto">Producto</th>';
    for (let d = 1; d <= diasMes; d++) {
        const cls = d <= diaActual ? '' : 'style="opacity:0.4;"';
        thead.innerHTML += `<th class="calendario-th-dia ${d === diaActual ? 'calendario-th-hoy' : ''}" ${cls}>${d}</th>`;
    }
    thead.innerHTML += '<th class="calendario-th-dia">Total</th>';

    const ventas = DataStore.getVentasDelMes(mes, anio).filter(v =>
        v.punto_venta === pdv && v.dia <= diaActual
    );

    tbody.innerHTML = '';
    let totalDiasConDatos = 0;
    for (let prod of productos) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${prod}</td>`;

        let suma = 0;
        const celdas = [];
        for (let d = 1; d <= diasMes; d++) {
            const venta = d <= diaActual ? ventas.find(v => v.producto === prod && v.dia === d) : null;
            const val = venta !== null && venta !== undefined ? venta.venta : '';
            suma += venta ? venta.venta : 0;
            const cls = d <= diaActual ? '' : 'style="opacity:0.4;"';
            const disabled = d > diaActual ? 'readonly' : '';
            const valCls = val === '' || val === 0 ? 'calendario-input-zero' : 'calendario-input-filled';
            celdas.push({ d, val, cls, disabled, valCls });
        }

        for (let c of celdas) {
            let tooltip = '';
            if (c.val !== '' && c.d > 1) {
                const cAnterior = ventas.find(v => v.producto === prod && v.dia === c.d - 1);
                if (cAnterior && cAnterior.venta > 0) {
                    const variacion = ((c.val - cAnterior.venta) / cAnterior.venta * 100).toFixed(1);
                    tooltip = ` title="Variaci\u00f3n: ${variacion > 0 ? '+' : ''}${variacion}% vs d\u00eda ${c.d - 1}"`;
                }
            }
            tr.innerHTML += `<td ${c.cls}><input class="calendario-input ${c.valCls}" type="number" min="0" step="1" value="${c.val}" data-prod="${prod}" data-dia="${c.d}"${tooltip} ${c.disabled}></td>`;
        }
        tr.innerHTML += `<td class="calendario-total"><span class="total-prod">${suma.toLocaleString('es-CL')}</span></td>`;
        tbody.appendChild(tr);
    }

    const totalRegistros = ventas.length;
    const maxRegistros = productos.length * diaActual;
    document.getElementById('ventas-progress-text').textContent = `${totalRegistros} / ${maxRegistros}`;

    document.querySelectorAll('.calendario-input').forEach(inp => {
        inp.addEventListener('input', function(e) {
            ventasModificadas = true;
            document.getElementById('ventas-unsaved-bar').classList.add('visible');
            const val = parseFloat(this.value);
            if (val > 0) {
                this.classList.remove('calendario-input-zero');
                this.classList.add('calendario-input-filled');
            } else {
                this.classList.remove('calendario-input-filled');
                this.classList.add('calendario-input-zero');
            }
            actualizarTotalesCalendario();
        });
    });
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
    btn.classList.add('loading');

    setTimeout(() => {
        const pdv = document.getElementById('modal-pdv').value;
        const mes = parseInt(document.getElementById('venta-mes').value);
        const anio = parseInt(document.getElementById('venta-anio').value);
        const inputs = document.querySelectorAll('.calendario-input');
        const datos = [];

        inputs.forEach(inp => {
            const val = parseFloat(inp.value);
            if (!isNaN(val) && val >= 0) {
                datos.push({
                    pdv,
                    producto: inp.dataset.prod,
                    dia: parseInt(inp.dataset.dia),
                    monto: val,
                    mes,
                    anio
                });
            }
        });

        if (datos.length === 0) {
            mostrarNotificacion('No hay ventas para guardar', 'error');
            btn.classList.remove('loading');
            return;
        }

        const registrosEliminados = DataStore.actualizarVentasCalendario(pdv, datos);
        guardarVentasFirebase(datos);

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
        mostrarNotificacion(registrosEliminados > 0 ? msg + `, ${registrosEliminados} eliminados` : msg, 'success');
    }, 400);
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-item').forEach(item => {
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

    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        pdvSelect.addEventListener('change', function () {
            renderizarAvancePDV(this.value);
        });
    }

    recargarDashboard();
    cambiarPagina('resumen');

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
});
