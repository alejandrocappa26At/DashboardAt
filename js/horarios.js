let horariosCellEditorActive = null;
let horariosToastTimer = null;
let horariosPDVFilter = '';

function filtrarHorariosPorPDV(pdvId) {
    horariosPDVFilter = pdvId;
    renderHorarios();
}

function initHorarios(role, userName) {
    HorariosDataStore.init(role || 'supervisor', userName || null, function (fromRealtime) {
        renderHorarios();
        if (fromRealtime) {
            mostrarHorariosToast();
        }
    });
}

function cambiarVistaHorarios(role, userName) {
    HorariosDataStore.setView(role, userName || HorariosDataStore.currentUser);
    renderHorarios();
}

function navegarSemana(direccion) {
    if (direccion === 'prev') {
        HorariosDataStore.currentWeekStart = getPrevWeek(HorariosDataStore.currentWeekStart);
    } else {
        HorariosDataStore.currentWeekStart = getNextWeek(HorariosDataStore.currentWeekStart);
    }
    renderHorarios();
}

function renderHorarios() {
    if (HorariosDataStore.currentRole === 'supervisor') {
        renderVistaSupervisor();
    } else {
        renderVistaPromotor();
    }
}

function renderVistaSupervisor() {
    const container = document.getElementById('horarios-content');
    if (!container) return;

    const weekStart = HorariosDataStore.currentWeekStart;
    const weekRange = getWeekRange(weekStart);
    const semana = HorariosDataStore.getOrCreateSemana(weekStart);
    const validaciones = HorariosDataStore.validarSemana(weekStart);

    const fechaLabel = weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const diasHeaders = DIAS_SEMANA.map((d, i) => {
        const fecha = getFechaSemana(weekStart, i);
        const cls = i === 6 ? 'horarios-th-dia domingo' : 'horarios-th-dia';
        const esFeriado = (semana.feriados || []).includes(i);
        return `<th class="${cls}">${d}<br><span class="horarios-th-zona-header">${getDiaSemanaLabel(fecha)}${esFeriado ? ' 🎌' : ''}</span></th>`;
    }).join('');

    let validacionesHtml = '';
    if (validaciones.length > 0) {
        validacionesHtml = '<div class="horarios-validations">' +
            validaciones.map((v, i) =>
                `<div class="horarios-validation-item ${v.tipo}" style="animation-delay:${i * 0.05}s">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        ${v.tipo === 'warning'
                            ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'
                            : '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>'}
                    </svg>
                    ${v.mensaje}
                </div>`
            ).join('') +
            '</div>';
    }

    let html = `
    <div class="horarios-header">
        <div class="horarios-header-left">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
            </svg>
            <h2>Planificador Semanal</h2>
        </div>
        <div class="horarios-header-right">
            <span class="horarios-role-badge supervisor">Supervisor</span>
            <button class="horarios-btn-manage-promotores" onclick="abrirModalPromotores()" title="Gestionar promotores">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Gestionar Promotores</span>
            </button>
        </div>
    </div>

    <div class="horarios-week-selector">
        <div class="horarios-week-nav">
            <button class="horarios-week-btn" onclick="navegarSemana('prev')" title="Semana anterior">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="horarios-week-label">${fechaLabel}</span>
            <button class="horarios-week-btn" onclick="navegarSemana('next')" title="Semana siguiente">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>
        <div class="horarios-week-status">
            <span class="horarios-status-badge ${semana.estado}">${semana.estado}</span>
            ${semana.estado !== 'publicada'
                ? `<button class="horarios-btn-publish" onclick="publicarSemana()">📢 Publicar semana</button>`
                : `<button class="horarios-btn-publish" style="background:#282828;color:#b3b3b3;" onclick="revertirBorrador()">Volver a borrador</button>`}
        </div>
    </div>

    <div class="horarios-legend">
        <div class="horarios-legend-item">
            <span class="horarios-legend-dot turno"></span> Turno asignado
        </div>
        <div class="horarios-legend-item">
            <span class="horarios-legend-dot descanso"></span> Descanso (D)
        </div>
        <div class="horarios-legend-item">
            <span class="horarios-legend-dot sin-asignar"></span> Sin asignar
        </div>
        <div class="horarios-legend-item">
            <span class="horarios-legend-dot flotante"></span> Cobertura flotante
        </div>
    </div>

    ${validacionesHtml}

    <div class="horarios-pdv-filter-bar">
        <div class="horarios-pdv-filter-group">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
            </svg>
            <select id="horarios-pdv-filter" onchange="filtrarHorariosPorPDV(this.value)">
                <option value="">Todas las tiendas (${HorariosDataStore.zonas.length})</option>
                ${HorariosDataStore.zonas.map(z =>
                    `<option value="${z.id}" ${z.id === horariosPDVFilter ? 'selected' : ''}>${z.nombre}${z.cadena ? ' · ' + z.cadena : ''}</option>`
                ).join('')}
            </select>
        </div>
        ${horariosPDVFilter ? `<button class="horarios-pdv-filter-clear" onclick="filtrarHorariosPorPDV('')">✕ Limpiar filtro</button>` : ''}
    </div>

    <div class="horarios-table-wrapper horarios-table-view">
        <table class="horarios-table">
            <thead>
                <tr>
                    <th class="horarios-th-zona">Zona / Promotor</th>
                    ${diasHeaders}
                    <th class="horarios-th-total">Total</th>
                </tr>
            </thead>
            <tbody>
    `;

    const zonasAMostrar = horariosPDVFilter
        ? HorariosDataStore.zonas.filter(z => z.id === horariosPDVFilter)
        : HorariosDataStore.zonas;

    for (let zona of zonasAMostrar) {
        const promotores = HorariosDataStore.getPromotoresDeZona(zona.id);
        const flotantesZona = HorariosDataStore.getPromotoresFlotantes();
        const horasZona = HorariosDataStore.getHorasZonaSemana(weekStart, zona.id);

        const collapsed = localStorage.getItem('horarios-zona-collapsed-' + zona.id) === 'true';

        html += `<tr class="horarios-zona-separator"><td colspan="9"></td></tr>`;

        html += `<tr>
            <td class="horarios-td-zona">
                <div class="horarios-td-zona-name">
                    <button class="horarios-td-zona-toggle" onclick="toggleZona('${zona.id}')">
                        ${collapsed ? '▶' : '▼'}
                    </button>
                    <span>${zona.nombre}</span>
                </div>
            </td>
        `;

        for (let d = 0; d < 7; d++) {
            const horasDia = collapsed ? '—' : `<span class="horarios-zona-total-value">${'<span class="horarios-count-up">' + horasZona.porDia[d].toFixed(1) + '</span>'}</span>`;
            html += `<td class="horarios-row-hours" style="background:rgba(29,185,84,0.03);"><div style="padding:6px;font-size:13px;font-weight:800;color:var(--accent);">${horasZona.porDia[d].toFixed(1)}h</div></td>`;
        }
        html += `<td class="horarios-row-hours" style="background:rgba(29,185,84,0.03);position:sticky;right:0;border-left:2px solid rgba(29,185,84,0.08);">
            <div style="padding:6px;font-size:15px;font-weight:800;color:var(--accent);">${horasZona.total.toFixed(1)}h</div>
        </td>`;
        html += `</tr>`;

        if (!collapsed) {
            for (let p of promotores) {
                html += renderFilaPromotor(weekStart, p, zona);
            }

            const flotantesEnZona = flotantesZona.filter(f => {
                const semanaData = HorariosDataStore.getSemana(weekStart);
                if (!semanaData) return false;
                for (let d = 0; d < 7; d++) {
                    const turnoKey = `${f.id}-${d}`;
                    const turno = semanaData.turnos[turnoKey];
                    if (turno && turno.zona_id === zona.id && turno.estado === 'flotante') return true;
                }
                return false;
            });

            if (flotantesEnZona.length > 0) {
                html += `<tr class="horarios-flotante-label"><td colspan="9"><span class="horarios-flotante-label-text">✦ Promotores flotantes cubriendo esta zona</span></td></tr>`;
                for (let f of flotantesEnZona) {
                    html += renderFilaPromotor(weekStart, f, zona, true);
                }
            }
        }
    }

    const promotoresSinAsignar = HorariosDataStore.promotores.filter(p => !p.zona_principal_id);
    if (promotoresSinAsignar.length > 0 && !horariosPDVFilter) {
        html += `<tr class="horarios-zona-separator"><td colspan="9"></td></tr>`;
        html += `<tr>
            <td class="horarios-td-zona">
                <div class="horarios-td-zona-name">
                    <span style="color:var(--text-subdued);font-size:11px;font-weight:500;">⚠️ Sin tienda asignada (${promotoresSinAsignar.length})</span>
                </div>
            </td>`;
        for (let d = 0; d < 7; d++) {
            html += `<td style="background:rgba(255,255,255,0.01);"><div style="padding:6px;font-size:13px;font-weight:800;color:var(--text-subdued);">—</div></td>`;
        }
        html += `<td style="background:rgba(255,255,255,0.01);position:sticky;right:0;border-left:2px solid rgba(255,255,255,0.06);"><div style="padding:6px;font-size:15px;font-weight:800;color:var(--text-subdued);">—</div></td>`;
        html += `</tr>`;
        for (let p of promotoresSinAsignar) {
            html += renderFilaPromotor(weekStart, p, { id: null, nombre: 'Sin tienda' });
        }
    }

    html += `
            </tbody>
        </table>
    </div>

    <div class="horarios-mobile-cards" id="horarios-mobile-cards"></div>

    <div class="horarios-editor-overlay" id="horarios-editor-overlay" onclick="cerrarEditorCelda()"></div>
    <div class="horarios-editor" id="horarios-editor">
        <div class="horarios-editor-header">
            <span class="horarios-editor-title" id="horarios-editor-title">Editar turno</span>
            <button class="horarios-editor-close" onclick="cerrarEditorCelda()">✕</button>
        </div>
        <div class="horarios-editor-presets" id="horarios-editor-presets"></div>
        <div class="horarios-editor-custom">
            <input class="horarios-editor-time-input" type="time" id="horarios-editor-inicio" placeholder="Inicio">
            <span class="horarios-editor-time-sep">→</span>
            <input class="horarios-editor-time-input" type="time" id="horarios-editor-fin" placeholder="Fin">
            <button class="horarios-editor-btn" style="background:var(--accent);color:#000;padding:8px 14px;" onclick="aplicarTurnoCustom()">✓</button>
        </div>
        <div class="horarios-editor-discount">
            <label>Refrigerio (horas):</label>
            <input type="number" id="horarios-editor-descuento" value="1" min="0" max="2" step="0.5">
        </div>
        <div class="horarios-editor-actions">
            <button class="horarios-editor-btn horarios-editor-btn-descanso" onclick="aplicarDescanso()">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Marcar como descanso (D)
            </button>
            <button class="horarios-editor-btn horarios-editor-btn-sin-asignar" onclick="aplicarSinAsignar()">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                Sin asignar
            </button>
            <button class="horarios-editor-btn horarios-editor-btn-flotante" onclick="abrirSelectorFlotante()">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>
                Asignar a flotante
            </button>
        </div>
    </div>
    `;

    container.innerHTML = html;

    renderMobileCardsSupervisor(weekStart);
}

function renderFilaPromotor(weekStart, promotor, zona, esFlotanteEnZona) {
    const semana = HorariosDataStore.getSemana(weekStart);
    const horas = HorariosDataStore.getHorasPromotorSemana(weekStart, promotor.id);
    const weekRange = getWeekRange(weekStart);

    let html = `<tr>
        <td class="horarios-td-promotor">
            <div class="horarios-promotor-info">
                <span class="horarios-promotor-type ${promotor.tipo}">${promotor.tipo === 'fijo' ? 'F' : 'FL'}</span>
                <span class="horarios-promotor-name" ondblclick="iniciarEdicionInline(this, '${promotor.id}')" title="Doble clic para editar">${promotor.nombre}</span>
            </div>
        </td>
    `;

    for (let d = 0; d < 7; d++) {
        const turnoKey = `${promotor.id}-${d}`;
        const turno = semana ? semana.turnos[turnoKey] : null;

        let cellClass = 'horarios-cell sin-asignar';
        let timeContent = '—';
        let hoursContent = '';
        let zoneContent = '';

        if (turno) {
            if (turno.estado === 'turno') {
                cellClass = 'horarios-cell turno';
                timeContent = formatHora(turno.hora_inicio, turno.hora_fin);
            } else if (turno.estado === 'descanso') {
                cellClass = 'horarios-cell descanso';
                timeContent = 'D';
            } else if (turno.estado === 'flotante') {
                cellClass = 'horarios-cell flotante';
                timeContent = formatHora(turno.hora_inicio, turno.hora_fin);
                const zonaFlotante = HorariosDataStore.zonas.find(z => z.id === turno.zona_id);
                if (zonaFlotante && zonaFlotante.id !== promotor.zona_principal_id) {
                    zoneContent = `<span class="horarios-cell-zone">${zonaFlotante.nombre.replace('RED AT ', '')}</span>`;
                }
            } else {
                cellClass = 'horarios-cell sin-asignar';
                timeContent = '—';
            }

            const h = turno.horas_calculadas || 0;
            if (h > 0) {
                hoursContent = `<span class="horarios-cell-hours">${h.toFixed(1)}h</span>`;
            }
        }

        const editAttr = HorariosDataStore.currentRole === 'supervisor' ? `onclick="abrirEditorCelda('${promotor.id}', ${d})"` : '';

        html += `<td ${editAttr} style="cursor:${HorariosDataStore.currentRole === 'supervisor' ? 'pointer' : 'default'}">
            <div class="${cellClass}" id="celda-${promotor.id}-${d}">
                <span class="horarios-cell-time">${timeContent}</span>
                ${hoursContent}
                ${zoneContent}
            </div>
        </td>`;
    }

    const totalHoras = horas.total;
    const totalClass = totalHoras > HORAS_META_SEMANAL + 4 ? 'alert' :
        totalHoras < HORAS_META_SEMANAL - 8 ? 'danger' : '';

    html += `<td style="position:sticky;right:0;background:#0f0f0f;border-left:2px solid rgba(255,255,255,0.06);">
        <span class="horarios-cell-total-week ${totalClass}">${totalHoras.toFixed(1)}h</span>
    </td>`;

    html += `</tr>`;
    return html;
}

function renderMobileCardsSupervisor(weekStart) {
    const container = document.getElementById('horarios-mobile-cards');
    if (!container) return;

    container.style.display = 'none';
}

function renderVistaPromotor() {
    const container = document.getElementById('horarios-content');
    if (!container) return;

    const userName = HorariosDataStore.currentUser;
    const promotor = HorariosDataStore.promotores.find(p => p.nombre.toLowerCase() === (userName || '').toLowerCase());

    if (!promotor) {
        container.innerHTML = `
            <div class="horarios-header">
                <div class="horarios-header-left">
                    <h2>Mi Horario</h2>
                </div>
                <div class="horarios-header-right">
                    <span class="horarios-role-badge promotor">Promotor</span>
                </div>
            </div>
            <div class="empty-state">
                <div class="empty-icon">👤</div>
                <h3>Promotor no encontrado</h3>
                <p>No se encontró un promotor con el nombre "${userName || ''}".</p>
            </div>
        `;
        return;
    }

    const weekStart = HorariosDataStore.currentWeekStart;
    const semana = HorariosDataStore.getOrCreateSemana(weekStart);
    const data = HorariosDataStore.getPromotorViewData(weekStart, promotor.id);
    if (!data) return;

    const fechaLabel = `${DIAS_SEMANA[0]} ${getDiaSemanaLabel(weekStart)} - ${DIAS_SEMANA[6]} ${getDiaSemanaLabel(getFechaSemana(weekStart, 6))}`;

    const pct = data.pctMeta;
    const metaColor = data.metaColor;

    const desktopHtml = data.dias.map((d, i) => {
        const estadoClass = d.estado;
        const timeClass = d.estado;
        const timeContent = d.estado === 'descanso' ? 'Descanso' :
            d.estado === 'sin_asignar' ? '—' :
            formatHora(d.hora_inicio, d.hora_fin);

        const hoursCell = d.horas > 0 ? `<span class="horarios-cell-hours">${d.horas.toFixed(1)}h</span>` : '';
        const zonaExtra = d.zonaCobertura ? `<span class="horarios-day-card-zone">📍 ${d.zonaCobertura}</span>` : '';

        return `
            <div class="horarios-day-card ${estadoClass}" style="animation-delay:${i * 0.07}s">
                <div class="horarios-day-card-header">
                    <span class="horarios-day-card-day">${d.diaLabel}</span>
                    <span class="horarios-day-card-date">${d.fechaLabel}</span>
                </div>
                <div class="horarios-day-card-body">
                    <div>
                        <div class="horarios-day-card-time ${timeClass}">${timeContent}</div>
                        ${zonaExtra}
                    </div>
                    <div class="horarios-day-card-hours">${hoursCell || (d.estado === 'descanso' ? '—' : d.horas > 0 ? d.horas.toFixed(1) + 'h' : '—')}</div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
    <div class="horarios-header">
        <div class="horarios-header-left">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
            </svg>
            <h2>Mi Horario</h2>
        </div>
        <div class="horarios-header-right">
            <span class="horarios-role-badge promotor">Promotor</span>
        </div>
    </div>

    <div class="horarios-promotor-hero">
        <div class="horarios-promotor-hero-info">
            <div class="horarios-promotor-hero-name">${data.promotor.nombre}</div>
            <div class="horarios-promotor-hero-zone">${data.zona ? data.zona.nombre : 'Sin zona asignada'}</div>
        </div>
        <div class="horarios-promotor-hero-stats">
            <div class="horarios-promotor-hero-stat">
                <div class="horarios-promotor-hero-stat-value ${metaColor}">${data.horasSemanales.toFixed(1)}</div>
                <div class="horarios-promotor-hero-stat-label">Horas / Semana</div>
            </div>
            <div class="horarios-promotor-hero-stat">
                <div class="horarios-promotor-hero-stat-value">${HORAS_META_SEMANAL}</div>
                <div class="horarios-promotor-hero-stat-label">Meta semanal</div>
            </div>
            <div class="horarios-promotor-hero-stat">
                <div class="horarios-promotor-hero-stat-value ${metaColor}">${data.pctMeta.toFixed(0)}%</div>
                <div class="horarios-promotor-hero-stat-label">Cumplimiento</div>
            </div>
        </div>
    </div>

    <div class="horarios-promotor-progress">
        <div class="horarios-promotor-progress-header">
            <span class="horarios-promotor-progress-label">Progreso semanal</span>
            <span class="horarios-promotor-progress-pct" style="color:var(--${metaColor === 'green' ? 'accent' : metaColor === 'yellow' ? 'warning' : 'danger'})">${data.horasSemanales.toFixed(1)}h / ${HORAS_META_SEMANAL}h</span>
        </div>
        <div class="horarios-promotor-progress-track">
            <div class="horarios-promotor-progress-fill ${metaColor}" style="width:${Math.min(pct, 100)}%"></div>
        </div>
    </div>

    <div class="horarios-week-selector">
        <div class="horarios-week-nav">
            <button class="horarios-week-btn" onclick="navegarSemana('prev')" title="Semana anterior">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="horarios-week-label">${fechaLabel}</span>
            <button class="horarios-week-btn" onclick="navegarSemana('next')" title="Semana siguiente">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>
        ${semana.estado === 'publicada' ? '<span class="horarios-status-badge publicada">Publicado</span>' : '<span class="horarios-status-badge borrador">Borrador</span>'}
    </div>

    <div class="horarios-table-view" style="display:none;"></div>

    <div class="horarios-mobile-cards" style="display:flex;">
        ${desktopHtml}
    </div>
    `;
}

function abrirEditorCelda(promotorId, diaIndex) {
    const semana = HorariosDataStore.getOrCreateSemana(HorariosDataStore.currentWeekStart);
    const key = HorariosDataStore.getSemanaKey(HorariosDataStore.currentWeekStart);
    const turnoKey = `${promotorId}-${diaIndex}`;
    const turno = semana.turnos[turnoKey];
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);

    if (!promotor) return;

    horariosCellEditorActive = { promotorId, diaIndex };

    const titleEl = document.getElementById('horarios-editor-title');
    const presetsEl = document.getElementById('horarios-editor-presets');
    const inicioEl = document.getElementById('horarios-editor-inicio');
    const finEl = document.getElementById('horarios-editor-fin');
    const descuentoEl = document.getElementById('horarios-editor-descuento');

    titleEl.textContent = `${promotor.nombre} - ${DIAS_SEMANA[diaIndex]}`;

    presetsEl.innerHTML = TURNOS_PREDEFINIDOS.map(t => {
        const active = turno && turno.estado === 'turno' && turno.hora_inicio === t.inicio && turno.hora_fin === t.fin;
        return `<button class="horarios-editor-preset ${active ? 'active' : ''}" onclick="aplicarPreset('${t.label}')">${t.label}</button>`;
    }).join('');

    if (turno && turno.estado === 'turno') {
        inicioEl.value = turno.hora_inicio || '';
        finEl.value = turno.hora_fin || '';
        descuentoEl.value = turno.descuento_refrigerio || 0;
    } else {
        inicioEl.value = '';
        finEl.value = '';
        descuentoEl.value = 1;
    }

    document.getElementById('horarios-editor-overlay').classList.add('open');
    document.getElementById('horarios-editor').classList.add('open');

    positionEditor();
}

function positionEditor() {
    const editor = document.getElementById('horarios-editor');
    if (!editor || window.innerWidth <= 768) return;

    const overlay = document.getElementById('horarios-editor-overlay');
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const ew = editor.offsetWidth;
    const eh = editor.offsetHeight;

    editor.style.left = Math.max(16, (vw - ew) / 2) + 'px';
    editor.style.top = Math.max(16, (vh - eh) / 2) + 'px';
    editor.style.right = 'auto';
    editor.style.bottom = 'auto';
}

function cerrarEditorCelda() {
    document.getElementById('horarios-editor-overlay').classList.remove('open');
    document.getElementById('horarios-editor').classList.remove('open');
    horariosCellEditorActive = null;
}

function aplicarPreset(label) {
    if (!horariosCellEditorActive) return;
    const { promotorId, diaIndex } = horariosCellEditorActive;
    const preset = TURNOS_PREDEFINIDOS.find(t => t.label === label);
    if (!preset) return;

    const descuento = parseFloat(document.getElementById('horarios-editor-descuento').value) || 0;
    HorariosDataStore.setTurno(HorariosDataStore.currentWeekStart, promotorId, diaIndex, {
        estado: 'turno',
        hora_inicio: preset.inicio,
        hora_fin: preset.fin,
        zona_id: HorariosDataStore.promotores.find(p => p.id === promotorId).zona_principal_id,
        descuento_refrigerio: descuento
    });

    cerrarEditorCelda();
    animarCelda(promotorId, diaIndex);
    renderHorarios();
}

function aplicarTurnoCustom() {
    if (!horariosCellEditorActive) return;
    const { promotorId, diaIndex } = horariosCellEditorActive;
    const inicio = document.getElementById('horarios-editor-inicio').value;
    const fin = document.getElementById('horarios-editor-fin').value;
    const descuento = parseFloat(document.getElementById('horarios-editor-descuento').value) || 0;

    if (!inicio || !fin) return;

    HorariosDataStore.setTurno(HorariosDataStore.currentWeekStart, promotorId, diaIndex, {
        estado: 'turno',
        hora_inicio: inicio,
        hora_fin: fin,
        zona_id: HorariosDataStore.promotores.find(p => p.id === promotorId).zona_principal_id,
        descuento_refrigerio: descuento
    });

    cerrarEditorCelda();
    animarCelda(promotorId, diaIndex);
    renderHorarios();
}

function aplicarDescanso() {
    if (!horariosCellEditorActive) return;
    const { promotorId, diaIndex } = horariosCellEditorActive;

    HorariosDataStore.setDescanso(HorariosDataStore.currentWeekStart, promotorId, diaIndex);
    cerrarEditorCelda();
    animarCelda(promotorId, diaIndex);
    renderHorarios();
}

function aplicarSinAsignar() {
    if (!horariosCellEditorActive) return;
    const { promotorId, diaIndex } = horariosCellEditorActive;

    HorariosDataStore.setSinAsignar(HorariosDataStore.currentWeekStart, promotorId, diaIndex);
    cerrarEditorCelda();
    animarCelda(promotorId, diaIndex);
    renderHorarios();
}

function abrirSelectorFlotante() {
    if (!horariosCellEditorActive) return;
    const { promotorId, diaIndex } = horariosCellEditorActive;
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);

    const flotantes = HorariosDataStore.getPromotoresFlotantes();
    if (flotantes.length === 0) {
        mostrarHorariosToast('No hay promotores flotantes disponibles');
        return;
    }

    const selectorHtml = flotantes.map(f => `
        <button class="horarios-editor-preset" onclick="aplicarFlotante('${f.id}', ${diaIndex})" style="grid-column:1/-1;text-align:left;padding:10px 14px;">
            <span style="color:#A855F7;font-weight:700;">${f.nombre}</span>
            <span style="color:var(--text-subdued);font-weight:400;display:block;font-size:10px;">
                ${HorariosDataStore.zonas.find(z => z.id === f.zona_principal_id)?.nombre || ''}
            </span>
        </button>
    `).join('');

    const presetsEl = document.getElementById('horarios-editor-presets');
    presetsEl.innerHTML = selectorHtml + `
        <button class="horarios-editor-preset" onclick="renderPresetsEdit()" style="grid-column:1/-1;color:var(--text-secondary);border-color:rgba(255,255,255,0.06);">
            ← Volver a turnos predefinidos
        </button>
    `;

    document.getElementById('horarios-editor-title').textContent = 'Asignar flotante a ' + DIAS_SEMANA[diaIndex];
}

function renderPresetsEdit() {
    if (!horariosCellEditorActive) return;
    abrirEditorCelda(horariosCellEditorActive.promotorId, horariosCellEditorActive.diaIndex);
}

function aplicarFlotante(flotanteId, diaIndex) {
    if (!horariosCellEditorActive) return;

    const inicio = document.getElementById('horarios-editor-inicio').value || '08:00';
    const fin = document.getElementById('horarios-editor-fin').value || '17:00';
    const descuento = parseFloat(document.getElementById('horarios-editor-descuento').value) || 0;

    const promotorActual = HorariosDataStore.promotores.find(p => p.id === horariosCellEditorActive.promotorId);
    const zonaDestino = promotorActual ? promotorActual.zona_principal_id : null;

    HorariosDataStore.setTurno(HorariosDataStore.currentWeekStart, flotanteId, diaIndex, {
        estado: 'flotante',
        hora_inicio: inicio,
        hora_fin: fin,
        zona_id: zonaDestino,
        descuento_refrigerio: descuento
    });

    cerrarEditorCelda();
    animarCelda(flotanteId, diaIndex);
    renderHorarios();
}

function animarCelda(promotorId, diaIndex) {
    const cell = document.getElementById(`celda-${promotorId}-${diaIndex}`);
    if (cell) {
        cell.classList.add('horarios-updated');
        setTimeout(() => cell.classList.remove('horarios-updated'), 1000);
    }
}

function toggleZona(zonaId) {
    const key = 'horarios-zona-collapsed-' + zonaId;
    const current = localStorage.getItem(key) === 'true';
    localStorage.setItem(key, !current);
    renderHorarios();
}

function publicarSemana() {
    if (!confirm('¿Publicar la semana? Los promotores verán los cambios al instante.')) return;
    HorariosDataStore.publicarSemana(HorariosDataStore.currentWeekStart);
    mostrarHorariosToast('✅ Semana publicada — promotores notificados');
    renderHorarios();
}

function revertirBorrador() {
    HorariosDataStore.setSemanaBorrador(HorariosDataStore.currentWeekStart);
    mostrarHorariosToast('📝 Semana vuelta a borrador');
    renderHorarios();
}

function mostrarHorariosToast(mensaje) {
    if (horariosToastTimer) {
        clearTimeout(horariosToastTimer);
    }

    const existing = document.querySelector('.horarios-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'horarios-toast';
    toast.innerHTML = `
        <span class="horarios-toast-icon">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </span>
        ${mensaje || '🔄 Tu horario se actualizó'}
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    horariosToastTimer = setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
        horariosToastTimer = null;
    }, 3500);
}

/* ===== GESTIÓN DE PROMOTORES (MODAL) ===== */

function escHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function abrirModalPromotores() {
    renderizarModalPromotores();
    const overlay = document.getElementById('modal-promotores-overlay');
    const modal = document.getElementById('modal-promotores');
    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
}

function cerrarModalPromotores() {
    const overlay = document.getElementById('modal-promotores-overlay');
    const modal = document.getElementById('modal-promotores');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
    renderHorarios();
}

function renderizarModalPromotores() {
    let overlay = document.getElementById('modal-promotores-overlay');
    let modal = document.getElementById('modal-promotores');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-promotores-overlay';
        overlay.className = 'horarios-modal-overlay';
        overlay.onclick = function (e) { if (e.target === this) cerrarModalPromotores(); };
        document.body.appendChild(overlay);

        modal = document.createElement('div');
        modal.id = 'modal-promotores';
        modal.className = 'horarios-modal horarios-modal-promotores';
        overlay.appendChild(modal);
    }

    const zonas = HorariosDataStore.zonas;
    const promotores = HorariosDataStore.promotores;

    const rowsHtml = promotores.map((p, i) => {
        const zonaOptions = `
            <option value="" ${!p.zona_principal_id ? 'selected' : ''}>— Sin asignar —</option>
            ${zonas.map(z =>
                `<option value="${z.id}" ${p.zona_principal_id === z.id ? 'selected' : ''}>${escHtml(z.nombre)}${z.cadena ? ' · ' + escHtml(z.cadena) : ''}</option>`
            ).join('')}
        `;

        return `
            <tr class="promotor-row" data-id="${escHtml(p.id)}">
                <td class="promotor-row-num">${i + 1}</td>
                <td>
                    <input class="promotor-input-name" type="text" value="${escHtml(p.nombre)}"
                        data-id="${escHtml(p.id)}"
                        onchange="aplicarCambiosPromotor('${escHtml(p.id)}')"
                        placeholder="Nombre del promotor">
                </td>
                <td>
                    <select class="promotor-select-tipo" data-id="${escHtml(p.id)}" onchange="aplicarCambiosPromotor('${escHtml(p.id)}')">
                        <option value="fijo" ${p.tipo === 'fijo' ? 'selected' : ''}>Fijo [F]</option>
                        <option value="flotante" ${p.tipo === 'flotante' ? 'selected' : ''}>Flotante [FL]</option>
                    </select>
                </td>
                <td>
                    <select class="promotor-select-zona" data-id="${escHtml(p.id)}" onchange="aplicarCambiosPromotor('${escHtml(p.id)}')">
                        ${zonaOptions}
                    </select>
                </td>
                <td>
                    <button class="promotor-btn-delete" onclick="eliminarPromotorHandler('${escHtml(p.id)}')" title="Eliminar promotor">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    modal.innerHTML = `
        <div class="horarios-modal-header">
            <h3>⚙️ Gestión de Promotores</h3>
            <button class="horarios-modal-close" onclick="cerrarModalPromotores()">✕</button>
        </div>
        <div class="horarios-modal-body">
            <div class="promotores-summary">
                <span>${promotores.length} promotor${promotores.length !== 1 ? 'es' : ''} registrados</span>
                <span>· ${HorariosDataStore.zonas.length} tiendas disponibles</span>
            </div>
            <div class="promotores-table-wrapper">
                <table class="promotores-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nombre</th>
                            <th>Tipo</th>
                            <th>Tienda asignada</th>
                            <th style="width:44px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="5" class="promotores-empty">No hay promotores registrados.</td></tr>'}
                    </tbody>
                </table>
            </div>
            <button class="promotor-btn-add" onclick="agregarNuevoPromotor()">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Añadir promotor
            </button>
        </div>
        <div class="horarios-modal-footer">
            <button class="horarios-btn-modal-secondary" onclick="cerrarModalPromotores()">Cerrar</button>
        </div>
    `;
}

function aplicarCambiosPromotor(promotorId) {
    const fila = document.querySelector(`.promotor-row[data-id="${promotorId}"]`);
    if (!fila) return;

    const nombreInput = fila.querySelector('.promotor-input-name');
    const tipoSelect = fila.querySelector('.promotor-select-tipo');
    const zonaSelect = fila.querySelector('.promotor-select-zona');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const tipo = tipoSelect ? tipoSelect.value : 'fijo';
    const zonaId = zonaSelect ? zonaSelect.value || null : null;

    if (!nombre) {
        nombreInput.focus();
        nombreInput.style.borderColor = '#EF4444';
        setTimeout(() => { if (nombreInput) nombreInput.style.borderColor = ''; }, 1500);
        return;
    }

    HorariosDataStore.editarPromotor(promotorId, { nombre, tipo, zona_principal_id: zonaId });
}

function agregarNuevoPromotor() {
    const zonas = HorariosDataStore.zonas;
    const nuevaZonaId = zonas.length > 0 ? zonas[0].id : null;
    HorariosDataStore.agregarPromotor('Nuevo promotor', 'fijo', nuevaZonaId);
    renderizarModalPromotores();

    setTimeout(() => {
        const lastInput = document.querySelector('.promotor-row:last-child .promotor-input-name');
        if (lastInput) { lastInput.focus(); lastInput.select(); }
    }, 100);
}

function eliminarPromotorHandler(promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor) return;
    if (!confirm(`¿Eliminar a "${promotor.nombre}"? Todos sus turnos asignados se perderán.`)) return;

    HorariosDataStore.eliminarPromotor(promotorId);
    renderizarModalPromotores();
}

function iniciarEdicionInline(span, promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor || !span) return;

    const currentName = promotor.nombre;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'horarios-inline-edit-input';
    input.value = currentName;
    input.style.cssText = 'width:100%;padding:4px 8px;border-radius:6px;border:1px solid var(--accent);background:rgba(29,185,84,0.06);color:#fff;font-size:12px;font-weight:600;font-family:inherit;outline:none;box-sizing:border-box;';

    span.style.display = 'none';
    span.parentNode.insertBefore(input, span.nextSibling);
    input.focus();
    input.select();

    function guardarInline() {
        const nuevoNombre = input.value.trim();
        if (nuevoNombre && nuevoNombre !== currentName) {
            HorariosDataStore.editarPromotor(promotorId, { nombre: nuevoNombre });
        }
        input.remove();
        span.style.display = '';
        span.textContent = nuevoNombre || currentName;
    }

    input.addEventListener('blur', guardarInline);
    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { input.blur(); }
        if (e.key === 'Escape') { input.value = currentName; input.blur(); }
    });
}

document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('resize', function () {
        if (document.getElementById('horarios-editor').classList.contains('open')) {
            positionEditor();
        }
    });
});
