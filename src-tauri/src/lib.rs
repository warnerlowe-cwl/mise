// Windows: true when this copy was installed from the Microsoft Store (an MSIX package).
// Store rules say only the Store may update the app, so the front end skips its own
// update check then. Any other answer from Windows counts as "not the Store", so the
// normal download keeps updating itself.
#[cfg(windows)]
#[link(name = "kernel32")]
extern "system" {
  fn GetCurrentPackageFullName(length: *mut u32, name: *mut u16) -> i32;
}

#[tauri::command]
fn store_install() -> bool {
  #[cfg(windows)]
  {
    const ERROR_INSUFFICIENT_BUFFER: i32 = 122; // packaged: the name just didn't fit in 0 characters
    let mut len: u32 = 0;
    let r = unsafe { GetCurrentPackageFullName(&mut len, std::ptr::null_mut()) };
    r == ERROR_INSUFFICIENT_BUFFER || r == 0
  }
  #[cfg(not(windows))]
  {
    false
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![store_install])
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
