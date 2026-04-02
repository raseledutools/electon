#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::thread;
use std::time::Duration;
use sysinfo::System;
use tauri::Manager;

#[tauri::command]
fn start_focus_session(app_handle: tauri::AppHandle) {
    // লক উইন্ডো তৈরি
    let _ = tauri::WindowBuilder::new(
        &app_handle,
        "focus_lock",
        tauri::WindowUrl::App("lock.html".into())
    )
    .title("Focus Active")
    .fullscreen(true)
    .always_on_top(true)
    .build();

    // টাস্ক ম্যানেজার ব্লক করার থ্রেড
    thread::spawn(move || {
        let mut sys = System::new_all();
        loop {
            sys.refresh_all();
            for process in sys.processes_by_exact_name("taskmgr.exe") {
                process.kill();
            }
            thread::sleep(Duration::from_millis(500));
        }
    });
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_focus_session])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
