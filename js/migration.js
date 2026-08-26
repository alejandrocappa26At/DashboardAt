/* =============================================
   MIGRACIÓN: dashboard/datos -> Subcolecciones
   Ejecutar UNA SOLA VEZ desde consola del navegador
   ============================================= */

const MIGRATION_BATCH_SIZE = 400;

const HORARIOS_COLLECTION = 'horarios';

async function migrarDashboardDatos() {
    if (typeof db === 'undefined' || !db) {
        console.error('Firebase no inicializado');
        return;
    }

    console.log('=== INICIANDO MIGRACIÓN dashboard/datos ===');

    try {
        const snap = await db.collection('dashboard').doc('datos').get();
        if (!snap.exists) {
            console.log('Documento dashboard/datos no existe');
            return;
        }

        const data = snap.data();
        console.log('Datos encontrados:', {
            ventas: data.ventas?.length || 0,
            cuotas: data.cuotas?.length || 0,
            promotores: data.promotores?.length || 0
        });

        await migrarVentas(data.ventas || []);
        await migrarCuotas(data.cuotas || []);
        await migrarPromotores(data.promotores || []);
        await migrarSemanasHorarios();

        console.log('=== MIGRACIÓN COMPLETADA ===');
    } catch (e) {
        console.error('Error en migración:', e);
    }
}

async function migrarVentas(ventas) {
    if (!ventas.length) return;
    console.log(`Migrando ${ventas.length} ventas...`);

    const grupos = {};
    for (const v of ventas) {
        const fecha = v.fecha ? new Date(v.fecha) : new Date();
        const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(v);
    }

    for (const [fecha, items] of Object.entries(grupos)) {
        await guardarBatchColeccion(`ventas/${fecha}/items`, items.map((v, i) => ({
            id: `v_${fecha}_${i}`,
            punto_venta: v.punto_venta,
            producto: v.producto,
            venta: v.venta,
            fecha: v.fecha instanceof Date ? v.fecha.toISOString() : v.fecha,
            dia: v.dia,
            promotor_id: v.promotor_id || null,
            promotor_nombre: v.promotor_nombre || null,
            promotor_correo: v.promotor_correo || null,
            promotor_dni: v.promotor_dni || null
        })));
    }
    console.log('Ventas migradas:', Object.keys(grupos).length, 'días');
}

async function migrarCuotas(cuotas) {
    if (!cuotas.length) return;
    console.log(`Migrando ${cuotas.length} cuotas...`);

    const grupos = {};
    for (const c of cuotas) {
        const mes = c.mes || new Date().getMonth() + 1;
        const anio = c.anio || new Date().getFullYear();
        const key = `${mes}-${anio}`;
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(c);
    }

    for (const [mesAnio, items] of Object.entries(grupos)) {
        await guardarBatchColeccion(`cuotas/${mesAnio}/items`, items.map((c, i) => ({
            id: `${c.punto_venta}_${c.producto}`.replace(/[^a-zA-Z0-9_]/g, '_'),
            punto_venta: c.punto_venta,
            producto: c.producto,
            mes: c.mes || parseInt(mesAnio.split('-')[0]),
            anio: c.anio || parseInt(mesAnio.split('-')[1]),
            cuota: c.cuota,
            fechaActualizacion: c.fechaActualizacion || new Date().toISOString(),
            usuarioActualizacion: c.usuarioActualizacion || 'migration'
        })));
    }
    console.log('Cuotas migradas:', Object.keys(grupos).length, 'meses');
}

async function migrarPromotores(promotores) {
    if (!promotores.length) return;
    console.log(`Migrando ${promotores.length} promotores...`);

    const items = promotores.map(p => ({
        id: p.id || `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        nombre: p.nombre || p.punto_venta,
        punto_venta: p.punto_venta,
        cadena: p.cadena || 'AREQUIPA SUR',
        num_promotores: p.num_promotores || 1,
        dni: p.dni || '',
        email: p.email || p.correo || '',
        password: p.password || '',
        password_hash: p.password_hash || '',
        tipo: p.tipo || 'fijo',
        zona_principal_id: p.zona_principal_id || p.tienda_asignada || p.tienda || null,
        estado: p.estado || 'Activo',
        fecha_creacion: p.fecha_creacion || new Date().toISOString(),
        fecha_actualizacion: p.fecha_actualizacion || new Date().toISOString()
    }));

    await guardarBatchColeccion('promotores', items);
    console.log('Promotores migrados:', items.length);
}

async function guardarBatchColeccion(ruta, items) {
    for (let i = 0; i < items.length; i += MIGRATION_BATCH_SIZE) {
        const batch = db.batch();
        const lote = items.slice(i, i + MIGRATION_BATCH_SIZE);
        const ref = db.collection(ruta);

        for (const item of lote) {
            const { id, ...data } = item;
            const docRef = ref.doc(id);
            batch.set(docRef, { ...data, migratedAt: new Date().toISOString() }, { merge: true });
        }

        await batch.commit();
        console.log(`  Batch ${Math.floor(i / MIGRATION_BATCH_SIZE) + 1}: ${lote.length} docs`);
    }
}

async function validarMigracion() {
    if (typeof db === 'undefined' || !db) return;

    console.log('=== VALIDANDO MIGRACIÓN ===');

    const ventasSnap = await db.collectionGroup('ventas').limit(10).get();
    console.log('Ventas (sample):', ventasSnap.docs.length);

    const cuotasSnap = await db.collectionGroup('cuotas').limit(10).get();
    console.log('Cuotas (sample):', cuotasSnap.docs.length);

    const promSnap = await db.collection('promotores').limit(10).get();
    console.log('Promotores (sample):', promSnap.docs.length);
}

async function migrarSemanasHorarios() {
    console.log('Migrando semanas de horarios...');
    try {
        const snap = await db.collection(HORARIOS_COLLECTION).doc('semanas').get();
        if (!snap.exists) {
            console.log('Documento horarios/semanas no existe');
            return;
        }

        const data = snap.data();
        if (!data.semanas) {
            console.log('No hay semanas en horarios/semanas');
            return;
        }

        const semanas = data.semanas;
        const keys = Object.keys(semanas);
        console.log(`Encontradas ${keys.length} semanas para migrar`);

        for (let i = 0; i < keys.length; i += MIGRATION_BATCH_SIZE) {
            const batch = db.batch();
            const lote = keys.slice(i, i + MIGRATION_BATCH_SIZE);
            const ref = db.collection(HORARIOS_COLLECTION + '_semanas');

            for (const key of lote) {
                const docRef = ref.doc(key);
                batch.set(docRef, {
                    ...semanas[key],
                    migratedAt: new Date().toISOString()
                }, { merge: true });
            }

            await batch.commit();
            console.log(`  Batch semanas ${Math.floor(i / MIGRATION_BATCH_SIZE) + 1}: ${lote.length} docs`);
        }
        console.log('Semanas de horarios migradas:', keys.length);
    } catch (e) {
        console.error('Error migrando semanas de horarios:', e);
    }
}

// Exponer globalmente para uso en consola
window.migrarDashboardDatos = migrarDashboardDatos;
window.validarMigracion = validarMigracion;
window.rollbackMigracion = rollbackMigracion;

console.log('Utilidades de migración cargadas:');
console.log('  - migrarDashboardDatos()');
console.log('  - validarMigracion()');
console.log('  - rollbackMigracion()');