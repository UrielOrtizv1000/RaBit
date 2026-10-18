# Plan de compatibilidad con Linux

Estado: **propuesta** (nada de esto está implementado). Objetivo: que RaBit se compile, se pruebe, se publique y se
actualice en Linux (x86_64 primero, arm64 después) con la misma calidad que en Windows.

Alcance: solo escritorio (`src/`, `src-tauri/`, `scripts/`, CI). `android/` e `ios/` no cambian.

## 1. Diagnóstico

El núcleo ya es bastante portable: la UI es React/WebView, la persistencia es SQLite vía `tauri-plugin-sql`, las rutas
salen de `app.path()` (no hay rutas fijas de Windows en el código), las fuentes van empaquetadas con `@fontsource`, y CI
(typecheck, lint, vitest, Playwright) ya corre en `ubuntu-latest`. Lo que falta está en la **capa nativa y de
distribución**, que hoy asume Windows (y algo de macOS).

### Hallazgos, ordenados por riesgo

| #   | Hallazgo                                                                                                                                                                                                                                                                                                                                        | Dónde                                                                 | Riesgo |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------ |
| 1   | **Ventana sin decoraciones + transparente.** En Linux (GTK/WebKitGTK) una ventana `decorations:false` no tiene bordes de redimensionado, `shadow:true` no aplica y `transparent:true` solo funciona con compositor. Sin resize, la ventana queda con tamaño fijo; en Wayland además falla el arrastre en algunos compositores.                  | `tauri.conf.json` (`app.windows`), `src/app/TitleBar.tsx`             | Alto   |
| 2   | **Bundles solo `nsis`, `dmg`, `app`.** No se genera nada para Linux.                                                                                                                                                                                                                                                                            | `tauri.conf.json` → `bundle.targets`                                  | Alto   |
| 3   | **Actualizador:** en Linux solo se actualiza el **AppImage**; `.deb`/`.rpm` no se autoactualizan. Hoy el botón de actualización aparecería igual y fallaría. `release.yml` no compila Linux y `verify` solo exige la firma `windows-x86_64`.                                                                                                    | `src/services/updater.ts`, `UpdateButton.tsx`, `release.yml`          | Alto   |
| 4   | **Dependencias de sistema** (webkit2gtk-4.1, libayatana-appindicator, librsvg, patchelf…) no documentadas; el README solo habla de Windows.                                                                                                                                                                                                     | `README.md`, `CONTRIBUTING.md`                                        | Medio  |
| 5   | **Cristal/acrylic** es solo Windows. En Linux `set_glass` no hace nada, pero el frontend igual baja `--glass-a` a 0.93: con ventana transparente y sin blur, se vería el escritorio a través de la UI. `window-vibrancy` se compila en todas las plataformas.                                                                                   | `src-tauri/src/lib.rs`, `src/services/glass.ts`, `Cargo.toml`         | Medio  |
| 6   | **`cargo test` nunca corre en CI** (los 5 tests de `backup.rs` solo se ejecutan a mano). No hay verificación de que el Rust compile en Linux.                                                                                                                                                                                                   | `.github/workflows/ci.yml`                                            | Medio  |
| 7   | **README con ruta de datos incorrecta en Linux.** Dice `~/.local/share/app.rabit.desktop/rabit.db`, pero `tauri-plugin-sql` y `backup.rs` usan `app_config_dir()`, que en Linux es `~/.config/app.rabit.desktop/`. (`~/.local/share/...` solo tendría los logs.) Verificar en una build real antes de corregir.                                 | `README.md:165`, `docs/UPDATES.md:126`                                | Medio  |
| 8   | **Tamaño mínimo 1280×800.** Muchos portátiles Linux son 1366×768: la ventana no cabe en pantalla.                                                                                                                                                                                                                                               | `tauri.conf.json` (`minWidth/minHeight`)                              | Medio  |
| 9   | **Render de WebKitGTK:** `backdrop-filter` (5 usos), `mask-image`, scrollbars `::-webkit-scrollbar` + `scrollbar-width`, canvas del frasco (Jar) y Framer Motion deben validarse. Hay bugs conocidos de ventana en blanco con DMA-BUF en NVIDIA/Wayland y rendimiento lento sin GPU. La versión de WebKitGTK varía por distro.                  | `src/styles/global.css`, `components/ui/glass.ts`, `features/savings` | Medio  |
| 10  | **Notificaciones:** `tauri-plugin-notification` usa D-Bus (`notify-rust`); necesita un demonio de notificaciones. Dentro de AppImage/Flatpak el identificador y el ícono pueden perderse. El flujo `isPermissionGranted → requestPermission` en Linux siempre devuelve concedido, así que no hay UX de permisos que probar, pero sí de entrega. | `src/services/reminders.ts`                                           | Medio  |
| 11  | **Scripts solo Windows:** `package.mjs` (solo `nsis`/`RaBit-Setup.exe`), `qa/permissions-check.mjs` (WebView2, `tasklist`, `rabit.exe`), `windows/probar-rabit.bat` (sin equivalente). Mensajes mencionan `rabit.exe`; en Linux el binario es `rabit`.                                                                                          | `scripts/`                                                            | Medio  |
| 12  | **Aviso de seguridad `glib` < 0.20** se declara como "no aplica porque no compilamos Linux". Al publicar Linux deja de ser cierto.                                                                                                                                                                                                              | `SECURITY.md`                                                         | Bajo   |
| 13  | **Metadatos de escritorio:** `category: Productivity` y descripción corta sirven para el `.desktop`, pero no hay `bundle.linux` (dependencias del `.deb`, formato de ícono, etc.).                                                                                                                                                              | `tauri.conf.json`                                                     | Bajo   |
| 14  | **Sensibilidad a mayúsculas** del sistema de archivos: un import con mayúsculas distintas funciona en Windows y rompe en Linux. Ya está cubierto porque CI corre en Ubuntu, pero hay que mantenerlo.                                                                                                                                            | CI                                                                    | Bajo   |

Lo que **no** es problema: atajos (`Ctrl`/`Cmd` ya se manejan), `localStorage`/`sql.js` en el navegador, fuentes, i18n
(`navigator.language`), `.gitattributes`/`.editorconfig` (ya `eol=lf`), `backup.rs` (usa `Path`/`PathBuf`, sin
separadores fijos).

## 2. Decisiones de diseño (a confirmar)

1. **Decoraciones en Linux: nativas.** Usar un `src-tauri/tauri.linux.conf.json` (Tauri lo fusiona solo en Linux) con
   `decorations: true`, `transparent: false`, `shadow: false`. Se descartan los resize-handles propios: es más código y
   cada compositor se comporta distinto. La `TitleBar` propia se oculta en Linux (el sistema ya dibuja la suya).
   _Alternativa_: mantener la barra propia y añadir `core:window:allow-start-resize-dragging` + bordes invisibles; solo si
   se quiere identidad visual idéntica.
2. **Formatos:** **AppImage** (único autoactualizable, principal) + **.deb** (Debian/Ubuntu) y **.rpm** (Fedora). Flatpak
   queda como fase opcional.
3. **Actualizaciones:** AppImage usa el actualizador de Tauri con la misma clave minisign; `.deb`/`.rpm` ocultan el botón
   y muestran "actualiza con tu gestor de paquetes". Se detecta con la variable `APPIMAGE` desde Rust.
4. **Cristal en Linux: desactivado.** El comando `set_glass` informa si la plataforma lo soporta y el frontend deja
   `--glass-a = 1` donde no.
5. **Arquitecturas:** `x86_64` en la primera entrega; `aarch64` (runner `ubuntu-24.04-arm`) en la fase 5.

## 3. Fases

### Fase 0 — Línea base (sin tocar código)

- Compilar y ejecutar hoy en una VM/WSL2 con GUI (Ubuntu 22.04 y 24.04; opcional Fedora): `npm ci && npm run tauri dev`.
- Registrar qué falla de la tabla anterior: resize, arrastre, transparencia, notificaciones, `backdrop-filter`, frasco.
- Confirmar el hallazgo 7 (dónde queda `rabit.db`) con `ls ~/.config/app.rabit.desktop`.
- Entregable: lista de fallos reales en `docs/QA.md` (sección Linux).

### Fase 1 — Compila y arranca en Linux

- Instalar dependencias (Debian/Ubuntu): `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev
libssl-dev patchelf build-essential curl wget file`. Documentarlas con equivalentes para Fedora/Arch en `README.md` y
  `CONTRIBUTING.md`.
- `Cargo.toml`: mover `window-vibrancy` a `[target.'cfg(any(target_os = "windows", target_os = "macos"))'.dependencies]`
  y proteger su `use`/llamada con el mismo `cfg` (hoy ya está bajo `cfg(windows)` en `lib.rs`).
- `tauri.conf.json` → `bundle.targets`: `["nsis", "dmg", "app", "appimage", "deb", "rpm"]` (Tauri ignora los que no
  corresponden al sistema anfitrión).
- Añadir `bundle.linux`: `deb.depends` (por ejemplo `libwebkit2gtk-4.1-0`, `libgtk-3-0`), `appimage.bundleMediaFramework:
false`, ícono `icons/icon.png` (ya existe) y revisar el `.desktop` generado (`Categories=Office;`, `StartupWMClass`).
- Criterio de salida: `npm run tauri build` en Ubuntu produce AppImage, .deb y .rpm que abren sin errores y crean/leen
  la base.

### Fase 2 — Ventana y apariencia nativas (hecha en contenedor; falta sesión real)

- `src-tauri/tauri.linux.conf.json` con ventana nativa (decisión 1). Reducir `minWidth/minHeight` a `1024×680` **solo en
  Linux** y confirmar que `FitPage` escala bien (hallazgo 8); si funciona, evaluar bajarlo también en Windows.
- Exponer la plataforma al frontend (comando `platform_info` o `navigator.userAgent`; preferible el comando para no
  depender de cadenas) y usarla en: ocultar `TitleBar` en Linux, y en `applyGlass`.
- `set_glass` devuelve `bool` ("soportado"); `applyGlass` mantiene `--glass-a: 1` si no hay soporte. Actualizar
  `tests/` si algún test fija ese comportamiento.
- Revisar en WebKitGTK real: `backdrop-filter`, `mask-image`, scrollbars (`::-webkit-scrollbar` vs `scrollbar-width` en
  `global.css:57,214,305`), blur de ventanas de Savings, rendimiento del frasco y de Framer Motion. Si algo falla,
  degradar con `@supports` en lugar de ramificar por plataforma.
- Documentar el workaround para ventana en blanco: `WEBKIT_DISABLE_DMABUF_RENDERER=1` (NVIDIA/Wayland) y, si hace
  falta, aplicarlo en `main.rs` solo en Linux antes de crear la ventana, tras confirmar que es necesario.
- Criterio de salida: ventana redimensionable, arrastrable, con botones del sistema, sin transparencia rota, en GNOME
  (Wayland y X11) y KDE.

### Fase 3 — Actualizador y notificaciones (código hecho; verify de `release.yml` pasa a la Fase 5; falta probar un update real)

- Rust: comando `update_supported` → `true` en Windows/macOS y, en Linux, solo si existe la variable `APPIMAGE`.
  `updater.ts` lo consulta; sin soporte, `check()` no corre y `UpdateButton` no se muestra (o muestra el aviso del
  gestor de paquetes). Cubrir con un test de `updater.test.ts` (backend simulado).
- Confirmar que `installOnExit` y `process:allow-restart` funcionan con AppImage (a diferencia de Windows, no hay
  instalador que cierre la app; la comprobación `onCloseRequested` de `updater.ts` debe probarse). Corregir los
  comentarios que dicen "en Windows el instalador cierra la app".
- `release.yml` → `verify`: exigir `linux-x86_64` con firma además de `windows-x86_64`.
- Notificaciones: probar con `dunst`/GNOME/KDE; si el ícono o el nombre no salen en AppImage, fijar el ícono y el
  `identifier`. Documentar que se necesita un demonio de notificaciones (`libnotify`). El toast interno ya es el respaldo.
- Criterio de salida: de una versión N a N+1 se actualiza un AppImage real, con rollback de DB gracias a `backup.rs`.

### Fase 4 — CI, pruebas y scripts (hecha; el workflow aún no corrió en GitHub)

- `ci.yml`: añadir un job `rust` en `ubuntu-latest` con las dependencias apt, `cargo test`, `cargo clippy -- -D
warnings` y `cargo check` (hoy nada del Rust se ejecuta en CI).
- Añadir un job `build-linux` (sin firmar, `createUpdaterArtifacts:false`) en pull requests, o al menos nocturno, para
  detectar roturas antes de un release.
- `scripts/package.mjs`: elegir bundle según `process.platform` (`nsis`→`RaBit-Setup.exe`; Linux→`RaBit-x86_64.AppImage`,
  `.deb`, `.rpm`); corregir el mensaje de `rabit.exe` en uso.
- `scripts/linux/probar-rabit.sh` (equivalente al `.bat`) con permiso de ejecución
  (`git update-index --chmod=+x`). Línea final LF ya está garantizada por `.gitattributes`.
- `qa/permissions-check.mjs`: hoy depende de WebView2/CDP. En Linux WebKitGTK no ofrece ese puerto; usar
  `tauri-driver` + `WebKitWebDriver` (WebDriver) como sustituto, o mantenerlo solo para Windows y cubrir Linux con
  `tests/capabilities.test.ts` (ya corre en Ubuntu). Recomendado: lo segundo en esta fase.
- Los tests e2e de Playwright ya corren en Chromium/Ubuntu; mantenerlos como están.
- `docs/TESTING.md` y `docs/QA.md`: añadir secciones de Linux (cómo probar, qué solo se ve en la app instalada).

### Fase 5 — Publicación (workflow y docs hechos; sin publicar; aarch64 pendiente)

- `release.yml` → matriz `publish`: añadir
  `{ label: Linux, os: ubuntu-22.04, args: "", rust_targets: "" }` con un paso previo
  `sudo apt-get update && sudo apt-get install -y <dependencias de la fase 1>`. Usar 22.04 (no 24.04) para que el
  AppImage funcione en distros con glibc más antigua. Mantener las acciones fijadas por SHA.
- Copia de nombre fijo para el botón de descarga, como se hace con `RaBit-Setup.exe`: `RaBit-x86_64.AppImage` (y sus
  `.deb`/`.rpm`) con `gh release upload --clobber`.
- `tauri-action` ya genera las entradas `linux-x86_64` de `latest.json` (`includeUpdaterJson: true`) y firma el AppImage
  con la misma clave.
- `README.md`: badge y botón de descarga para Linux, matriz de formatos, y corregir la ruta de datos (hallazgo 7).
  `docs/UPDATES.md`: pasos de verificación y explicación de por qué `.deb`/`.rpm` no se autoactualizan.
- `SECURITY.md`: reescribir el aviso de `glib` (hallazgo 12): ahora sí se compila en Linux; reevaluar con cada
  actualización de Tauri y reflejarlo en `CHANGELOG.md`.
- `aarch64`: añadir una segunda fila Linux con `ubuntu-24.04-arm` (o compilación cruzada) cuando x86_64 esté estable.
- Opcional posterior: Flatpak (Flathub) con permisos mínimos; AUR/`.deb` en un repositorio apt propio.

## 4. Matriz de pruebas manuales

| Entorno                        | Compilación | Arranque | Ventana | Notificaciones | Actualizador (AppImage) |
| ------------------------------ | :---------: | :------: | :-----: | :------------: | :---------------------: |
| Ubuntu 22.04 GNOME (X11)       |      ☐      |    ☐     |    ☐    |       ☐        |            ☐            |
| Ubuntu 24.04 GNOME (Wayland)   |      ☐      |    ☐     |    ☐    |       ☐        |            ☐            |
| Fedora (Wayland) con `.rpm`    |      ☐      |    ☐     |    ☐    |       ☐        |  n/a (gestor de paq.)   |
| KDE Plasma (Wayland)           |      ☐      |    ☐     |    ☐    |       ☐        |            ☐            |
| Debian estable con `.deb`      |      ☐      |    ☐     |    ☐    |       ☐        |  n/a (gestor de paq.)   |
| Equipo sin GPU / VM (software) |      ☐      |    ☐     |    ☐    |       ☐        |            ☐            |

Casos fijos en cada fila: crear/editar/borrar tarea, evento, nota, rutina y meta de ahorro; exportar respaldo (diálogo
de guardado + `fs`); recordatorio con notificación; activar/desactivar cristal; tema claro/oscuro; cambio de idioma;
tutorial; reinicio y persistencia.

## 5. Orden recomendado y esfuerzo

| Fase | Contenido                           | Esfuerzo | Depende de |
| ---- | ----------------------------------- | -------- | ---------- |
| 0    | Línea base en VM                    | 0.5 día  | —          |
| 1    | Compila y empaqueta                 | 0.5 día  | 0          |
| 2    | Ventana/apariencia nativas          | 1–2 días | 1          |
| 3    | Actualizador y notificaciones       | 1 día    | 1          |
| 4    | CI, pruebas, scripts                | 1 día    | 1          |
| 5    | Release Linux + docs + aviso `glib` | 0.5 día  | 2, 3, 4    |

Total estimado: ~4–6 días, con la fase 2 como la de mayor incertidumbre (comportamiento de WebKitGTK).

## 6. Riesgos abiertos

- **Versión de WebKitGTK por distro**: el AppImage no incluye WebKit; usa el del sistema. En distros antiguas faltarán
  características CSS. Definir una distro mínima soportada (propuesta: Ubuntu 22.04 / Fedora 38).
- **Dependencias del AppImage vs. glibc**: compilar en la distro más vieja soportada.
- **Sin firma de código** en Linux no hay equivalente a SmartScreen, pero conviene publicar sumas SHA256 junto a los
  binarios.
- **Compartir convenciones**: lo que se haga por plataforma debe vivir en `tauri.<os>.conf.json` y `cfg(target_os)`, sin
  ramificar la lógica de negocio (capas de `docs/ARCHITECTURE.md`).

## 7. Reglas de trabajo

Todo se hace en local; publicar a GitHub (tags, releases, secretos, `git push`) lo hace la persona dueña del repo al
final. Actualizar `CHANGELOG.md` en la misma PR de cada fase y `docs/ARCHITECTURE.md` si cambian las capas o los permisos
de Tauri (`tests/capabilities.test.ts` debe seguir en verde).
