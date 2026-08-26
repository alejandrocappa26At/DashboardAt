/* =============================================
   MÓDULO: GESTIÓN DE CUOTAS
   ============================================= */

const CuotasModule = {
    editando: null,

    init() {
        this._cache = new Map();
    },

    navegarACuotas() {
        if (!this._verificarAccesoSupervisor()) return;
        window.cambiarPagina?.('cuotas');
        this.renderCuotas();
    },

    _verificarAccesoSupervisor() {
        if (typeof Auth !== 'undefined' && !Auth.estaSupervisorDesbloqueado()) {
            if (typeof window.abrirModalPassword === 'function') window.abrirModalPassword();
            return false;
        }
        return true;
    },

    _obtenerZonaSupervisor() {
        if (typeof Auth !== 'undefined' && typeof Auth.getSupervisorZona === 'function') {
            return Auth.getSupervisorZona();
        }
        return null;
    },

    _esJefeComercial() {
        if (typeof Auth !== 'undefined' && typeof Auth.isJefeComercial === 'function') {
            return Auth.isJefeComercial();
        }
        return false;
    },

    _validarZonaSupervisor(zonaSolicitada) {
        const zonaSupervisor = this._obtenerZonaSupervisor();
        const esJefe = this._esJefeComercial();

        if (esJefe) {
            console.log('[SEGURIDAD CUOTAS] Jefe Comercial - acceso total a zona:', zonaSolicitada);
            return true;
        }

        if (!zonaSupervisor) {
            console.warn('[SEGURIDAD CUOTAS] Supervisor sin zona asignada - acceso denegado');
            return false;
        }

        const zonaNorm = (z => String(z || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());
        const coincide = zonaNorm(zonaSupervisor) === zonaNorm(zonaSolicitada);

        console.log('[SEGURIDAD CUOTAS]', {
            supervisor: zonaSupervisor,
            zonaSesion: zonaSupervisor,
            zonaSolicitada: zonaSolicitada,
            coincide: coincide,
            rol: esJefe ? 'jefe' : 'supervisor'
        });

        return coincide;
    },

    _obtenerZonaActual() {
        const zonaSupervisor = this._obtenerZonaSupervisor();
        const esJefe = this._esJefeComercial();
        
        if (esJefe) {
            return null; // Jefe ve todas las zonas
        }
        return zonaSupervisor; // Supervisor solo ve su zona
    },

    _esSupervisor() {
        return typeof Auth !== 'undefined' && Auth.estaSupervisorDesbloqueado() && !this._esJefeComercial();
    },

    renderCuotas() {
        const container = document.getElementById('cuotas-content');
        if (!container) return;

        const mesActual = new Date().getMonth() + 1;
        const anioActual = new Date().getFullYear();

        const zonaActual = this._obtenerZonaActual();
        const esSupervisor = this._esSupervisor();
        const esJefe = this._esJefeComercial();

        // Construir selector de zona solo para Jefe Comercial
        let zonaSelectorHtml = '';
        if (esJefe) {
            zonaSelectorHtml = `
                <label>Zona:</label>
                <select id="cuotas-zona" onchange="CuotasModule.cambiarZona(this.value)">
                    <option value="">Todas las Zonas</option>
                    <option value="AREQUIPA SUR">AREQUIPA SUR</option>
                    <option value="PUNO SUR">PUNO SUR</option>
                    <option value="CUSCO SUR">CUSCO SUR</option>
                    <option value="APURIMAC SUR">APURIMAC SUR</option>
                    <option value="TACNA SUR">TACNA SUR</option>
                </select>
            `;
        } else if (esSupervisor) {
            // Supervisor: mostrar solo su zona, sin selector
            zonaSelectorHtml = `
                <div class="cuotas-zona-info">
                    <label>Zona:</label>
                    <span class="cuotas-zona-badge">${this._escHtml(zonaActual || 'Sin zona')}</span>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="cuotas-header">
                <h2>Editar Cuotas - ${this._nombreMes(mesActual)} ${anioActual}</h2>
                <div class="cuotas-controls">
                    <select id="cuotas-mes" onchange="CuotasModule.cambiarMes(this.value)">
                        ${this._generarOpcionesMeses(mesActual)}
                    </select>
                    <select id="cuotas-anio" onchange="CuotasModule.cambiarAnio(this.value)">
                        ${this._generarOpcionesAnios(anioActual)}
                    </select>
                    ${zonaSelectorHtml}
                </div>
            </div>
            <div id="cuotas-tabla-container">
                <div class="empty-state">Cargando cuotas...</div>
            </div>
        `;

        this.cargarCuotas(mesActual, anioActual, zonaActual);
    },

    _nombreMes(mes) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses[mes - 1] || mes;
    },

    _generarOpcionesMeses(actual) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses.map((m, i) => '<option value="' + (i + 1) + '"' + (i + 1 === actual ? ' selected' : '') + '>' + m + '</option>').join('');
    },

    _generarOpcionesAnios(actual) {
        const anios = [];
        for (let i = actual - 2; i <= actual + 2; i++) {
            anios.push('<option value="' + i + '"' + (i === actual ? ' selected' : '') + '>' + i + '</option>');
        }
        return anios.join('');
    },

    cambiarMes(val) {
        const anio = parseInt(document.getElementById('cuotas-anio').value) || new Date().getFullYear();
        const zona = this._obtenerZonaActual();
        this.cargarCuotas(parseInt(val), anio, zona);
    },

    cambiarAnio(val) {
        const mes = parseInt(document.getElementById('cuotas-mes').value) || new Date().getMonth() + 1;
        const zona = this._obtenerZonaActual();
        this.cargarCuotas(mes, parseInt(val), zona);
    },

    cambiarZona(val) {
        if (!this._esJefeComercial()) return; // Solo Jefe puede cambiar zona
        const mes = parseInt(document.getElementById('cuotas-mes').value) || new Date().getMonth() + 1;
        const anio = parseInt(document.getElementById('cuotas-anio').value) || new Date().getFullYear();
        this.cargarCuotas(mes, anio, val || null);
    },

    async cargarCuotas(mes, anio, zona = null) {
        const container = document.getElementById('cuotas-tabla-container');
        if (!container) return;

        try {
            if (typeof DataStore !== 'undefined' && DataStore.getCuotas) {
                let cuotas;
                if (zona) {
                    // Filtrar cuotas por zona
                    const cuotasTodas = DataStore.getCuotas(mes, anio);
                    const pdvsZona = this._obtenerPDVsFiltrados(zona);
                    const pdvSet = new Set(pdvsZona);
                    cuotas = cuotasTodas.filter(c => pdvSet.has(c.punto_venta));
                    console.log('[CUOTAS] Filtradas por zona:', zona, '| PDVs:', pdvsZona.length, '| Cuotas:', cuotas.length);
                } else {
                    // Jefe Comercial - todas las cuotas
                    cuotas = DataStore.getCuotas(mes, anio);
                }
                this.renderTablaCuotas(cuotas, mes, anio);
            } else {
                container.innerHTML = '<div class="empty-state">DataStore no disponible</div>';
            }
        } catch (e) {
            console.error('[CUOTAS] Error cargando:', e);
            container.innerHTML = '<div class="empty-state">Error cargando cuotas</div>';
        }
    },

    _obtenerPDVsFiltrados(zona = null) {
        if (typeof DataStore !== 'undefined' && DataStore.getPDVs) {
            if (zona) {
                // Filtrar PDVs por zona específica
                const todosPDVs = DataStore.getAllPDVs();
                return todosPDVs.filter(pdv => {
                    const cadena = DataStore.getTiendaCadena(pdv);
                    return String(cadena || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim() === 
                           String(zona || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                });
            }
            return DataStore.getPDVs(); // Ya filtrado por zona de sesión para supervisores
        }
        return [];
    },

    renderTablaCuotas(cuotas, mes, anio) {
        const container = document.getElementById('cuotas-tabla-container');
        if (!container) return;

        const esJefe = this._esJefeComercial();
        const esSupervisor = this._esSupervisor();
        const zonaActual = this._obtenerZonaActual();

        const pdvs = this._obtenerPDVsFiltrados(zonaActual);
        const productos = typeof DataStore !== 'undefined' && DataStore.getProductos ? DataStore.getProductos() : [];

        const cuotasMap = new Map();
        cuotas.forEach(c => {
            const key = c.punto_venta + '|' + c.producto;
            cuotasMap.set(key, c.cuota);
        });

        let html = '<table class="cuotas-table"><thead><tr><th>Tienda</th>';
        productos.forEach(p => html += '<th>' + this._escHtml(p) + '</th>');
        html += '</tr></thead><tbody>';

        pdvs.forEach(pdv => {
            html += '<tr><td class="cuota-pdv">' + this._escHtml(pdv) + '</td>';
            productos.forEach(prod => {
                const key = pdv + '|' + prod;
                const valor = cuotasMap.get(key) || 0;
                html += '<td><input type="number" class="cuota-input" data-pdv="' + this._escHtml(pdv) + '" data-producto="' + this._escHtml(prod) + '" value="' + valor + '" step="0.01" min="0"></td>';
            });
            html += '</tr>';
        });
        html += '</tbody></table>';

        // Info de zona actual
        let zonaInfoHtml = '';
        if (zonaActual) {
            zonaInfoHtml = '<div class="cuotas-zona-actual">Mostrando zona: <strong>' + this._escHtml(zonaActual) + '</strong> (' + pdvs.length + ' tiendas)</div>';
        } else if (esJefe) {
            zonaInfoHtml = '<div class="cuotas-zona-actual">Mostrando todas las zonas (' + pdvs.length + ' tiendas)</div>';
        }

        container.innerHTML = zonaInfoHtml + html + `
            <div class="cuotas-actions">
                <button class="btn btn-primary" onclick="CuotasModule.guardarCuotas()">Guardar Cuotas</button>
            </div>
        `;
    },

    _escHtml(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&').replace(/</g, '<')
            .replace(/>/g, '>').replace(/"/g, '"')
            .replace(/'/g, '\x27');
    },

    async guardarCuotas() {
        const inputs = document.querySelectorAll('.cuota-input');
        const mes = parseInt(document.getElementById('cuotas-mes').value);
        const anio = parseInt(document.getElementById('cuotas-anio').value);
        const nuevasCuotas = [];

        // Validar zona del supervisor antes de procesar
        const zonaActual = this._obtenerZonaActual();
        const esJefe = this._esJefeComercial();
        const pdvs = this._obtenerPDVsFiltrados(zonaActual);

        if (pdvs.length === 0 && !esJefe) {
            console.warn('[SEGURIDAD CUOTAS] Supervisor sin PDVs asignados - operación cancelada');
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('No tienes tiendas asignadas para editar cuotas', 'error');
            }
            return;
        }

        // Validar que la zona solicitada coincide con la zona del supervisor
        if (zonaActual && !this._validarZonaSupervisor(zonaActual)) {
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('No tienes permisos para editar cuotas de esta zona', 'error');
            }
            return;
        }

        inputs.forEach(input => {
            const valor = parseFloat(input.value) || 0;
            if (valor > 0) {
                nuevasCuotas.push({
                    punto_venta: input.dataset.pdv,
                    producto: input.dataset.producto,
                    cuota: valor,
                    mes,
                    anio
                });
            }
        });

        if (typeof DataStore !== 'undefined' && DataStore.actualizarCuotas) {
            DataStore.actualizarCuotas(nuevasCuotas, mes, anio, pdvs);
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Cuotas guardadas correctamente', 'success');
            }
        }
    }
};

window.CuotasModule = CuotasModule;