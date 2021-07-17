<template>
  <transition name="modal" appear @leave="onTransitionLeaveStart">
    <div
      ref="modal"
      class="
        bg-primaryLight
        flex
        h-full
        w-full
        inset-0
        transition
        z-50
        fixed
        items-center
        justify-center
      "
      @touchstart="onBackdropMouseDown"
      @touchend="onBackdropMouseUp"
      @mouseup="onBackdropMouseUp"
      @mousedown="onBackdropMouseDown"
    >
      <div
        class="
          bg-primary
          rounded-lg
          flex flex-col
          max-w-md max-h-lg
          flex-1
          m-2
          shadow-xl
          p-4
          transition
          modal-container
          relative
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
  data() {
    return {
      stackId: Math.random(),
      shouldCloseOnBackdropClick: true,
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
    onBackdropMouseDown({ target }) {
      this.shouldCloseOnBackdropClick =
        !this.checkIfTargetInsideModalContent(target)
    },
    onBackdropMouseUp({ target }) {
      if (
        this.shouldCloseOnBackdropClick &&
        !this.checkIfTargetInsideModalContent(target)
      ) {
        this.close()
      }
      this.shouldCloseOnBackdropClick = true
    },
    checkIfTargetInsideModalContent($target) {
      return $target?.closest(".modal-container")
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

<style scoped lang="scss">
.modal-enter,
.modal-leave-active {
  @apply opacity-0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  @apply transform;
  @apply scale-90;
  @apply transition;
}
</style>
