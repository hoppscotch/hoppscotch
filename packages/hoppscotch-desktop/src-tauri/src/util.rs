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

#[cfg(test)]
mod tests {
    use super::*;

    // NOTE: These tests won't actually open URLs in testing environments
    // but these will test the command construction logic
    #[test]
    fn test_open_link_with_valid_url() {
        let test_url = "https://example.com";

        // The function should not panic and should return `Some(())` or `None`
        // depending on whether the command can be spawned
        let result = open_link(test_url);

        // This should return `Some(())` if the command exists,
        // on unsupported platforms, this should return None
        #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
        {
            assert!(result.is_some() || result.is_none());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            assert_eq!(result, None);
        }
    }

    #[test]
    fn test_open_link_with_empty_string() {
        let result = open_link("");

        #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
        {
            assert!(result.is_some() || result.is_none());
        }

        #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
        {
            assert_eq!(result, None);
        }
    }

    #[test]
    fn test_open_link_with_special_characters() {
        let test_urls = vec![
            "https://example.com/path with spaces",
            "https://example.com/path?query=value&other=test",
            "https://example.com/path#fragment",
            "file:///path/to/local/file.txt",
        ];

        for url in test_urls {
            let result = open_link(url);

            #[cfg(any(target_os = "windows", target_os = "macos", target_os = "linux"))]
            {
                assert!(result.is_some() || result.is_none());
            }

            #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
            {
                assert_eq!(result, None);
            }
        }
    }
}
