use std::process::{Command, Stdio};

pub fn open_link(link: &str) -> Option<()> {
    let null = Stdio::null();

    #[cfg(target_os = "windows")]
    {
        Command::new("rundll32")
            .args(["url.dll,FileProtocolHandler", link])
            .stdout(null)
            .spawn()
            .ok()
            .map(|_| ())
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(link)
            .stdout(null)
            .spawn()
            .ok()
            .map(|_| ())
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(link)
            .stdout(null)
            .spawn()
            .ok()
            .map(|_| ())
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        None
    }
}
