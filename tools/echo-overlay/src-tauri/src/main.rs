use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::str::FromStr;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIcon, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewWindow, WindowEvent};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

const WINDOW_LABEL: &str = "main";
const TRAY_ID: &str = "ambient-dot";
const TOGGLE_MENU_ID: &str = "toggle-overlay";
const QUIT_MENU_ID: &str = "quit";
// Only Shift+Cmd+E is bound by default. Shift+Cmd+D was released back to Ghostty
// (2026-05-31) — the overlay no longer claims it. Override via ECHO_OVERLAY_HOTKEYS.
const DEFAULT_HOTKEYS: &[&str] = &["CommandOrControl+Shift+E"];
const HOTKEY_ENV: &str = "ECHO_OVERLAY_HOTKEY";
const HOTKEYS_ENV: &str = "ECHO_OVERLAY_HOTKEYS";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum DotState {
    Lit,
    Dark,
    Unknown,
}

impl DotState {
    fn from_wire(value: &str) -> Result<Self, String> {
        match value {
            "lit" => Ok(Self::Lit),
            "dark" => Ok(Self::Dark),
            "unknown" => Ok(Self::Unknown),
            other => Err(format!("unsupported dot state: {other}")),
        }
    }

    fn title(self) -> &'static str {
        match self {
            Self::Lit => "●",
            Self::Dark => "○",
            Self::Unknown => "◌",
        }
    }

    fn tooltip(self) -> &'static str {
        match self {
            Self::Lit => "ECHO: decision waiting",
            Self::Dark => "ECHO: no pending decisions",
            Self::Unknown => "ECHO: decision status unknown",
        }
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InFlightItem {
    item_id: String,
    title: String,
    stage: String,
    path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReviewRequestSummary {
    item_id: String,
    round: String,
    correlation_id: String,
    path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct InFlightSnapshot {
    items: Vec<InFlightItem>,
    review_requests: Vec<ReviewRequestSummary>,
    scanned_review_roots: Vec<String>,
}

#[tauri::command]
fn dismiss_overlay(app: AppHandle) -> Result<(), String> {
    hide_overlay(&app)
}

#[tauri::command]
fn set_ambient_dot(app: AppHandle, state: String) -> Result<(), String> {
    let state = DotState::from_wire(&state)?;
    set_tray_dot(&app, state)
}

#[tauri::command]
fn open_target(target: String) -> Result<(), String> {
    open_with_system(&target)
}

#[tauri::command]
fn read_in_flight_snapshot(repo_path: String) -> Result<InFlightSnapshot, String> {
    read_snapshot(Path::new(&repo_path))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        eprintln!("ECHO overlay hotkey pressed: {_shortcut:?}");
                        if let Err(err) = toggle_overlay(app) {
                            eprintln!("failed to toggle ECHO overlay: {err}");
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            dismiss_overlay,
            set_ambient_dot,
            open_target,
            read_in_flight_snapshot,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let window = app
                .get_webview_window(WINDOW_LABEL)
                .ok_or_else(|| "main webview window missing".to_string())?;
            configure_overlay_window(&window)?;
            wire_window_dismissal(&window);
            build_tray(app.handle())?;
            register_hotkey(app.handle())?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if id == TOGGLE_MENU_ID {
                if let Err(err) = toggle_overlay(app) {
                    eprintln!("failed to toggle ECHO overlay from menu: {err}");
                }
            } else if id == QUIT_MENU_ID {
                app.exit(0);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running ECHO decisions overlay");
}

fn configure_overlay_window(window: &WebviewWindow) -> Result<(), String> {
    window
        .set_always_on_top(true)
        .map_err(|err| format!("set always-on-top failed: {err}"))?;
    window
        .set_decorations(false)
        .map_err(|err| format!("set decorations failed: {err}"))?;
    window
        .hide()
        .map_err(|err| format!("initial hide failed: {err}"))?;

    #[cfg(target_os = "macos")]
    configure_macos_window(window)?;

    Ok(())
}

#[cfg(target_os = "macos")]
fn configure_macos_window(window: &WebviewWindow) -> Result<(), String> {
    use objc2_app_kit::{NSColor, NSFloatingWindowLevel, NSWindow};

    let ns_window_ptr = window
        .ns_window()
        .map_err(|err| format!("ns_window unavailable: {err}"))? as *mut NSWindow;
    let ns_window = unsafe { &*ns_window_ptr };
    let clear = NSColor::clearColor();
    ns_window.setOpaque(false);
    ns_window.setBackgroundColor(Some(&clear));
    ns_window.setHasShadow(true);
    ns_window.setLevel(NSFloatingWindowLevel);
    Ok(())
}

fn wire_window_dismissal(window: &WebviewWindow) {
    let app = window.app_handle().clone();
    window.on_window_event(move |event| {
        if matches!(event, WindowEvent::Focused(false)) {
            if let Err(err) = hide_overlay(&app) {
                eprintln!("failed to hide ECHO overlay on blur: {err}");
            }
        }
    });
}

fn build_tray(app: &AppHandle) -> tauri::Result<TrayIcon> {
    let toggle = MenuItem::with_id(app, TOGGLE_MENU_ID, "Show/Hide ECHO Decisions", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_MENU_ID, "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&toggle, &quit])?;

    TrayIconBuilder::with_id(TRAY_ID)
        .title(DotState::Unknown.title())
        .tooltip(DotState::Unknown.tooltip())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Err(err) = toggle_overlay(tray.app_handle()) {
                    eprintln!("failed to toggle ECHO overlay from tray: {err}");
                }
            }
        })
        .build(app)
}

fn register_hotkey(app: &AppHandle) -> Result<(), String> {
    let hotkeys = configured_hotkeys();
    let mut registered = Vec::new();
    let mut failures = Vec::new();

    for hotkey in hotkeys {
        match Shortcut::from_str(&hotkey) {
            Ok(shortcut) => match app.global_shortcut().register(shortcut) {
                Ok(()) => {
                    eprintln!("registered ECHO overlay hotkey: {hotkey}");
                    registered.push(hotkey);
                }
                Err(err) => failures.push(format!("{hotkey}: {err}")),
            },
            Err(err) => failures.push(format!("{hotkey}: invalid shortcut: {err}")),
        }
    }

    if registered.is_empty() {
        return Err(format!("no ECHO overlay hotkeys registered: {}", failures.join("; ")));
    }
    if !failures.is_empty() {
        eprintln!("some ECHO overlay hotkeys were not registered: {}", failures.join("; "));
    }
    Ok(())
}

fn configured_hotkeys() -> Vec<String> {
    let raw = std::env::var(HOTKEYS_ENV)
        .ok()
        .or_else(|| std::env::var(HOTKEY_ENV).ok());
    let values: Vec<String> = raw
        .map(|value| {
            value
                .split([',', ';'])
                .map(str::trim)
                .filter(|value| !value.is_empty())
                .map(ToString::to_string)
                .collect()
        })
        .unwrap_or_else(|| DEFAULT_HOTKEYS.iter().map(|value| value.to_string()).collect());

    values.into_iter().fold(Vec::new(), |mut unique, value| {
        if !unique.contains(&value) {
            unique.push(value);
        }
        unique
    })
}

fn toggle_overlay(app: &AppHandle) -> Result<(), String> {
    let window = overlay_window(app)?;
    let visible = window
        .is_visible()
        .map_err(|err| format!("visibility check failed: {err}"))?;
    if visible {
        hide_overlay(app)
    } else {
        show_overlay(app)
    }
}

fn show_overlay(app: &AppHandle) -> Result<(), String> {
    let window = overlay_window(app)?;
    #[cfg(target_os = "macos")]
    app.show()
        .map_err(|err| format!("show app failed: {err}"))?;
    window
        .show()
        .map_err(|err| format!("show overlay failed: {err}"))?;
    window
        .set_focusable(true)
        .map_err(|err| format!("make overlay focusable failed: {err}"))?;
    window
        .set_focus()
        .map_err(|err| format!("focus overlay failed: {err}"))?;
    window
        .set_always_on_top(true)
        .map_err(|err| format!("restore always-on-top failed: {err}"))?;
    window
        .emit("overlay:shown", ())
        .map_err(|err| format!("emit overlay shown failed: {err}"))?;
    eprintln!("ECHO overlay shown");
    Ok(())
}

fn hide_overlay(app: &AppHandle) -> Result<(), String> {
    let window = overlay_window(app)?;
    window
        .emit("overlay:hidden", ())
        .map_err(|err| format!("emit overlay hidden failed: {err}"))?;
    window
        .hide()
        .map_err(|err| format!("hide overlay failed: {err}"))?;
    eprintln!("ECHO overlay hidden");
    Ok(())
}

fn overlay_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(WINDOW_LABEL)
        .ok_or_else(|| "main webview window missing".to_string())
}

fn set_tray_dot(app: &AppHandle, state: DotState) -> Result<(), String> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| "ambient tray icon missing".to_string())?;
    tray.set_title(Some(state.title()))
        .map_err(|err| format!("set tray title failed: {err}"))?;
    tray.set_tooltip(Some(state.tooltip()))
        .map_err(|err| format!("set tray tooltip failed: {err}"))
}

fn open_with_system(target: &str) -> Result<(), String> {
    if target.trim().is_empty() {
        return Err("target is empty".to_string());
    }

    #[cfg(target_os = "macos")]
    let status = Command::new("open").arg(target).status();

    #[cfg(target_os = "linux")]
    let status = Command::new("xdg-open").arg(target).status();

    #[cfg(target_os = "windows")]
    let status = Command::new("cmd")
        .args(["/C", "start", "", target])
        .status();

    status
        .map_err(|err| format!("open target failed: {err}"))
        .and_then(|status| {
            if status.success() {
                Ok(())
            } else {
                Err(format!("open target exited with status {status}"))
            }
        })
}

fn read_snapshot(repo_root: &Path) -> Result<InFlightSnapshot, String> {
    if !repo_root.is_absolute() {
        return Err("repo_path must be absolute".to_string());
    }

    let mut items = Vec::new();
    for stage in ["ready", "claimed", "pending_review"] {
        let dir = repo_root.join("backlog").join(stage);
        for path in markdown_files(&dir)? {
            let item_id = file_stem(&path)?;
            let title = read_title(&path)?.unwrap_or_else(|| item_id.clone());
            items.push(InFlightItem {
                item_id,
                title,
                stage: stage.to_string(),
                path: path_to_string(&path),
            });
        }
    }
    items.sort_by(|a, b| a.item_id.cmp(&b.item_id));

    let mut review_requests = Vec::new();
    let mut scanned_review_roots = Vec::new();
    for item in &items {
        let review_root = repo_root.join("backlog").join("reviews").join(&item.item_id);
        if !review_root.exists() {
            continue;
        }
        scanned_review_roots.push(path_to_string(&review_root));
        for round_dir in round_dirs(&review_root)? {
            let request = round_dir.join("request.md");
            if !request.is_file() {
                continue;
            }
            if let Some(correlation_id) = read_frontmatter_string(&request, "correlation_id")? {
                review_requests.push(ReviewRequestSummary {
                    item_id: item.item_id.clone(),
                    round: round_dir
                        .file_name()
                        .and_then(|name| name.to_str())
                        .unwrap_or_default()
                        .to_string(),
                    correlation_id,
                    path: path_to_string(&request),
                });
            }
        }
    }

    Ok(InFlightSnapshot {
        items,
        review_requests,
        scanned_review_roots,
    })
}

fn markdown_files(dir: &Path) -> Result<Vec<PathBuf>, String> {
    if !dir.exists() {
        return Ok(Vec::new());
    }
    let mut out = Vec::new();
    for entry in fs::read_dir(dir).map_err(|err| format!("read {} failed: {err}", dir.display()))? {
        let path = entry
            .map_err(|err| format!("read {} entry failed: {err}", dir.display()))?
            .path();
        if path.extension().and_then(|ext| ext.to_str()) == Some("md") {
            out.push(path);
        }
    }
    out.sort();
    Ok(out)
}

fn round_dirs(review_root: &Path) -> Result<Vec<PathBuf>, String> {
    let mut out = Vec::new();
    for entry in fs::read_dir(review_root)
        .map_err(|err| format!("read {} failed: {err}", review_root.display()))?
    {
        let path = entry
            .map_err(|err| format!("read {} entry failed: {err}", review_root.display()))?
            .path();
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or_default();
        if path.is_dir() && name.starts_with('r') {
            out.push(path);
        }
    }
    out.sort();
    Ok(out)
}

fn read_title(path: &Path) -> Result<Option<String>, String> {
    read_frontmatter_string(path, "title")
}

fn read_frontmatter_string(path: &Path, key: &str) -> Result<Option<String>, String> {
    let body =
        fs::read_to_string(path).map_err(|err| format!("read {} failed: {err}", path.display()))?;
    let mut lines = body.lines();
    if lines.next() != Some("---") {
        return Ok(None);
    }
    let needle = format!("{key}:");
    for line in lines {
        if line == "---" {
            break;
        }
        let trimmed = line.trim();
        if !trimmed.starts_with(&needle) {
            continue;
        }
        let raw = trimmed[needle.len()..].trim();
        return Ok(Some(raw.trim_matches('"').trim_matches('\'').to_string()));
    }
    Ok(None)
}

fn file_stem(path: &Path) -> Result<String, String> {
    path.file_stem()
        .and_then(|stem| stem.to_str())
        .map(ToString::to_string)
        .ok_or_else(|| format!("could not derive item id from {}", path.display()))
}

fn path_to_string(path: &Path) -> String {
    path.to_string_lossy().to_string()
}
