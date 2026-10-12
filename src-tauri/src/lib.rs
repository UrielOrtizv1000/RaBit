
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
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![set_glass])
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_notification::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}
