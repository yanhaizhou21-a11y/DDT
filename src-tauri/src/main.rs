// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::net::TcpStream;
use std::time::Duration;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

fn ensure_backend_alive() {
    let timeout = Duration::from_millis(250);
    let port3000_alive = TcpStream::connect_timeout(&"127.0.0.1:3000".parse().unwrap(), timeout).is_ok();
    let port3001_alive = TcpStream::connect_timeout(&"127.0.0.1:3001".parse().unwrap(), timeout).is_ok();

    if !port3000_alive && !port3001_alive {
        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            let _ = std::process::Command::new("cmd")
                .args(["/C", "ddt --no-open"])
                .creation_flags(CREATE_NO_WINDOW)
                .spawn();
        }
    }
}

fn main() {
    ensure_backend_alive();

    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running DDT tauri desktop application");
}
