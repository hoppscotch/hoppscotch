mod auth;
mod content;
pub mod error;
mod header;
mod interop;
mod relay;
mod request;
mod response;
mod security;
mod transfer;
mod util;

// The pinned curl fork omits this conditional linkage even when its HTTP/2
// sources are enabled. Referencing the sys crate here carries nghttp2's native
// link flags through to relay binaries.
use libnghttp2_sys as _;

pub use interop::{Request, Response};
pub use relay::{cancel, execute};
