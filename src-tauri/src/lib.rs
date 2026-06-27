#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .plugin(tauri_plugin_process::init())
    .setup(|app| {
      // Register the mise:// URL scheme so the CrownWell Launcher (and any link)
      // can open the installed app. On macOS the scheme is declared via Info.plist
      // (generated from tauri.conf.json); on Linux/Windows we also register at
      // runtime. Best-effort — failure here must not block app startup.
      #[cfg(any(target_os = "linux", windows))]
      {
        use tauri_plugin_deep_link::DeepLinkExt;
        let _ = app.handle().deep_link().register_all();
      }
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
    .expect("error while running tauri application");
}
