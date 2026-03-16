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
    setProps: (opts: Record<string, unknown>) => void
    destroy: () => void
  }
  _tippy?: {
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
    app.use(VueTippy)

    // Override the v-tippy directive to fix tooltips inside <tippy> wrappers.
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
    //  vnode.props first, which is not affected by DOM stripping,and then
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

      // Called on every re-render of the parent component.
      // Needed to sync tooltip content when reactive :title bindings change
      // (e.g. toggling "Add star" ↔ "Remove star" in History). Without this,
      // useTippy won't pick up changes since we pass a plain object, not a ref.
      updated(el: TippyElement, binding: DirectiveBinding, vnode: VNode) {
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
          opts.content = null
        }

        if (el.$tippy) {
          el.$tippy.setProps(opts || {})
        } else if (el._tippy) {
          el._tippy.setProps(opts || {})
        }
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
