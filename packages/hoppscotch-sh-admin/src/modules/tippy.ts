import { HoppModule } from '.';
import type { DirectiveBinding, VNode } from 'vue';
import VueTippy, { useTippy, roundArrow, setDefaultProps } from 'vue-tippy';

import 'tippy.js/dist/tippy.css';
import 'tippy.js/animations/scale-subtle.css';
import 'tippy.js/dist/border.css';
import 'tippy.js/dist/svg-arrow.css';

interface TippyElement extends HTMLElement {
  $tippy?: {
    props: Record<string, unknown>;
    setProps: (opts: Record<string, unknown>) => void;
    destroy: () => void;
  };
  _tippy?: {
    props: Record<string, unknown>;
    setProps: (opts: Record<string, unknown>) => void;
    destroy: () => void;
  };
}

// Resolves tooltip options from directive binding, vnode props, and DOM attrs.
// Reads from vnode.props first (immune to DOM stripping by parent <tippy>
// components), then falls back to DOM attributes.
function resolveOpts(
  el: TippyElement,
  binding: DirectiveBinding,
  vnode: VNode,
): Record<string, unknown> {
  const opts =
    typeof binding.value === 'string'
      ? { content: binding.value }
      : { ...(binding.value || {}) };

  if (!opts.content) {
    const title = vnode.props?.title ?? el.getAttribute('title');
    if (title) {
      opts.content = title;
    }
  }

  if (!opts.content && el.getAttribute('content')) {
    opts.content = el.getAttribute('content');
  }

  return opts;
}

export default <HoppModule>{
  onVueAppInit(app) {
    // Register VueTippy under a noop directive name so it doesn't conflict
    // with the custom v-tippy below.
    app.use(VueTippy, { directive: 'tippy-original' });

    // Custom v-tippy directive: reads content from vnode.props instead of
    // el.getAttribute('title') to fix tooltips inside <tippy> wrappers where
    // tippy.js strips the title attribute before the child directive reads it.
    app.directive('tippy', {
      mounted(el: TippyElement, binding: DirectiveBinding, vnode: VNode) {
        const opts = resolveOpts(el, binding, vnode);
        el.removeAttribute('title');
        // useTippy (not tippy() directly) so setDefaultProps are applied.
        // Works outside setup() because vue-tippy v6.x guards getCurrentInstance().
        useTippy(el, opts);
      },

      // Explicit cleanup for v-if removals — useTippy's internal
      // onBeforeUnmount only fires on component unmount, not element removal.
      unmounted(el: TippyElement) {
        if (el._tippy) {
          el._tippy.destroy();
        } else if (el.$tippy) {
          el.$tippy.destroy();
        }
      },

      // Sync tooltip content when reactive :title bindings change
      // (e.g. "Add star" ↔ "Remove star" in History).
      updated(el: TippyElement, binding: DirectiveBinding, vnode: VNode) {
        const tippy = el.$tippy || el._tippy;
        if (!tippy) return;

        const opts = resolveOpts(el, binding, vnode);

        if (!opts.content) {
          opts.content = '';
        }

        // Vue re-applies :title on each patch cycle
        el.removeAttribute('title');

        // Skip if content unchanged — setProps is expensive (recreates Popper).
        const currentContent = tippy.props?.content;
        if (opts.content === currentContent) return;

        tippy.setProps(opts);
      },
    });

    setDefaultProps({
      animation: 'scale-subtle',
      appendTo: document.body,
      allowHTML: false,
      animateFill: false,
      arrow: roundArrow + roundArrow,
      popperOptions: {
        // https://popper.js.org/docs/v2/utils/detect-overflow/
        modifiers: [
          {
            name: 'preventOverflow',
            options: {
              rootBoundary: 'document',
            },
          },
        ],
      },
    });
  },
};
