function renderizarResumenEjecutivo() {
    const ventaTotal = DataStore.getVentaTotal();
    const cuotaTotal = DataStore.getCuotaTotal();
    const avance = DataStore.getAvanceGeneral();
    const proyeccion = DataStore.getProyeccion();
    const pdvCumplen = DataStore.getPDVsCumplenMeta();
    const totalPDVs = DataStore.getPDVs().length;
    const pdvRiesgo = DataStore.getPDVsEnRiesgo();
    const mejorPDV = DataStore.getMejorPDV();

    document.getElementById('kpi-venta-total').textContent = formatCurrency(ventaTotal);
    document.getElementById('kpi-venta-sub').textContent = 'de ' + formatCurrency(cuotaTotal) + ' meta total';
    document.getElementById('kpi-avance').textContent = formatPercent(avance);
    document.getElementById('kpi-avance-sub').textContent = avance >= 100 ? '¡Meta alcanzada!' : 'Falta ' + formatPercent(100 - avance) + ' para la meta';
    document.getElementById('kpi-proyeccion').textContent = formatCurrency(proyeccion);
    document.getElementById('kpi-proyeccion-sub').textContent = proyeccion >= cuotaTotal ? 'Supera la meta mensual' : 'Por debajo de la meta';
    document.getElementById('kpi-cumplen').textContent = pdvCumplen + ' / ' + totalPDVs;
    document.getElementById('kpi-cumplen-sub').textContent = totalPDVs > 0 ? Math.round((pdvCumplen / totalPDVs) * 100) + '% de PDVs' : '';
    document.getElementById('kpi-riesgo').textContent = pdvRiesgo;
    document.getElementById('kpi-riesgo-sub').textContent = totalPDVs > 0 ? Math.round((pdvRiesgo / totalPDVs) * 100) + '% de PDVs' : '';
    document.getElementById('kpi-mejor-pdv').textContent = mejorPDV.replace('Red AT ', '');

    const opNum = document.getElementById('op-number');
    const opBar = document.getElementById('op-bar-fill');
    const opStatus = document.getElementById('op-status');
    const cls = avance >= 100 ? 'green' : avance >= 80 ? 'yellow' : 'red';
    opNum.textContent = formatPercent(avance);
    opNum.className = 'op-number ' + cls;
    opBar.style.width = Math.min(avance, 100) + '%';
    opBar.className = 'op-bar-fill ' + cls;
    opStatus.textContent = avance >= 100 ? 'Meta alcanzada' : avance >= 80 ? 'Cerca de la meta' : 'Requiere atenci\u00f3n';
    opStatus.className = 'op-status ' + cls;

    actualizarGraficos();
}

function renderizarAvancePDV(pdvSeleccionado) {
    const pdvs = DataStore.getPDVs();
    const select = document.getElementById('pdv-select');
    if (!select) return;

    if (!pdvSeleccionado) {
        pdvSeleccionado = select.value || pdvs[0];
    }
    select.value = pdvSeleccionado;

    const data = DataStore.getProyeccionPDV(pdvSeleccionado);
    if (!data) {
        document.getElementById('pdv-content').innerHTML = '<div class="empty-state"><p>Selecciona un punto de venta</p></div>';
        return;
    }

    document.getElementById('pdv-nombre').textContent = pdvSeleccionado;

    let html = '';
    for (let prod of DataStore.getProductos()) {
        const p = data.productos[prod];
        const semaforoCls = p.cumplimiento >= 100 ? 'green' : p.cumplimiento >= 80 ? 'yellow' : 'red';
        const proyPDV = DataStore.diaActual > 0 ? (p.venta / DataStore.getDiaActual()) * 31 : 0;
        const proyCumple = proyPDV >= p.cuota;

        html += `
        <div class="card mb-4">
            <div class="flex justify-between items-center mb-4">
                <h3 style="font-size:15px;font-weight:600;color:var(--text-primary);">${prod}</h3>
                <span class="badge badge-${semaforoCls}">${formatPercent(p.cumplimiento)}</span>
            </div>
            <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px;">
                <div class="card" style="padding:12px;">
                    <div style="font-size:11px;color:var(--text-subdued);">Cuota</div>
                    <div style="font-size:17px;font-weight:700;color:var(--text-primary);">${formatCurrency(p.cuota)}</div>
                </div>
                <div class="card" style="padding:12px;">
                    <div style="font-size:11px;color:var(--text-subdued);">Venta Acumulada</div>
                    <div style="font-size:17px;font-weight:700;color:var(--text-primary);">${formatCurrency(p.venta)}</div>
                </div>
                <div class="card" style="padding:12px;">
                    <div style="font-size:11px;color:var(--text-subdued);">Diferencia</div>
                    <div style="font-size:17px;font-weight:700;color:${p.venta >= p.cuota ? 'var(--accent)' : 'var(--danger)'}">
                        ${p.venta >= p.cuota ? '\u2713 ' : ''}${formatCurrency(Math.abs(p.cuota - p.venta))}
                    </div>
                </div>
                <div class="card" style="padding:12px;">
                    <div style="font-size:11px;color:var(--text-subdued);">Proyecci\u00f3n</div>
                    <div style="font-size:17px;font-weight:700;color:var(--text-primary);">${formatCurrency(proyPDV)}</div>
                </div>
            </div>

            <div style="margin-bottom:8px;">
                <div class="flex justify-between mb-2" style="font-size:12px;color:var(--text-subdued);">
                    <span>Avance: <strong style="color:var(--text-primary);">${formatPercent(p.cumplimiento)}</strong></span>
                    <span style="color:${p.venta >= p.cuota ? 'var(--accent)' : 'var(--text-subdued)'}">${p.venta >= p.cuota ? 'Meta alcanzada \u2713' : 'Faltan: ' + formatCurrency(p.cuota - p.venta)}</span>
                </div>
                <div class="progress-bar-track" style="height:10px;">
                    <div class="progress-bar-fill ${semaforoCls}" style="width:${Math.min(p.cumplimiento, 100)}%;height:100%;">
                    </div>
                </div>
            </div>

            <div class="mt-4">
                <div class="flex justify-between mb-2" style="font-size:12px;color:var(--text-subdued);">
                    <span>Proyecci\u00f3n fin de mes</span>
                    <span class="font-bold" style="color:${proyCumple ? 'var(--accent)' : 'var(--danger)'}">
                        ${proyCumple ? '\u2713 Se proyecta cumplir la meta' : '\u2717 No se proyecta cumplir la meta'}
                    </span>
                </div>
                <div class="flex gap-4" style="margin-top:10px;">
                    <div class="flex items-center gap-2" style="font-size:11px;color:var(--text-subdued);">
                        <span style="width:10px;height:10px;border-radius:50%;background:var(--accent);display:inline-block;"></span> \u2265 100%
                    </div>
                    <div class="flex items-center gap-2" style="font-size:11px;color:var(--text-subdued);">
                        <span style="width:10px;height:10px;border-radius:50%;background:var(--warning);display:inline-block;"></span> 80-99%
                    </div>
                    <div class="flex items-center gap-2" style="font-size:11px;color:var(--text-subdued);">
                        <span style="width:10px;height:10px;border-radius:50%;background:var(--danger);display:inline-block;"></span> &lt; 80%
                    </div>
                </div>
            </div>
        </div>`;
    }

    document.getElementById('pdv-content').innerHTML = html;
}

function renderizarRanking() {
    const ranking = DataStore.getRanking();
    const tabla = document.getElementById('tabla-ranking');
    if (!tabla) return;

    const medals = { 1: '\ud83e\udd47', 2: '\ud83e\udd48', 3: '\ud83e\udd49' };

    let html = '<thead><tr><th>Puesto</th><th>Punto de Venta</th><th>Puntaje</th><th>Cumplimiento</th><th>Venta Total</th><th>Proyecci\u00f3n</th></tr></thead><tbody>';

    for (let r of ranking) {
        const medal = medals[r.puesto] || '';
        const cls = r.cumplimiento >= 100 ? 'badge-green' : r.cumplimiento >= 80 ? 'badge-yellow' : 'badge-red';
        html += `<tr>
            <td class="text-center">${medal ? `<span class="ranking-medal">${medal}</span>` : `<span class="ranking-number">#${r.puesto}</span>`}</td>
            <td><strong>${r.punto_venta}</strong></td>
            <td class="font-bold" style="color:var(--text-primary);">${r.puntaje.toFixed(1)}</td>
            <td><span class="badge ${cls}">${formatPercent(r.cumplimiento)}</span></td>
            <td>${formatCurrency(r.venta_total)}</td>
            <td>${formatCurrency(r.proyeccion)}</td>
        </tr>`;
    }

    html += '</tbody>';
    tabla.innerHTML = html;

    createRankingChart();
}

function poblarFiltros() {
    const pdvs = DataStore.getPDVs();
    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        pdvSelect.innerHTML = '<option value="">Seleccionar punto de venta...</option>' +
            pdvs.map(p => `<option value="${p}">${p}</option>`).join('');
    }
}

const reporteSort = { sortBy: 'pdv', sortDir: 'asc' };

function recargarDashboard() {
    poblarFiltros();
    const fechaInfo = document.getElementById('dia-actual');
    if (fechaInfo) fechaInfo.textContent = DataStore.getDiaActual() + ' / 31';
    renderizarResumenEjecutivo();
    renderizarAvancePDV();
    renderizarRanking();
}

function cambiarPagina(pagina) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const pageEl = document.getElementById('page-' + pagina);
    if (pageEl) pageEl.classList.add('active');

    const navItem = document.querySelector(`.nav-item[data-page="${pagina}"]`);
    if (navItem) navItem.classList.add('active');

    document.getElementById('page-title').textContent =
        pagina === 'resumen' ? 'Resumen Ejecutivo' :
            pagina === 'avance' ? 'Avance por Punto de Venta' :
                pagina === 'ranking' ? 'Ranking de Tiendas' : 'Dashboard';

    if (pagina === 'resumen') {
        renderizarResumenEjecutivo();
    } else if (pagina === 'avance') {
        renderizarAvancePDV();
    } else if (pagina === 'ranking') {
        renderizarRanking();
    }

    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
    }
}

function mostrarNotificacion(mensaje, tipo) {
    const container = document.getElementById('notificacion-container') || (() => {
        const c = document.createElement('div');
        c.id = 'notificacion-container';
        c.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(c);
        return c;
    })();

    const el = document.createElement('div');
    const bgColor = tipo === 'success' ? 'var(--success-bg)' : tipo === 'error' ? 'var(--danger-bg)' : 'var(--bg-hover)';
    const textColor = tipo === 'success' ? 'var(--accent)' : tipo === 'error' ? 'var(--danger)' : 'var(--text-primary)';
    const borderColor = tipo === 'success' ? 'var(--accent)' : tipo === 'error' ? 'var(--danger)' : 'var(--border)';

    el.style.cssText = `
        padding:14px 20px;border-radius:8px;font-size:13px;font-weight:500;
        background:${bgColor};color:${textColor};border:1px solid ${borderColor};
        box-shadow:0 8px 24px rgba(0,0,0,0.3);
        animation: slideIn 0.3s ease;
    `;
    el.textContent = mensaje;
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 4000);
}

function abrirModalCuotas() {
    const password = prompt('Ingrese la contrase\u00f1a para editar cuotas:');
    if (password !== 'Adecco2019@') {
        if (password !== null) {
            mostrarNotificacion('Contrase\u00f1a incorrecta', 'error');
        }
        return;
    }

    const mesesSel = document.getElementById('cuotas-mes');
    const mesActual = parseInt(mesesSel.value);
    const anioActual = parseInt(document.getElementById('cuotas-anio').value);

    const tbody = document.getElementById('tbody-cuotas');
    const thead = document.querySelector('#tabla-cuotas thead tr');

    const pdvs = DataStore.getPDVs();
    const productos = DataStore.getProductos();
    const cuotas = DataStore.getCuotas(mesActual, anioActual);

    let headHtml = '<th class="cuotas-th-pdv">Punto de Venta</th>';
    for (let prod of productos) {
        headHtml += `<th class="cuotas-th-prod">${prod}</th>`;
    }
    thead.innerHTML = headHtml;

    tbody.innerHTML = '';
    for (let pdv of pdvs) {
        let tr = document.createElement('tr');
        let rowHtml = `<td>${pdv}</td>`;
        for (let prod of productos) {
            const cuota = cuotas.find(c => c.punto_venta === pdv && c.producto === prod);
            const val = cuota ? cuota.cuota : 0;
            rowHtml += `<td><input class="cuotas-input" type="number" min="0" step="1" value="${val}" data-pdv="${pdv}" data-prod="${prod}"></td>`;
        }
        tr.innerHTML = rowHtml;
        tbody.appendChild(tr);
    }

    document.getElementById('modal-cuotas').classList.add('open');
}

function cambiarMesCuotas() {
    if (document.getElementById('modal-cuotas').classList.contains('open')) {
        abrirModalCuotas();
    }
}

function cerrarModalCuotas() {
    document.getElementById('modal-cuotas').classList.remove('open');
}

function guardarCuotas() {
    const inputs = document.querySelectorAll('.cuotas-input');
    const mes = parseInt(document.getElementById('cuotas-mes').value);
    const anio = parseInt(document.getElementById('cuotas-anio').value);
    const nuevasCuotas = [];

    inputs.forEach(inp => {
        const val = parseFloat(inp.value);
        if (!isNaN(val) && val >= 0) {
            nuevasCuotas.push({
                punto_venta: inp.dataset.pdv,
                producto: inp.dataset.prod,
                cuota: val,
                mes,
                anio
            });
        }
    });

    if (nuevasCuotas.length === 0) {
        mostrarNotificacion('No hay cuotas para guardar', 'error');
        return;
    }

    DataStore.actualizarCuotas(nuevasCuotas, mes, anio);
    cerrarModalCuotas();
    recargarDashboard();
    const nombreMes = MESES.find(m => m.valor === mes)?.nombre || mes;
    mostrarNotificacion(`Cuotas de ${nombreMes} ${anio} actualizadas (${nuevasCuotas.length} registros)`, 'success');
}

let ventasModificadas = false;
let ventasFullscreen = false;

function abrirModalVenta() {
    const pdvSel = document.getElementById('modal-pdv');
    pdvSel.innerHTML = DataStore.getPDVs().map(p => `<option value="${p}">${p}</option>`).join('');
    document.getElementById('modal-venta').classList.add('open');
    ventasModificadas = false;
    document.getElementById('ventas-unsaved-bar').classList.remove('visible');
    cargarVentasCalendario();
}

function cerrarModalVenta() {
    document.getElementById('modal-venta').classList.remove('open');
    document.getElementById('modal-venta').classList.remove('ventas-fullscreen');
    ventasFullscreen = false;
}

function toggleVentasFullscreen() {
    ventasFullscreen = !ventasFullscreen;
    document.getElementById('modal-venta').classList.toggle('ventas-fullscreen', ventasFullscreen);
    const btn = document.getElementById('ventas-expand-btn');
    if (ventasFullscreen) {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 4 20 10 20"></polyline><polyline points="20 10 20 4 14 4"></polyline><line x1="14" y1="10" x2="20" y2="4"></line><line x1="4" y1="20" x2="10" y2="14"></line></svg>`;
    } else {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
    }
}

function cargarVentasCalendario() {
    const pdv = document.getElementById('modal-pdv').value;
    const mes = parseInt(document.getElementById('venta-mes').value);
    const anio = parseInt(document.getElementById('venta-anio').value);
    const tbody = document.getElementById('tbody-calendario');
    const thead = document.querySelector('#tabla-calendario thead tr');
    const productos = DataStore.getProductos();
    const diaActual = DataStore.getDiaActual();
    const diasMes = new Date(anio, mes, 0).getDate();

    thead.innerHTML = '<th class="calendario-th-producto">Producto</th>';
    for (let d = 1; d <= diasMes; d++) {
        const cls = d <= diaActual ? '' : 'style="opacity:0.4;"';
        thead.innerHTML += `<th class="calendario-th-dia ${d === diaActual ? 'calendario-th-hoy' : ''}" ${cls}>${d}</th>`;
    }
    thead.innerHTML += '<th class="calendario-th-dia">Total</th>';

    const ventas = DataStore.getVentasDelMes(mes, anio).filter(v =>
        v.punto_venta === pdv && v.dia <= diaActual
    );

    tbody.innerHTML = '';
    let totalDiasConDatos = 0;
    for (let prod of productos) {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${prod}</td>`;

        let suma = 0;
        const celdas = [];
        for (let d = 1; d <= diasMes; d++) {
            const venta = d <= diaActual ? ventas.find(v => v.producto === prod && v.dia === d) : null;
            const val = venta !== null && venta !== undefined ? venta.venta : '';
            suma += venta ? venta.venta : 0;
            const cls = d <= diaActual ? '' : 'style="opacity:0.4;"';
            const disabled = d > diaActual ? 'readonly' : '';
            const valCls = val === '' || val === 0 ? 'calendario-input-zero' : 'calendario-input-filled';
            celdas.push({ d, val, cls, disabled, valCls });
        }

        for (let c of celdas) {
            let tooltip = '';
            if (c.val !== '' && c.d > 1) {
                const cAnterior = ventas.find(v => v.producto === prod && v.dia === c.d - 1);
                if (cAnterior && cAnterior.venta > 0) {
                    const variacion = ((c.val - cAnterior.venta) / cAnterior.venta * 100).toFixed(1);
                    tooltip = ` title="Variaci\u00f3n: ${variacion > 0 ? '+' : ''}${variacion}% vs d\u00eda ${c.d - 1}"`;
                }
            }
            tr.innerHTML += `<td ${c.cls}><input class="calendario-input ${c.valCls}" type="number" min="0" step="1" value="${c.val}" data-prod="${prod}" data-dia="${c.d}"${tooltip} ${c.disabled}></td>`;
        }
        tr.innerHTML += `<td class="calendario-total"><span class="total-prod">${suma.toLocaleString('es-CL')}</span></td>`;
        tbody.appendChild(tr);
    }

    const totalRegistros = ventas.length;
    const maxRegistros = productos.length * diaActual;
    document.getElementById('ventas-progress-text').textContent = `${totalRegistros} / ${maxRegistros}`;

    document.querySelectorAll('.calendario-input').forEach(inp => {
        inp.addEventListener('input', function(e) {
            ventasModificadas = true;
            document.getElementById('ventas-unsaved-bar').classList.add('visible');
            const val = parseFloat(this.value);
            if (val > 0) {
                this.classList.remove('calendario-input-zero');
                this.classList.add('calendario-input-filled');
            } else {
                this.classList.remove('calendario-input-filled');
                this.classList.add('calendario-input-zero');
            }
            actualizarTotalesCalendario();
        });
    });
}

function actualizarTotalesCalendario() {
    const filas = document.querySelectorAll('#tbody-calendario tr');
    filas.forEach(tr => {
        const inputs = tr.querySelectorAll('.calendario-input');
        let suma = 0;
        inputs.forEach(inp => {
            const v = parseFloat(inp.value);
            if (!isNaN(v)) suma += v;
        });
        const totalSpan = tr.querySelector('.total-prod');
        if (totalSpan) totalSpan.textContent = suma.toLocaleString('es-CL');
    });
}

function guardarVentasCalendario() {
    const btn = document.getElementById('btn-guardar-ventas');
    btn.classList.add('loading');

    setTimeout(() => {
        const pdv = document.getElementById('modal-pdv').value;
        const mes = parseInt(document.getElementById('venta-mes').value);
        const anio = parseInt(document.getElementById('venta-anio').value);
        const inputs = document.querySelectorAll('.calendario-input');
        const datos = [];

        inputs.forEach(inp => {
            const val = parseFloat(inp.value);
            if (!isNaN(val) && val >= 0) {
                datos.push({
                    pdv,
                    producto: inp.dataset.prod,
                    dia: parseInt(inp.dataset.dia),
                    monto: val,
                    mes,
                    anio
                });
            }
        });

        if (datos.length === 0) {
            mostrarNotificacion('No hay ventas para guardar', 'error');
            btn.classList.remove('loading');
            return;
        }

        const registrosEliminados = DataStore.actualizarVentasCalendario(pdv, datos);
        guardarVentasFirebase(datos);

        inputs.forEach(inp => {
            inp.classList.add('venta-guardada-anim');
            setTimeout(() => inp.classList.remove('venta-guardada-anim'), 500);
        });

        btn.classList.remove('loading');
        ventasModificadas = false;
        document.getElementById('ventas-unsaved-bar').classList.remove('visible');
        cerrarModalVenta();
        recargarDashboard();

        const msg = `Ventas guardadas para ${pdv} (${datos.length} registros)`;
        mostrarNotificacion(registrosEliminados > 0 ? msg + `, ${registrosEliminados} eliminados` : msg, 'success');
    }, 400);
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            this.style.setProperty('--ripple-x', x + '%');
            this.style.setProperty('--ripple-y', y + '%');
            cambiarPagina(this.dataset.page);
        });
    });

    document.getElementById('mobile-toggle').addEventListener('click', function () {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebar-backdrop').addEventListener('click', function () {
        document.getElementById('sidebar').classList.remove('open');
    });

    const pdvSelect = document.getElementById('pdv-select');
    if (pdvSelect) {
        pdvSelect.addEventListener('change', function () {
            renderizarAvancePDV(this.value);
        });
    }

    recargarDashboard();
    cambiarPagina('resumen');

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    `;
    document.head.appendChild(style);
});
