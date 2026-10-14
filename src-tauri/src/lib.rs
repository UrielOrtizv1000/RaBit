mod backup;

use tauri::Manager;

/// Activa o desactiva el efecto de cristal (acrylic en Windows). Muy sutil: el tinte es casi opaco.
#[tauri::command]
fn set_glass(window: tauri::WebviewWindow, enabled: bool) {
  #[cfg(target_os = "windows")]
  {
    if enabled {
      let _ = window_vibrancy::apply_acrylic(&window, Some((233, 238, 235, 110)));
    } else {
      let _ = window_vibrancy::clear_acrylic(&window);
    }
  }
  #[cfg(not(target_os = "windows"))]
  {
    let _ = (&window, enabled);
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let builder = tauri::Builder::default();
  // Reinicio tras actualizar (`relaunch`): solo escritorio.
  #[cfg(desktop)]
  let builder = builder.plugin(tauri_plugin_process::init());
  builder
    .invoke_handler(tauri::generate_handler![set_glass])
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      // Registro local (sin red): en desarrollo informa de todo; en la versión instalada solo avisos y errores,
      // para poder diagnosticar un fallo del actualizador, que de otro modo sería silencioso.
      let level = if cfg!(debug_assertions) { log::LevelFilter::Info } else { log::LevelFilter::Warn };
      app.handle().plugin(tauri_plugin_log::Builder::default().level(level).build())?;
      // Antes de que el frontend abra la base y migre: respalda `rabit.db` si esta versión es distinta de la anterior.
      // Un fallo aquí nunca debe impedir que la app arranque.
      if let Ok(dir) = app.path().app_config_dir() {
        match backup::backup_on_upgrade(&dir, env!("CARGO_PKG_VERSION")) {
          Ok(Some(path)) => log::info!("database backed up to {}", path.display()),
          Ok(None) => {}
          Err(e) => log::warn!("database backup failed: {e}"),
        }
      }
      // Actualizador: si su configuración fuera inválida (p. ej. aún con valores de ejemplo) se registra y la app sigue.
      #[cfg(desktop)]
      if let Err(e) = app.handle().plugin(tauri_plugin_updater::Builder::new().build()) {
        log::warn!("updater unavailable: {e}");
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
