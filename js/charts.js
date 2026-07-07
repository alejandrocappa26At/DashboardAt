let chartInstances = {};

function formatCurrency(value) {
    return '$' + value.toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
        v >= targetPerDay ? '#1DB954' : v >= targetPerDay * 0.8 ? '#f59e0b' : '#e74c3c'
    );

    chartInstances[id] = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Venta del d\u00eda',
                data: dailyTotals,
                backgroundColor: barColors,
                borderRadius: 3,
                borderSkipped: false,
                barPercentage: 0.6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#282828',
                    titleColor: '#ffffff',
                    bodyColor: '#b3b3b3',
                    borderColor: '#333333',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        label: ctx => 'Venta: ' + formatCurrency(ctx.raw) + ' | Meta diaria: ' + formatCurrency(targetPerDay)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#2a2a2a', drawBorder: false },
                    ticks: {
                        color: '#727272',
                        font: { size: 10 },
                        callback: v => formatCurrency(v)
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#727272',
                        font: { size: 9 },
                        maxTicksLimit: 15
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
    const colors = ['#1DB954', '#1aa34a', '#16963d', '#E13300', '#FF4632', '#FF7A59'];

    chartInstances[id] = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#1a1a1a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 14,
                        font: { size: 11 },
                        color: '#b3b3b3'
                    }
                },
                tooltip: {
                    backgroundColor: '#282828',
                    titleColor: '#ffffff',
                    bodyColor: '#b3b3b3',
                    borderColor: '#333333',
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 6,
                    callbacks: {
                        label: ctx => {
                            const prodVenta = DataStore.getVentaPorProducto()[ctx.label] || 0;
                            return ctx.label + ': ' + formatPercent(ctx.raw) + ' (' + formatCurrency(prodVenta) + ')';
                        }
                    }
                }
            }
        }
    });
}

function renderAvanceProductoBarras() {
    const container = document.getElementById('progress-list');
    if (!container) return;

    const avance = DataStore.getAvancePorProducto();
    const labels = Object.keys(avance);

    let html = '';
    for (let prod of labels) {
        const p = avance[prod];
        const pct = Math.min(p.cumplimiento, 100);
        const cls = p.cumplimiento >= 100 ? 'green' : p.cumplimiento >= 80 ? 'yellow' : 'red';
        const diff = p.cuota - p.venta;

        html += `
        <div class="progress-item">
            <div class="progress-item-header">
                <span class="progress-item-name">${prod}</span>
                <span class="progress-item-pct ${cls}">${formatPercent(p.cumplimiento)}</span>
            </div>
            <div class="progress-bar-track">
                <div class="progress-bar-fill ${cls}" style="width:${pct}%;"></div>
            </div>
            <div class="progress-item-stats">
                <span>Vendido: ${formatCurrency(p.venta)}</span>
                <span>Meta: ${formatCurrency(p.cuota)}</span>
                <span style="color:${p.venta >= p.cuota ? 'var(--accent)' : 'var(--text-subdued)'}">
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
