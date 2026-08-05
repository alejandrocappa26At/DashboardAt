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
        if (!wrap || wrap.classList.contains('mob-built')) return;
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
                tienda: txt(2),
                venta: txt(3),
                meta: txt(4),
                cum: txt(5),
                cumCls: cumCls(tds[5]),
                dif: txt(6),
                mejor: txt(7),
                peor: txt(8),
                estado: tds[9] ? tds[9].innerHTML : ''
            });
        }
        if (!items.length) return;

        var details = items.map(function (it) {
            return '<details class="prm-acc">' +
                '<summary>' +
                '<span class="prm-name">' + it.name + '</span>' +
                '<span class="prm-cump ' + it.cumCls + '">' + mobEsc(it.cum) + '</span>' +
                '<span class="prm-venta">' + mobEsc(it.venta) + '</span>' +
                '</summary>' +
                '<div class="prm-detail"><div class="prm-grid">' +
                '<div><span>Meta</span><b>' + mobEsc(it.meta) + '</b></div>' +
                '<div><span>Tienda</span><b>' + mobEsc(it.tienda) + '</b></div>' +
                '<div><span>Diferencia</span><b>' + mobEsc(it.dif) + '</b></div>' +
                '<div><span>Mejor Producto</span><b>' + mobEsc(it.mejor) + '</b></div>' +
                '<div><span>Peor Producto</span><b>' + mobEsc(it.peor) + '</b></div>' +
                '<div><span>Estado</span><b>' + it.estado + '</b></div>' +
                '</div></div>' +
                '</details>';
        }).join('');

        var footer = wrap.querySelector('[style*="justify-content:space-between"]');
        var footerHtml = footer ? footer.outerHTML : '';

        wrap.classList.add('mob-built');
        wrap.setAttribute('data-mob-original', original);
        wrap.innerHTML = details + footerHtml;
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
    }

    function apply() {
        if (!mq.matches) { restoreAll(); return; }
        setupFilterTriggers();
        buildPdvMobile();
        buildPromotorAccordion();
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
