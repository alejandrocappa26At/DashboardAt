const TIENDA_COLORS = [
    { name: 'blue',   bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  icon: 'rgba(59,130,246,0.15)', text: '#60a5fa' },
    { name: 'amber',  bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  icon: 'rgba(245,158,11,0.15)', text: '#fbbf24' },
    { name: 'rose',   bg: 'rgba(244,63,94,0.08)',   border: 'rgba(244,63,94,0.2)',   icon: 'rgba(244,63,94,0.15)',  text: '#fb7185' },
    { name: 'cyan',   bg: 'rgba(6,182,212,0.08)',   border: 'rgba(6,182,212,0.2)',   icon: 'rgba(6,182,212,0.15)',  text: '#22d3ee' },
    { name: 'violet', bg: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  icon: 'rgba(139,92,246,0.15)', text: '#a78bfa' },
    { name: 'orange', bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.2)',  icon: 'rgba(249,115,22,0.15)', text: '#fb923c' },
    { name: 'emerald',bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  icon: 'rgba(16,185,129,0.15)',text: '#34d399' },
    { name: 'pink',   bg: 'rgba(236,72,153,0.08)',  border: 'rgba(236,72,153,0.2)',  icon: 'rgba(236,72,153,0.15)', text: '#f472b6' },
];

let hpTiendaSeleccionada = null;
let hpFiltroAbierto = false;

function renderizarHorariosPublic() {
    const container = document.getElementById('horarios-public-content');
    if (!container) return;

    if (!HorariosDataStore.initialized) {
        container.innerHTML = '<div class="hp-loading">Cargando horarios...</div>';
        return;
    }

    const weekStart = HorariosDataStore.currentWeekStart;
    const semana = HorariosDataStore.getOrCreateSemana(weekStart);

    const fechaLabel = weekStart.toLocaleDateString('es-ES', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const diasHeaders = DIAS_SEMANA.map((d, i) => {
        const fecha = getFechaSemana(weekStart, i);
        const esFeriado = (semana.feriados || []).includes(i);
        return `<th class="hp-th-day${esFeriado ? ' hp-feriado' : ''}${i >= 5 ? ' hp-weekend' : ''}">
            ${d}
            <span class="hp-day-sub">${getDiaSemanaLabel(fecha)}</span>
        </th>`;
    }).join('');

    const tiendas = HorariosDataStore.zonas
        .filter(z => HorariosDataStore.getPromotoresDeZona(z.id).length > 0)
        .map(z => z.nombre);

    let cardsHtml = '';
    let colorIdx = 0;

    for (let zona of HorariosDataStore.zonas) {
        if (hpTiendaSeleccionada && zona.nombre !== hpTiendaSeleccionada) continue;

        const promotores = HorariosDataStore.getPromotoresDeZona(zona.id);
        const flotantes = HorariosDataStore.getPromotoresFlotantes();

        if (promotores.length === 0) continue;

        const paleta = TIENDA_COLORS[colorIdx % TIENDA_COLORS.length];
        colorIdx++;

        let rowsHtml = '';

        for (let p of promotores) {
            rowsHtml += renderPublicRow(weekStart, p, zona, semana);
        }

        const flotantesEnZona = flotantes.filter(f => {
            if (!semana) return false;
            for (let d = 0; d < 7; d++) {
                const turnoKey = `${f.id}-${d}`;
                const turno = semana.turnos[turnoKey];
                if (turno && turno.zona_id === zona.id && turno.estado === 'flotante') return true;
            }
            return false;
        });

        if (flotantesEnZona.length > 0) {
            rowsHtml += `<tr class="hp-flotante-sep"><td colspan="8"><span>Promotores Flotantes</span></td></tr>`;
            for (let f of flotantesEnZona) {
                rowsHtml += renderPublicRow(weekStart, f, zona, semana, true);
            }
        }

        const countFijos = promotores.length;
        const countFlotantes = flotantesEnZona.length;
        const countLabel = `${countFijos} promotor${countFijos !== 1 ? 'es' : ''}` +
            (countFlotantes > 0 ? ` + ${countFlotantes} flotante${countFlotantes !== 1 ? 's' : ''}` : '');

        cardsHtml += `
        <div class="hp-card hp-card-color-${paleta.name}" style="border-color: ${paleta.border};">
            <div class="hp-card-header" style="background: ${paleta.bg}; border-bottom-color: ${paleta.border};">
                <div class="hp-card-header-icon" style="background: ${paleta.icon}; color: ${paleta.text};">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
                <h3 style="color: ${paleta.text};">${escHtml(zona.nombre)}</h3>
                <span class="hp-promo-count">${countLabel}</span>
            </div>
            <div class="hp-card-body">
                <div class="hp-table-wrap">
                    <table class="hp-table">
                        <thead>
                            <tr>
                                <th class="hp-th-promotor">Promotor</th>
                                ${diasHeaders}
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    }

    if (!cardsHtml) {
        cardsHtml = `<div class="hp-empty-state">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>No hay horarios disponibles para esta semana.</p>
        </div>`;
    }

    const filterLabel = hpTiendaSeleccionada ? escHtml(hpTiendaSeleccionada) : 'Buscar mi tienda...';
    const filterOptions = tiendas.map(t => `
        <div class="hp-filter-option${t === hpTiendaSeleccionada ? ' hp-filter-option-active' : ''}" data-tienda="${escHtml(t)}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>
            <span>${escHtml(t)}</span>
            ${t === hpTiendaSeleccionada ? '<svg class="hp-filter-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
    `).join('');

    container.innerHTML = `
    <div class="hp-container">
        <div class="hp-header">
            <div class="hp-header-left">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                    <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                </svg>
                <h2>Horarios Semanales</h2>
            </div>
            <div class="hp-header-right">
                <button class="hp-btn-print" onclick="window.print()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"/>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                        <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    <span>Exportar PDF / Imprimir</span>
                </button>
            </div>
        </div>

        <div class="hp-week-bar">
            <div class="hp-week-nav">
                <button class="hp-week-btn" onclick="navegarSemanaPublic('prev')" title="Semana anterior">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <span class="hp-week-label">${fechaLabel}</span>
                <button class="hp-week-btn" onclick="navegarSemanaPublic('next')" title="Semana siguiente">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
            </div>

            <div class="hp-filter" id="hp-filter">
                <button class="hp-filter-btn${hpFiltroAbierto ? ' hp-filter-btn-open' : ''}" id="hp-filter-btn" onclick="toggleFiltroTienda(event)" type="button">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span id="hp-filter-label">${filterLabel}</span>
                    <svg class="hp-filter-chevron" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 12 15 18 9"/>
                    </svg>
                </button>
                <div class="hp-filter-menu${hpFiltroAbierto ? ' hp-filter-menu-open' : ''}" id="hp-filter-menu">
                    <div class="hp-filter-option${!hpTiendaSeleccionada ? ' hp-filter-option-active' : ''}" data-tienda="">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                            <line x1="3" y1="9" x2="21" y2="9"/>
                            <line x1="9" y1="21" x2="9" y2="9"/>
                        </svg>
                        <span>Ver todas las tiendas</span>
                        ${!hpTiendaSeleccionada ? '<svg class="hp-filter-check" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
                    </div>
                    ${filterOptions}
                </div>
            </div>

            <div class="hp-legend">
                <span class="hp-legend-item"><span class="hp-legend-dot turno"></span> Turno</span>
                <span class="hp-legend-item"><span class="hp-legend-dot descanso"></span> Descanso</span>
                <span class="hp-legend-item"><span class="hp-legend-dot sin-asignar"></span> Sin asignar</span>
            </div>
        </div>

        ${cardsHtml}
    </div>`;

    initFiltroTienda();
}

function renderPublicRow(weekStart, promotor, zona, semana, esFlotanteEnZona) {
    const isFlotante = promotor.tipo === 'flotante' || esFlotanteEnZona;
    const roleLabel = isFlotante ? 'FL' : 'F';
    const roleClass = isFlotante ? 'hp-role-flotante' : 'hp-role-fijo';
    const nameClass = isFlotante ? 'hp-promo-name hp-promo-name-flotante' : 'hp-promo-name';

    let cellsHtml = '';
    for (let d = 0; d < 7; d++) {
        const turnoKey = `${promotor.id}-${d}`;
        const turno = semana.turnos[turnoKey];

        if (!turno || turno.estado === 'sin_asignar') {
            cellsHtml += `<td><span class="hp-cell hp-cell-empty">—</span></td>`;
        } else if (turno.estado === 'descanso') {
            cellsHtml += `<td><span class="hp-cell hp-cell-descanso">D</span></td>`;
        } else if (turno.estado === 'turno' || turno.estado === 'flotante') {
            const esFlotanteCell = turno.estado === 'flotante';
            const cellClass = esFlotanteCell ? 'hp-cell-flotante' : 'hp-cell-turno';
            const horaInicio = turno.hora_inicio || '--:--';
            const horaFin = turno.hora_fin || '--:--';
            cellsHtml += `<td><span class="hp-cell ${cellClass}">${horaInicio} – ${horaFin}</span></td>`;
        } else {
            cellsHtml += `<td><span class="hp-cell hp-cell-empty">—</span></td>`;
        }
    }

    return `<tr>
        <td class="hp-td-promotor">
            <span class="${nameClass}">${escHtml(promotor.nombre)}</span>
            <span class="hp-promo-role ${roleClass}">${roleLabel}</span>
        </td>
        ${cellsHtml}
    </tr>`;
}

function navegarSemanaPublic(direccion) {
    if (direccion === 'prev') {
        HorariosDataStore.currentWeekStart = getPrevWeek(HorariosDataStore.currentWeekStart);
    } else {
        HorariosDataStore.currentWeekStart = getNextWeek(HorariosDataStore.currentWeekStart);
    }
    renderizarHorariosPublic();
}

function toggleFiltroTienda(e) {
    if (e) e.stopPropagation();
    hpFiltroAbierto = !hpFiltroAbierto;
    const menu = document.getElementById('hp-filter-menu');
    const btn = document.getElementById('hp-filter-btn');
    if (menu) menu.classList.toggle('hp-filter-menu-open', hpFiltroAbierto);
    if (btn) btn.classList.toggle('hp-filter-btn-open', hpFiltroAbierto);
}

function seleccionarTienda(nombre) {
    hpTiendaSeleccionada = nombre || null;
    hpFiltroAbierto = false;
    renderizarHorariosPublic();
}

function initFiltroTienda() {
    const menu = document.getElementById('hp-filter-menu');
    if (!menu) return;
    menu.querySelectorAll('.hp-filter-option').forEach(opt => {
        opt.addEventListener('click', function(e) {
            e.stopPropagation();
            seleccionarTienda(this.dataset.tienda);
        });
    });
}

document.addEventListener('click', function(e) {
    if (!hpFiltroAbierto) return;
    const filter = document.getElementById('hp-filter');
    if (filter && !filter.contains(e.target)) {
        hpFiltroAbierto = false;
        const menu = document.getElementById('hp-filter-menu');
        const btn = document.getElementById('hp-filter-btn');
        if (menu) menu.classList.remove('hp-filter-menu-open');
        if (btn) btn.classList.remove('hp-filter-btn-open');
    }
});

function escHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}