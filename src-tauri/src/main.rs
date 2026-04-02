#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::thread;
use std::time::Duration;
use sysinfo::System;
use tauri::Manager;

// 1. Profile Save Command
#[tauri::command]
fn save_profile(name: String) {
    println!("Profile saved to Rust Backend: {}", name);
    // আপনি চাইলে এখানে File System (fs) ব্যবহার করে JSON এ সেভ করতে পারেন
}

// 2. Uninstall Settings Command
#[tauri::command]
fn save_uninstall_settings(mode: String, password: String) {
    println!("Uninstall protection activated in mode: {}. Pass: {}", mode, password);
}

// 3. Strict Lock Command (টাস্ক ম্যানেজার ব্লক ও ফুলস্ক্রিন)
#[tauri::command]
fn start_focus_session(app_handle: tauri::AppHandle, plan_type: String) {
    println!("Starting Focus Session: {}", plan_type);

    // একটি নতুন ফুলস্ক্রিন উইন্ডো তৈরি করা হচ্ছে (Alt+F4 ব্লক করার জন্য on_top)
    tauri::WindowBuilder::new(
        &app_handle,
        "focus_lock_window",
        tauri::WindowUrl::App("lock.html".into())
    )
    .title("Focus Mode Active")
    .fullscreen(true)
    .always_on_top(true)
    .closable(false) // সহজে ক্লোজ করা যাবে না
    .build()
    .unwrap();

    // ব্যাকগ্রাউন্ড থ্রেডে প্রসেস কিলার (Task Manager ব্লক করা)
    thread::spawn(move || {
        let mut sys = System::new_all();
        // এটি সেশন চলাকালীন সময় পর্যন্ত চলবে (এখানে ডেমো হিসেবে ইনফিনিট লুপ দেওয়া হলো)
        loop {
            sys.refresh_processes();
            for (_pid, process) in sys.processes() {
                let process_name = process.name().to_lowercase();
                // যদি কেউ টাস্ক ম্যানেজার ওপেন করে, সাথে সাথে কেটে দেবে
                if process_name.contains("taskmgr") {
                    process.kill();
                }
            }
            // ১ সেকেন্ড পরপর স্ক্যান করবে
            thread::sleep(Duration::from_secs(1));
        }
    });
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            save_profile,
            save_uninstall_settings,
            start_focus_session
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
