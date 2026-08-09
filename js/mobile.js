/* =============================================
   OPTIMIZACIÓN MÓVIL — comportamiento
   SOLO se activa en pantallas <= 480px.
   Desktop / laptop / pantallas grandes: no ejecuta nada.
   ============================================= */
(function () {
    'use strict';

    if (typeof window === 'undefined' || !window.matchMedia) return;

    var mq = window.matchMedia('(max-width: 480px)');

    function mobEsc(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function cumCls(cell) {
        if (!cell) return '';
        var s = cell.querySelector('strong');
        if (!s || !s.className) return '';
        var c = String(s.className);
        if (c.indexOf('good') > -1) return 'c-good';
        if (c.indexOf('warn') > -1) return 'c-warn';
        if (c.indexOf('bad') > -1) return 'c-bad';
        return '';
    }

    /* ---------- 1. Barra de filtros compacta ---------- */
    function setupFilterTriggers() {
        var boxes = document.querySelectorAll('.date-filters, .rpdv-filters, .inf-promotor-filters');
        for (var i = 0; i < boxes.length; i++) {
            var box = boxes[i];
            if (box.querySelector('.mob-filter-trigger')) continue;
            var isDate = box.classList.contains('date-filters');
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mob-filter-trigger';
            btn.setAttribute('aria-expanded', 'false');
            btn.innerHTML = (isDate
                ? '<span class="mob-ft-left">\ud83d\udcc5 Per\u00edodo</span>'
                : '<span class="mob-ft-left">\ud83d\udd0d Filtros</span>') +
                '<span class="mob-ft-right">Abrir <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>';
            box.insertBefore(btn, box.firstChild);
            box.classList.add('mob-collapsible');
        }
    }

    /* ---------- 2. Avance PDV: tablas -> tarjetas con Ver Detalle ---------- */
    function buildPdvMobile() {
        var wrap = document.getElementById('pdv-content');
        if (!wrap || wrap.classList.contains('mob-built')) return;
        var table = wrap.querySelector('table.ctl-table');
        if (!table) return;
        var rows = table.querySelectorAll('tbody tr');
        if (!rows.length) return;

        var original = wrap.innerHTML;
        var groups = [];
        var current = null;

        for (var i = 0; i < rows.length; i++) {
            var tr = rows[i];
            var tds = tr.querySelectorAll('td');
            if (tr.classList.contains('ctl-group-row')) {
                var nameEl = tr.querySelector('.ctl-group-name');
                var name = nameEl ? nameEl.textContent.replace(/\s+/g, ' ').trim() : '';
                var badgeEl = tr.querySelector('.ctl-semaforo');
                current = {
                    name: name,
                    badge: badgeEl ? badgeEl.outerHTML : '',
                    prods: []
                };
                groups.push(current);
            } else {
                if (!current || tds.length < 5) continue;
                var txt = function (n) { return tds[n] ? tds[n].textContent.replace(/\s+/g, ' ').trim() : ''; };
                current.prods.push({
                    name: txt(0),
                    venta: txt(1),
                    meta: txt(2),
                    cum: txt(3),
                    cumCls: cumCls(tds[3]),
                    dif: txt(4),
                    proy: txt(5),
                    req: txt(6),
                    estado: txt(7)
                });
            }
        }
        if (!groups.length) return;

        var html = groups.map(function (g) {
            var prods = g.prods.map(function (p) {
                return '<div class="pdv-mob-prod">' +
                    '<span class="pdv-mob-pname">' + mobEsc(p.name) + '</span>' +
                    '<span class="pdv-mob-pmain">' + mobEsc(p.venta) + ' <span style="color:#3a3a3a">/</span> ' + mobEsc(p.meta) +
                    ' <b class="' + p.cumCls + '">' + mobEsc(p.cum) + '</b></span>' +
                    '</div>';
            }).join('');
            var detail = g.prods.map(function (p) {
                return '<div class="pdv-mob-drow">' +
                    '<span>' + mobEsc(p.name) + '</span>' +
                    '<span>Dif <b>' + mobEsc(p.dif) + '</b></span>' +
                    '<span>Proy <b>' + mobEsc(p.proy) + '</b></span>' +
                    '<span>Req <b>' + mobEsc(p.req) + '</b></span>' +
                    '<span>' + mobEsc(p.estado) + '</span>' +
                    '</div>';
            }).join('');
            return '<div class="ctl-card pdv-mob-card">' +
                '<div class="pdv-mob-head">' +
                '<span class="ctl-group-name">' + g.badge + ' ' + mobEsc(g.name) + '</span>' +
                '</div>' +
                '<div class="pdv-mob-prods">' + prods + '</div>' +
                '<button type="button" class="pdv-mob-toggle" data-pdv-detail>Ver Detalle <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>' +
                '<div class="pdv-mob-detail">' + detail + '</div>' +
                '</div>';
        }).join('');

        wrap.classList.add('mob-built');
        wrap.setAttribute('data-mob-original', original);
        wrap.innerHTML = '<div class="pdv-mob-list">' + html + '</div>';
    }

    /* ---------- 3. Promotores: tabla consolidada -> acordeón ---------- */
    function buildPromotorAccordion() {
        var wrap = document.getElementById('inf-promotor-content');
        if (!wrap) return;
        if (wrap.classList.contains('mob-built') && wrap.querySelector('details.prm-acc')) return;
        var table = wrap.querySelector('table.ctl-table');
        if (!table) return;
        var head = table.querySelector('thead');
        if (!head || head.textContent.indexOf('Promotor') === -1) return;

        var rows = table.querySelectorAll('tbody tr');
        if (!rows.length) return;
        var original = wrap.innerHTML;
        var items = [];

        for (var i = 0; i < rows.length; i++) {
            var tds = rows[i].querySelectorAll('td');
            if (tds.length < 6) continue;
            var txt = function (n) { return tds[n] ? tds[n].textContent.replace(/\s+/g, ' ').trim() : ''; };
            items.push({
                name: tds[1].innerHTML,
                nameText: txt(1),
                tienda: txt(2),
                venta: txt(3),
                meta: txt(4),
                cum: txt(5),
                cumCls: cumCls(tds[5]),
                dif: txt(6),
                estado: tds[9] ? tds[9].innerHTML : ''
            });
        }
        if (!items.length) return;

        var details = items.map(function (it) {
            return '<details class="prm-acc" data-pname="' + mobEsc(it.nameText) + '" data-tienda="' + mobEsc(it.tienda) + '">' +
                '<summary>' +
                '<span class="prm-name">' + it.name + '</span>' +
                '<span class="prm-cump ' + it.cumCls + '">' + mobEsc(it.cum) + '</span>' +
                '<span class="prm-venta">' + mobEsc(it.venta) + '</span>' +
                '</summary>' +
                '<div class="prm-detail"><div class="prm-detail-inner">' +
                '<div class="prm-loading">Cargando detalle...</div>' +
                '</div></div>' +
                '</details>';
        }).join('');

        var footer = wrap.querySelector('[style*="justify-content:space-between"]');
        var footerHtml = footer ? footer.outerHTML : '';

        wrap.classList.add('mob-built');
        wrap.setAttribute('data-mob-original', original);
        wrap.innerHTML = details + footerHtml;

        var accs = wrap.querySelectorAll('details.prm-acc');
        for (var a = 0; a < accs.length; a++) {
            accs[a].addEventListener('toggle', function (ev) {
                lazyLoadPromotorDetail(ev.target || this);
            });
        }
    }

    /* ---------- Lazy load del detalle de productos por promotor ---------- */
    function lazyLoadPromotorDetail(acc) {
        if (!acc || !acc.open) return;
        var inner = acc.querySelector('.prm-detail-inner');
        if (!inner || inner.getAttribute('data-loaded')) return;
        var name = acc.getAttribute('data-pname') || '';
        var tienda = acc.getAttribute('data-tienda') || '';
        var html = buildPromotorDetail(name, tienda);
        if (html) {
            inner.innerHTML = html;
            inner.setAttribute('data-loaded', '1');
        }
    }

    function fmtV(n) {
        return 'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    function fmtP(n) {
        return Number(n || 0).toFixed(1) + '%';
    }

    function sema(pct) {
        if (pct >= 100) return { cls: 'c-good', dot: '\ud83d\udfe2' };
        if (pct >= 70) return { cls: 'c-warn', dot: '\ud83d\udfe1' };
        return { cls: 'c-bad', dot: '\ud83d\udd34' };
    }

    function buildPromotorDetail(name, tienda) {
        var fechas = (typeof fechasEfectivasInforme === 'function') ? fechasEfectivasInforme() : { desde: null, hasta: null };
        var desde = fechas.desde;
        var hasta = fechas.hasta;
        var ventas = (typeof DataStore !== 'undefined' && DataStore.getVentasActivas) ? DataStore.getVentasActivas() : [];
        var productos = (typeof DataStore !== 'undefined' && DataStore.getProductos) ? DataStore.getProductos() : [];
        var cuotas = (typeof DataStore !== 'undefined' && DataStore.getCuotasActivas) ? DataStore.getCuotasActivas() : [];
        var promotores = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.promotores) ? HorariosDataStore.promotores : [];
        var zonas = (typeof HorariosDataStore !== 'undefined' && HorariosDataStore.zonas) ? HorariosDataStore.zonas : [];
        if (!ventas.length && !productos.length) return '';

        var prom = null;
        for (var i = 0; i < promotores.length; i++) {
            if (promotores[i].nombre === name) { prom = promotores[i]; break; }
        }
        var tiendaNombre = null;
        if (prom && prom.zona_principal_id) {
            for (var j = 0; j < zonas.length; j++) {
                if (zonas[j].id === prom.zona_principal_id) { tiendaNombre = zonas[j].nombre; break; }
            }
        }
        if (!tiendaNombre && tienda && tienda !== 'Sin tienda') tiendaNombre = tienda;

        var ventasProm = [];
        for (var k = 0; k < ventas.length; k++) {
            var v = ventas[k];
            if (!v) continue;
            if (desde && new Date(v.fecha) < new Date(desde + 'T00:00:00')) continue;
            if (hasta && new Date(v.fecha) > new Date(hasta + 'T23:59:59')) continue;
            if (v.promotor_id) {
                if (prom && v.promotor_id !== prom.id) continue;
            } else if (tiendaNombre && v.punto_venta !== tiendaNombre) continue;
            ventasProm.push(v);
        }

        var fechaRef = desde ? new Date(desde + 'T00:00:00') : new Date();
        var mes = fechaRef.getMonth() + 1;
        var anio = fechaRef.getFullYear();

        var ventaProd = {};
        for (var k2 = 0; k2 < ventasProm.length; k2++) {
            var pname = ventasProm[k2].producto;
            if (!ventaProd[pname]) ventaProd[pname] = 0;
            ventaProd[pname] += (ventasProm[k2].venta || 0);
        }

        var prodList = [];
        for (var p = 0; p < productos.length; p++) {
            var prod = productos[p];
            var vv = ventaProd[prod] || 0;
            var cuo = 0;
            for (var c = 0; c < cuotas.length; c++) {
                var q = cuotas[c];
                if (q.punto_venta === tiendaNombre && q.producto === prod && q.mes === mes && q.anio === anio) {
                    cuo = q.cuota || 0;
                    break;
                }
            }
            prodList.push({ name: prod, venta: vv, cuota: cuo, cumpl: cuo > 0 ? (vv / cuo) * 100 : 0, dif: vv - cuo });
        }

        var totalVenta = 0, totalCuota = 0;
        for (var t = 0; t < prodList.length; t++) {
            totalVenta += prodList[t].venta;
            totalCuota += prodList[t].cuota;
        }
        var totalCumpl = totalCuota > 0 ? (totalVenta / totalCuota) * 100 : 0;
        var totalDif = totalCuota - totalVenta;

        prodList.sort(function (a, b) { return b.venta - a.venta; });

        var sTot = sema(totalCumpl);
        var summary =
            '<div class="prm-summary">' +
            '<div class="prm-summary-item"><span class="prm-summary-label">\ud83d\udcb0 Venta Total</span><span class="prm-summary-value">' + fmtV(totalVenta) + '</span></div>' +
            '<div class="prm-summary-item"><span class="prm-summary-label">\ud83c\udfaf Meta Total</span><span class="prm-summary-value">' + fmtV(totalCuota) + '</span></div>' +
            '<div class="prm-summary-item"><span class="prm-summary-label">\ud83d\udcc9 Faltante Total</span><span class="prm-summary-value ' + (totalDif <= 0 ? 'c-good' : 'c-bad') + '">' + (totalDif <= 0 ? 'S/ 0' : fmtV(totalDif)) + '</span></div>' +
            '<div class="prm-summary-item"><span class="prm-summary-label">\ud83d\udcca Cumplimiento</span><span class="prm-summary-value ' + sTot.cls + '">' + sTot.dot + ' ' + fmtP(totalCumpl) + '</span></div>' +
            '</div>';

        var cards = prodList.map(function (r) {
            var s = sema(r.cumpl);
            return '<div class="prm-prod">' +
                '<div class="prm-prod-head"><span class="prm-prod-name">' + mobEsc(r.name) + '</span>' +
                '<span class="prm-prod-pct ' + s.cls + '">' + s.dot + ' ' + fmtP(r.cumpl) + '</span></div>' +
                '<div class="prm-prod-grid">' +
                '<div class="prm-prod-metric"><span class="prm-prod-label">\ud83c\udfaf Cuota</span><span class="prm-prod-value">' + fmtV(r.cuota) + '</span></div>' +
                '<div class="prm-prod-metric"><span class="prm-prod-label">\ud83d\udcb0 Venta</span><span class="prm-prod-value">' + fmtV(r.venta) + '</span></div>' +
                '<div class="prm-prod-metric"><span class="prm-prod-label">\ud83d\udcc9 Faltante</span><span class="prm-prod-value ' + (r.dif <= 0 ? 'c-good' : 'c-bad') + '">' + (r.dif <= 0 ? 'S/ 0' : fmtV(r.dif)) + '</span></div>' +
                '</div>' +
                '</div>';
        }).join('');

        return summary + '<div class="prm-prod-list">' + cards + '</div>';
    }

    /* ---------- 4. Vista Ejecutiva: 6 KPIs móviles (incluye META TOTAL) ---------- */
    function buildVeKpisMobile() {
        var wrap = document.getElementById('ve-kpis');
        if (!wrap) return;
        if (wrap.querySelector('.ctl-ve-mob')) return;
        if (!wrap.querySelector('.ctl-kpi')) return;
        if (typeof DataStore === 'undefined') return;

        var ventaTotal = (typeof DataStore.getVentaTotal === 'function') ? DataStore.getVentaTotal() : 0;
        var cuotaTotal = (typeof DataStore.getCuotaTotal === 'function') ? DataStore.getCuotaTotal() : 0;
        var avance = (typeof DataStore.getAvanceGeneral === 'function') ? DataStore.getAvanceGeneral() : 0;
        var ranking = (typeof DataStore.getRanking === 'function') ? DataStore.getRanking() : [];
        var totalPDVs = ranking.length;
        var pdvCumplen = 0;
        var pdvRiesgo = 0;
        for (var i = 0; i < ranking.length; i++) {
            var c = ranking[i].cumplimiento || 0;
            if (c >= 100) pdvCumplen++;
            if (c < 80) pdvRiesgo++;
        }
        var faltante = Math.max(0, cuotaTotal - ventaTotal);
        var avCls = avance >= 100 ? 'c-good' : avance >= 80 ? 'c-warn' : 'c-bad';

        var kpi = function (label, value, cls, sub) {
            return '<div class="ctl-kpi">' +
                '<span class="ctl-kpi-label">' + label + '</span>' +
                '<span class="ctl-kpi-value ' + cls + '">' + value + '</span>' +
                (sub ? '<span class="ctl-kpi-sub">' + sub + '</span>' : '') +
                '</div>';
        };

        var inner =
            kpi('\ud83d\udcb0 Venta Total', fmtV(ventaTotal), 'c-good', 'Venta acumulada del per\u00edodo') +
            kpi('\ud83c\udfaf Meta Total', fmtV(cuotaTotal), '', 'Cuota acumulada del per\u00edodo') +
            kpi('\ud83d\udcca Cumplimiento', fmtP(avance), avCls, '') +
            kpi('\u2705 PDVs Cumpliendo', pdvCumplen + ' / ' + totalPDVs, 'c-good', '') +
            kpi('\u26a0\ufe0f PDVs en Riesgo', pdvRiesgo, 'c-bad', '') +
            '<div class="ctl-kpi ctl-kpi-avance">' +
            '<span class="ctl-kpi-label">\ud83d\udcc8 Avance General</span>' +
            '<span class="ctl-kpi-value ' + avCls + '">' + fmtP(avance) + '</span>' +
            '<span class="ctl-kpi-lines">' +
            '<span class="ctl-kpi-line"><b>' + fmtV(ventaTotal) + '</b> Venta acum.</span>' +
            '<span class="ctl-kpi-line"><b>' + fmtV(cuotaTotal) + '</b> Meta acum.</span>' +
            '<span class="ctl-kpi-line"><b>' + fmtV(faltante) + '</b> Faltante total</span>' +
            '</span>' +
            '</div>';

        wrap.setAttribute('data-mob-original', wrap.innerHTML);
        wrap.innerHTML = '<div class="ctl-ve-mob">' + inner + '</div>';
    }

    /* ---------- Restauración al salir de móvil ---------- */
    function restoreAll() {
        var ids = ['pdv-content', 'inf-promotor-content'];
        for (var i = 0; i < ids.length; i++) {
            var el = document.getElementById(ids[i]);
            if (el && el.classList.contains('mob-built') && el.getAttribute('data-mob-original')) {
                el.innerHTML = el.getAttribute('data-mob-original');
                el.classList.remove('mob-built');
                el.removeAttribute('data-mob-original');
            }
        }
        var ve = document.getElementById('ve-kpis');
        if (ve && ve.querySelector('.ctl-ve-mob') && ve.getAttribute('data-mob-original')) {
            ve.innerHTML = ve.getAttribute('data-mob-original');
            ve.removeAttribute('data-mob-original');
        }
    }

    function apply() {
        if (!mq.matches) { restoreAll(); return; }
        setupFilterTriggers();
        buildPdvMobile();
        buildPromotorAccordion();
        buildVeKpisMobile();
    }

    /* Delegación de eventos (sobrevive a re-renders) */
    document.addEventListener('click', function (e) {
        var trigger = e.target && e.target.closest ? e.target.closest('.mob-filter-trigger') : null;
        if (trigger) {
            var box = trigger.closest('.mob-collapsible') || trigger.parentElement;
            if (box) {
                var open = box.classList.toggle('open');
                trigger.setAttribute('aria-expanded', String(open));
            }
            return;
        }
        var pdvBtn = e.target && e.target.closest ? e.target.closest('[data-pdv-detail]') : null;
        if (pdvBtn) {
            var card = pdvBtn.closest('.pdv-mob-card');
            if (card) card.classList.toggle('open');
        }
    });

    if (mq.addEventListener) mq.addEventListener('change', apply);

    var debTimer = null;
    if (window.MutationObserver) {
        new MutationObserver(function () {
            clearTimeout(debTimer);
            debTimer = setTimeout(apply, 150);
        }).observe(document.documentElement, { childList: true, subtree: true });
    }

    document.addEventListener('DOMContentLoaded', apply);
    apply();
})();
