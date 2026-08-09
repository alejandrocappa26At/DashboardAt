let horariosToastTimer = null;

const ESTADO_PROMOTOR_OPCIONES = [
    { value: 'Activo', label: '🟢 Activo' },
    { value: 'Licencia', label: '🟡 Licencia' },
    { value: 'Vacaciones', label: '🟠 Vacaciones' },
    { value: 'Inactivo', label: '🔴 Inactivo' }
];

function _nombreTiendaPromotor(zonaId, zonas) {
    if (!zonaId) return '';
    const zona = (zonas || []).find(z => z.id === zonaId);
    return zona && zona.nombre ? zona.nombre : zonaId;
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

function _promotorOpcionesZonaHtml(p, zonas) {
    const sinAsignar = '<option value="" ' + (!p.zona_principal_id ? 'selected' : '') + '>&mdash; Sin asignar &mdash;</option>';
    const opciones = (zonas || []).map(z =>
        '<option value="' + escHtml(z.id) + '" ' + (p.zona_principal_id === z.id ? 'selected' : '') + '>' +
        escHtml(z.nombre) + (z.cadena ? ' &middot; ' + escHtml(z.cadena) : '') + '</option>'
    ).join('');
    return sinAsignar + opciones;
}

function _promoFilaHtml(p, numero, zonas) {
    const zonaOptions = _promotorOpcionesZonaHtml(p, zonas);
    const estadoActual = p.estado || 'Activo';
    const estadoOptionsHtml = ESTADO_PROMOTOR_OPCIONES.map(eo =>
        '<option value="' + eo.value + '" ' + (estadoActual === eo.value ? 'selected' : '') + '>' + eo.label + '</option>'
    ).join('');
    const estadoBadgeClass = estadoActual === 'Activo' ? 'promotor-estado-activo' :
        estadoActual === 'Licencia' ? 'promotor-estado-licencia' :
        estadoActual === 'Vacaciones' ? 'promotor-estado-vacaciones' :
        'promotor-estado-inactivo';
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

function _promoRowsHtml(promotores, zonas) {
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
        html += _promoFilaHtml(p, numero, zonas);
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

    console.log('[AUDITORIA][PROMOTORES] Promotores visibles:', promotores.length);
    console.log('[AUDITORIA][PROMOTORES] IDs visibles:', promotores.map(p => p.id));
    console.log('[AUDITORIA][PROMOTORES] Correos visibles:', promotores.map(p => p.email || '').filter(Boolean));
    console.log('[AUDITORIA][PROMOTORES] Fuente utilizada:', HorariosDataStore._fuentePromotores || 'HorariosDataStore.promotores (memoria)');
    console.log('[AUDITORIA][PROMOTORES] Coincide con login (Registro de Ventas): ' + (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores === promotores));

    const rowsHtml = _promoRowsHtml(promotores, zonas);

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
                <button class="horarios-btn-manage-promotores" onclick="agregarNuevoPromotor()" title="Añadir promotor">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    <span>Añadir Promotor</span>
                </button>
            </div>
        </div>

        <div class="gestion-promotores-body">
            <div class="promotores-summary">
                <span>${promotores.length} promotor${promotores.length !== 1 ? 'es' : ''} registrados</span>
                <span>· ${HorariosDataStore.zonas.length} tiendas disponibles</span>
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
                                <th>Tienda Asignada</th>
                                <th>Fecha de Registro</th>
                                <th style="width:120px;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml || '<tr><td colspan="9" class="promotores-empty">No hay promotores registrados.</td></tr>'}
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
    const nuevaZonaId = zonas.length > 0 ? zonas[0].id : null;
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