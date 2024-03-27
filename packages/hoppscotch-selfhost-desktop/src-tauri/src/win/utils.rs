use windows::Win32::Foundation::NTSTATUS;

#[link(name = "ntdll")]
extern "system" {
    fn RtlGetVersion(lpVersionInformation: *mut OSVERSIONINFOW) -> NTSTATUS;
}

#[derive(Debug)]
#[repr(C)]
pub struct OSVERSIONINFOW {
    pub dwOSVersionInfoSize: u32,
    pub dwMajorVersion: u32,
    pub dwMinorVersion: u32,
    pub dwBuildNumber: u32,
    pub dwPlatformId: u32,
    // In Rust, arrays longer than 32 elements don't have built-in "Default",
    // that's why we can't use Default derive.
    pub szCSDVersion: [u16; 128],
}

impl OSVERSIONINFOW {
  pub fn new() -> Self {
      Self {
          dwOSVersionInfoSize: std::mem::size_of::<OSVERSIONINFOW>() as u32,
          dwMajorVersion: 0,
          dwMinorVersion: 0,
          dwBuildNumber: 0,
          dwPlatformId: 0,
          szCSDVersion: [0; 128],
      }
  }
}

pub fn is_windows_version_higher(major: u32, minor: u32, build: u32) -> bool {
  let mut os_version_info = OSVERSIONINFOW::new();

  if unsafe { RtlGetVersion(&mut os_version_info) } == NTSTATUS(0) {
    if os_version_info.dwMajorVersion >= major && os_version_info.dwMinorVersion >= minor && os_version_info.dwBuildNumber >= build {
      return true
    }
  }

  false
}
