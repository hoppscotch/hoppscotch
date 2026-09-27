;(() => {
  console.log("Setting desktop kernel mode")
  window.__KERNEL_MODE__ = "desktop"

  // write bundle identity to the log file on disk so we can trace which
  // webview is which across webkit relaunches (console logs get wiped).
  // runs before any JS modules load, so we use the raw Tauri IPC channel
  // instead of @tauri-apps/api.
  //
  // log webview identity to disk so we can trace which webview is which
  // across webkit relaunches (console logs get wiped)
  Promise.resolve().then(function () {
    var params = new URLSearchParams(window.location.search)
    var orgParam = params.get("org")
    var tag = orgParam ? "org(" + orgParam + ")" : "vendored"

    var line = [
      "",
      "========================================================================",
      "WEBVIEW INIT  " + new Date().toISOString(),
      "  tag         : " + tag,
      "  ?org=       : " + (orgParam || "(not set)"),
      "  href        : " + window.location.href,
      "  hostname    : " + window.location.hostname,
      "  origin      : " + window.location.origin,
      "========================================================================",
      "",
    ].join("\n")

    // __TAURI_INTERNALS__ is always present before initialization_scripts run
    if (window.__TAURI_INTERNALS__) {
      window.__TAURI_INTERNALS__.invoke("append_log", {
        filename: "appload.diag.log",
        content: line,
      }).catch(function (err) {
        console.warn("[kernel.js] Failed to write init log:", err)
      })
    }
  })
})()
