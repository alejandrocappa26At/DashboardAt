let chartInstances = {};

function formatCurrency(value) {
    return 'S/ ' + value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatPercent(value) {
    return value.toFixed(1) + '%';
}

function destroyChart(id) {
    if (chartInstances[id]) {
        chartInstances[id].destroy();
        delete chartInstances[id];
    }
}

function createEvolucionDiaria() {
    const id = 'chartEvolucion';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const ventaDiaria = DataStore.getEvolucionDiaria();
    const diaActual = DataStore.getDiaActual();
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
    const targetPerDay = diaActual > 0 ? cuotaTotal / 31 : 0;

    const barColors = dailyTotals.map(v =>
        v >= targetPerDay ? '#1DB954' : v >= targetPerDay * 0.8 ? '#f59e0b' : '#ef4444'
    );

    const barBorderColors = dailyTotals.map(v =>
        v >= targetPerDay ? '#1ed760' : v >= targetPerDay * 0.8 ? '#fbbf24' : '#f87171'
    );

    chartInstances[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Venta del d\u00eda',
                data: dailyTotals,
                backgroundColor: barColors,
                borderColor: barBorderColors,
                borderWidth: 1,
                borderRadius: 4,
                borderSkipped: false,
                barPercentage: 0.55,
                hoverBackgroundColor: dailyTotals.map(v =>
                    v >= targetPerDay ? '#1ed760' : v >= targetPerDay * 0.8 ? '#fbbf24' : '#f87171'
                )
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 800,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#181818',
                    titleColor: '#ffffff',
                    bodyColor: '#b3b3b3',
                    borderColor: '#282828',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 8,
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
                    grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false, borderDash: [3, 3] },
                    ticks: {
                        color: '#727272',
                        font: { size: 10, family: 'Inter' },
                        callback: v => formatCurrency(v)
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#727272',
                        font: { size: 10, family: 'Inter' },
                        maxTicksLimit: 15,
                        maxRotation: 0
                    }
                }
            }
        }
    });
}

function createParticipacionProducto() {
    const id = 'chartParticipacion';
    destroyChart(id);
    const canvas = document.getElementById(id);
    if (!canvas) return;

    const participacion = DataStore.getParticipacionProducto();
    const labels = Object.keys(participacion);
    const data = Object.values(participacion);
    const colors = ['#1DB954', '#22c55e', '#06b6d4', '#f59e0b', '#ef4444', '#a855f7'];

    chartInstances[id] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#121212',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '72%',
            animation: {
                animateRotate: true,
                duration: 1000,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 14,
                        font: { size: 11, family: 'Inter' },
                        color: '#b3b3b3',
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#181818',
                    titleColor: '#ffffff',
                    bodyColor: '#b3b3b3',
                    borderColor: '#282828',
                    borderWidth: 1,
                    padding: 14,
                    cornerRadius: 8,
                    displayColors: true,
                    boxPadding: 4,
                    callbacks: {
                        label: ctx => {
                            const prodVenta = DataStore.getVentaPorProducto()[ctx.label] || 0;
                            return ' ' + ctx.label + ': ' + formatPercent(ctx.raw) + ' (' + formatCurrency(prodVenta) + ')';
                        }
                    }
                }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: function(chart) {
                const { width, height, ctx } = chart;
                ctx.save();
                const centerX = width / 2;
                const centerY = height / 2 - 10;
                const total = chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.font = '700 22px Inter, sans-serif';
                ctx.fillStyle = '#ffffff';
                ctx.fillText(total.toFixed(1) + '%', centerX, centerY);
                ctx.font = '400 10px Inter, sans-serif';
                ctx.fillStyle = '#727272';
                ctx.fillText('Total', centerX, centerY + 18);
                ctx.restore();
            }
        }]
    });
}

function renderAvanceProductoBarras() {
    const container = document.getElementById('progress-list');
    if (!container) return;

    const avance = DataStore.getAvancePorProducto();
    const labels = Object.keys(avance);

    const iconMap = {
        'Apuestas Deportivas': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
        'Lottingo': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>',
        'Hípica': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3L3 17l4 4L21 7l-4-4z"/><path d="M8 8l4-4"/><path d="M16 16l-4 4"/></svg>',
        'Juegos Virtuales': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/></svg>',
        'Torito': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg>',
        'VLT': '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/></svg>'
    };

    let html = '';
    for (let prod of labels) {
        const p = avance[prod];
        const pct = Math.min(p.cumplimiento, 100);
        const cls = p.cumplimiento >= 80 ? 'green' : p.cumplimiento >= 50 ? 'yellow' : 'red';
        const diff = p.cuota - p.venta;

        html += `
        <div class="resumen-progress-item">
            <div class="resumen-progress-item-header">
                <div class="resumen-progress-item-left">
                    <div class="resumen-progress-item-icon ${cls}">${iconMap[prod] || ''}</div>
                    <span class="resumen-progress-item-name">${prod}</span>
                </div>
                <span class="resumen-progress-item-pct ${cls}">${formatPercent(p.cumplimiento)}</span>
            </div>
            <div class="resumen-progress-item-track">
                <div class="resumen-progress-item-fill ${cls}" style="width:${pct}%;"></div>
            </div>
            <div class="resumen-progress-item-stats">
                <span>Vendido: <strong>${formatCurrency(p.venta)}</strong></span>
                <span>Meta: <strong>${formatCurrency(p.cuota)}</strong></span>
                <span class="${p.venta >= p.cuota ? 'stat-green' : 'stat-red'}">
                    ${p.venta >= p.cuota ? '\u2713 Meta alcanzada' : 'Faltan: ' + formatCurrency(diff)}
                </span>
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

    const ranking = DataStore.getRanking().slice(0, 10);
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
                    backgroundColor: '#282828',
                    titleColor: '#ffffff',
                    bodyColor: '#b3b3b3',
                    borderColor: '#333333',
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
                    grid: { color: '#2a2a2a', drawBorder: false },
                    ticks: {
                        color: '#727272',
                        font: { size: 10 },
                        callback: v => v + '%'
                    }
                },
                y: {
                    grid: { display: false },
                    ticks: {
                        color: '#b3b3b3',
                        font: { size: 11 }
                    }
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
