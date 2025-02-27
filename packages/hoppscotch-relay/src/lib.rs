pub(crate) mod error;
pub(crate) mod interop;
pub(crate) mod relay;
pub(crate) mod util;

pub use error::{RelayError, RelayResult};
pub use interop::{RequestWithMetadata, ResponseWithMetadata};
pub use relay::run_request_task;

pub fn add(left: u64, right: u64) -> u64 {
    left + right
}

#[cfg(test)]
mod tests {
    use tokio_util::sync::CancellationToken;
    use crate::interop::KeyValuePair;
    use super::*;

    #[test]
    fn it_works() {
        let result = add(2, 2);
        assert_eq!(result, 4);
    }

    #[test]
    fn test_gzip_encoding() {
        let request = RequestWithMetadata::new(
            1,                    // Request ID
            "GET".to_string(),    // Method
            "https://echo.hoppscotch.io".to_string(), // Endpoint
            vec![                 // Headers
                                  KeyValuePair {
                                      key: "Accept-Encoding".to_string(),
                                      value: "gzip".to_string(),
                                  }
            ],
            None,                 // Body
            true,                 // Validate certificates
            vec![],              // Root certificate bundles
            None,                // Client certificate
            None,                // Proxy configuration
        );

        // Execute the request with cancellation support
        let cancel_token = CancellationToken::new();
        let response = run_request_task(&request, cancel_token).unwrap();
        let response_data = String::from_utf8_lossy(&response.data);

        println!("Status: {}", response.status_text);
        println!("Response time: {}ms", response.time_end_ms - response.time_start_ms);

        println!("{}", response_data);

        assert!(response_data.contains("\"accept-encoding\": \"gzip\""))
    }

    #[test]
    fn test_deflate_encoding() {
        let request = RequestWithMetadata::new(
            1,                    // Request ID
            "GET".to_string(),    // Method
            "https://echo.hoppscotch.io".to_string(), // Endpoint
            vec![                 // Headers
                                  KeyValuePair {
                                      key: "Accept-Encoding".to_string(),
                                      value: "deflate".to_string(),
                                  }
            ],
            None,                 // Body
            true,                 // Validate certificates
            vec![],              // Root certificate bundles
            None,                // Client certificate
            None,                // Proxy configuration
        );

        // Execute the request with cancellation support
        let cancel_token = CancellationToken::new();
        let response = run_request_task(&request, cancel_token).unwrap();
        let response_data = String::from_utf8_lossy(&response.data);

        println!("Status: {}", response.status_text);
        println!("Response time: {}ms", response.time_end_ms - response.time_start_ms);

        println!("{}", response_data);

        assert!(response_data.contains("\"accept-encoding\": \"deflate\""))
    }
}
