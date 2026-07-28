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

    const acceso = verificarAccesoPromotor(promotor.id);
    if (!acceso.allowed) {
        container.innerHTML = `
            <div class="horarios-header">
                <div class="horarios-header-left">
                    <h2>Mi Horario</h2>
                </div>
                <div class="horarios-header-right">
                    <span class="horarios-role-badge promotor">Promotor</span>
                </div>
            </div>
            <div class="empty-state" style="text-align:center;padding:60px 20px;">
                <div style="font-size:48px;margin-bottom:16px;">🔒</div>
                <h3 style="color:#fff;font-size:20px;margin-bottom:8px;">Acceso suspendido</h3>
                <p style="color:var(--text-secondary);font-size:14px;max-width:400px;margin:0 auto;">${acceso.message}</p>
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

    const overlay = document.getElementById('horarios-editor-overlay');
    const editor = document.getElementById('horarios-editor');
    if (overlay) overlay.classList.add('open');
    if (editor) editor.classList.add('open');

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
    const overlay = document.getElementById('horarios-editor-overlay');
    const editor = document.getElementById('horarios-editor');
    if (overlay) overlay.classList.remove('open');
    if (editor) editor.classList.remove('open');
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
    requestAnimationFrame(syncPromotorScroll);
}

function syncPromotorScroll() {
    const wrapper = document.getElementById('promotores-table-wrapper');
    const topScroll = document.getElementById('promotores-scroll-top');
    if (!wrapper || !topScroll) return;

    const inner = topScroll.querySelector('.promotores-scroll-top-inner');
    if (!inner) return;

    const tableWidth = wrapper.scrollWidth;
    const wrapperWidth = wrapper.clientWidth;

    inner.style.width = tableWidth + 'px';
    topScroll.style.display = tableWidth > wrapperWidth ? 'block' : 'none';

    let syncing = false;

    topScroll.onscroll = function () {
        if (syncing) return;
        syncing = true;
        wrapper.scrollLeft = this.scrollLeft;
        syncing = false;
    };

    wrapper.onscroll = function () {
        if (syncing) return;
        syncing = true;
        topScroll.scrollLeft = this.scrollLeft;
        syncing = false;
    };
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

    const estadoOptions = [
        { value: 'Activo', label: '🟢 Activo' },
        { value: 'Licencia', label: '🟡 Licencia' },
        { value: 'Vacaciones', label: '🟠 Vacaciones' },
        { value: 'Inactivo', label: '🔴 Inactivo' }
    ];

    const rowsHtml = promotores.map((p, i) => {
        const zonaOptions = `
            <option value="" ${!p.zona_principal_id ? 'selected' : ''}>— Sin asignar —</option>
            ${zonas.map(z =>
                `<option value="${z.id}" ${p.zona_principal_id === z.id ? 'selected' : ''}>${escHtml(z.nombre)}${z.cadena ? ' · ' + escHtml(z.cadena) : ''}</option>`
            ).join('')}
        `;

        const estadoActual = p.estado || 'Activo';

        const estadoOptionsHtml = estadoOptions.map(eo =>
            `<option value="${eo.value}" ${estadoActual === eo.value ? 'selected' : ''}>${eo.label}</option>`
        ).join('');
        const estadoBadgeClass = estadoActual === 'Activo' ? 'promotor-estado-activo' :
            estadoActual === 'Licencia' ? 'promotor-estado-licencia' :
            estadoActual === 'Vacaciones' ? 'promotor-estado-vacaciones' :
            'promotor-estado-inactivo';

        const showReactivar = estadoActual !== 'Activo';

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
                    <div class="promotor-field-group">
                        <input class="promotor-input-dni" type="text" value="${escHtml(p.dni || '')}"
                            data-id="${escHtml(p.id)}"
                            maxlength="8"
                            oninput="validarDNIInput(this)"
                            onchange="aplicarCambiosPromotor('${escHtml(p.id)}')"
                            placeholder="12345678">
                        <span class="promotor-dni-error" style="display:none;">Debe tener 8 dígitos numéricos</span>
                    </div>
                </td>
                <td>
                    <div class="promotor-field-group">
                        <input class="promotor-input-email" type="email" value="${escHtml(p.email || '')}"
                            data-id="${escHtml(p.id)}"
                            onchange="aplicarCambiosPromotor('${escHtml(p.id)}')"
                            placeholder="correo@ejemplo.com">
                        <span class="promotor-email-error" style="display:none;">Correo inválido o ya registrado</span>
                    </div>
                </td>
                <td>
                    <div class="promotor-password-wrapper">
                        <input class="promotor-input-password" type="text" value="${escHtml(p.password || '')}"
                            data-id="${escHtml(p.id)}"
                            onchange="aplicarCambiosPromotor('${escHtml(p.id)}')"
                            placeholder="Contraseña">
                        <button class="promotor-btn-generate" onclick="generarPasswordHandler('${escHtml(p.id)}')" title="Generar contraseña">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/>
                                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                            </svg>
                        </button>
                    </div>
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
                    <select class="promotor-select-estado ${estadoBadgeClass}" data-id="${escHtml(p.id)}" onchange="aplicarCambiosPromotor('${escHtml(p.id)}')">
                        ${estadoOptionsHtml}
                    </select>
                </td>
                <td class="promotor-actions-cell">
                    ${showReactivar ? `
                        <button class="promotor-btn-reactivate" onclick="reactivarPromotorHandler('${escHtml(p.id)}')" title="Reactivar promotor">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </button>
                    ` : ''}
                    <button class="promotor-btn-pause" onclick="pausarPromotorHandler('${escHtml(p.id)}')" title="Poner en pausa">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    </button>
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
            <div class="promotores-toolbar">
                <button class="promotor-btn-import" onclick="abrirModalImportarExcel()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Importar Excel
                </button>
                <button class="promotor-btn-add" onclick="agregarNuevoPromotor()">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Añadir promotor
                </button>
            </div>
            <div class="promotores-table-scroll-area">
                <div class="promotores-scroll-top" id="promotores-scroll-top">
                    <div class="promotores-scroll-top-inner"></div>
                </div>
                <div class="promotores-table-wrapper" id="promotores-table-wrapper">
                    <table class="promotores-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nombre</th>
                                <th>DNI</th>
                                <th>Correo Electrónico</th>
                                <th>Contraseña</th>
                                <th>Tipo</th>
                                <th>Tienda asignada</th>
                                <th>Estado</th>
                                <th style="width:100px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml || '<tr><td colspan="9" class="promotores-empty">No hay promotores registrados.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="horarios-modal-footer">
            <button class="horarios-btn-modal-secondary" onclick="cerrarModalPromotores()">Cerrar</button>
        </div>
    `;

    requestAnimationFrame(syncPromotorScroll);
}

function validarDNIInput(input) {
    input.value = input.value.replace(/\D/g, '');
    const errorEl = input.closest('.promotor-field-group')?.querySelector('.promotor-dni-error');
    if (!input.value || /^\d{8}$/.test(input.value)) {
        input.style.borderColor = '';
        if (errorEl) errorEl.style.display = 'none';
    } else {
        input.style.borderColor = '#EF4444';
        if (errorEl) errorEl.style.display = 'block';
    }
}

function aplicarCambiosPromotor(promotorId) {
    const fila = document.querySelector(`.promotor-row[data-id="${promotorId}"]`);
    if (!fila) return;

    const nombreInput = fila.querySelector('.promotor-input-name');
    const dniInput = fila.querySelector('.promotor-input-dni');
    const emailInput = fila.querySelector('.promotor-input-email');
    const passwordInput = fila.querySelector('.promotor-input-password');
    const tipoSelect = fila.querySelector('.promotor-select-tipo');
    const zonaSelect = fila.querySelector('.promotor-select-zona');
    const estadoSelect = fila.querySelector('.promotor-select-estado');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const dni = dniInput ? dniInput.value.trim() : '';
    const email = emailInput ? emailInput.value.trim() : '';
    const password = passwordInput ? passwordInput.value.trim() : '';
    const tipo = tipoSelect ? tipoSelect.value : 'fijo';
    const zonaId = zonaSelect ? zonaSelect.value || null : null;
    const estado = estadoSelect ? estadoSelect.value : 'Activo';

    if (!nombre) {
        nombreInput.focus();
        nombreInput.style.borderColor = '#EF4444';
        setTimeout(() => { if (nombreInput) nombreInput.style.borderColor = ''; }, 1500);
        return;
    }

    if (dni && !/^\d{8}$/.test(dni)) {
        const errorEl = fila.querySelector('.promotor-dni-error');
        if (dniInput) dniInput.style.borderColor = '#EF4444';
        if (errorEl) errorEl.style.display = 'block';
        setTimeout(() => {
            if (dniInput) dniInput.style.borderColor = '';
            if (errorEl) errorEl.style.display = 'none';
        }, 2500);
        return;
    }

    if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            const errorEl = fila.querySelector('.promotor-email-error');
            if (emailInput) emailInput.style.borderColor = '#EF4444';
            if (errorEl) {
                errorEl.textContent = 'Formato de correo inválido';
                errorEl.style.display = 'block';
            }
            setTimeout(() => {
                if (emailInput) emailInput.style.borderColor = '';
                if (errorEl) errorEl.style.display = 'none';
            }, 2500);
            return;
        }
        const duplicado = HorariosDataStore.promotores.find(p => p.id !== promotorId && p.email === email);
        if (duplicado) {
            const errorEl = fila.querySelector('.promotor-email-error');
            if (emailInput) emailInput.style.borderColor = '#EF4444';
            if (errorEl) {
                errorEl.textContent = 'Este correo ya está registrado';
                errorEl.style.display = 'block';
            }
            setTimeout(() => {
                if (emailInput) emailInput.style.borderColor = '';
                if (errorEl) errorEl.style.display = 'none';
            }, 2500);
            return;
        }
    }

    HorariosDataStore.editarPromotor(promotorId, {
        nombre, tipo, zona_principal_id: zonaId,
        dni, email, password, estado
    });

    if (estadoSelect) {
        estadoSelect.className = 'promotor-select-estado promotor-estado-' + estado.toLowerCase();
    }
}

function generarPassword(nombre) {
    const base = (nombre || 'Promotor').trim().split(' ')[0];
    const limpio = base.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '');
    if (!limpio) return 'Promotor' + Math.floor(1000 + Math.random() * 9000);
    const nums = Math.floor(1000 + Math.random() * 9000);
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase() + nums;
}

function generarPasswordHandler(promotorId) {
    const fila = document.querySelector(`.promotor-row[data-id="${promotorId}"]`);
    if (!fila) return;
    const nombreInput = fila.querySelector('.promotor-input-name');
    const passwordInput = fila.querySelector('.promotor-input-password');
    if (!passwordInput) return;
    const nombre = nombreInput ? nombreInput.value.trim() : 'Promotor';
    passwordInput.value = generarPassword(nombre);
    aplicarCambiosPromotor(promotorId);
}

function pausarPromotorHandler(promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor) return;
    if (!confirm('¿Desea poner en pausa a este promotor?')) return;
    HorariosDataStore.editarPromotor(promotorId, { estado: 'Licencia' });
    renderizarModalPromotores();
}

function reactivarPromotorHandler(promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor) return;
    HorariosDataStore.editarPromotor(promotorId, { estado: 'Activo' });
    renderizarModalPromotores();
}

function verificarAccesoPromotor(promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor) return { allowed: false, message: 'Promotor no encontrado.' };
    const estado = promotor.estado || 'Activo';
    if (estado !== 'Activo') {
        return { allowed: false, message: 'Tu cuenta se encuentra temporalmente suspendida. Comunícate con tu supervisor.' };
    }
    if (!promotor.zona_principal_id) {
        return { allowed: false, message: 'No tienes una tienda asignada. Comunícate con tu supervisor.' };
    }
    return { allowed: true };
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

/* ===== IMPORTACIÓN MASIVA DE PROMOTORES (EXCEL) ===== */

let importData = [];
let importFileData = null;

function abrirModalImportarExcel() {
    importData = [];
    importFileData = null;
    renderizarModalImportarExcel();
    const overlay = document.getElementById('modal-import-excel-overlay');
    const modal = document.getElementById('modal-import-excel');
    if (overlay) overlay.classList.add('open');
    if (modal) modal.classList.add('open');
}

function cerrarModalImportarExcel() {
    const overlay = document.getElementById('modal-import-excel-overlay');
    const modal = document.getElementById('modal-import-excel');
    if (overlay) overlay.classList.remove('open');
    if (modal) modal.classList.remove('open');
}

function renderizarModalImportarExcel() {
    let overlay = document.getElementById('modal-import-excel-overlay');
    let modal = document.getElementById('modal-import-excel');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modal-import-excel-overlay';
        overlay.className = 'horarios-modal-overlay';
        overlay.onclick = function (e) { if (e.target === this) cerrarModalImportarExcel(); };
        document.body.appendChild(overlay);

        modal = document.createElement('div');
        modal.id = 'modal-import-excel';
        modal.className = 'horarios-modal import-modal';
        overlay.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="horarios-modal-header">
            <h3>📁 Carga Masiva de Promotores</h3>
            <button class="horarios-modal-close" onclick="cerrarModalImportarExcel()">✕</button>
        </div>
        <div class="horarios-modal-body">
            <p style="color:var(--text-secondary);margin-bottom:20px;font-size:13px;line-height:1.5;">
                Seleccione un archivo Excel para importar promotores automáticamente.
            </p>
            <div class="import-dropzone" id="import-dropzone" onclick="document.getElementById('import-file-input').click()">
                <input type="file" id="import-file-input" accept=".xlsx,.xls" style="display:none" onchange="manejarArchivoImportacion(event)">
                <div class="import-dropzone-content">
                    <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    <p>Arrastra un archivo Excel o haz clic para seleccionar</p>
                    <span class="import-dropzone-hint">Formatos aceptados: .xlsx, .xls</span>
                </div>
            </div>
            <div class="import-actions">
                <button class="import-btn import-btn-secondary" onclick="seleccionarArchivoImportacion()" type="button">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Seleccionar Archivo
                </button>
                <button class="import-btn import-btn-secondary" onclick="descargarPlantillaExcel()" type="button">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Descargar Plantilla
                </button>
            </div>
            <div id="import-preview-container" style="display:none;"></div>
            <div id="import-progress-container" style="display:none;"></div>
            <div id="import-result-container" style="display:none;"></div>
        </div>
        <div class="horarios-modal-footer" id="import-modal-footer">
            <button class="horarios-btn-modal-secondary" onclick="cerrarModalImportarExcel()">Cancelar</button>
            <button class="horarios-btn-publish" id="btn-confirmar-importacion" onclick="confirmarImportacion()" style="display:none;">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Importar
            </button>
        </div>
    `;
}

function seleccionarArchivoImportacion() {
    document.getElementById('import-file-input').click();
}

function descargarPlantillaExcel() {
    if (typeof XLSX === 'undefined') {
        alert('La librería XLSX no está disponible. Verifica la conexión a internet.');
        return;
    }
    const wb = XLSX.utils.book_new();
    const ws_data = [
        ['Nombre y Apellido', 'Nro Documento', 'E-mail Corporativo'],
        ['Juan Perez', '71234567', 'juan.perez@empresa.com'],
        ['Maria Flores', '74891234', 'maria.flores@empresa.com']
    ];
    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Promotores');
    XLSX.writeFile(wb, 'Plantilla_Promotores.xlsx');
}

function manejarArchivoImportacion(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const container = document.getElementById('import-preview-container');
    const dropzone = document.getElementById('import-dropzone');
    if (container) container.style.display = 'none';
    if (dropzone) {
        const fileName = file.name;
        dropzone.innerHTML = `
            <div class="import-dropzone-content import-file-selected">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                <p style="color:#fff;font-weight:600;">${escHtml(fileName)}</p>
                <span class="import-dropzone-hint">${(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar archivo</span>
            </div>
        `;
        dropzone.onclick = function () { document.getElementById('import-file-input').click(); };
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (!json || json.length === 0) {
                alert('El archivo está vacío. Descargue la plantilla y complete los datos.');
                return;
            }

            importFileData = json;
            procesarDatosImportacion(json);
        } catch (err) {
            alert('Error al leer el archivo: ' + err.message);
        }
    };
    reader.readAsArrayBuffer(file);
}

function extraerNombreMostrado(nombreCompleto) {
    const partes = (nombreCompleto || '').trim().split(/\s+/);
    if (partes.length === 0 || !partes[0]) return '';
    const primerNombre = partes[0];
    const primerApellido = partes.length >= 3 ? partes[partes.length - 2] : (partes[1] || '');
    const cap = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    return (cap(primerNombre) + ' ' + cap(primerApellido)).trim();
}

function procesarDatosImportacion(json) {
    const zonas = HorariosDataStore.zonas;
    const existentes = HorariosDataStore.promotores;

    const results = json.map((row, index) => {
        const nombreOriginal = (row['Nombre y Apellido'] || row['NOMBRE Y APELLIDO'] || row['nombre'] || row['Nombre'] || '').toString().trim();
        const nombreMostrado = extraerNombreMostrado(nombreOriginal);
        const dni = (row['Nro Documento'] || row['NRO DOCUMENTO'] || row['dni'] || row['DNI'] || row['documento'] || row['Documento'] || '').toString().trim();
        const email = (row['E-mail Corporativo'] || row['E-MAIL CORPORATIVO'] || row['email'] || row['Email'] || row['E-mail'] || row['correo'] || '').toString().trim().toLowerCase();

        const errores = [];
        if (!nombreOriginal) errores.push('Nombre obligatorio');
        if (!dni) errores.push('DNI obligatorio');
        else if (!/^\d{8}$/.test(dni)) errores.push('DNI debe tener 8 dígitos');
        if (!email) errores.push('Correo obligatorio');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errores.push('Correo inválido');

        const duplicado = existentes.find(p => p.dni === dni || p.email === email);
        const esDuplicado = !!duplicado;

        return { nombreOriginal, nombreMostrado, dni, email, errores, esDuplicado, valido: errores.length === 0 && !esDuplicado, index };
    });

    importData = results;
    renderPreviewImportacion(results);
}

function renderPreviewImportacion(results) {
    const container = document.getElementById('import-preview-container');
    const btnImportar = document.getElementById('btn-confirmar-importacion');
    if (!container) return;

    const validos = results.filter(r => r.valido);
    const conErrores = results.filter(r => r.errores.length > 0);
    const duplicados = results.filter(r => r.esDuplicado);

    container.style.display = 'block';

    if (validos.length === 0) {
        container.innerHTML = `
            <div class="import-validation-summary" style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                <span>No hay registros válidos para importar. Verifica el archivo.</span>
            </div>
        `;
        if (btnImportar) btnImportar.style.display = 'none';
        return;
    }

    if (btnImportar) btnImportar.style.display = 'inline-flex';

    let rowsHtml = results.map((r, i) => {
        let statusIcon = '';
        let statusClass = '';
        if (r.valido) {
            statusIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#1DB954" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
            statusClass = 'import-row-valido';
        } else if (r.errores.length > 0) {
            statusIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            statusClass = 'import-row-error';
        } else if (r.esDuplicado) {
            statusIcon = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
            statusClass = 'import-row-duplicado';
        }
        const errorText = r.errores.length > 0 ? r.errores.join(', ') : (r.esDuplicado ? 'El promotor ya existe y fue omitido.' : '');
        return `<tr class="${statusClass}">
            <td>${i + 1}</td>
            <td>${escHtml(r.nombreMostrado) || '<span style="color:#EF4444;">—</span>'}</td>
            <td>${escHtml(r.dni) || '<span style="color:#EF4444;">—</span>'}</td>
            <td>${escHtml(r.email) || '<span style="color:#EF4444;">—</span>'}</td>
            <td>${statusIcon}</td>
            <td style="font-size:11px;color:${errorText ? '#EF4444' : '#1DB954'};">${errorText || '✓ Válido'}</td>
        </tr>`;
    }).join('');

    container.innerHTML = `
        <div class="import-validation-bar">
            <span class="import-validation-count valid">✅ ${validos.length} válidos</span>
            ${conErrores.length ? `<span class="import-validation-count error">❌ ${conErrores.length} con errores</span>` : ''}
            ${duplicados.length ? `<span class="import-validation-count warning">⚠️ ${duplicados.length} duplicados</span>` : ''}
        </div>
        <div class="import-preview-table-wrapper">
            <table class="import-preview-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Nombre y Apellido</th>
                        <th>DNI</th>
                        <th>Correo</th>
                        <th>Estado</th>
                        <th>Detalle</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        <div class="import-store-assign">
            <label>Asignar tienda a los nuevos promotores:</label>
            <select id="import-store-select" class="import-store-select">
                <option value="">— Sin asignar —</option>
                ${HorariosDataStore.zonas.map(z =>
                    `<option value="${z.id}">${escHtml(z.nombre)}${z.cadena ? ' · ' + escHtml(z.cadena) : ''}</option>`
                ).join('')}
            </select>
        </div>
    `;
}

async function hashPassword(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password + 'dashboard-ventas-salt-2024');
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        return 'hash_' + Math.abs(hash).toString(16).padStart(8, '0');
    }
}

function generarPasswordImportacion(nombre) {
    const base = (nombre || 'Promotor').trim().split(' ')[0];
    const limpio = base.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '');
    if (!limpio) return 'Promotor' + Math.floor(1000 + Math.random() * 9000);
    const nums = Math.floor(1000 + Math.random() * 9000);
    return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase() + nums;
}

async function confirmarImportacion() {
    const btn = document.getElementById('btn-confirmar-importacion');
    const progressContainer = document.getElementById('import-progress-container');
    const resultContainer = document.getElementById('import-result-container');
    const previewContainer = document.getElementById('import-preview-container');

    if (!importData || importData.length === 0) return;

    const validos = importData.filter(r => r.valido);
    if (validos.length === 0) return;

    btn.disabled = true;
    btn.textContent = 'Importando...';

    if (progressContainer) {
        progressContainer.style.display = 'block';
        progressContainer.innerHTML = `
            <div class="import-progress-bar">
                <div class="import-progress-fill" id="import-progress-fill" style="width:0%"></div>
            </div>
            <div class="import-progress-text" id="import-progress-text">0 / ${validos.length} procesados</div>
        `;
    }

    const storeSelect = document.getElementById('import-store-select');
    const zonaId = storeSelect ? storeSelect.value || null : null;

    let creados = 0;
    let duplicados = importData.filter(r => r.esDuplicado).length;
    let errores = importData.filter(r => r.errores.length > 0).length;

    for (let i = 0; i < validos.length; i++) {
        const r = validos[i];
        const password = generarPasswordImportacion(r.nombreOriginal);
        const passwordHash = await hashPassword(password);
        const ahora = new Date().toISOString();

        const nuevoPromotor = {
            id: HorariosDataStore._proximoIdPromotor(),
            nombre: r.nombreMostrado || r.nombreOriginal,
            nombreOriginal: r.nombreOriginal || null,
            zona_principal_id: zonaId,
            tipo: 'fijo',
            dni: r.dni,
            email: r.email,
            password: password,
            password_hash: passwordHash,
            estado: 'Activo',
            fecha_creacion: ahora,
            fecha_actualizacion: ahora
        };

        HorariosDataStore.promotores.push(nuevoPromotor);

        for (let key in HorariosDataStore.semanas) {
            const semana = HorariosDataStore.semanas[key];
            for (let d = 0; d < 7; d++) {
                const turnoKey = `${nuevoPromotor.id}-${d}`;
                semana.turnos[turnoKey] = {
                    promotor_id: nuevoPromotor.id, dia: d,
                    estado: 'sin_asignar', hora_inicio: null, hora_fin: null,
                    zona_id: null, descuento_refrigerio: 0, horas_calculadas: 0
                };
            }
        }

        creados++;

        const pct = Math.round(((i + 1) / validos.length) * 100);
        const fill = document.getElementById('import-progress-fill');
        const text = document.getElementById('import-progress-text');
        if (fill) fill.style.width = pct + '%';
        if (text) text.textContent = `${i + 1} / ${validos.length} procesados`;

        await new Promise(resolve => setTimeout(resolve, 50));
    }

    HorariosDataStore._guardarEnFirestore();

    if (progressContainer) progressContainer.style.display = 'none';
    if (previewContainer) previewContainer.style.display = 'none';

    const totalRegistros = importData.length;

    if (resultContainer) {
        resultContainer.style.display = 'block';
        resultContainer.innerHTML = `
            <div class="import-result">
                <div class="import-result-icon">
                    <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#1DB954" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h3 class="import-result-title">Base de datos sincronizada correctamente</h3>
                <div class="import-result-stats">
                    <div class="import-result-stat">
                        <span class="import-result-stat-value">${totalRegistros}</span>
                        <span class="import-result-stat-label">Total registros encontrados</span>
                    </div>
                    <div class="import-result-stat">
                        <span class="import-result-stat-value" style="color:#1DB954;">${creados}</span>
                        <span class="import-result-stat-label">Registros cargados</span>
                    </div>
                    <div class="import-result-stat">
                        <span class="import-result-stat-value" style="color:#F59E0B;">${duplicados}</span>
                        <span class="import-result-stat-label">Duplicados omitidos</span>
                    </div>
                    <div class="import-result-stat">
                        <span class="import-result-stat-value" style="color:#EF4444;">${errores}</span>
                        <span class="import-result-stat-label">Errores encontrados</span>
                    </div>
                </div>
                <div style="margin-top:14px;padding:10px 14px;background:rgba(29,185,84,0.06);border:1px solid rgba(29,185,84,0.15);border-radius:10px;font-size:12px;color:#1DB954;text-align:center;">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><polyline points="20 6 9 17 4 12"/></svg>
                    Fuente: Excel Oficial
                </div>
            </div>
        `;
    }

    btn.style.display = 'none';

    const footer = document.getElementById('import-modal-footer');
    if (footer) {
        const cancelBtn = footer.querySelector('.horarios-btn-modal-secondary');
        if (cancelBtn) {
            cancelBtn.textContent = 'Cerrar';
            cancelBtn.onclick = function () {
                cerrarModalImportarExcel();
                renderizarModalPromotores();
            };
        }
    }

    renderizarModalPromotores();
}

document.addEventListener('DOMContentLoaded', function () {
    window.addEventListener('resize', function () {
        const he = document.getElementById('horarios-editor');
        if (he && he.classList.contains('open')) {
            positionEditor();
        }
    });
});
