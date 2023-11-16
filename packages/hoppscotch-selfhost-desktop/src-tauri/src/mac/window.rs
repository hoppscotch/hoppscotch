use hex_color::HexColor;
use tauri::{App, Manager, Runtime, Window};

// If anything breaks on macOS, this should be the place which is broken
// We have to override Tauri (Tao) 's built-in NSWindowDelegate implementation with a
// custom implementation so we can emit events on full screen mode changes.
// Our custom implementation tries to mock the Tauri implementation. So please do refer to the relevant parts

// Apple's NSWindowDelegate reference: https://developer.apple.com/documentation/appkit/nswindowdelegate?language=objc
// Tao's Window Delegate Implementation: https://github.com/tauri-apps/tao/blob/dev/src/platform_impl/macos/window_delegate.rs

#[allow(dead_code)]
pub enum ToolbarThickness {
    Thick,
    Medium,
    Thin,
}

const WINDOW_CONTROL_PAD_X: f64 = 15.0;
const WINDOW_CONTROL_PAD_Y: f64 = 23.0;

pub trait WindowExt {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self);
}

#[cfg(target_os = "macos")]
unsafe fn set_transparent_titlebar(id: cocoa::base::id) {
    use cocoa::appkit::NSWindow;

    id.setTitlebarAppearsTransparent_(cocoa::base::YES);
    id.setTitleVisibility_(cocoa::appkit::NSWindowTitleVisibility::NSWindowTitleHidden);
}

struct UnsafeWindowHandle(*mut std::ffi::c_void);
unsafe impl Send for UnsafeWindowHandle {}
unsafe impl Sync for UnsafeWindowHandle {}

#[cfg(target_os = "macos")]
fn update_window_theme(window: &tauri::Window, color: HexColor) {
    use cocoa::appkit::{
        NSAppearance, NSAppearanceNameVibrantDark, NSAppearanceNameVibrantLight, NSWindow,
    };

    let brightness = (color.r as u64 + color.g as u64 + color.b as u64) / 3;

    unsafe {
        let window_handle = UnsafeWindowHandle(window.ns_window().unwrap());

        let _ = window.run_on_main_thread(move || {
            let handle = window_handle;

            let selected_appearance = if brightness >= 128 {
                NSAppearance(NSAppearanceNameVibrantLight)
            } else {
                NSAppearance(NSAppearanceNameVibrantDark)
            };

            NSWindow::setAppearance(handle.0 as cocoa::base::id, selected_appearance);
            set_window_controls_pos(
                handle.0 as cocoa::base::id,
                WINDOW_CONTROL_PAD_X,
                WINDOW_CONTROL_PAD_Y,
            );
        });
    }
}

#[cfg(target_os = "macos")]
fn set_window_controls_pos(window: cocoa::base::id, x: f64, y: f64) {
    use cocoa::{
        appkit::{NSView, NSWindow, NSWindowButton},
        foundation::NSRect,
    };

    unsafe {
        let close = window.standardWindowButton_(NSWindowButton::NSWindowCloseButton);
        let miniaturize = window.standardWindowButton_(NSWindowButton::NSWindowMiniaturizeButton);
        let zoom = window.standardWindowButton_(NSWindowButton::NSWindowZoomButton);

        let title_bar_container_view = close.superview().superview();

        let close_rect: NSRect = msg_send![close, frame];
        let button_height = close_rect.size.height;

        let title_bar_frame_height = button_height + y;
        let mut title_bar_rect = NSView::frame(title_bar_container_view);
        title_bar_rect.size.height = title_bar_frame_height;
        title_bar_rect.origin.y = NSView::frame(window).size.height - title_bar_frame_height;
        let _: () = msg_send![title_bar_container_view, setFrame: title_bar_rect];

        let window_buttons = vec![close, miniaturize, zoom];
        let space_between = NSView::frame(miniaturize).origin.x - NSView::frame(close).origin.x;

        for (i, button) in window_buttons.into_iter().enumerate() {
            let mut rect: NSRect = NSView::frame(button);
            rect.origin.x = x + (i as f64 * space_between);
            button.setFrameOrigin(rect.origin);
        }
    }
}

impl<R: Runtime> WindowExt for Window<R> {
    #[cfg(target_os = "macos")]
    fn set_transparent_titlebar(&self) {
        unsafe {
            let id = self.ns_window().unwrap() as cocoa::base::id;

            set_transparent_titlebar(id);

            set_window_controls_pos(id, WINDOW_CONTROL_PAD_X, WINDOW_CONTROL_PAD_Y);
        }
    }
}

#[cfg(target_os = "macos")]
#[derive(Debug)]
struct HoppAppState {
    window: Window,
}

#[cfg(target_os = "macos")]
pub fn setup_mac_window(app: &mut App) {
    use cocoa::appkit::NSWindow;
    use cocoa::base::{id, BOOL};
    use cocoa::foundation::NSUInteger;
    use objc::runtime::{Object, Sel};
    use std::ffi::c_void;

    fn with_hopp_app<F: FnOnce(&mut HoppAppState) -> T, T>(this: &Object, func: F) {
        let ptr = unsafe {
            let x: *mut c_void = *this.get_ivar("hoppApp");
            &mut *(x as *mut HoppAppState)
        };
        func(ptr);
    }

    let window = app.get_window("main").unwrap();

    unsafe {
        let ns_win = window.ns_window().unwrap() as id;

        let current_delegate: id = ns_win.delegate();

        extern "C" fn on_window_should_close(this: &Object, _cmd: Sel, sender: id) -> BOOL {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                msg_send![super_del, windowShouldClose: sender]
            }
        }
        extern "C" fn on_window_will_close(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowWillClose: notification];
            }
        }
        extern "C" fn on_window_did_resize(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_hopp_app(&*this, |state| {
                    let id = state.window.ns_window().unwrap() as id;

                    set_window_controls_pos(id, WINDOW_CONTROL_PAD_X, WINDOW_CONTROL_PAD_Y);
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidResize: notification];
            }
        }
        extern "C" fn on_window_did_move(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidMove: notification];
            }
        }
        extern "C" fn on_window_did_change_backing_properties(
            this: &Object,
            _cmd: Sel,
            notification: id,
        ) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidChangeBackingProperties: notification];
            }
        }
        extern "C" fn on_window_did_become_key(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidBecomeKey: notification];
            }
        }
        extern "C" fn on_window_did_resign_key(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidResignKey: notification];
            }
        }
        extern "C" fn on_dragging_entered(this: &Object, _cmd: Sel, notification: id) -> BOOL {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                msg_send![super_del, draggingEntered: notification]
            }
        }
        extern "C" fn on_prepare_for_drag_operation(
            this: &Object,
            _cmd: Sel,
            notification: id,
        ) -> BOOL {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                msg_send![super_del, prepareForDragOperation: notification]
            }
        }
        extern "C" fn on_perform_drag_operation(this: &Object, _cmd: Sel, sender: id) -> BOOL {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                msg_send![super_del, performDragOperation: sender]
            }
        }
        extern "C" fn on_conclude_drag_operation(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, concludeDragOperation: notification];
            }
        }
        extern "C" fn on_dragging_exited(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, draggingExited: notification];
            }
        }
        extern "C" fn on_window_will_use_full_screen_presentation_options(
            this: &Object,
            _cmd: Sel,
            window: id,
            proposed_options: NSUInteger,
        ) -> NSUInteger {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                msg_send![super_del, window: window willUseFullScreenPresentationOptions: proposed_options]
            }
        }
        extern "C" fn on_window_did_enter_full_screen(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_hopp_app(&*this, |state| {
                    state.window.emit("did-enter-fullscreen", ()).unwrap();
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidEnterFullScreen: notification];
            }
        }
        extern "C" fn on_window_will_enter_full_screen(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_hopp_app(&*this, |state| {
                    state.window.emit("will-enter-fullscreen", ()).unwrap();
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowWillEnterFullScreen: notification];
            }
        }
        extern "C" fn on_window_did_exit_full_screen(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_hopp_app(&*this, |state| {
                    state.window.emit("did-exit-fullscreen", ()).unwrap();

                    let id = state.window.ns_window().unwrap() as id;
                    set_window_controls_pos(id, WINDOW_CONTROL_PAD_X, WINDOW_CONTROL_PAD_Y);
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidExitFullScreen: notification];
            }
        }
        extern "C" fn on_window_will_exit_full_screen(this: &Object, _cmd: Sel, notification: id) {
            unsafe {
                with_hopp_app(&*this, |state| {
                    state.window.emit("will-exit-fullscreen", ()).unwrap();
                });

                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowWillExitFullScreen: notification];
            }
        }
        extern "C" fn on_window_did_fail_to_enter_full_screen(
            this: &Object,
            _cmd: Sel,
            window: id,
        ) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, windowDidFailToEnterFullScreen: window];
            }
        }
        extern "C" fn on_effective_appearance_did_change(
            this: &Object,
            _cmd: Sel,
            notification: id,
        ) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![super_del, effectiveAppearanceDidChange: notification];
            }
        }
        extern "C" fn on_effective_appearance_did_changed_on_main_thread(
            this: &Object,
            _cmd: Sel,
            notification: id,
        ) {
            unsafe {
                let super_del: id = *this.get_ivar("super_delegate");
                let _: () = msg_send![
                    super_del,
                    effectiveAppearanceDidChangedOnMainThread: notification
                ];
            }
        }

        // extern fn on_dealloc(this: &Object, cmd: Sel) {
        //   unsafe {
        //     let super_del: id = *this.get_ivar("super_delegate");
        //     let _: () = msg_send![super_del, dealloc];
        //   }
        // }

        // extern fn on_mark_is_checking_zoomed_in(this: &Object, cmd: Sel) {
        //   unsafe {
        //     let super_del: id = *this.get_ivar("super_delegate");
        //     let _: () = msg_send![super_del, markIsCheckingZoomedIn];
        //   }
        // }

        // extern fn on_clear_is_checking_zoomed_in(this: &Object, cmd: Sel) {
        //   unsafe {
        //     let super_del: id = *this.get_ivar("super_delegate");
        //     let _: () = msg_send![super_del, clearIsCheckingZoomedIn];
        //   }
        // }

        // Are we deallocing this properly ? (I miss safe Rust :(  )
        let app_state = HoppAppState { window };
        let app_box = Box::into_raw(Box::new(app_state)) as *mut c_void;

        ns_win.setDelegate_(delegate!("MainWindowDelegate", {
      window: id = ns_win,
      hoppApp: *mut c_void = app_box,
      toolbar: id = cocoa::base::nil,
      super_delegate: id = current_delegate,
      // (dealloc) => on_dealloc as extern fn(&Object, Sel),
      // (markIsCheckingZoomedIn) => on_mark_is_checking_zoomed_in as extern fn(&Object, Sel),
      // (clearIsCheckingZoomedIn) => on_clear_is_checking_zoomed_in as extern fn(&Object, Sel),
      (windowShouldClose:) => on_window_should_close as extern fn(&Object, Sel, id) -> BOOL,
      (windowWillClose:) => on_window_will_close as extern fn(&Object, Sel, id),
      (windowDidResize:) => on_window_did_resize as extern fn(&Object, Sel, id),
      (windowDidMove:) => on_window_did_move as extern fn(&Object, Sel, id),
      (windowDidChangeBackingProperties:) => on_window_did_change_backing_properties as extern fn(&Object, Sel, id),
      (windowDidBecomeKey:) => on_window_did_become_key as extern fn(&Object, Sel, id),
      (windowDidResignKey:) => on_window_did_resign_key as extern fn(&Object, Sel, id),
      (draggingEntered:) => on_dragging_entered as extern fn(&Object, Sel, id) -> BOOL,
      (prepareForDragOperation:) => on_prepare_for_drag_operation as extern fn(&Object, Sel, id) -> BOOL,
      (performDragOperation:) => on_perform_drag_operation as extern fn(&Object, Sel, id) -> BOOL,
      (concludeDragOperation:) => on_conclude_drag_operation as extern fn(&Object, Sel, id),
      (draggingExited:) => on_dragging_exited as extern fn(&Object, Sel, id),
      (window:willUseFullScreenPresentationOptions:) => on_window_will_use_full_screen_presentation_options as extern fn(&Object, Sel, id, NSUInteger) -> NSUInteger,
      (windowDidEnterFullScreen:) => on_window_did_enter_full_screen as extern fn(&Object, Sel, id),
      (windowWillEnterFullScreen:) => on_window_will_enter_full_screen as extern fn(&Object, Sel, id),
      (windowDidExitFullScreen:) => on_window_did_exit_full_screen as extern fn(&Object, Sel, id),
      (windowWillExitFullScreen:) => on_window_will_exit_full_screen as extern fn(&Object, Sel, id),
      (windowDidFailToEnterFullScreen:) => on_window_did_fail_to_enter_full_screen as extern fn(&Object, Sel, id),
      (effectiveAppearanceDidChange:) => on_effective_appearance_did_change as extern fn(&Object, Sel, id),
      (effectiveAppearanceDidChangedOnMainThread:) => on_effective_appearance_did_changed_on_main_thread as extern fn(&Object, Sel, id)
    }))
    }

    app.get_window("main").unwrap().set_transparent_titlebar();

    let window_handle = app.get_window("main").unwrap();
    update_window_theme(&window_handle, HexColor::WHITE);

    // Control window theme based on app update_window
    app.listen_global("hopp-bg-changed", move |ev| {
        let payload = serde_json::from_str::<&str>(ev.payload().unwrap())
            .unwrap()
            .trim();

        let color = HexColor::parse_rgb(payload).unwrap();

        update_window_theme(&window_handle, color);
    });
}
