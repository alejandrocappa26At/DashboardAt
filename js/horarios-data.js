const HORARIOS_COLLECTION = 'horarios';
const PROMOTORES_COLLECTION = 'promotores';
const ZONAS_COLLECTION = 'zonas';
const HORAS_META_SEMANAL = 48;
const DIAS_SEMANA = ['LU', 'MA', 'MI', 'JU', 'VI', 'SA', 'DO'];
const TURNOS_PREDEFINIDOS = [
    { label: '8AM-5PM', inicio: '08:00', fin: '17:00' },
    { label: '1PM-10PM', inicio: '13:00', fin: '22:00' },
    { label: '7AM-4PM', inicio: '07:00', fin: '16:00' },
    { label: '12PM-9PM', inicio: '12:00', fin: '21:00' },
    { label: '9AM-6PM', inicio: '09:00', fin: '18:00' },
    { label: '10AM-7PM', inicio: '10:00', fin: '19:00' },
    { label: '6AM-3PM', inicio: '06:00', fin: '15:00' },
    { label: '2PM-11PM', inicio: '14:00', fin: '23:00' },
];

function calcularHoras(inicio, fin, descuentoRefrigerio) {
    if (!inicio || !fin) return 0;
    const [hI, mI] = inicio.split(':').map(Number);
    const [hF, mF] = fin.split(':').map(Number);
    const totalMinutos = (hF * 60 + mF) - (hI * 60 + mI);
    const descuento = descuentoRefrigerio || 0;
    return Math.max(0, (totalMinutos - descuento * 60) / 60);
}

function formatHora(inicio, fin) {
    if (!inicio && !fin) return '—';
    return `${inicio}-${fin}`;
}

function getFechaSemana(fechaInicio, diaIndex) {
    const d = new Date(fechaInicio);
    d.setDate(d.getDate() + diaIndex);
    return d;
}

function getWeekRange(fecha) {
    const d = new Date(fecha);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(d.setDate(diff));
    lunes.setHours(0, 0, 0, 0);
    const domingo = new Date(lunes);
    domingo.setDate(lunes.getDate() + 6);
    return { lunes, domingo };
}

function getDiaSemanaLabel(fecha) {
    const dia = fecha.getDate();
    const mes = fecha.getMonth() + 1;
    return `${dia}/${mes}`;
}

function getNextWeek(fecha) {
    const d = new Date(fecha);
    d.setDate(d.getDate() + 7);
    return d;
}

function getPrevWeek(fecha) {
    const d = new Date(fecha);
    d.setDate(d.getDate() - 7);
    return d;
}

const HorariosDataStore = {
    zonas: [],
    promotores: [],
    semanas: {},
    currentWeekStart: null,
    currentUser: null,
    currentRole: 'supervisor',
    initialized: false,
    _firestoreLoaded: false,
    _fuentePromotores: null,
    onUpdate: null,
    realtimeUnsubscribe: null,

    init(role, userName, callback) {
        this.currentRole = role || 'supervisor';
        this.currentUser = userName || null;
        this.onUpdate = callback || null;

        const hoy = new Date();
        this.currentWeekStart = getWeekRange(hoy).lunes;

        this._cargarDatosIniciales();
        this._iniciarRealtime();
        this.initialized = true;
    },

    setView(role, userName) {
        this.currentRole = role;
        this.currentUser = userName;
    },

    generarMockData() {
        if (typeof DataStore !== 'undefined' && DataStore.initialized) {
            const pdvObjects = DataStore.getPDVObjects();
            this.zonas = pdvObjects.map(pdv => ({
                id: pdv.id,
                nombre: pdv.nombre,
                cadena: pdv.cadena
            }));
        } else {
            this.zonas = [];
        }

        this.semanas = {};
    },

    getSemanaKey(fechaInicio) {
        const d = new Date(fechaInicio);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    getOrCreateSemana(fechaInicio) {
        const key = this.getSemanaKey(fechaInicio);
        if (!this.semanas[key]) {
            this.semanas[key] = {
                fecha_inicio: fechaInicio.toISOString(),
                fecha_fin: getWeekRange(fechaInicio).domingo.toISOString(),
                estado: 'borrador',
                turnos: {},
                feriados: [],
                coberturas: {}
            };

            for (let p of this.promotores) {
                for (let d = 0; d < 7; d++) {
                    const turnoKey = `${p.id}-${d}`;
                    this.semanas[key].turnos[turnoKey] = {
                        promotor_id: p.id,
                        dia: d,
                        estado: 'sin_asignar',
                        hora_inicio: null,
                        hora_fin: null,
                        zona_id: null,
                        descuento_refrigerio: 0,
                        horas_calculadas: 0
                    };
                }
            }
        }
        return this.semanas[key];
    },

    getSemana(fechaInicio) {
        const key = this.getSemanaKey(fechaInicio);
        return this.semanas[key] || null;
    },

    getTurno(fechaInicio, promotorId, diaIndex) {
        const semana = this.getOrCreateSemana(fechaInicio);
        const key = this.getSemanaKey(fechaInicio);
        const turnoKey = `${promotorId}-${diaIndex}`;
        return semana.turnos[turnoKey] || null;
    },

    setTurno(fechaInicio, promotorId, diaIndex, data) {
        const semana = this.getOrCreateSemana(fechaInicio);
        const key = this.getSemanaKey(fechaInicio);
        const turnoKey = `${promotorId}-${diaIndex}`;

        if (!semana.turnos[turnoKey]) {
            semana.turnos[turnoKey] = { promotor_id: promotorId, dia: diaIndex };
        }

        const turno = semana.turnos[turnoKey];
        if (data.estado) turno.estado = data.estado;
        if (data.hora_inicio !== undefined) turno.hora_inicio = data.hora_inicio;
        if (data.hora_fin !== undefined) turno.hora_fin = data.hora_fin;
        if (data.zona_id !== undefined) turno.zona_id = data.zona_id;
        if (data.descuento_refrigerio !== undefined) turno.descuento_refrigerio = data.descuento_refrigerio;

        turno.horas_calculadas = calcularHoras(turno.hora_inicio, turno.hora_fin, turno.descuento_refrigerio);

        this._guardarEnFirestore();
        return turno;
    },

    setTurnoPreset(fechaInicio, promotorId, diaIndex, presetKey) {
        const preset = TURNOS_PREDEFINIDOS.find(t => t.label === presetKey);
        if (!preset) return null;

        const promotor = this.promotores.find(p => p.id === promotorId);
        return this.setTurno(fechaInicio, promotorId, diaIndex, {
            estado: 'turno',
            hora_inicio: preset.inicio,
            hora_fin: preset.fin,
            zona_id: promotor ? promotor.zona_principal_id : null,
            descuento_refrigerio: 1
        });
    },

    setDescanso(fechaInicio, promotorId, diaIndex) {
        return this.setTurno(fechaInicio, promotorId, diaIndex, {
            estado: 'descanso',
            hora_inicio: null,
            hora_fin: null,
            horas_calculadas: 0
        });
    },

    setSinAsignar(fechaInicio, promotorId, diaIndex) {
        return this.setTurno(fechaInicio, promotorId, diaIndex, {
            estado: 'sin_asignar',
            hora_inicio: null,
            hora_fin: null,
            zona_id: null,
            horas_calculadas: 0
        });
    },

    setFlotante(fechaInicio, promotorId, diaIndex, zonaId, inicio, fin) {
        return this.setTurno(fechaInicio, promotorId, diaIndex, {
            estado: 'flotante',
            hora_inicio: inicio,
            hora_fin: fin,
            zona_id: zonaId,
            descuento_refrigerio: 1
        });
    },

    publicarSemana(fechaInicio) {
        const key = this.getSemanaKey(fechaInicio);
        if (this.semanas[key]) {
            this.semanas[key].estado = 'publicada';
            this._guardarEnFirestore();
        }
        return this.semanas[key];
    },

    setSemanaBorrador(fechaInicio) {
        const key = this.getSemanaKey(fechaInicio);
        if (this.semanas[key]) {
            this.semanas[key].estado = 'borrador';
            this._guardarEnFirestore();
        }
        return this.semanas[key];
    },

    marcarFeriado(fechaInicio, diaIndex) {
        const semana = this.getOrCreateSemana(fechaInicio);
        const key = this.getSemanaKey(fechaInicio);
        if (!semana.feriados) semana.feriados = [];
        if (!semana.feriados.includes(diaIndex)) {
            semana.feriados.push(diaIndex);
        }
        this._guardarEnFirestore();
        return semana.feriados;
    },

    desmarcarFeriado(fechaInicio, diaIndex) {
        const semana = this.getOrCreateSemana(fechaInicio);
        const key = this.getSemanaKey(fechaInicio);
        if (semana.feriados) {
            semana.feriados = semana.feriados.filter(d => d !== diaIndex);
        }
        this._guardarEnFirestore();
        return semana.feriados || [];
    },

    _proximoIdPromotor() {
        let maxNum = 0;
        for (let p of this.promotores) {
            const match = p.id.match(/^p(\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNum) maxNum = num;
            }
        }
        return `p${maxNum + 1}`;
    },

    agregarPromotor(nombre, tipo, zonaId) {
        const id = this._proximoIdPromotor();
        const ahora = new Date().toISOString();
        const promotor = {
            id,
            nombre: nombre || 'Nuevo promotor',
            zona_principal_id: zonaId || null,
            tipo: tipo || 'fijo',
            dni: '',
            email: '',
            password: '',
            estado: 'Activo',
            fecha_creacion: ahora,
            fecha_actualizacion: ahora
        };
        this.promotores.push(promotor);

        for (let key in this.semanas) {
            const semana = this.semanas[key];
            for (let d = 0; d < 7; d++) {
                const turnoKey = `${id}-${d}`;
                semana.turnos[turnoKey] = {
                    promotor_id: id, dia: d,
                    estado: 'sin_asignar', hora_inicio: null, hora_fin: null,
                    zona_id: null, descuento_refrigerio: 0, horas_calculadas: 0
                };
            }
        }

        this._guardarEnFirestore();
        if (typeof this.onUpdate === 'function') this.onUpdate();
        return promotor;
    },

    editarPromotor(promotorId, cambios) {
        const promotor = this.promotores.find(p => p.id === promotorId);
        if (!promotor) return null;
        const rolAnterior = promotor.tipo || 'fijo';
        if (cambios.nombre !== undefined) promotor.nombre = cambios.nombre;
        if (cambios.tipo !== undefined) promotor.tipo = cambios.tipo;
        if (cambios.zona_principal_id !== undefined) promotor.zona_principal_id = cambios.zona_principal_id;
        if (cambios.dni !== undefined) promotor.dni = cambios.dni;
        if (cambios.email !== undefined) promotor.email = cambios.email;
        if (cambios.password !== undefined) promotor.password = cambios.password;
        if (cambios.estado !== undefined) promotor.estado = cambios.estado;
        promotor.fecha_actualizacion = new Date().toISOString();
        this._guardarEnFirestore();
        if (cambios.tipo && cambios.tipo !== rolAnterior) {
            const fijos = this.promotores.filter(p => (p.tipo || 'fijo') === 'fijo').length;
            const volantes = this.promotores.filter(p => (p.tipo || 'fijo') === 'volante').length;
            const vacacioneros = this.promotores.filter(p => (p.tipo || 'fijo') === 'vacacionero').length;
            const expertos = this.promotores.filter(p => (p.tipo || 'fijo') === 'experto').length;
            console.log('Promotor actualizado:', promotor.nombre);
            console.log('Rol anterior:', rolAnterior);
            console.log('Rol nuevo:', cambios.tipo);
            console.log('Fijos:', fijos);
            console.log('Volantes:', volantes);
            console.log('Vacacioneros:', vacacioneros);
            console.log('Expertos:', expertos);
        }
        if (typeof this.onUpdate === 'function') this.onUpdate();
        return promotor;
    },

    eliminarPromotor(promotorId) {
        const idx = this.promotores.findIndex(p => p.id === promotorId);
        if (idx === -1) return false;
        this.promotores.splice(idx, 1);

        for (let key in this.semanas) {
            const semana = this.semanas[key];
            for (let d = 0; d < 7; d++) {
                delete semana.turnos[`${promotorId}-${d}`];
            }
        }

        this._guardarEnFirestore();
        if (typeof this.onUpdate === 'function') this.onUpdate();
        return true;
    },

    /* Importación masiva desde Excel: recibe una lista ya validada
       [{ nombre, dni, email, password, password_hash, zona_principal_id, tipo, estado }]
       y los registra en una sola operación (Firestore horarios/config). */
    importarPromotores(lista) {
        if (!Array.isArray(lista) || lista.length === 0) return { creados: [], errores: [] };
        const ahora = new Date().toISOString();
        const creados = [];
        const errores = [];
        for (const item of lista) {
            const nombre = String((item && item.nombre) || '').trim();
            if (!nombre) { errores.push({ error: 'El nombre es obligatorio.' }); continue; }

            const email = String((item && item.email) || '').trim().toLowerCase();
            const dni = String((item && item.dni) || '').trim();

            const existeEmail = email && this.promotores.some(p => p.email && String(p.email).trim().toLowerCase() === email);
            if (existeEmail) { errores.push({ error: 'El correo ya existe: ' + email }); continue; }

            const existeDni = dni && this.promotores.some(p => p.dni && String(p.dni).trim() === dni);
            if (existeDni) { errores.push({ error: 'El DNI ya existe: ' + dni }); continue; }

            const id = this._proximoIdPromotor();
            const promotor = {
                id,
                nombre,
                zona_principal_id: (item && item.zona_principal_id) || null,
                tipo: (item && item.tipo) || 'fijo',
                dni,
                email,
                password: (item && item.password) || '',
                password_hash: (item && item.password_hash) || '',
                estado: (item && item.estado) || 'Activo',
                fecha_creacion: ahora,
                fecha_actualizacion: ahora
            };
            this.promotores.push(promotor);

            for (let key in this.semanas) {
                const semana = this.semanas[key];
                for (let d = 0; d < 7; d++) {
                    const turnoKey = `${id}-${d}`;
                    semana.turnos[turnoKey] = {
                        promotor_id: id, dia: d,
                        estado: 'sin_asignar', hora_inicio: null, hora_fin: null,
                        zona_id: null, descuento_refrigerio: 0, horas_calculadas: 0
                    };
                }
            }

            creados.push(promotor);
        }
        if (creados.length > 0) {
            this._guardarEnFirestore();
            if (typeof this.onUpdate === 'function') this.onUpdate();
        }
        return { creados, errores };
    },

    getPromotoresDeZona(zonaId) {
        return this.promotores.filter(p => p.zona_principal_id === zonaId);
    },

    getPromotoresFlotantes() {
        return this.promotores.filter(p => p.tipo === 'flotante');
    },

    getZonaDePromotor(promotorId) {
        const p = this.promotores.find(pr => pr.id === promotorId);
        if (!p) return null;
        return this.zonas.find(z => z.id === p.zona_principal_id);
    },

    getHorasPromotorSemana(fechaInicio, promotorId) {
        const semana = this.getSemana(fechaInicio);
        if (!semana) return { total: 0, porDia: {} };

        const total = { total: 0, porDia: {} };
        for (let d = 0; d < 7; d++) {
            const turnoKey = `${promotorId}-${d}`;
            const turno = semana.turnos[turnoKey];
            const horas = turno ? (turno.horas_calculadas || 0) : 0;
            total.porDia[d] = horas;
            total.total += horas;
        }
        return total;
    },

    getHorasZonaSemana(fechaInicio, zonaId) {
        const promotores = this.getPromotoresDeZona(zonaId);
        const semana = this.getSemana(fechaInicio);
        if (!semana) return { total: 0, porDia: {}, porPromotor: {} };

        const result = { total: 0, porDia: {}, porPromotor: {} };
        for (let d = 0; d < 7; d++) result.porDia[d] = 0;

        for (let p of promotores) {
            const horas = this.getHorasPromotorSemana(fechaInicio, p.id);
            result.porPromotor[p.id] = horas;
            result.total += horas.total;
            for (let d = 0; d < 7; d++) {
                result.porDia[d] += horas.porDia[d];
            }
        }

        const flotantes = this.getPromotoresFlotantes();
        for (let p of flotantes) {
            const semanaData = this.getSemana(fechaInicio);
            if (!semanaData) continue;
            for (let d = 0; d < 7; d++) {
                const turnoKey = `${p.id}-${d}`;
                const turno = semanaData.turnos[turnoKey];
                if (turno && turno.zona_id === zonaId && turno.estado === 'flotante') {
                    result.total += turno.horas_calculadas || 0;
                    result.porDia[d] += turno.horas_calculadas || 0;
                    if (!result.porPromotor[p.id]) {
                        result.porPromotor[p.id] = { total: 0, porDia: {} };
                    }
                    result.porPromotor[p.id].total += turno.horas_calculadas || 0;
                    result.porPromotor[p.id].porDia[d] = (result.porPromotor[p.id].porDia[d] || 0) + (turno.horas_calculadas || 0);
                }
            }
        }

        return result;
    },

    getHorasPromotorSemanaConFlotantes(fechaInicio, promotorId) {
        const result = this.getHorasPromotorSemana(fechaInicio, promotorId);
        return result;
    },

    setCobertura(fechaInicio, zonaId, diaIndex, data) {
        const semana = this.getOrCreateSemana(fechaInicio);
        if (!semana.coberturas) semana.coberturas = {};
        const key = `${zonaId}-${diaIndex}`;
        semana.coberturas[key] = {
            promotor_id: data.promotor_id,
            promotor_nombre: data.promotor_nombre,
            hora_inicio: data.hora_inicio || null,
            hora_fin: data.hora_fin || null,
            fecha_asignacion: new Date().toISOString()
        };
        this._guardarEnFirestore();
        return semana.coberturas[key];
    },

    removeCobertura(fechaInicio, zonaId, diaIndex) {
        const semana = this.getSemana(fechaInicio);
        if (!semana || !semana.coberturas) return null;
        const key = `${zonaId}-${diaIndex}`;
        const removed = semana.coberturas[key];
        if (removed) {
            delete semana.coberturas[key];
            this._guardarEnFirestore();
        }
        return removed || null;
    },

    getCobertura(fechaInicio, zonaId, diaIndex) {
        const semana = this.getSemana(fechaInicio);
        if (!semana || !semana.coberturas) return null;
        return semana.coberturas[`${zonaId}-${diaIndex}`] || null;
    },

    getCoberturasZonaSemana(fechaInicio, zonaId) {
        const semana = this.getSemana(fechaInicio);
        if (!semana || !semana.coberturas) return [];
        const results = [];
        for (let d = 0; d < 7; d++) {
            const key = `${zonaId}-${d}`;
            if (semana.coberturas[key]) {
                results.push({ dia: d, ...semana.coberturas[key] });
            }
        }
        return results;
    },

    validarSemana(fechaInicio) {
        const validaciones = [];
        const semana = this.getSemana(fechaInicio);
        if (!semana) return validaciones;

        for (let p of this.promotores) {
            const horas = this.getHorasPromotorSemana(fechaInicio, p.id);
            let tieneDescanso = false;
            let sinAsignarCount = 0;

            for (let d = 0; d < 7; d++) {
                const turnoKey = `${p.id}-${d}`;
                const turno = semana.turnos[turnoKey];
                if (turno && turno.estado === 'descanso') tieneDescanso = true;
                if (!turno || turno.estado === 'sin_asignar') sinAsignarCount++;
            }

            if (!tieneDescanso && !this.promotores.find(pr => pr.id === p.id && pr.tipo === 'flotante')) {
                validaciones.push({
                    tipo: 'warning',
                    mensaje: `${p.nombre} no tiene ningún día libre en la semana.`
                });
            }

            if (horas.total > 0 && Math.abs(horas.total - HORAS_META_SEMANAL) > 12) {
                const diff = horas.total - HORAS_META_SEMANAL;
                validaciones.push({
                    tipo: diff > 0 ? 'warning' : 'error',
                    mensaje: `${p.nombre}: ${horas.total.toFixed(1)}h semanales (meta: ${HORAS_META_SEMANAL}h). ${diff > 0 ? 'Excede por ' + diff.toFixed(1) + 'h' : 'Faltan ' + Math.abs(diff).toFixed(1) + 'h'}.`
                });
            }
        }

        return validaciones;
    },

    getDatosPromotor(promotorId) {
        const promotor = this.promotores.find(p => p.id === promotorId);
        if (!promotor) return null;
        const zona = this.zonas.find(z => z.id === promotor.zona_principal_id);
        return { promotor, zona };
    },

    getPromotorViewData(fechaInicio, promotorId) {
        const info = this.getDatosPromotor(promotorId);
        if (!info) return null;

        const semana = this.getOrCreateSemana(fechaInicio);
        const key = this.getSemanaKey(fechaInicio);
        const horas = this.getHorasPromotorSemana(fechaInicio, promotorId);

        const dias = [];
        for (let d = 0; d < 7; d++) {
            const turnoKey = `${promotorId}-${d}`;
            const turno = semana.turnos[turnoKey] || {
                estado: 'sin_asignar',
                hora_inicio: null,
                hora_fin: null,
                horas_calculadas: 0,
                zona_id: null,
                descuento_refrigerio: 0
            };

            const fecha = getFechaSemana(fechaInicio, d);
            let zonaNombre = null;
            if (turno.zona_id && turno.zona_id !== promotor.zona_principal_id) {
                const zonaCobertura = this.zonas.find(z => z.id === turno.zona_id);
                zonaNombre = zonaCobertura ? zonaCobertura.nombre : null;
            }

            dias.push({
                dia: d,
                diaLabel: DIAS_SEMANA[d],
                fecha: fecha,
                fechaLabel: getDiaSemanaLabel(fecha),
                estado: turno.estado,
                hora_inicio: turno.hora_inicio,
                hora_fin: turno.hora_fin,
                horas: turno.horas_calculadas || 0,
                zonaCobertura: zonaNombre,
            });
        }

        const pctMeta = horas.total / HORAS_META_SEMANAL * 100;
        const metaColor = pctMeta >= 100 ? 'green' : pctMeta >= 75 ? 'yellow' : 'red';

        return {
            promotor: info.promotor,
            zona: info.zona,
            dias,
            horasSemanales: horas.total,
            pctMeta,
            metaColor,
            esFeriado: (semana.feriados || [])
        };
    },

    _sincronizarZonasConDataStore() {
        if (typeof DataStore === 'undefined' || !DataStore.initialized) return false;

        const pdvObjects = DataStore.getPDVObjects();
        const zonasPrevias = [...this.zonas];

        this.zonas = pdvObjects.map(pdv => ({
            id: pdv.id,
            nombre: pdv.nombre,
            cadena: pdv.cadena
        }));

        for (let p of this.promotores) {
            if (!p.zona_principal_id) continue;

            const yaValido = this.zonas.some(z => z.id === p.zona_principal_id);
            if (yaValido) continue;

            const zonaPrevia = zonasPrevias.find(z => z.id === p.zona_principal_id);
            if (zonaPrevia) {
                const match = this.zonas.find(z =>
                    z.nombre.toUpperCase() === zonaPrevia.nombre.toUpperCase()
                );
                if (match) { p.zona_principal_id = match.id; continue; }
            }

            const matchDirecto = this.zonas.find(z =>
                z.nombre.toUpperCase() === p.zona_principal_id.toUpperCase()
            );
            if (matchDirecto) { p.zona_principal_id = matchDirecto.id; continue; }

            // AUDITORÍA: nunca anular la tienda asignada si la sincronización
            // aún no ha confirmado el listado real de tiendas (carrera de carga
            // de TiendasStore/Firestore). La asignación se conserva intacta.
            console.warn('[AUDITORIA] No se encontró la tienda del promotor en la lista actual. Se CONSERVA la asignación sin modificarla:', p.nombre, '| zona previa:', p.zona_principal_id);
        }

        for (let key in this.semanas) {
            const semana = this.semanas[key];
            for (let turnoKey in semana.turnos) {
                const turno = semana.turnos[turnoKey];
                if (turno.zona_id) {
                    const yaValido = this.zonas.some(z => z.id === turno.zona_id);
                    if (yaValido) continue;
                    const zonaPrevia = zonasPrevias.find(z => z.id === turno.zona_id);
                    if (zonaPrevia) {
                        const match = this.zonas.find(z =>
                            z.nombre.toUpperCase() === zonaPrevia.nombre.toUpperCase()
                        );
                        if (match) turno.zona_id = match.id;
                    }
                }
            }
        }

        return true;
    },

    _cargarDatosIniciales() {
        this.generarMockData();

        if (typeof db !== 'undefined' && db) {
            db.collection(HORARIOS_COLLECTION).doc('config').get().then(async snap => {
                let cargados = null;
                let origen = HORARIOS_COLLECTION + '/config.promotores';

                if (snap.exists) {
                    const data = snap.data();
                    if (data.promotores && data.promotores.length > 0) {
                        // AUDITORÍA: normalizar en memoria la lista de promotores
                        // para garantizar el campo zona_principal_id. Si Firestore
                        // guardó la tienda como "tienda_asignada"/"tienda", se mapea
                        // sin modificar la base de datos.
                        cargados = data.promotores.map(p => {
                            if (!p) return null;
                            const base = Object.assign({}, p);
                            if (!base.zona_principal_id && (p.tienda_asignada || p.tienda)) {
                                base.zona_principal_id = p.tienda_asignada || p.tienda;
                            }
                            if (!base.email && base.correo) base.email = base.correo;
                            if (!base.nombre && (base.nombre_completo || base.usuario)) {
                                base.nombre = base.nombre_completo || base.usuario;
                            }
                            if (!base.estado) base.estado = 'Activo';
                            return base;
                        }).filter(Boolean);
                    }
                }

                if (!cargados || cargados.length === 0) {
                    const recuperados = await this._recuperarDesdeColeccionPromotores();
                    if (recuperados && recuperados.length > 0) {
                        cargados = recuperados;
                        origen = PROMOTORES_COLLECTION;
                    }
                }

                if (cargados) {
                    this.promotores = cargados;
                }
                this._fuentePromotores = origen;
                this._firestoreLoaded = true;

                this._limpiarPromotoresFicticios(true);
                this._sincronizarZonasConDataStore();

                // AUDITORÍA: si el promotor ya inició sesión (o hay una sesión
                // almacenada) y los promotores recién terminaron de cargar, se
                // rehidrata la tienda asignada para nunca perderla por carrera.
                if (typeof _rehidratarSesionPromotor === 'function') _rehidratarSesionPromotor();

                console.log('[VALIDACION] Promotores encontrados:', this.promotores.length);
                console.log('[VALIDACION] Fuente:', this._fuentePromotores);
                console.log('[AUDITORIA][PROMOTORES] Promotores visibles:', this.promotores.length);
                console.log('[AUDITORIA][PROMOTORES] Listado de IDs:', this.promotores.map(p => p.id));
                console.log('[AUDITORIA][PROMOTORES] Listado de correos:', this.promotores.map(p => p.email || '').filter(Boolean));

                if (typeof this.onUpdate === 'function') this.onUpdate();
            }).catch(e => {
                console.error('[AUDITORIA][PROMOTORES] Error al leer la configuración de Firestore. No se sobrescribirá la base de datos.', e);
                this._sincronizarZonasConDataStore();
                this._firestoreLoaded = true;
            });

            db.collection(HORARIOS_COLLECTION).doc('semanas').get().then(snap => {
                if (snap.exists) {
                    const data = snap.data();
                    if (data.semanas) {
                        for (let key in data.semanas) {
                            this.semanas[key] = data.semanas[key];
                        }
                    }
                }
                if (typeof this.onUpdate === 'function') this.onUpdate();
            }).catch(() => {
                if (typeof this.onUpdate === 'function') this.onUpdate();
            });

            this._cargarSemanasParticionadas();
        } else {
            setTimeout(() => {
                if (typeof this.onUpdate === 'function') this.onUpdate();
            }, 100);
        }
    },

    async _recuperarDesdeColeccionPromotores() {
        if (typeof db === 'undefined' || !db) return null;
        try {
            const snap = await db.collection(PROMOTORES_COLLECTION).get();
            if (snap.empty) return null;

            const docs = [];
            snap.forEach(doc => {
                const d = doc.data() || {};
                if (!d || (!d.nombre && !d.email)) return;
                docs.push({
                    id: d.id || doc.id,
                    nombre: d.nombre || d.nombre_completo || doc.id,
                    dni: d.dni || d.documento || '',
                    email: d.email || d.correo || '',
                    password: d.password || '',
                    password_hash: d.password_hash || '',
                    tipo: d.tipo || 'fijo',
                    zona_principal_id: d.zona_principal_id || d.tienda_asignada || d.tienda || null,
                    estado: d.estado || 'Activo',
                    fecha_creacion: d.fecha_creacion || d.createdAt || new Date().toISOString(),
                    fecha_actualizacion: d.fecha_actualizacion || d.updatedAt || new Date().toISOString()
                });
            });

            if (docs.length > 0) {
                console.log('[AUDITORIA][PROMOTORES] Recuperados desde la colección ' + PROMOTORES_COLLECTION + ':', docs.length);
            }
            return docs;
        } catch (e) {
            console.warn('[AUDITORIA][PROMOTORES] No se pudo leer la colección ' + PROMOTORES_COLLECTION + ':', e.message);
            return null;
        }
    },

    _esPromotorPlaceholder(p) {
        if (!p) return true;
        const nombrePlaceholder = p.nombre === 'Nuevo promotor' || !p.nombre;
        const dniFicticio = !p.dni || p.dni === '12345678';
        const emailFicticio = !p.email || p.email === 'correo@ejemplo.com';
        return nombrePlaceholder && dniFicticio && emailFicticio && !p.password;
    },

    _limpiarPromotoresFicticios(permitirVacio) {
        if (!this.promotores || this.promotores.length === 0) return;

        const nombresFicticios = [
            'Carlos Mamani', 'Ana Condori', 'Luis Quispe', 'Maria Huanca',
            'Jose Lopez', 'Rosa Nina', 'Pedro Torres', 'Sofia Rojas',
            'Diego Puma', 'Lucia Vargas', 'Raul Choque'
        ];
        const idsFicticios = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11'];

        const antes = this.promotores.length;
        const eliminados = [];

        this.promotores = this.promotores.filter(p => {
            if (!p || !p.id) {
                eliminados.push(p);
                return false;
            }

            // 1) Auto-seed histórico de la primera versión (sin DNI/correo/contraseña).
            if (idsFicticios.includes(p.id) && nombresFicticios.includes(p.nombre)
                && !p.dni && !p.email && !p.password) {
                eliminados.push(p);
                return false;
            }

            // 2) Placeholder "Nuevo promotor" creado con "Añadir Promotor" sin completar
            //    (sin DNI/correo/contraseña, o solo con los valores de ejemplo).
            if (this._esPromotorPlaceholder(p)) {
                eliminados.push(p);
                return false;
            }

            return true;
        });

        const despues = this.promotores.length;

        if (eliminados.length > 0) {
            console.log('[AUDITORIA][PROMOTORES] Registros ficticios/placeholder eliminados (' + eliminados.length + '):',
                eliminados.map(p => (p && p.id ? p.id : '?') + ' · ' + (p && p.nombre ? p.nombre : '(sin nombre)')));
            this._guardarEnFirestore(permitirVacio);
        }

        if (antes !== despues) {
            console.log('[AUDITORIA][PROMOTORES] Limpieza: ' + antes + ' → ' + despues + ' promotores.');
        }
    },

    _iniciarRealtime() {
        if (typeof db === 'undefined' || !db) return;

        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
        }

        try {
            this.realtimeUnsubscribe = db.collection(HORARIOS_COLLECTION).doc('semanas')
                .onSnapshot(snap => {
                    if (!snap.exists) return;
                    const data = snap.data();
                    if (data.semanas) {
                        for (let key in data.semanas) {
                            this.semanas[key] = data.semanas[key];
                        }
                    }
                    if (typeof this.onUpdate === 'function') {
                        this.onUpdate(true);
                    }
                }, () => { });
        } catch (e) { }

        try {
            this.realtimeSemanasUnsubscribe = db.collection(HORARIOS_COLLECTION + '_semanas')
                .onSnapshot(snap => {
                    snap.docChanges().forEach(change => {
                        const data = change.doc.data();
                        if (data) {
                            this.semanas[change.doc.id] = data;
                        }
                    });
                    if (typeof this.onUpdate === 'function') {
                        this.onUpdate(true);
                    }
                }, () => { });
        } catch (e) { }
    },

    _guardarEnFirestore(permitirVacio) {
        if (typeof db === 'undefined' || !db) return;

        // AUDITORÍA: protección anti-destrucción de datos.
        // Nunca sobrescribir la lista de promotores si la sesión aún no confirmó qué
        // hay realmente en Firestore y la lista en memoria está vacía o solo contiene
        // placeholders (no proviene aún de la base de datos).
        const soloPlaceholders = this.promotores.length > 0
            && this.promotores.every(p => this._esPromotorPlaceholder(p));

        if (!permitirVacio && this.promotores.length === 0 && this._firestoreLoaded) return;

        if (!this._firestoreLoaded && (this.promotores.length === 0 || soloPlaceholders)) {
            console.warn('[AUDITORIA][PROMOTORES] Escritura omitida: la lista local aún no proviene de Firestore (vacía o solo placeholders). No se sobrescribe la base de datos.');
            return;
        }

        // No persistir registros placeholder puros ("Nuevo promotor" sin completar),
        // aunque Firestore ya haya sido cargado.
        if (!permitirVacio && soloPlaceholders) {
            console.warn('[AUDITORIA][PROMOTORES] Escritura omitida: solo hay registros placeholder sin completar. Se guardarán al completar DNI/correo.');
            return;
        }

        try {
            db.collection(HORARIOS_COLLECTION).doc('config').set({
                zonas: this.zonas,
                promotores: this.promotores,
                updatedAt: new Date().toISOString()
            });

            this._guardarSemanasParticionadas();
        } catch (e) { }
    },

    async _guardarSemanasParticionadas() {
        if (typeof db === 'undefined' || !db) return;

        const batch = db.batch();
        const semanasRef = db.collection(HORARIOS_COLLECTION + '_semanas');

        for (const [key, semana] of Object.entries(this.semanas)) {
            const docRef = semanasRef.doc(key);
            batch.set(docRef, {
                ...semana,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        }

        try {
            await batch.commit();
            console.log('[HORARIOS] Semanas particionadas guardadas:', Object.keys(this.semanas).length);
        } catch (e) {
            console.error('[HORARIOS] Error guardando semanas particionadas:', e);
            // Fallback: guardar en documento legacy
            try {
                await db.collection(HORARIOS_COLLECTION).doc('semanas').set({
                    semanas: this.semanas,
                    updatedAt: new Date().toISOString()
                });
            } catch (fallbackError) {
                console.error('[HORARIOS] Fallback también falló:', fallbackError);
            }
        }
    },

    async _cargarSemanasParticionadas() {
        if (typeof db === 'undefined' || !db) return;
        try {
            const snap = await db.collection(HORARIOS_COLLECTION + '_semanas').get();
            if (!snap.empty) {
                snap.docs.forEach(doc => {
                    this.semanas[doc.id] = doc.data();
                });
                console.log('[HORARIOS] Semanas particionadas cargadas:', snap.docs.length);
            }
        } catch (e) {
            console.warn('[HORARIOS] No se pudieron cargar semanas particionadas:', e.message);
        }
    },

    cleanup() {
        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
            this.realtimeUnsubscribe = null;
        }
        if (this.realtimeSemanasUnsubscribe) {
            this.realtimeSemanasUnsubscribe();
            this.realtimeSemanasUnsubscribe = null;
        }
    }
};

window.HorariosDataStore = HorariosDataStore;
console.log('HORARIOS DATASTORE CARGADO');