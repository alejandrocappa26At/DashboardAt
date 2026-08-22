let horariosToastTimer = null;

const ESTADO_PROMOTOR_OPCIONES = [
    { value: 'Activo', label: '🟢 Activo' },
    { value: 'Licencia', label: '🟡 Licencia' },
    { value: 'Vacaciones', label: '🟠 Vacaciones' },
    { value: 'Inactivo', label: '🔴 Inactivo' }
];

const ROL_PROMOTOR_OPCIONES = [
    { value: 'fijo', label: 'Fijo', color: '🟢' },
    { value: 'volante', label: 'Volante', color: '🔵' },
    { value: 'vacacionero', label: 'Vacacionero', color: '🟡' },
    { value: 'experto', label: 'Experto', color: '🟣' }
];

function _rolBadgeClass(rol) {
    switch (rol) {
        case 'fijo': return 'promotor-rol-fijo';
        case 'volante': return 'promotor-rol-volante';
        case 'vacacionero': return 'promotor-rol-vacacionero';
        case 'experto': return 'promotor-rol-experto';
        default: return '';
    }
}

function _rolLabel(rol) {
    const r = ROL_PROMOTOR_OPCIONES.find(o => o.value === rol);
    return r ? r.label : rol;
}

function _nombreTiendaPromotor(zonaId, zonas) {
    if (!zonaId) return '';
    const zona = (zonas || []).find(z => z.id === zonaId);
    return zona && zona.nombre ? zona.nombre : zonaId;
}

function _zonaGestionSesion() {
    try {
        const raw = sessionStorage.getItem('auth_session');
        if (!raw) return null;
        const s = JSON.parse(raw);
        return (s && s.rol === 'supervisor' && s.zona) ? String(s.zona) : null;
    } catch (e) { return null; }
}

function _esJefeGestion() {
    try {
        const raw = sessionStorage.getItem('auth_session');
        if (!raw) return false;
        const s = JSON.parse(raw);
        return !!(s && s.rol === 'jefe');
    } catch (e) { return false; }
}

function _normalizarZonaGestion(str) {
    return String(str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function _cadenaTiendaGestion(tiendaId, zonas) {
    const zona = (zonas || []).find(z => z.id === tiendaId);
    return zona && zona.cadena ? String(zona.cadena) : '';
}

function _getZonasUnicas(zonas) {
    const cadenas = new Set();
    (zonas || []).forEach(z => {
        if (z.cadena) cadenas.add(z.cadena);
    });
    return Array.from(cadenas).sort();
}

function _getPromotorZona(p, zonas) {
    if (!p || !p.zona_principal_id) return '';
    return _cadenaTiendaGestion(p.zona_principal_id, zonas);
}

function _tiendasZonaGestion(zonas) {
    const zona = _zonaGestionSesion();
    if (!zona) return zonas || [];
    const z = _normalizarZonaGestion(zona);
    return (zonas || []).filter(t => _normalizarZonaGestion(t.cadena) === z);
}

function _promotorEnZonaGestion(p) {
    const zona = _zonaGestionSesion();
    if (!zona) return true;
    if (!p || !p.zona_principal_id) return false;
    const cadena = _cadenaTiendaGestion(p.zona_principal_id, HorariosDataStore.zonas);
    return _normalizarZonaGestion(cadena) === _normalizarZonaGestion(zona);
}

function ordenarPromotoresPorTienda(promotores, zonas) {
    return [...promotores].sort((a, b) => {
        const ta = a.zona_principal_id ? _nombreTiendaPromotor(a.zona_principal_id, zonas).toUpperCase() : null;
        const tb = b.zona_principal_id ? _nombreTiendaPromotor(b.zona_principal_id, zonas).toUpperCase() : null;
        const keyA = ta !== null ? '1:' + ta : '2:';
        const keyB = tb !== null ? '1:' + tb : '2:';
        if (keyA !== keyB) return keyA < keyB ? -1 : 1;
        const na = String(a.nombre || '').trim().toUpperCase();
        const nb = String(b.nombre || '').trim().toUpperCase();
        if (na !== nb) return na < nb ? -1 : 1;
        return 0;
    });
}

function _promotorOpcionesZonaHtml(p, zonas, restringido) {
    const sinAsignar = !restringido
        ? '<option value="" ' + (!p.zona_principal_id ? 'selected' : '') + '>&mdash; Sin asignar &mdash;</option>'
        : '';
    const opciones = (zonas || []).map(z =>
        '<option value="' + escHtml(z.id) + '" ' + (p.zona_principal_id === z.id ? 'selected' : '') + '>' +
        escHtml(z.nombre) + (z.cadena ? ' &middot; ' + escHtml(z.cadena) : '') + '</option>'
    ).join('');
    return sinAsignar + opciones;
}

function _promoFilaHtml(p, numero, zonas, restringido) {
    const zonaOptions = _promotorOpcionesZonaHtml(p, zonas, restringido);
    const estadoActual = p.estado || 'Activo';
    const estadoOptionsHtml = ESTADO_PROMOTOR_OPCIONES.map(eo =>
        '<option value="' + eo.value + '" ' + (estadoActual === eo.value ? 'selected' : '') + '>' + eo.label + '</option>'
    ).join('');
    const estadoBadgeClass = estadoActual === 'Activo' ? 'promotor-estado-activo' :
        estadoActual === 'Licencia' ? 'promotor-estado-licencia' :
        estadoActual === 'Vacaciones' ? 'promotor-estado-vacaciones' :
        'promotor-estado-inactivo';
    
    const rolActual = p.tipo || 'fijo';
    const rolOptionsHtml = ROL_PROMOTOR_OPCIONES.map(ro =>
        '<option value="' + ro.value + '" ' + (rolActual === ro.value ? 'selected' : '') + '>' + ro.label + '</option>'
    ).join('');
    const rolBadgeClass = _rolBadgeClass(rolActual);
    
    const showReactivar = estadoActual !== 'Activo';
    const fechaRegistro = p.fecha_creacion
        ? new Date(p.fecha_creacion).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : '&mdash;';

    return `
            <tr class="promotor-row" data-id="${escHtml(p.id)}">
                <td class="promotor-row-num">${numero}</td>
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
                        <input class="promotor-input-password" type="password" value="${escHtml(p.password || '')}"
                            data-id="${escHtml(p.id)}"
                            onchange="aplicarCambiosPromotor('${escHtml(p.id)}')"
                            placeholder="********">
                        <button type="button" class="promotor-btn-generate promotor-btn-eye" title="Mostrar/Ocultar contraseña" onclick="togglePasswordVisibilidad(this)">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button type="button" class="promotor-btn-generate" title="Generar nueva contraseña" onclick="generarPasswordHandler('${escHtml(p.id)}')">
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </button>
                    </div>
                </td>
                <td>
                    <select class="promotor-select-estado ${estadoBadgeClass}" data-id="${escHtml(p.id)}" onchange="aplicarCambiosPromotor('${escHtml(p.id)}')">
                        ${estadoOptionsHtml}
                    </select>
                </td>
                <td>
                    <select class="promotor-select-tipo ${rolBadgeClass}" data-id="${escHtml(p.id)}" onchange="aplicarCambiosPromotor('${escHtml(p.id)}')">
                        ${rolOptionsHtml}
                    </select>
                </td>
                <td>
                    <select class="promotor-select-zona" data-id="${escHtml(p.id)}" onchange="aplicarCambiosPromotor('${escHtml(p.id)}')">
                        ${zonaOptions}
                    </select>
                </td>
                <td class="promotor-fecha-registro">${fechaRegistro}</td>
                <td class="promotor-actions-cell">
                    ${showReactivar ? `
                        <button class="promotor-btn-reactivate" onclick="reactivarPromotorHandler('${escHtml(p.id)}')" title="Reactivar promotor">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                        </button>
                    ` : `
                        <button class="promotor-btn-pause" onclick="pausarPromotorHandler('${escHtml(p.id)}')" title="Desactivar">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        </button>
                    `}
                    <button class="promotor-btn-delete" onclick="eliminarPromotorHandler('${escHtml(p.id)}')" title="Eliminar promotor">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            </tr>
        `;
}

function _promoRowsHtml(promotores, zonas, restringido) {
    if (!promotores || promotores.length === 0) return '';
    const ordenados = ordenarPromotoresPorTienda(promotores, zonas);
    let html = '';
    let tiendaActual = null;
    let numero = 0;
    for (const p of ordenados) {
        const label = p.zona_principal_id ? _nombreTiendaPromotor(p.zona_principal_id, zonas) : '';
        const grupo = label || '&mdash; Sin asignar &mdash;';
        if (grupo !== tiendaActual) {
            html += `
                <tr class="tienda-group-header">
                    <td colspan="9">
                        <span class="tienda-group-title">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            ${escHtml(grupo)}
                        </span>
                    </td>
                </tr>
            `;
            tiendaActual = grupo;
        }
        numero += 1;
        html += _promoFilaHtml(p, numero, zonas, restringido);
    }
    return html;
}

function actualizarTiendaEnColeccionPromotores(promotorId, zonaId, tienda) {
    if (typeof db === 'undefined' || !db) return;
    try {
        db.collection('promotores').doc(promotorId).update({
            tienda: tienda || null,
            zona_principal_id: zonaId || null
        }).catch(() => {
            db.collection('promotores').doc(promotorId).set({
                id: promotorId,
                nombre: (HorariosDataStore.promotores.find(p => p.id === promotorId) || {}).nombre || '',
                tienda: tienda || null,
                zona_principal_id: zonaId || null,
                fecha_actualizacion: new Date().toISOString()
            }, { merge: true }).catch(e => {
                console.warn('[AUDITORIA][PROMOTORES] No se pudo escribir la tienda en Firestore:', e);
            });
        }).then(() => {
            console.log('[AUDITORIA][PROMOTORES] Tienda actualizada en colección promotores:', promotorId, '->', tienda);
        });
    } catch (e) {
        console.warn('[AUDITORIA][PROMOTORES] Error al actualizar tienda en Firestore:', e);
    }
}

function initHorarios(role, userName) {
    HorariosDataStore.init(role || 'supervisor', userName || null, function (fromRealtime) {
        renderHorarios();
        if (fromRealtime) {
            mostrarHorariosToast();
        }
    });
}

function renderHorarios() {
    renderGestionPromotores();
}

function renderGestionPromotores() {
    const container = document.getElementById('horarios-content');
    if (!container) return;

    const zonas = HorariosDataStore.zonas;
    const promotores = HorariosDataStore.promotores;

    const zonaActiva = _zonaGestionSesion();
    const esJefe = _esJefeGestion();
    const restringido = !!zonaActiva;
    const zonasVisibles = zonaActiva ? _tiendasZonaGestion(zonas) : zonas;
    const promotoresVisibles = zonaActiva
        ? promotores.filter(p => _promotorEnZonaGestion(p))
        : promotores;

    console.log('[AUDITORIA][PROMOTORES] Promotores visibles:', promotoresVisibles.length);
    console.log('[AUDITORIA][PROMOTORES] IDs visibles:', promotoresVisibles.map(p => p.id));
    console.log('[AUDITORIA][PROMOTORES] Correos visibles:', promotoresVisibles.map(p => p.email || '').filter(Boolean));
    console.log('[AUDITORIA][PROMOTORES] Fuente utilizada:', HorariosDataStore._fuentePromotores || 'HorariosDataStore.promotores (memoria)');
    console.log('[AUDITORIA][PROMOTORES] Coincide con login (Registro de Ventas): ' + (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores === promotores));
    if (zonaActiva) {
        console.log('[AUDITORIA][PROMOTORES] Zona activa del supervisor:', zonaActiva, '| Tiendas visibles:', zonasVisibles.length, '| Promotores visibles:', promotoresVisibles.length);
    }

    // Resumen por rol
    const totalPromotores = promotoresVisibles.length;
    const fijos = promotoresVisibles.filter(p => (p.tipo || 'fijo') === 'fijo').length;
    const volantes = promotoresVisibles.filter(p => (p.tipo || 'fijo') === 'volante').length;
    const vacacioneros = promotoresVisibles.filter(p => (p.tipo || 'fijo') === 'vacacionero').length;
    const expertos = promotoresVisibles.filter(p => (p.tipo || 'fijo') === 'experto').length;

    // Zonas únicas para el filtro (solo para Jefe Comercial)
    const zonasUnicas = _getZonasUnicas(zonas);

    const rowsHtml = _promoRowsHtml(promotoresVisibles, zonasVisibles, restringido);

    const zonaBar = zonaActiva && !esJefe
        ? `
        <div class="promotores-zona-activa">
            <span class="pza-item"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg> Zona Activa: <strong>${escHtml(zonaActiva)}</strong></span>
            <span class="pza-divider">&middot;</span>
            <span class="pza-item"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> Promotores: <strong>${promotoresVisibles.length}</strong></span>
            <span class="pza-divider">&middot;</span>
            <span class="pza-item"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Tiendas: <strong>${zonasVisibles.length}</strong></span>
        </div>`
        : '';

    container.innerHTML = `
        <div class="horarios-header">
            <div class="horarios-header-left">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#1DB954" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h2>Gestión de Promotores</h2>
            </div>
            <div class="horarios-header-right">
                <button class="horarios-btn-excel" onclick="descargarPlantillaPromotores()" title="Descargar plantilla Excel para carga masiva">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Descargar Plantilla</span>
                </button>
                <button class="horarios-btn-importar" onclick="abrirModalImportarPromotores()" title="Importar promotores desde un archivo Excel">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Importar Promotores</span>
                </button>
                <button class="horarios-btn-exportar" onclick="exportarPromotoresExcel()" title="Exportar promotores a Excel">
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1.5-5h15L21 9"/><path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 21v-6h6v6"/></svg>
                    <span>Exportar Promotores</span>
                </button>
                <button class="horarios-btn-manage-promotores" onclick="agregarNuevoPromotor()" title="Añadir promotor">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Añadir Promotor</span>
                </button>
            </div>
        </div>

        ${zonaBar}

        <div class="gestion-promotores-body">
            <!-- Resumen por rol -->
            <div class="promotores-rol-summary">
                <div class="rol-summary-item total">
                    <span class="rol-summary-count">${totalPromotores}</span>
                    <span class="rol-summary-label">Total Promotores</span>
                </div>
                <div class="rol-summary-item fijo">
                    <span class="rol-summary-count">${fijos}</span>
                    <span class="rol-summary-label">🟢 Fijos</span>
                </div>
                <div class="rol-summary-item volante">
                    <span class="rol-summary-count">${volantes}</span>
                    <span class="rol-summary-label">🔵 Volantes</span>
                </div>
                <div class="rol-summary-item vacacionero">
                    <span class="rol-summary-count">${vacacioneros}</span>
                    <span class="rol-summary-label">🟡 Vacacioneros</span>
                </div>
                <div class="rol-summary-item experto">
                    <span class="rol-summary-count">${expertos}</span>
                    <span class="rol-summary-label">🟣 Expertos</span>
                </div>
            </div>

            <!-- Buscador y filtros -->
            <div class="promotores-filtros">
                <div class="promotores-busqueda-wrapper">
                    <svg class="promotores-busqueda-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input type="text" id="promotores-busqueda" class="promotores-busqueda-input" placeholder="🔍 Buscar Promotor..." oninput="filtrarPromotores()" autocomplete="off">
                </div>
                ${esJefe ? `
                <div class="promotores-filtro-zona-wrapper">
                    <label for="promotores-filtro-zona" class="promotores-filtro-label">Zona</label>
                    <select id="promotores-filtro-zona" class="promotores-filtro-select" onchange="filtrarPromotores()">
                        <option value="">Todas las Zonas</option>
                        ${zonasUnicas.map(z => `<option value="${escHtml(z)}">🌎 ${escHtml(z)}</option>`).join('')}
                    </select>
                </div>
                ` : ''}
                <div class="promotores-filtro-rol-wrapper">
                    <label for="promotores-filtro-rol" class="promotores-filtro-label">Rol</label>
                    <select id="promotores-filtro-rol" class="promotores-filtro-select" onchange="filtrarPromotores()">
                        <option value="">Todos</option>
                        <option value="fijo">🟢 Fijo</option>
                        <option value="volante">🔵 Volante</option>
                        <option value="vacacionero">🟡 Vacacionero</option>
                        <option value="experto">🟣 Experto</option>
                    </select>
                </div>
            </div>

            <div class="promotores-summary">
                <span>${promotoresVisibles.length} promotor${promotoresVisibles.length !== 1 ? 'es' : ''} registrados</span>
                <span>· ${zonasVisibles.length} tiendas disponibles</span>
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
                                <th>Promotor</th>
                                <th>DNI</th>
                                <th>Correo</th>
                                <th>Contraseña</th>
                                <th>Estado</th>
                                <th>Rol</th>
                                <th>Tienda Asignada</th>
                                <th>Fecha de Registro</th>
                                <th style="width:120px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="promotores-tbody">
                            ${rowsHtml || '<tr><td colspan="10" class="promotores-empty">No hay promotores registrados.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    requestAnimationFrame(syncPromotorScroll);
}

function refrescarVistaPromotores() {
    renderGestionPromotores();
}

function filtrarPromotores() {
    const searchInput = document.getElementById('promotores-busqueda');
    const filtroRol = document.getElementById('promotores-filtro-rol');
    const filtroZona = document.getElementById('promotores-filtro-zona');
    const tbody = document.getElementById('promotores-tbody');
    if (!tbody) return;

    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const rolSeleccionado = filtroRol ? filtroRol.value : '';
    const zonaSeleccionada = filtroZona ? filtroZona.value : '';

    const filas = tbody.querySelectorAll('.promotor-row');
    let visibles = 0;

    filas.forEach(fila => {
        const id = fila.dataset.id;
        const promotor = HorariosDataStore.promotores.find(p => p.id === id);
        if (!promotor) {
            fila.style.display = 'none';
            return;
        }

        const nombre = (promotor.nombre || '').toLowerCase();
        const dni = (promotor.dni || '').toLowerCase();
        const email = (promotor.email || '').toLowerCase();
        const rol = (promotor.tipo || 'fijo').toLowerCase();
        const zonaPromotor = _getPromotorZona(promotor, HorariosDataStore.zonas);

        const coincideBusqueda = !searchTerm ||
            nombre.includes(searchTerm) ||
            dni.includes(searchTerm) ||
            email.includes(searchTerm);

        const coincideRol = !rolSeleccionado || rol === rolSeleccionado;
        const coincideZona = !zonaSeleccionada || zonaPromotor === zonaSeleccionada;

        if (coincideBusqueda && coincideRol && coincideZona) {
            fila.style.display = '';
            visibles++;
        } else {
            fila.style.display = 'none';
        }
    });

    // Actualizar grupos de tienda (tienda-group-header)
    const grupos = tbody.querySelectorAll('.tienda-group-header');
    grupos.forEach(grupo => {
        let tieneVisibles = false;
        let siguiente = grupo.nextElementSibling;
        while (siguiente && !siguiente.classList.contains('tienda-group-header')) {
            if (siguiente.classList.contains('promotor-row') && siguiente.style.display !== 'none') {
                tieneVisibles = true;
                break;
            }
            siguiente = siguiente.nextElementSibling;
        }
        grupo.style.display = tieneVisibles ? '' : 'none';
    });

    // Actualizar contador en el resumen
    const summaryEl = document.querySelector('.promotores-summary');
    if (summaryEl) {
        const total = HorariosDataStore.promotores.length;
        const zonas = HorariosDataStore.zonas;
        const zonaActiva = _zonaGestionSesion();
        const zonasVisibles = zonaActiva ? _tiendasZonaGestion(zonas) : zonas;
        summaryEl.innerHTML = `<span>${visibles} promotor${visibles !== 1 ? 'es' : ''} encontrados</span><span>· ${zonasVisibles.length} tiendas disponibles</span>`;
    }

    // Actualizar resumen por rol
    actualizarResumenRoles(visibles);
}

function actualizarResumenRoles(visibles) {
    const searchInput = document.getElementById('promotores-busqueda');
    const filtroRol = document.getElementById('promotores-filtro-rol');
    const filtroZona = document.getElementById('promotores-filtro-zona');
    if (!searchInput || !filtroRol) return;

    const searchTerm = searchInput.value.toLowerCase().trim();
    const rolSeleccionado = filtroRol.value;
    const zonaSeleccionada = filtroZona ? filtroZona.value : '';

    const promotores = HorariosDataStore.promotores;
    const zonaActiva = _zonaGestionSesion();
    const promotoresVisibles = zonaActiva
        ? promotores.filter(p => _promotorEnZonaGestion(p))
        : promotores;

    let fijos = 0, volantes = 0, vacacioneros = 0, expertos = 0;

    promotoresVisibles.forEach(p => {
        const nombre = (p.nombre || '').toLowerCase();
        const dni = (p.dni || '').toLowerCase();
        const email = (p.email || '').toLowerCase();
        const rol = (p.tipo || 'fijo').toLowerCase();
        const zonaPromotor = _getPromotorZona(p, HorariosDataStore.zonas);

        const coincideBusqueda = !searchTerm ||
            nombre.includes(searchTerm) ||
            dni.includes(searchTerm) ||
            email.includes(searchTerm);

        const coincideRol = !rolSeleccionado || rol === rolSeleccionado;
        const coincideZona = !zonaSeleccionada || zonaPromotor === zonaSeleccionada;

        if (coincideBusqueda && coincideRol && coincideZona) {
            if (rol === 'fijo') fijos++;
            else if (rol === 'volante') volantes++;
            else if (rol === 'vacacionero') vacacioneros++;
            else if (rol === 'experto') expertos++;
        }
    });

    const totalEl = document.querySelector('.rol-summary-item.total .rol-summary-count');
    const fijoEl = document.querySelector('.rol-summary-item.fijo .rol-summary-count');
    const volanteEl = document.querySelector('.rol-summary-item.volante .rol-summary-count');
    const vacacioneroEl = document.querySelector('.rol-summary-item.vacacionero .rol-summary-count');
    const expertoEl = document.querySelector('.rol-summary-item.experto .rol-summary-count');

    if (totalEl) totalEl.textContent = visibles;
    if (fijoEl) fijoEl.textContent = fijos;
    if (volanteEl) volanteEl.textContent = volantes;
    if (vacacioneroEl) vacacioneroEl.textContent = vacacioneros;
    if (expertoEl) expertoEl.textContent = expertos;
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

function escHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
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

function togglePasswordVisibilidad(btn) {
    const wrapper = btn.closest('.promotor-password-wrapper');
    const input = wrapper ? wrapper.querySelector('.promotor-input-password') : null;
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        btn.classList.add('visible');
    } else {
        input.type = 'password';
        btn.classList.remove('visible');
    }
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

    const zonaActiva = _zonaGestionSesion();
    if (zonaActiva && zonaId) {
        const tienda = (HorariosDataStore.zonas || []).find(z => z.id === zonaId);
        const cadena = tienda ? String(tienda.cadena || '') : '';
        if (_normalizarZonaGestion(cadena) !== _normalizarZonaGestion(zonaActiva)) {
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('No puedes asignar una tienda fuera de tu zona.', 'error');
            }
            refrescarVistaPromotores();
            return;
        }
    }

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

    const cambios = {
        nombre,
        zona_principal_id: zonaId,
        dni,
        email,
        password,
        estado
    };
    if (tipoSelect) cambios.tipo = tipo;
    HorariosDataStore.editarPromotor(promotorId, cambios);

    if (estadoSelect) {
        estadoSelect.className = 'promotor-select-estado promotor-estado-' + estado.toLowerCase();
    }
    if (tipoSelect) {
        tipoSelect.className = 'promotor-select-tipo ' + _rolBadgeClass(tipo);
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
    refrescarVistaPromotores();
}

function reactivarPromotorHandler(promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor) return;
    HorariosDataStore.editarPromotor(promotorId, { estado: 'Activo' });
    refrescarVistaPromotores();
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
    const zonaActiva = _zonaGestionSesion();
    const zonasVisibles = zonaActiva ? _tiendasZonaGestion(zonas) : zonas;
    const nuevaZonaId = zonasVisibles.length > 0 ? zonasVisibles[0].id : (zonas.length > 0 ? zonas[0].id : null);
    HorariosDataStore.agregarPromotor('Nuevo promotor', 'fijo', nuevaZonaId);
    refrescarVistaPromotores();

    setTimeout(() => {
        const lastInput = document.querySelector('.promotor-row:last-child .promotor-input-name');
        if (lastInput) { lastInput.focus(); lastInput.select(); }
    }, 100);
}

function eliminarPromotorHandler(promotorId) {
    const promotor = HorariosDataStore.promotores.find(p => p.id === promotorId);
    if (!promotor) return;
    if (!confirm(`¿Eliminar a "${promotor.nombre}"?`)) return;

    HorariosDataStore.eliminarPromotor(promotorId);
    refrescarVistaPromotores();
}

/* =============================================
   CARGA MASIVA DE PROMOTORES DESDE EXCEL
   Plantilla: NOMBRE_COMPLETO | DNI | CORREO |
   CONTRASEÑA | TIENDA | ZONA | ESTADO
   ============================================= */

const PROMOTOR_IMPORT_COLUMNAS = [
    { header: 'NOMBRE_COMPLETO', key: 'nombre', width: 32 },
    { header: 'DNI', key: 'dni', width: 14 },
    { header: 'CORREO', key: 'correo', width: 30 },
    { header: 'CONTRASEÑA', key: 'password', width: 18 },
    { header: 'TIENDA', key: 'tienda', width: 34 },
    { header: 'ZONA', key: 'zona', width: 24 },
    { header: 'ESTADO', key: 'estado', width: 14 }
];

function _colPromotorIndex(normCols, tokens) {
    return normCols.findIndex(c => tokens.every(t => c.indexOf(t) !== -1));
}

function _normColPromotor(str) {
    return String(str || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').trim();
}

function _estadoPromotorExcel(valor) {
    const v = String(valor || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (v === '' || v === 'ACTIVO' || v === 'ACTIVA' || v === '1' || v === 'SI') return 'Activo';
    if (v === 'INACTIVO' || v === 'INACTIVA' || v === '0' || v === 'NO') return 'Inactivo';
    if (v === 'LICENCIA') return 'Licencia';
    if (v === 'VACACIONES') return 'Vacaciones';
    return 'Activo';
}

function _tiendaPromotorExcel(nombreTienda) {
    const norm = _normalizarZonaGestion(nombreTienda);
    if (!norm) return null;
    return (HorariosDataStore.zonas || []).find(z =>
        _normalizarZonaGestion(z.id) === norm || _normalizarZonaGestion(z.nombre) === norm
    ) || null;
}

function _procesarImportacionPromotores(filas) {
    const validos = [];
    const duplicados = [];
    const errores = [];
    const dnisVistos = new Set();
    const correosVistos = new Set();

    for (const fila of filas) {
        const nombre = String(fila.nombre == null ? '' : fila.nombre).trim();
        const dni = String(fila.dni == null ? '' : fila.dni).trim();
        const correo = String(fila.correo == null ? '' : fila.correo).trim().toLowerCase();
        const password = String(fila.password == null ? '' : fila.password).trim();
        const tiendaNombre = String(fila.tienda == null ? '' : fila.tienda).trim();
        const zonaCol = String(fila.zona == null ? '' : fila.zona).trim();
        const razones = [];

        if (!nombre) razones.push('Nombre vac\u00edo');

        if (!dni) razones.push('DNI vac\u00edo');
        else if (!/^\d{8}$/.test(dni)) razones.push('DNI debe tener 8 d\u00edgitos');

        if (!correo) razones.push('Correo vac\u00edo');
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) razones.push('Formato de correo inv\u00e1lido');

        if (!password) razones.push('Contrase\u00f1a vac\u00eda');
        else if (password.length < 4) razones.push('Contrase\u00f1a muy corta (m\u00edn. 4 caracteres)');

        let zona = null;
        if (!tiendaNombre) razones.push('Tienda vac\u00eda');
        else {
            zona = _tiendaPromotorExcel(tiendaNombre);
            if (!zona) razones.push('Tienda no v\u00e1lida: ' + tiendaNombre);
        }

        if (zona) {
            const cadenaNorm = _normalizarZonaGestion(zona.cadena);
            if (!zonaCol) {
                razones.push('Zona vac\u00eda');
            } else if (cadenaNorm && cadenaNorm !== _normalizarZonaGestion(zonaCol)) {
                razones.push('La zona no corresponde a la tienda');
            }
        } else if (zonaCol) {
            razones.push('Zona sin tienda v\u00e1lida');
        }

        if (razones.length > 0) {
            errores.push({ numero: fila.numero, nombre, razon: razones.join(', ') });
            continue;
        }

        const dniKey = dni;
        const correoKey = correo;
        const esDupDniArchivo = dnisVistos.has(dniKey);
        const esDupCorreoArchivo = correosVistos.has(correoKey);
        const esDupDniExistente = HorariosDataStore.promotores.some(p => p.dni && String(p.dni).trim() === dniKey);
        const esDupCorreoExistente = HorariosDataStore.promotores.some(p => p.email && String(p.email).trim().toLowerCase() === correoKey);

        if (esDupDniArchivo || esDupCorreoArchivo || esDupDniExistente || esDupCorreoExistente) {
            const motivos = [];
            if (esDupDniArchivo) motivos.push('DNI repetido en el archivo');
            if (esDupCorreoArchivo) motivos.push('Correo repetido en el archivo');
            if (esDupDniExistente) motivos.push('DNI ya registrado');
            if (esDupCorreoExistente) motivos.push('Correo ya registrado');
            duplicados.push({ numero: fila.numero, nombre, razon: motivos.join(', ') });
            continue;
        }

        dnisVistos.add(dniKey);
        correosVistos.add(correoKey);
        validos.push({
            numero: fila.numero,
            nombre,
            dni,
            email: correo,
            password,
            zona_principal_id: zona.id,
            cadena: zona.cadena || '',
            estado: _estadoPromotorExcel(fila.estado)
        });
    }

    return {
        validos,
        duplicados,
        errores,
        registrosValidos: validos.length + duplicados.length,
        total: filas.length
    };
}

function descargarPlantillaPromotores() {
    try {
        if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') {
            console.error('[PROMOTORES] ExcelJS o FileSaver no disponibles.');
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('No se pudo generar la plantilla: librerías de Excel no disponibles.', 'error');
            }
            return;
        }
        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Promotores');
        ws.columns = PROMOTOR_IMPORT_COLUMNAS.map(c => ({ header: c.header, key: c.key, width: c.width }));

        const headRow = ws.getRow(1);
        headRow.height = 24;
        headRow.eachCell(c => {
            c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6E4D' } };
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.border = { bottom: { style: 'medium', color: { argb: 'FF1DB954' } } };
        });
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        const ejemplos = [
            ['JUAN CARLOS PEREZ', '12345678', 'juan.perez@empresa.com', 'Clave2026', 'RED AT ALTO SELVA ALEGRE', 'AREQUIPA SUR', 'ACTIVO'],
            ['MARIA FERNANDA ROJAS', '87654321', 'maria.rojas@empresa.com', 'Clave2026', 'RED AT BELEN', 'CUSCO SUR', 'ACTIVO']
        ];
        ejemplos.forEach(row => ws.addRow(row));

        const nota = ws.addRow(['Completa cada fila con los datos del promotor. Usa una tienda y zona existentes del dashboard.']);
        nota.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF8A8A8A' } };
        ws.mergeCells(nota.number, 1, nota.number, 7);

        const nombreArchivo = 'Plantilla_Promotores_DriveATSur.xlsx';
        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, nombreArchivo);
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Plantilla Excel descargada.', 'success');
            }
        });
    } catch (e) {
        console.error('[PROMOTORES] Error al generar la plantilla:', e);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error al generar la plantilla: ' + e.message, 'error');
        }
    }
}

function exportarPromotoresExcel() {
    try {
        if (typeof ExcelJS === 'undefined' || typeof saveAs === 'undefined') {
            console.error('[PROMOTORES] ExcelJS o FileSaver no disponibles.');
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('No se pudo exportar: librerías de Excel no disponibles.', 'error');
            }
            return;
        }

        const zonaActiva = _zonaGestionSesion();
        const promotores = zonaActiva
            ? (HorariosDataStore.promotores || []).filter(p => _promotorEnZonaGestion(p))
            : (HorariosDataStore.promotores || []);

        const workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet('Promotores');
        ws.columns = PROMOTOR_IMPORT_COLUMNAS.map(c => ({ header: c.header, key: c.key, width: c.width }));

        const headRow = ws.getRow(1);
        headRow.height = 24;
        headRow.eachCell(c => {
            c.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6E4D' } };
            c.alignment = { vertical: 'middle', horizontal: 'center' };
            c.border = { bottom: { style: 'medium', color: { argb: 'FF1DB954' } } };
        });
        ws.views = [{ state: 'frozen', ySplit: 1 }];

        for (const p of promotores) {
            const zona = (HorariosDataStore.zonas || []).find(z => z.id === p.zona_principal_id);
            ws.addRow([
                p.nombre || '',
                p.dni || '',
                p.email || '',
                p.password || '',
                zona ? zona.nombre : (p.zona_principal_id || ''),
                zona ? zona.cadena : '',
                p.estado || 'Activo'
            ]);
        }

        const hoy = new Date();
        const stamp = hoy.getFullYear() + '-' +
            String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
            String(hoy.getDate()).padStart(2, '0');
        const nombreArchivo = 'Promotores_' + stamp + '.xlsx';

        workbook.xlsx.writeBuffer().then(buffer => {
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, nombreArchivo);
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Se exportaron ' + promotores.length + ' promotor' + (promotores.length !== 1 ? 'es' : '') + ' a Excel.', 'success');
            }
        });
    } catch (e) {
        console.error('[PROMOTORES] Error al exportar:', e);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error al exportar: ' + e.message, 'error');
        }
    }
}

let promotorImportacionEnCurso = null;

function abrirModalImportarPromotores() {
    console.log('Abriendo modal de importación');
    try {
        let overlay = document.getElementById('promotor-import-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'promotor-import-overlay';
            overlay.className = 'horarios-modal-overlay promotor-import-overlay';
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
            <div class="horarios-modal promotor-import-modal open">
                <div class="horarios-modal-header">
                    <h3>Importar Promotores desde Excel</h3>
                    <button class="horarios-modal-close" onclick="cerrarModalImportarPromotores()" title="Cerrar" aria-label="Cerrar">&#10005;</button>
                </div>
                <div class="horarios-modal-body">
                    <div class="promotor-import-info">
                        <p>Sube un archivo Excel con las columnas <strong>NOMBRE_COMPLETO</strong>, <strong>DNI</strong>, <strong>CORREO</strong>, <strong>CONTRASE&Ntilde;A</strong>, <strong>TIENDA</strong>, <strong>ZONA</strong> y <strong>ESTADO</strong>.</p>
                        <p>Usa solo tiendas y zonas registradas en el dashboard. Descarga la plantilla modelo para respetar el formato.</p>
                    </div>
                    <div class="promotor-import-dropzone" id="promotor-import-dropzone" onclick="document.getElementById('promotor-import-file').click()">
                        <input type="file" id="promotor-import-file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" style="display:none">
                        <div class="promotor-import-dropzone-icon">&#128229;</div>
                        <div class="promotor-import-dropzone-text">Haz clic para seleccionar el archivo Excel</div>
                        <div class="promotor-import-dropzone-sub">Solo archivos .xlsx &middot; NOMBRE_COMPLETO | DNI | CORREO | CONTRASE&Ntilde;A | TIENDA | ZONA | ESTADO</div>
                    </div>
                    <div id="promotor-import-resultado"></div>
                </div>
                <div class="horarios-modal-footer">
                    <button class="horarios-btn-modal-secondary" onclick="cerrarModalImportarPromotores()">Cancelar</button>
                    <button class="horarios-btn-modal-primary" id="promotor-import-confirmar" onclick="confirmarImportacionPromotores()" style="display:none;">Confirmar importaci&oacute;n</button>
                </div>
            </div>
        `;
        const modal = overlay.querySelector('.horarios-modal');
        console.log('Modal encontrado:', modal);
        overlay.classList.add('open');
        promotorImportacionEnCurso = null;

        const fileInput = document.getElementById('promotor-import-file');
        if (fileInput) {
            fileInput.addEventListener('change', function () {
                const file = this.files && this.files[0];
                if (file) _manejarArchivoImportacionPromotores(file);
                this.value = '';
            });
        }

        const dz = document.getElementById('promotor-import-dropzone');
        if (dz) {
            dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
            dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
            dz.addEventListener('drop', e => {
                e.preventDefault();
                dz.classList.remove('drag');
                const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
                if (file) _manejarArchivoImportacionPromotores(file);
            });
        }
    } catch (e) {
        console.error('[PROMOTORES] Error al abrir el modal de importación:', e);
        const overlay = document.getElementById('promotor-import-overlay');
        if (overlay) overlay.classList.remove('open');
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo abrir la ventana de importación.', 'error');
        }
    }
}

function cerrarModalImportarPromotores() {
    const overlay = document.getElementById('promotor-import-overlay');
    if (overlay) overlay.classList.remove('open');
    promotorImportacionEnCurso = null;
}

async function _manejarArchivoImportacionPromotores(file) {
    const resultadoEl = document.getElementById('promotor-import-resultado');
    if (!resultadoEl) return;
    resultadoEl.innerHTML = '<div class="promotor-import-loading">Procesando archivo <strong>' + escHtml(file.name) + '</strong>&hellip;</div>';
    try {
        const filas = await _procesarArchivoPromotoresExcel(file);
        const resumen = _procesarImportacionPromotores(filas);
        _renderResumenImportacionPromotores(resumen);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion(
                'Archivo procesado: ' + resumen.validos.length + ' a importar, ' +
                resumen.duplicados.length + ' duplicado' + (resumen.duplicados.length !== 1 ? 's' : '') + ', ' +
                resumen.errores.length + ' error' + (resumen.errores.length !== 1 ? 'es' : '') + '.',
                resumen.validos.length > 0 ? 'success' : 'warning'
            );
        }
    } catch (e) {
        console.error('[PROMOTORES] Error al importar:', e);
        resultadoEl.innerHTML = '<div class="promotor-import-error">&#10060; ' + escHtml(e.message || 'No se pudo leer el archivo. Verifica que sea un Excel .xlsx válido.') + '</div>';
    }
}

async function _procesarArchivoPromotoresExcel(file) {
    if (typeof ExcelJS === 'undefined') {
        throw new Error('La librería de Excel no está disponible. Recarga la página.');
    }
    const nombre = (file && file.name) || '';
    if (/\.xls$/i.test(nombre)) {
        throw new Error('El formato .xls no es compatible. Guarda el archivo como .xlsx (Excel 2010 o posterior) e inténtalo de nuevo.');
    }
    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    return _promotoresDesdeWorkbook(workbook);
}

function _promotoresDesdeWorkbook(workbook) {
    const ws = workbook.worksheets[0];
    if (!ws) throw new Error('El archivo no contiene hojas de cálculo.');

    const filas = [];
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const valores = [];
        for (let i = 1; i <= 8; i++) {
            valores.push(String(row.getCell(i).text == null ? '' : row.getCell(i).text).trim());
        }
        filas.push({ numero: rowNumber, valores });
    });

    let headerIndex = -1;
    let headerMap = { nombre: -1, dni: -1, correo: -1, password: -1, tienda: -1, zona: -1, estado: -1 };
    for (let i = 0; i < filas.length && i < 10; i++) {
        const cols = filas[i].valores.map(_normColPromotor);
        const idxNombre = _colPromotorIndex(cols, ['NOMBRE']);
        if (idxNombre === -1) continue;
        const idxDni = _colPromotorIndex(cols, ['DNI']);
        const idxCorreo = _colPromotorIndex(cols, ['CORREO']) !== -1
            ? _colPromotorIndex(cols, ['CORREO'])
            : _colPromotorIndex(cols, ['EMAIL']);
        const idxPassword = _colPromotorIndex(cols, ['CONTRASE']) !== -1
            ? _colPromotorIndex(cols, ['CONTRASE'])
            : _colPromotorIndex(cols, ['CLAVE']) !== -1
                ? _colPromotorIndex(cols, ['CLAVE'])
                : _colPromotorIndex(cols, ['PASSWORD']);
        const idxTienda = _colPromotorIndex(cols, ['TIENDA']) !== -1
            ? _colPromotorIndex(cols, ['TIENDA'])
            : _colPromotorIndex(cols, ['PDV']);
        const idxZona = _colPromotorIndex(cols, ['ZONA']);
        const idxEstado = _colPromotorIndex(cols, ['ESTADO']);
        headerIndex = i;
        headerMap = { nombre: idxNombre, dni: idxDni, correo: idxCorreo, password: idxPassword, tienda: idxTienda, zona: idxZona, estado: idxEstado };
        break;
    }

    if (headerIndex === -1 || headerMap.nombre === -1) {
        throw new Error('Estructura no válida: se esperaban las columnas NOMBRE_COMPLETO, DNI, CORREO, CONTRASEÑA, TIENDA, ZONA y ESTADO.');
    }
    const requeridas = ['nombre', 'dni', 'correo', 'password', 'tienda', 'zona'];
    const faltantes = requeridas.filter(k => headerMap[k] === -1);
    if (faltantes.length > 0) {
        throw new Error('Estructura incompleta: faltan las columnas ' + faltantes.join(', ') + '.');
    }

    return filas
        .slice(headerIndex + 1)
        .filter(r => r.valores.some(v => v !== ''))
        .map(r => ({
            numero: r.numero,
            nombre: r.valores[headerMap.nombre],
            dni: r.valores[headerMap.dni],
            correo: r.valores[headerMap.correo],
            password: r.valores[headerMap.password],
            tienda: r.valores[headerMap.tienda],
            zona: r.valores[headerMap.zona],
            estado: headerMap.estado >= 0 ? r.valores[headerMap.estado] : ''
        }));
}

function _renderResumenImportacionPromotores(resumen) {
    const resultadoEl = document.getElementById('promotor-import-resultado');
    const confirmarBtn = document.getElementById('promotor-import-confirmar');
    if (!resultadoEl) return;

    promotorImportacionEnCurso = resumen;

    const cards =
        '<div class="promotor-import-summary">' +
            '<div class="promotor-import-sum-card nuevo"><span class="promotor-import-sum-num">' + resumen.validos.length + '</span><span class="promotor-import-sum-label">Promotores a importar</span></div>' +
            '<div class="promotor-import-sum-card duplicado"><span class="promotor-import-sum-num">' + resumen.duplicados.length + '</span><span class="promotor-import-sum-label">Duplicados</span></div>' +
            '<div class="promotor-import-sum-card error"><span class="promotor-import-sum-num">' + resumen.errores.length + '</span><span class="promotor-import-sum-label">Errores</span></div>' +
            '<div class="promotor-import-sum-card valido"><span class="promotor-import-sum-num">' + resumen.registrosValidos + '</span><span class="promotor-import-sum-label">Registros v\u00e1lidos</span></div>' +
        '</div>';

    let detalles = '';
    if (resumen.duplicados.length > 0) {
        detalles += '<div class="promotor-import-detalle"><div class="promotor-import-detalle-title">Duplicados</div><ul>' +
            resumen.duplicados.slice(0, 20).map(d =>
                '<li>Fila ' + d.numero + ': <strong>' + escHtml(d.nombre) + '</strong> &mdash; ' + escHtml(d.razon) + '</li>'
            ).join('') +
            (resumen.duplicados.length > 20 ? '<li class="promotor-import-mas">+ ' + (resumen.duplicados.length - 20) + ' m&aacute;s...</li>' : '') +
            '</ul></div>';
    }
    if (resumen.errores.length > 0) {
        detalles += '<div class="promotor-import-detalle errores"><div class="promotor-import-detalle-title">Errores</div><ul>' +
            resumen.errores.slice(0, 20).map(d =>
                '<li>Fila ' + d.numero + ': <strong>' + escHtml(d.nombre || '(sin nombre)') + '</strong> &mdash; ' + escHtml(d.razon) + '</li>'
            ).join('') +
            (resumen.errores.length > 20 ? '<li class="promotor-import-mas">+ ' + (resumen.errores.length - 20) + ' m&aacute;s...</li>' : '') +
            '</ul></div>';
    }

    resultadoEl.innerHTML = cards + detalles;

    if (confirmarBtn) {
        if (resumen.validos.length > 0) {
            confirmarBtn.style.display = 'inline-flex';
            confirmarBtn.textContent = 'Importar ' + resumen.validos.length + ' promotor' + (resumen.validos.length !== 1 ? 'es' : '');
        } else {
            confirmarBtn.style.display = 'none';
        }
    }
}

async function confirmarImportacionPromotores() {
    if (!promotorImportacionEnCurso) return;
    const validos = promotorImportacionEnCurso.validos;
    if (!validos || validos.length === 0) return;

    const conHash = [];
    for (const p of validos) {
        let hash = '';
        if (typeof hashPassword === 'function') {
            try { hash = await hashPassword(p.password); } catch (e) { hash = ''; }
        }
        conHash.push({ ...p, password_hash: hash });
    }

    const resultado = HorariosDataStore.importarPromotores(conHash);
    if (resultado.errores && resultado.errores.length > 0) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('No se pudo importar: ' + resultado.errores[0].error, 'error');
        }
        return;
    }

    const creados = resultado.creados.length;
    promotorImportacionEnCurso = null;
    cerrarModalImportarPromotores();
    if (typeof mostrarNotificacion === 'function') {
        mostrarNotificacion(creados + ' promotor' + (creados !== 1 ? 'es importados' : ' importado') + ' correctamente.', 'success');
    }
    refrescarVistaPromotores();
}