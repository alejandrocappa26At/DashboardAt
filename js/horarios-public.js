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

    let cardsHtml = '';

    for (let zona of HorariosDataStore.zonas) {
        const promotores = HorariosDataStore.getPromotoresDeZona(zona.id);
        const flotantes = HorariosDataStore.getPromotoresFlotantes();

        if (promotores.length === 0) continue;

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
        <div class="hp-card">
            <div class="hp-card-header">
                <div class="hp-card-header-icon">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                    </svg>
                </div>
                <h3>${escHtml(zona.nombre)}</h3>
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
            <div class="hp-legend">
                <span class="hp-legend-item"><span class="hp-legend-dot turno"></span> Turno</span>
                <span class="hp-legend-item"><span class="hp-legend-dot descanso"></span> Descanso</span>
                <span class="hp-legend-item"><span class="hp-legend-dot sin-asignar"></span> Sin asignar</span>
            </div>
        </div>

        ${cardsHtml}
    </div>`;
}

function renderPublicRow(weekStart, promotor, zona, semana, esFlotanteEnZona) {
    const roleLabel = promotor.tipo === 'flotante' ? 'FL' : 'F';
    const roleClass = promotor.tipo === 'flotante' ? 'hp-role-flotante' : 'hp-role-fijo';

    let cellsHtml = '';
    for (let d = 0; d < 7; d++) {
        const turnoKey = `${promotor.id}-${d}`;
        const turno = semana.turnos[turnoKey];

        if (!turno || turno.estado === 'sin_asignar') {
            cellsHtml += `<td><span class="hp-cell hp-cell-empty">—</span></td>`;
        } else if (turno.estado === 'descanso') {
            cellsHtml += `<td><span class="hp-cell hp-cell-descanso">D</span></td>`;
        } else if (turno.estado === 'turno' || turno.estado === 'flotante') {
            const isFlotante = turno.estado === 'flotante';
            const cellClass = isFlotante ? 'hp-cell-flotante' : 'hp-cell-turno';
            const horaInicio = turno.hora_inicio || '--:--';
            const horaFin = turno.hora_fin || '--:--';
            cellsHtml += `<td><span class="hp-cell ${cellClass}">${horaInicio} – ${horaFin}</span></td>`;
        } else {
            cellsHtml += `<td><span class="hp-cell hp-cell-empty">—</span></td>`;
        }
    }

    return `<tr>
        <td class="hp-td-promotor">
            <span class="hp-promo-name">${escHtml(promotor.nombre)}</span>
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
