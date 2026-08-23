let chartInstances = {};

function formatCurrency(value) {
    return 'S/ ' + value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatCurrencyCompact(value) {
    const abs = Math.abs(value);
    if (abs >= 1000000) {
        return 'S/ ' + (value / 1000000).toFixed(1).replace('.0', '') + 'M';
    }
    if (abs >= 1000) {
        return 'S/ ' + (value / 1000).toFixed(1).replace('.0', '') + 'K';
    }
    return 'S/ ' + value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPercent(value) {
    return value.toFixed(1) + '%';
}

function formatPctIndicator(pct) {
    if (pct >= 100) return '<span class="pct-indicator pct-green">🟢 ' + pct.toFixed(0) + '%</span>';
    if (pct >= 70) return '<span class="pct-indicator pct-yellow">🟡 ' + pct.toFixed(0) + '%</span>';
    return '<span class="pct-indicator pct-red">🔴 ' + pct.toFixed(0) + '%</span>';
}

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function temaCss(varName) {
    const valor = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return valor ? valor.trim() : '';
}

function repintarTodosLosGraficos() {
    function actualizarRegistro(lista) {
        if (!lista) return;
        Object.keys(lista).forEach(function (k) {
            const ch = lista[k];
            if (ch && typeof ch.update === 'function') ch.update();
        });
    }
    actualizarRegistro(chartInstances);
    if (typeof infPromChartInstances !== 'undefined') actualizarRegistro(infPromChartInstances);
    if (typeof infIndChartInstances !== 'undefined') actualizarRegistro(infIndChartInstances);
}

function createEvolucionDiaria() {
    const id = 'chartEvolucion';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ventaDiaria = DataStore.getEvolucionDiaria();
    const periodo = DataStore.getInfoPeriodo();
    const diaActual = periodo.elapsed;
    const totalDias = periodo.total;
    const labels = [];
    for (let d = 1; d <= diaActual; d++) {
        labels.push('D\u00eda ' + d);
    }

    const dailyTotals = [];
    for (let d = 1; d <= diaActual; d++) {
        let total = 0;
        for (let prod of DataStore.getProductos()) {
            total += (ventaDiaria[prod] || [])[d - 1] || 0;
        }
        dailyTotals.push(total);
    }

    const cuotaTotal = DataStore.getCuotaTotal();
    const targetPerDay = totalDias > 0 ? cuotaTotal / totalDias : 0;

    const axisH = (canvas.parentElement && canvas.parentElement.clientHeight) || 280;
    const gradient = canvas.getContext('2d').createLinearGradient(0, 0, 0, axisH);
    gradient.addColorStop(0, 'rgba(29, 185, 84, 0.45)');
    gradient.addColorStop(0.6, 'rgba(29, 185, 84, 0.12)');
    gradient.addColorStop(1, 'rgba(29, 185, 84, 0)');

    chartInstances[id] = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Venta del d\u00eda',
                data: dailyTotals,
                borderColor: '#1DB954',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                backgroundColor: gradient,
                pointRadius: 3.5,
                pointHoverRadius: 7,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#1DB954',
                pointBorderWidth: 2.5,
                pointHoverBackgroundColor: '#1ed760',
                pointHoverBorderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: () => temaCss('--chart-tooltip'),
                    titleColor: () => temaCss('--t-text'),
                    bodyColor: () => temaCss('--chart-tick2'),
                    borderColor: 'rgba(29, 185, 84, 0.35)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        title: items => items[0].label,
                        label: ctx => {
                            const idx = ctx.dataIndex;
                            const prev = idx > 0 ? dailyTotals[idx - 1] : null;
                            let variacion = '';
                            if (prev && prev > 0) {
                                const diff = ((ctx.raw - prev) / prev * 100).toFixed(1);
                                variacion = ` (${diff > 0 ? '+' : ''}${diff}%)`;
                            }
                            return 'Venta: ' + formatCurrency(ctx.raw) + variacion;
                        },
                        afterLabel: () => 'Meta diaria: ' + formatCurrency(targetPerDay)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: () => temaCss('--chart-grid'), drawBorder: false, borderDash: [3, 3] },
                    ticks: {
                        color: () => temaCss('--chart-tick'),
                        font: { size: 10, family: 'Inter' },
                        callback: v => {
                            if (Math.abs(v) >= 1000) return 'S/ ' + (v / 1000) + 'k';
                            return 'S/ ' + v;
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: () => temaCss('--chart-tick'),
                        font: { size: 10, family: 'Inter' },
                        maxTicksLimit: 15,
                        maxRotation: 0
                    }
                }
            }
        }
    });

    canvas._chartInstance = chartInstances[id];
}

function createParticipacionProducto() {
    const id = 'chartParticipacion';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ventas = DataStore.getVentaPorProducto();
    const ventaTotal = DataStore.getVentaTotal();
    const rows = Object.keys(ventas)
        .map(prod => ({
            label: prod,
            venta: ventas[prod] || 0,
            pct: ventaTotal > 0 ? (ventas[prod] / ventaTotal) * 100 : 0
        }))
        .sort((a, b) => b.venta - a.venta);

    const labels = rows.map(r => r.label);
    const data = rows.map(r => r.venta);

    const gradientFn = (ctx) => {
        const { ctx: c, chartArea } = ctx.chart;
        if (!chartArea) return '#1DB954';
        const g = c.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
        g.addColorStop(0, '#1DB954');
        g.addColorStop(1, '#00E676');
        return g;
    };

    chartInstances[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: gradientFn,
                hoverBackgroundColor: gradientFn,
                borderWidth: 0,
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 26,
                categoryPercentage: 0.72,
                barPercentage: 0.82
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            animation: {
                duration: 900,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: () => temaCss('--chart-tooltip'),
                    titleColor: () => temaCss('--t-text'),
                    bodyColor: () => temaCss('--chart-tick2'),
                    borderColor: 'rgba(29, 185, 84, 0.35)',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 10,
                    displayColors: false,
                    callbacks: {
                        title: items => items[0].label,
                        label: ctx => {
                            const idx = ctx.dataIndex;
                            const row = rows[idx] || {};
                            return ' ' + row.label + ': ' + formatCurrency(row.venta) + '  \u00b7  ' + formatPercent(row.pct) + ' del total';
                        }
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: () => temaCss('--chart-grid'), drawBorder: false, borderDash: [3, 3] },
                    ticks: {
                        color: () => temaCss('--chart-tick'),
                        font: { size: 10, family: 'Inter' },
                        callback: v => {
                            if (Math.abs(v) >= 1000) return (v / 1000) + 'k';
                            return v;
                        }
                    }
                },
                y: {
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        color: () => temaCss('--chart-tick2'),
                        font: { size: 11.5, family: 'Inter', weight: '500' },
                        autoSkip: false
                    }
                }
            }
        }
    });

    canvas._chartInstance = chartInstances[id];
}

function renderAvanceProductoBarras() {
    const container = document.getElementById('progress-list');
    if (!container) return;

    const avance = DataStore.getAvancePorProducto();
    const labels = Object.keys(avance);

    const iconMap = {
        'Apuestas Deportivas': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        'Lottingo': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
        'Hípica': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3L3 17l4 4L21 7l-4-4z"/><path d="M8 8l4-4"/><path d="M16 16l-4 4"/></svg>',
        'Juegos Virtuales': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>',
        'Torito': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>',
        'VLT': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>',
        'LOTOBOLA': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        'MI BILLETERA': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>'
    };

    let html = '';
    for (let prod of labels) {
        const p = avance[prod];
        const pct = Math.min(p.cumplimiento, 100);
        const cls = p.cumplimiento >= 80 ? 'green' : p.cumplimiento >= 50 ? 'yellow' : 'red';
        const diff = p.cuota - p.venta;
        const cumplido = p.venta >= p.cuota;

        html += `
        <div class="prod-luxury-card">
            <div class="prod-luxury-head">
                <div class="prod-luxury-title">
                    <div class="prod-luxury-icon ${cls}">${iconMap[prod] || ''}</div>
                    <div class="prod-luxury-name">${prod}</div>
                </div>
                <span class="prod-luxury-badge ${cls}">
                    ${cumplido ? '\u2713 Meta' : formatPercent(p.cumplimiento)}
                </span>
            </div>
            <div class="prod-luxury-bar">
                <div class="prod-luxury-glow ${cls}"></div>
                <div class="prod-luxury-fill ${cls}" style="width:${pct}%;"></div>
            </div>
            <div class="prod-luxury-metrics">
                <div class="prod-luxury-metric">
                    <span>Vendido</span>
                    <strong>${formatCurrency(p.venta)}</strong>
                </div>
                <div class="prod-luxury-metric">
                    <span>Cuota</span>
                    <strong>${formatCurrency(p.cuota)}</strong>
                </div>
                <div class="prod-luxury-metric ${cumplido ? 'ok' : 'warn'}">
                    <span>${cumplido ? 'Cumplida' : 'Faltante'}</span>
                    <strong>${cumplido ? '\u2713' : formatCurrency(diff)}</strong>
                </div>
            </div>
        </div>`;
    }

    container.innerHTML = html;
}

function createRankingChart() {
    const id = 'chartRanking';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ranking = (typeof _getRankingRestringido === 'function' ? _getRankingRestringido() : DataStore.getRanking()).slice(0, 10);
    const labels = ranking.map(r => r.punto_venta.replace('Red AT ', ''));
    const data = ranking.map(r => r.puntaje);
    const colors = data.map((v, i) =>
        i === 0 ? '#1DB954' : i === 1 ? '#1aa34a' : i === 2 ? '#16963d' : '#2a2a2a'
    );

    chartInstances[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: '% Cumplimiento',
                data,
                backgroundColor: colors,
                borderRadius: 3,
                borderSkipped: false,
                barPercentage: 0.5
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: () => temaCss('--chart-tooltip'),
                    titleColor: () => temaCss('--t-text'),
                    bodyColor: () => temaCss('--chart-tick2'),
                    borderColor: () => temaCss('--chart-tooltip-border'),
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        label: ctx => 'Cumplimiento: ' + formatPercent(ctx.raw)
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: () => temaCss('--t-bd'), drawBorder: false },
                    ticks: {
                        color: () => temaCss('--chart-tick'),
                        font: { size: 10 },
                        callback: v => v + '%'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: () => temaCss('--chart-tick2'),
                        font: { size: 11 }
                    }
                }
            }
        }
    });
}

function createPromosChart(ranking) {
    const id = 'chartPromos';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (!ranking || ranking.length === 0) return;

    const labels = ranking.map(r => String(r.tienda).replace(/^Red AT /i, '').replace(/^RED AT /i, '').trim());
    const data = ranking.map(r => r.cantidad);
    const colors = data.map((v, i) => i === 0 ? '#1DB954' : i === 1 ? '#3B82F6' : i === 2 ? '#F59E0B' : '#3B82F6');

    chartInstances[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Cantidad',
                data,
                backgroundColor: colors,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: () => temaCss('--chart-tooltip'),
                    titleColor: () => temaCss('--t-text'),
                    bodyColor: () => temaCss('--chart-tick2'),
                    borderColor: () => temaCss('--chart-tooltip-border'),
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        label: ctx => 'Cantidad: ' + ctx.raw
                    }
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: () => temaCss('--chart-grid'), drawBorder: false, borderDash: [3, 3] },
                    ticks: { color: () => temaCss('--chart-tick'), font: { size: 10 }, precision: 0 }
                },
                y: {
                    grid: { display: false },
                    ticks: { color: () => temaCss('--chart-tick2'), font: { size: 11 } }
                }
            }
        }
    });
}

function actualizarGraficos() {
    createEvolucionDiaria();
    createParticipacionProducto();
    renderAvanceProductoBarras();
    createRankingChart();
}
