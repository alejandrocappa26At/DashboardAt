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
        this.zonas = [
            { id: 'zona-1', nombre: 'RED AT ALTO SELVA ALEGRE' },
            { id: 'zona-2', nombre: 'RED AT CAYMA' },
            { id: 'zona-3', nombre: 'RED AT PROGRESO' },
            { id: 'zona-4', nombre: 'RED AT LA JOYA' },
        ];

        this.promotores = [
            { id: 'p1', nombre: 'Carlos Mamani', zona_principal_id: 'zona-1', tipo: 'fijo' },
            { id: 'p2', nombre: 'Ana Condori', zona_principal_id: 'zona-1', tipo: 'fijo' },
            { id: 'p3', nombre: 'Luis Quispe', zona_principal_id: 'zona-1', tipo: 'flotante' },
            { id: 'p4', nombre: 'Maria Huanca', zona_principal_id: 'zona-2', tipo: 'fijo' },
            { id: 'p5', nombre: 'Jose Lopez', zona_principal_id: 'zona-2', tipo: 'fijo' },
            { id: 'p6', nombre: 'Rosa Nina', zona_principal_id: 'zona-2', tipo: 'flotante' },
            { id: 'p7', nombre: 'Pedro Torres', zona_principal_id: 'zona-3', tipo: 'fijo' },
            { id: 'p8', nombre: 'Sofia Rojas', zona_principal_id: 'zona-3', tipo: 'fijo' },
            { id: 'p9', nombre: 'Diego Puma', zona_principal_id: 'zona-3', tipo: 'fijo' },
            { id: 'p10', nombre: 'Lucia Vargas', zona_principal_id: 'zona-4', tipo: 'fijo' },
            { id: 'p11', nombre: 'Raul Choque', zona_principal_id: 'zona-4', tipo: 'flotante' },
        ];

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
                feriados: []
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

    _cargarDatosIniciales() {
        this.generarMockData();

        if (typeof db !== 'undefined' && db) {
            db.collection(HORARIOS_COLLECTION).doc('config').get().then(snap => {
                if (snap.exists) {
                    const data = snap.data();
                    if (data.zonas) this.zonas = data.zonas;
                    if (data.promotores) this.promotores = data.promotores;
                }
            }).catch(() => {});

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
                this._guardarEnFirestore();
                if (typeof this.onUpdate === 'function') this.onUpdate();
            });
        } else {
            setTimeout(() => {
                if (typeof this.onUpdate === 'function') this.onUpdate();
            }, 100);
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
                }, () => {});
        } catch (e) {}
    },

    _guardarEnFirestore() {
        if (typeof db === 'undefined' || !db) return;

        try {
            db.collection(HORARIOS_COLLECTION).doc('config').set({
                zonas: this.zonas,
                promotores: this.promotores,
                updatedAt: new Date().toISOString()
            });

            db.collection(HORARIOS_COLLECTION).doc('semanas').set({
                semanas: this.semanas,
                updatedAt: new Date().toISOString()
            });
        } catch (e) {}
    },

    cleanup() {
        if (this.realtimeUnsubscribe) {
            this.realtimeUnsubscribe();
            this.realtimeUnsubscribe = null;
        }
    }
};
