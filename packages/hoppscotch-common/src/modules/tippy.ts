import { HoppModule } from "."
import type { DirectiveBinding, VNode } from "vue"
import VueTippy, { useTippy, roundArrow, setDefaultProps } from "vue-tippy"

import "tippy.js/dist/tippy.css"
import "tippy.js/animations/scale-subtle.css"
import "tippy.js/dist/border.css"
import "tippy.js/dist/svg-arrow.css"

// Extended HTMLElement with tippy instance properties added by vue-tippy
interface TippyElement extends HTMLElement {
  $tippy?: {
    props: Record<string, unknown>
    setProps: (opts: Record<string, unknown>) => void
    destroy: () => void
  }
  _tippy?: {
    props: Record<string, unknown>
    setProps: (opts: Record<string, unknown>) => void
    destroy: () => void
  }
}

export type TippyState = {
  isEnabled: boolean
  isVisible: boolean
  isDestroyed: boolean
  isMounted: boolean
  isShown: boolean
}

export default <HoppModule>{
  onVueAppInit(app) {
    // Register VueTippy with a noop directive name so the plugin's built-in
    // v-tippy directive doesn't conflict with our custom one below.
    app.use(VueTippy, { directive: "tippy-original" })

    // Custom v-tippy directive to fix tooltips inside <tippy> wrappers.
    //
    // The original vue-tippy directive reads content from
    // `el.getAttribute('title')` which fails inside <tippy> wrappers because
    // tippy.js strips the title attribute before the directive reads it.
    //
    // This fix reads from `vnode.props` instead (immune to DOM stripping)
    // and copies binding.value to prevent mutation leaks.

    // Fixes #5915 (https://github.com/hoppscotch/hoppscotch/issues/5915)
    // Buttons inside a tippy wrapper were not showing tooltips because the
    // title attribute was being stripped by the parent tippy component before
    // the directive could read it. This change makes the directive read from
    // vnode.props first, which is not affected by DOM stripping, and then
    // fall back to reading from the DOM attributes if necessary.

    app.directive("tippy", {
      // Called once when the element is inserted into the DOM.
      // This is where we create the tippy instance. We read the tooltip
      // content from vnode.props (not the DOM) to avoid the title-stripping
      // race condition with parent <tippy> wrappers.
      mounted(el: TippyElement, binding: DirectiveBinding, vnode: VNode) {
        const opts =
          typeof binding.value === "string"
            ? { content: binding.value }
            : { ...(binding.value || {}) }

        // Read title from VNode props first (always available, immune to DOM
        // stripping by parent <tippy> components), then fall back to DOM attrs
        if (!opts.content) {
          const title = vnode.props?.title || el.getAttribute("title")
          if (title) {
            opts.content = title
            el.removeAttribute("title")
          }
        }

        if (!opts.content && el.getAttribute("content")) {
          opts.content = el.getAttribute("content")
        }

        useTippy(el, opts)
      },

      // Cleanup when the element is removed from the DOM (e.g. via v-if).
      // useTippy's internal onBeforeUnmount only fires when the parent
      // component unmounts, not when the element itself is conditionally removed.
      unmounted(el: TippyElement) {
        if (el._tippy) {
          el._tippy.destroy()
        } else if (el.$tippy) {
          el.$tippy.destroy()
        }
      },

      // Called on every re-render of the parent component.
      // Needed to sync tooltip content when reactive :title bindings change
      // (e.g. toggling "Add star" ↔ "Remove star" in History). Without this,
      // useTippy won't pick up changes since we pass a plain object, not a ref.
      updated(el: TippyElement, binding: DirectiveBinding, vnode: VNode) {
        const tippy = el.$tippy || el._tippy
        if (!tippy) return

        const opts =
          typeof binding.value === "string"
            ? { content: binding.value }
            : { ...(binding.value || {}) }

        if (!opts.content) {
          const title = vnode.props?.title || el.getAttribute("title")
          if (title) {
            opts.content = title
            el.removeAttribute("title")
          }
        }

        if (!opts.content && el.getAttribute("content")) {
          opts.content = el.getAttribute("content")
        }

        if (!opts.content) {
          opts.content = ""
        }

        // Skip setProps if nothing changed — tippy.js doesn't diff
        // internally and does expensive work (listener teardown/re-add,
        // Popper instance recreation) on every call.
        // Check both binding.value identity (covers reactive options like
        // theme/delay) and resolved content (covers :title changes)
        const currentContent = tippy.props?.content
        if (
          binding.value === binding.oldValue &&
          opts.content === currentContent
        )
          return

        tippy.setProps(opts)
      },
    })

    setDefaultProps({
      animation: "scale-subtle",
      appendTo: document.body,
      allowHTML: false,
      animateFill: false,
      arrow: roundArrow + roundArrow,
      popperOptions: {
        // https://popper.js.org/docs/v2/utils/detect-overflow/
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              rootBoundary: "document",
            },
          },
        ],
      },
    })
  },
}
