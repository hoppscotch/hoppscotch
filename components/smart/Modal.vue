<template>
  <transition name="fade" appear @leave="onTransitionLeaveStart">
    <div
      ref="modal"
      class="inset-0 transition z-10 z-50 fixed hide-scrollbar overflow-y-auto"
    >
      <div
        class="flex min-h-screen text-center items-end justify-center sm:block"
      >
        <transition name="fade" appear>
          <div
            class="bg-primaryDark inset-0 transition-opacity fixed"
            @touchstart="!dialog ? close() : null"
            @touchend="!dialog ? close() : null"
            @mouseup="!dialog ? close() : null"
            @mousedown="!dialog ? close() : null"
          ></div>
        </transition>
        <span
          class="hidden sm:inline-block sm:align-middle sm:h-screen"
          aria-hidden="true"
          >&#8203;</span
        >
        <transition
          appear
          enter-active-class="transition"
          enter-class="translate-y-4 scale-95"
          enter-to-class="translate-y-0 scale-100"
          leave-active-class="transition"
          leave-class="translate-y-0 scale-100"
          leave-to-class="translate-y-4 scale-95"
        >
          <div
            class="
              bg-primary
              rounded
              shadow-xl
              m-4
              text-left
              w-full
              p-4
              transform
              transition-all
              inline-block
              align-bottom
              overflow-hidden
              sm:align-middle sm:max-w-md
            "
          >
            <div class="flex pl-2 items-center justify-between">
              <slot name="header"></slot>
            </div>
            <div class="flex flex-col my-4 overflow-auto">
              <slot name="body"></slot>
            </div>
            <div
              v-if="hasFooterSlot"
              class="flex flex-1 p-2 items-center justify-between"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script>
const PORTAL_DOM_ID = "hoppscotch-modal-portal"

const stack = (() => {
  const stack = []
  return {
    push: stack.push.bind(stack),
    pop: stack.pop.bind(stack),
    peek: () => (stack.length === 0 ? undefined : stack[stack.length - 1]),
  }
})()

export default {
  props: {
    dialog: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      stackId: Math.random(),
      // when doesn't fire on unmount, we should manually remove the modal from DOM
      // (for example, when the parent component of this modal gets destroyed)
      shouldCleanupDomOnUnmount: true,
    }
  },
  computed: {
    hasFooterSlot() {
      return !!this.$slots.footer
    },
  },
  mounted() {
    const $portal = this.$getPortal()
    $portal.appendChild(this.$refs.modal)
    stack.push(this.stackId)
    document.addEventListener("keydown", this.onKeyDown)
  },
  beforeDestroy() {
    const $modal = this.$refs.modal
    if (this.shouldCleanupDomOnUnmount && $modal) {
      this.$getPortal().removeChild($modal)
    }
    stack.pop()
    document.removeEventListener("keydown", this.onKeyDown)
  },
  methods: {
    close() {
      this.$emit("close")
    },
    onKeyDown(e) {
      if (e.key === "Escape" && this.stackId === stack.peek()) {
        e.preventDefault()
        this.close()
      }
    },
    onTransitionLeaveStart() {
      this.shouldCleanupDomOnUnmount = false
    },
    $getPortal() {
      let $el = document.querySelector("#" + PORTAL_DOM_ID)
      if ($el) {
        return $el
      }
      $el = document.createElement("DIV")
      $el.id = PORTAL_DOM_ID
      document.body.appendChild($el)
      return $el
    },
  },
}
</script>
