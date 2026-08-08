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