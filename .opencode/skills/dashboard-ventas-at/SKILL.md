---
name: dashboard-ventas-at
description: Proyecto Dashboard Ventas AT. App web (Firestore, JS vanilla) para registro de ventas, cuotas, promociones y horarios de promotores con roles supervisor/promotor. Usa cuando se trabaje en js/, index.html o se corrijan bugs del dashboard (tienda asignada, "Sin tienda asignada", ventas que desaparecen, promociones, login de promotor).
---

# Dashboard Ventas AT

Dashboard de ventas de punto de venta (PDV). App 100% cliente: HTML + CSS + JS vanilla + Firebase (Firestore). Sin framework.

## Contexto crítico (leer SIEMPRE)

- **No crear datos nuevos ni modificar Firestore** al corregir bugs, salvo que el usuario lo pida explícitamente.
- **No generar registros de prueba** (ventas, cuotas, promociones, promotores) jamás.
- Las correcciones deben ser de código; usar datos reales existentes de Firestore.
- `zona_principal_id` de un promotor ES el nombre de la tienda (`zonas[].id === nombre`). Puede usarse como fallback directo para resolver la tienda.

## Orden de carga de scripts (index.html)

`firebase-config.js` → `firestore.js?v=2` → `data.js?v=2` → `charts.js?v=2` → `promociones.js?v=1` → `horarios-data.js?v=2` → `horarios.js?v=3` → `tiendas.js?v=1` → `ejecutivo.js?v=2` → `mobile.js?v=1` → `theme.js?v=1` → `app.js?v=6` → `respaldo.js?v=1`.

- `data.js` y `app.js` se ejecutan como IIFE `DataStore.init()` / `init()`. Los stores (DataStore, TiendasStore, HorariosDataStore, PromocionesStore) cargan async desde Firestore → hay **carreras de carga**.
- Para invalidar caché del navegador hay que subir el `?v=N` del script modificado en index.html.

## Arquitectura

### Stores (objetos JS globales)
- **DataStore** (`js/data.js`): ventas, cuotas, promotores, `diaActual`. Fuente: `dashboard/datos` (doc único). `onSnapshot` en vivo.
- **TiendasStore** (`js/tiendas.js`): catálogo de tiendas/PDV. Fuente: `dashboard/tiendas`. Constante `PDVS_FIJOS`.
- **HorariosDataStore** (`js/horarios-data.js`): `zonas`, `promotores`, `semanas`, horarios. Fuentes: `horarios/config`, `horarios/semanas`, colección `promotores`.
- **PromocionesStore** (`js/promociones.js`): `promociones` y `registros`. Fuentes: `promociones` y `registro_promociones`.

### Colecciones / docs Firestore
| Store | Ruta |
|---|---|
| DataStore | `dashboard/datos` (ventas, cuotas, promotores, diaActual) |
| TiendasStore | `dashboard/tiendas` |
| HorariosDataStore | `horarios/config`, `horarios/semanas`, colección `promotores` |
| PromocionesStore | `promociones`, `registro_promociones` |
| Historial de acceso | `historial_accesos` |
| Ventas (alternativo) | `ventas` |

### Roles / sesión (`js/app.js`)
- `promotorSession` (global): `{ id, nombre, dni, email, zona_principal_id }`.
- `aplicarSesionInicial()`: al recargar, reconstruye `promotorSession` fusionando registro de `HorariosDataStore.promotores` + sesión almacenada (`localStorage`/`sessionStorage` `promotor_session`) + sesión de auth. **Preservar siempre `zona_principal_id`, `dni`, `email`**.
- Paneles promotor (ya no son modales): `abrirPanelVentasConSesion()` y `abrirPanelPromocionesConSesion()` resuelven la tienda con fallback `(zona && zona.nombre) || promotorSession.zona_principal_id`. Los registros de ventas/promociones se abren dentro de la página `page-avance` como paneles expandibles (`#avance-panel-ventas`, `#avance-panel-promociones`), accesibles vía `navegarRegistrarVentas()` / `navegarRegistrarPromociones()` (sidebar) o los botones de la barra de acciones `.avance-acciones`.
- `logValidacionPromotor()`: helper que imprime `[VALIDACION]` (Promotor autenticado, Correo, Tienda encontrada, Promociones cargadas, Ventas cargadas) para validar el flujo del promotor en consola.

## Roles de archivos en js/
- `firebase-config.js`: init de Firebase (config real).
- `firestore.js`: helpers de persistencia (`registrarVenta`, etc.).
- `data.js`: DataStore + recarga del dashboard (recargarDashboard).
- `charts.js`: gráficas Chart.js.
- `promociones.js`: PromocionesStore + UI de promociones.
- `horarios-data.js`: HorariosDataStore (zonas/promotores/horarios) + sincronización de zonas.
- `horarios.js`: gestión de promotores (crear/editar, colección `promotores`).
- `tiendas.js`: TiendasStore + gestión de tiendas (renombrar/eliminar).
- `ejecutivo.js`: vista ejecutiva.
- `mobile.js`: adaptaciones móviles.
- `theme.js`: tema claro/oscuro (variables CSS `--t-*`, función `temaCss(...)`).
- `respaldo.js`: exportación/backup de datos.
- `app.js`: routing, login, sesión, modales de venta/promociones, dashboard, informe individual.

## Trappas conocidas (bugs ya corregidos — NO reintroducir)

1. **Métodos duplicados en un objeto literal** (`DataStore`): la segunda definición sobrescribe a la primera en JS. Ya NO debe existir más de un `_iniciarFirestore` / `_guardarEnFirestore`. Si algo "desaparece", revisar duplicados.
2. **Vaciado de datos**: `onSnapshot` de `dashboard/datos` NO debe hacer `ventas = []` / `cuotas = []` cuando el snapshot no trae esas claves. Debe conservar la data en memoria.
3. **"Sin tienda asignada"**: `_sincronizarZonasConDataStore()` en horarios-data.js NO debe poner `zona_principal_id = null` cuando la tienda no se encuentra en el listado actual (carrera de carga). Conservar la asignación y solo `console.warn`.
4. **`aplicarSesionInicial`** no debe reemplazar `promotorSession` por un objeto mínimo sin `zona_principal_id`. Fusionar siempre con la sesión almacenada.
5. Paneles promotor: si `zonas` aún no cargó, usar fallback `zona_principal_id` como nombre de tienda; nunca dejar el selector vacío ni bloquear con "Sin tienda asignada" si la asignación existe. El filtro `#pdv-select` de la página avance se auto-selecciona con la tienda del promotor (`_tiendaPromotorSesion()`).
6. Cambios de indentación espurios (`scales: {` sin sangría, arrays sin indentar) aparecen en app.js; mantener el estilo original.

## Flujo de validación tras un cambio

1. `node --check js/<archivo>.js` para todos los archivos modificados (no debe dar salida).
2. En el navegador: iniciar sesión como promotor real, abrir "Registrar Ventas" y "Registrar Promociones" desde el sidebar o la barra de acciones (paneles en `page-avance`).
3. En consola confirmar los 5 logs `[VALIDACION]` (nombre, correo, tienda, promociones, ventas).
4. Verificar que la tienda asignada se mantiene tras recargar la página (F5).
5. No crear datos de prueba ni escribir en Firestore durante las pruebas.
