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

// Resolves tooltip options from directive binding, vnode props, and DOM attrs.
// Reads from vnode.props first (immune to DOM stripping by parent <tippy>
// components), then falls back to DOM attributes.
// Side effect: removes the title attribute from el to prevent the browser's
// native tooltip from showing alongside the tippy tooltip.
function resolveOpts(
  el: TippyElement,
  binding: DirectiveBinding,
  vnode: VNode
): Record<string, unknown> {
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

  return opts
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
    //
    // Fixes #5915 (https://github.com/hoppscotch/hoppscotch/issues/5915)

    app.directive("tippy", {
      // Called once when the element is inserted into the DOM.
      // Creates the tippy instance with content resolved from vnode.props
      // to avoid the title-stripping race with parent <tippy> wrappers.
      mounted(el: TippyElement, binding: DirectiveBinding, vnode: VNode) {
        useTippy(el, resolveOpts(el, binding, vnode))
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

        const opts = resolveOpts(el, binding, vnode)

        if (!opts.content) {
          opts.content = ""
        }

        // Skip setProps if nothing changed — tippy.js doesn't diff
        // internally and does expensive work (listener teardown/re-add,
        // Popper instance recreation) on every call.
        // Note: binding.value is a new object ref on every render for inline
        // literals like v-tippy="{ theme: 'tooltip' }", so we only guard on
        // resolved content. If reactive options (theme/delay) are needed in
        // the future, add a shallow comparison of opts vs tippy.props here.
        const currentContent = tippy.props?.content
        if (opts.content === currentContent) return

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
