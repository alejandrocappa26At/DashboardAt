async function generarRespaldo() {
    try {
        const ahora = new Date();
        const pad = n => String(n).padStart(2, '0');
        const fecha = ahora.getFullYear() + '-' + pad(ahora.getMonth() + 1) + '-' + pad(ahora.getDate());
        const hora = pad(ahora.getHours()) + '-' + pad(ahora.getMinutes());

        const respaldo = {
            version: 1,
            app: 'Drive AT Sur - Dashboard Ventas',
            tipo: 'respaldo_manual',
            generado: ahora.toISOString(),
            fecha: fecha,
            hora: hora,
            fuentes: {
                promotores: 'horarios/config',
                ventas: 'dashboard/datos',
                cuotas: 'dashboard/datos',
                promociones: 'promociones',
                registros_promociones: 'registro_promociones'
            },
            conteo: {},
            promotores: [],
            promotoresPDV: [],
            ventas: [],
            cuotas: [],
            promociones: [],
            registros_promociones: []
        };

        const leerDoc = async (coleccion, documento) => {
            if (typeof db === 'undefined' || !db) return null;
            try {
                const snap = await db.collection(coleccion).doc(documento).get();
                return snap.exists ? snap.data() : null;
            } catch (e) {
                console.warn('[RESPALDO] No se pudo leer ' + coleccion + '/' + documento + ':', e.message);
                return null;
            }
        };

        const leerColeccion = async (coleccion) => {
            if (typeof db === 'undefined' || !db) return [];
            try {
                const snap = await db.collection(coleccion).get();
                return snap.docs.map(doc => doc.data());
            } catch (e) {
                console.warn('[RESPALDO] No se pudo leer la coleccion ' + coleccion + ':', e.message);
                return null;
            }
        };

        const dash = await leerDoc('dashboard', 'datos');
        if (dash) {
            respaldo.ventas = dash.ventas || [];
            respaldo.cuotas = dash.cuotas || [];
            respaldo.promotoresPDV = dash.promotores || [];
        }

        const config = await leerDoc('horarios', 'config');
        if (config) {
            respaldo.promotores = config.promotores || [];
        }

        const promos = await leerColeccion('promociones');
        if (promos) respaldo.promociones = promos;

        const registros = await leerColeccion('registro_promociones');
        if (registros) respaldo.registros_promociones = registros;

        if (respaldo.ventas.length === 0 && typeof DataStore !== 'undefined' && DataStore.ventas && DataStore.ventas.length > 0) {
            respaldo.ventas = DataStore.ventas;
        }
        if (respaldo.cuotas.length === 0 && typeof DataStore !== 'undefined' && DataStore.cuotas && DataStore.cuotas.length > 0) {
            respaldo.cuotas = DataStore.cuotas;
        }
        if (respaldo.promotoresPDV.length === 0 && typeof DataStore !== 'undefined' && DataStore.promotores && DataStore.promotores.length > 0) {
            respaldo.promotoresPDV = DataStore.promotores;
        }
        if (respaldo.promotores.length === 0 && typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores && HorariosDataStore.promotores.length > 0) {
            respaldo.promotores = HorariosDataStore.promotores;
        }
        if (respaldo.promociones.length === 0 && typeof PromocionesStore !== 'undefined' && PromocionesStore.promociones && PromocionesStore.promociones.length > 0) {
            respaldo.promociones = PromocionesStore.promociones;
        }
        if (respaldo.registros_promociones.length === 0 && typeof PromocionesStore !== 'undefined' && PromocionesStore.registros && PromocionesStore.registros.length > 0) {
            respaldo.registros_promociones = PromocionesStore.registros;
        }

        respaldo.conteo = {
            promotores: respaldo.promotores.length,
            ventas: respaldo.ventas.length,
            cuotas: respaldo.cuotas.length,
            promociones: respaldo.promociones.length,
            registros_promociones: respaldo.registros_promociones.length
        };

        const nombre = 'Backup_DriveATSur_' + fecha + '_' + hora + '.json';
        const blob = new Blob([JSON.stringify(respaldo, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        setTimeout(() => {
            URL.revokeObjectURL(url);
            enlace.remove();
        }, 1000);

        console.log('[RESPALDO] Archivo generado:', nombre);
        console.log('[RESPALDO] Conteo:', JSON.stringify(respaldo.conteo));

        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Respaldo generado: ' + nombre, 'success');
        }
    } catch (e) {
        console.error('[RESPALDO] Error al generar respaldo:', e);
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Error al generar el respaldo: ' + e.message, 'error');
        }
    }
}

async function restaurarRespaldo(archivo) {
    return new Promise((resolve, reject) => {
        if (!archivo) {
            reject(new Error('No se proporcionó archivo'));
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const contenido = e.target.result;
                const respaldo = JSON.parse(contenido);

                if (!validarRespaldo(respaldo)) {
                    reject(new Error('Archivo de respaldo inválido o incompatible'));
                    return;
                }

                console.log('[RESTAURAR] Iniciando restauración...', {
                    version: respaldo.version,
                    generado: respaldo.generado,
                    conteo: respaldo.conteo
                });

                await escribirRespaldo(respaldo);

                console.log('[RESTAURAR] Restauración completada');
                if (typeof mostrarNotificacion === 'function') {
                    mostrarNotificacion('Respaldo restaurado correctamente. Recargue la página.', 'success');
                }
                resolve({ ok: true, conteo: respaldo.conteo });
            } catch (err) {
                console.error('[RESTAURAR] Error:', err);
                if (typeof mostrarNotificacion === 'function') {
                    mostrarNotificacion('Error al restaurar: ' + err.message, 'error');
                }
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Error leyendo archivo'));
        reader.readAsText(archivo);
    });
}

function validarRespaldo(respaldo) {
    if (!respaldo || typeof respaldo !== 'object') return false;
    if (!respaldo.version || respaldo.version < 1) return false;
    if (!respaldo.app || !respaldo.app.includes('Drive AT Sur')) return false;
    if (!respaldo.conteo || typeof respaldo.conteo !== 'object') return false;
    if (!Array.isArray(respaldo.ventas) || !Array.isArray(respaldo.cuotas) ||
        !Array.isArray(respaldo.promociones) || !Array.isArray(respaldo.registros_promociones)) {
        return false;
    }
    console.log('[RESTAURAR] Validación de integridad OK');
    return true;
}

async function escribirRespaldo(respaldo) {
    if (typeof db === 'undefined' || !db) throw new Error('Firebase no disponible');

    const batch = db.batch();
    let totalEscritos = 0;

    for (const promo of respaldo.promociones || []) {
        if (promo.id) {
            batch.set(db.collection('promociones').doc(promo.id), { ...promo, restoredAt: new Date().toISOString() });
            totalEscritos++;
        }
    }

    for (const reg of respaldo.registros_promociones || []) {
        if (reg.id) {
            batch.set(db.collection('registro_promociones').doc(reg.id), { ...reg, restoredAt: new Date().toISOString() });
            totalEscritos++;
        }
    }

    for (const sup of respaldo.promotores || []) {
        if (sup.id) {
            batch.set(db.collection('promotores').doc(sup.id), { ...sup, restoredAt: new Date().toISOString() });
            totalEscritos++;
        }
    }

    for (const venta of respaldo.ventas || []) {
        const fecha = venta.fecha ? new Date(venta.fecha) : new Date();
        const fechaKey = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        const ventaId = `v_${fechaKey}_${totalEscritos}`;
        batch.set(db.collection('ventas').doc(fechaKey).collection('items').doc(ventaId), { ...venta, restoredAt: new Date().toISOString() });
        totalEscritos++;
    }

    for (const cuota of respaldo.cuotas || []) {
        const mesAnio = `${cuota.mes || 1}-${cuota.anio || new Date().getFullYear()}`;
        const cuotaId = `${cuota.punto_venta}_${cuota.producto}`.replace(/[^a-zA-Z0-9_]/g, '_');
        batch.set(db.collection('cuotas').doc(mesAnio).collection('items').doc(cuotaId), { ...cuota, restoredAt: new Date().toISOString() });
        totalEscritos++;
    }

    if (respaldo.promotoresPDV && respaldo.promotoresPDV.length) {
        batch.set(db.collection('dashboard').doc('datos'), {
            promotores: respaldo.promotoresPDV,
            diaActual: respaldo.diaActual || new Date().getDate()
        }, { merge: true });
    }

    await batch.commit();
    console.log('[RESTAURAR] Documentos escritos:', totalEscritos);
}

function abrirModalRestaurarRespaldo() {
    let overlay = document.getElementById('restore-modal-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'restore-modal-overlay';
        overlay.className = 'modal-overlay';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div class="modal modal-lg">
            <div class="modal-header">
                <div class="modal-header-left"><h3>Restaurar Respaldo</h3></div>
                <button class="modal-close" onclick="cerrarModalRestaurar()" aria-label="Cerrar">&times;</button>
            </div>
            <div class="modal-body">
                <div class="restore-dropzone" id="restore-dropzone" onclick="document.getElementById('restore-file').click()">
                    <input type="file" id="restore-file" accept=".json" style="display:none" onchange="manejarArchivoRestaurar(this.files[0])">
                    <div class="restore-icon">📁</div>
                    <div class="restore-text">Seleccione archivo de respaldo (.json)</div>
                    <div class="restore-sub">Generado con "Generar Respaldo"</div>
                </div>
                <div id="restore-preview" style="display:none;"></div>
                <div id="restore-progress" style="display:none; margin-top:16px;">
                    <div class="restore-progress-bar"><div class="restore-progress-fill" style="width:0%"></div></div>
                    <div class="restore-progress-text">Procesando...</div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="cerrarModalRestaurar()">Cancelar</button>
                <button class="btn btn-primary" id="restore-confirm-btn" onclick="confirmarRestaurar()" style="display:none;">Restaurar</button>
            </div>
        </div>
    `;
    overlay.classList.add('open');
}

function cerrarModalRestaurar() {
    const overlay = document.getElementById('restore-modal-overlay');
    if (overlay) overlay.classList.remove('open');
}

let restoreFileData = null;

function manejarArchivoRestaurar(file) {
    if (!file || !file.name.endsWith('.json')) {
        if (typeof mostrarNotificacion === 'function') {
            mostrarNotificacion('Seleccione un archivo .json válido', 'error');
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const respaldo = JSON.parse(e.target.result);
            if (!validarRespaldo(respaldo)) {
                throw new Error('Formato inválido');
            }
            restoreFileData = respaldo;

            const preview = document.getElementById('restore-preview');
            preview.style.display = 'block';
            preview.innerHTML = `
                <div class="restore-preview-card">
                    <div class="restore-preview-row"><strong>Versión:</strong> ${respaldo.version}</div>
                    <div class="restore-preview-row"><strong>Generado:</strong> ${new Date(respaldo.generado).toLocaleString('es-PE')}</div>
                    <div class="restore-preview-row"><strong>Ventas:</strong> ${respaldo.conteo.ventas || 0}</div>
                    <div class="restore-preview-row"><strong>Cuotas:</strong> ${respaldo.conteo.cuotas || 0}</div>
                    <div class="restore-preview-row"><strong>Promotores:</strong> ${respaldo.conteo.promotores || 0}</div>
                    <div class="restore-preview-row"><strong>Promociones:</strong> ${respaldo.conteo.promociones || 0}</div>
                    <div class="restore-preview-row"><strong>Registros promo:</strong> ${respaldo.conteo.registros_promociones || 0}</div>
                    <div class="restore-warning">⚠️ Esta acción SOBRESCRIBIRÁ datos existentes. Use con precaución.</div>
                </div>
            `;
            document.getElementById('restore-confirm-btn').style.display = 'inline-flex';
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Archivo válido. Revise los datos antes de confirmar.', 'info');
            }
        } catch (err) {
            if (typeof mostrarNotificacion === 'function') {
                mostrarNotificacion('Archivo inválido: ' + err.message, 'error');
            }
        }
    };
    reader.readAsText(file);
}

async function confirmarRestaurar() {
    if (!restoreFileData) return;

    const btn = document.getElementById('restore-confirm-btn');
    const progress = document.getElementById('restore-progress');
    const fill = progress.querySelector('.restore-progress-fill');
    const text = progress.querySelector('.restore-progress-text');

    btn.disabled = true;
    btn.textContent = 'Restaurando...';
    progress.style.display = 'block';

    try {
        fill.style.width = '20%';
        text.textContent = 'Validando...';
        await new Promise(r => setTimeout(r, 100));

        fill.style.width = '50%';
        text.textContent = 'Escribiendo en Firestore...';
        await escribirRespaldo(restoreFileData);

        fill.style.width = '100%';
        text.textContent = 'Completado';
        await new Promise(r => setTimeout(r, 500));

        cerrarModalRestaurar();
    } catch (err) {
        text.textContent = 'Error: ' + err.message;
        fill.style.background = '#EF4444';
        btn.disabled = false;
        btn.textContent = 'Reintentar';
    }
}

window.abrirModalRestaurarRespaldo = abrirModalRestaurarRespaldo;
window.restaurarRespaldo = restaurarRespaldo;