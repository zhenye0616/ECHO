#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const failures = [];

function assert(condition, message) {
  if (!condition) failures.push(message);
}

const config = readJson("src-tauri/tauri.conf.json");
const capabilities = readJson("src-tauri/capabilities/default.json");
const mainRs = readText("src-tauri/src/main.rs");

const mainWindow = config.app?.windows?.find((window) => window.label === "main");

assert(config.app?.macOSPrivateApi === true, "tauri.conf.json must set app.macOSPrivateApi=true");
assert(mainWindow !== undefined, "tauri.conf.json must define a main window");
assert(mainWindow?.transparent === true, "main window must be transparent");
assert(mainWindow?.alwaysOnTop === true, "main window must be alwaysOnTop");
assert(mainWindow?.decorations === false, "main window must disable decorations");
assert(mainWindow?.skipTaskbar === true, "main window must skip the taskbar/Dock posture where supported");
assert(mainWindow?.visible === false, "main window must be hidden at launch");
assert(
  typeof config.app?.security?.csp === "string" && config.app.security.csp.includes("http://127.0.0.1:38478"),
  "CSP must allow the local ECHO MCP daemon",
);

assert(capabilities.windows?.includes("main"), "default capabilities must apply to the main window");
assert(capabilities.permissions?.includes("core:default"), "default capabilities must allow core invoke APIs");
assert(capabilities.permissions?.includes("opener:default"), "default capabilities must allow SEE+JUMP opener APIs");

assert(
  mainRs.includes("tauri::ActivationPolicy::Accessory"),
  "Rust shell must use accessory activation policy on macOS",
);
assert(mainRs.includes("set_always_on_top(true)"), "Rust shell must restore always-on-top at runtime");
assert(mainRs.includes("setOpaque(false)"), "Rust shell must make the macOS NSWindow non-opaque");
assert(mainRs.includes("NSColor::clearColor()"), "Rust shell must use a clear macOS window background");
assert(mainRs.includes("NSFloatingWindowLevel"), "Rust shell must set the macOS floating window level");
assert(mainRs.includes("read_in_flight_snapshot"), "Rust shell must expose the bounded in-flight snapshot command");
assert(mainRs.includes('"ready", "claimed", "pending_review"'), "snapshot must be bounded to in-flight backlog dirs");
assert(
  mainRs.includes('join("reviews").join(&item.item_id)'),
  "snapshot must scan only each in-flight item's review request root",
);
assert(mainRs.includes("repo_path must be absolute"), "snapshot must reject non-absolute repo paths");
assert(mainRs.includes("open_target"), "Rust shell must expose SEE+JUMP open target command");

if (failures.length > 0) {
  console.error("Static smoke failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Static smoke passed: Tauri overlay config, CSP, capabilities, and shell invariants are present.");
