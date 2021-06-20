<template>
  <transition name="modal" appear @leave="onTransitionLeaveStart">
    <div
      ref="modal"
      class="modal-backdrop"
      @touchstart="onBackdropMouseDown"
      @touchend="onBackdropMouseUp"
      @mouseup="onBackdropMouseUp"
      @mousedown="onBackdropMouseDown"
    >
      <div class="modal-wrapper">
        <div class="modal-container">
          <div class="modal-header">
            <slot name="header"></slot>
          </div>
          <div class="modal-body">
            <slot name="body"></slot>
            <!-- <div class="top fade"></div>
            <div class="bottom fade"></div> -->
          </div>
          <div v-if="hasFooterSlot" class="modal-footer">
            <slot name="footer"></slot>
          </div>
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
      // when transition doesn't fire on unmount, we should manually remove the modal from DOM
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
.modal-backdrop {
  @apply fixed;
  @apply inset-0;
  @apply z-50;
  @apply w-full;
  @apply h-full;
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;

  background-color: rgba(0, 0, 0, 0.64);
}

.modal-wrapper {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply flex-1;
}

.modal-container {
  @apply relative;
  @apply flex;
  @apply flex-1;
  @apply flex-col;
  @apply m-2;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
  @apply bg-primary;
  @apply rounded-lg;
  @apply shadow-2xl;
  @apply border-4;
  @apply border-tooltip;

  max-height: calc(100vh - 128px);
  max-width: 640px;
}

.modal-header {
  @apply pl-2;
}

.modal-body {
  @apply overflow-auto;
}

.modal-footer {
  @apply p-2;
}

/*
  * The following styles are auto-applied to elements with
  * transition="modal" when their visibility is toggled
  * by Vue.js.
  *
  * You can easily play with the modal transition by editing
  * these styles.
  */

.modal-enter,
.modal-leave-active {
  @apply opacity-0;
}

.modal-enter .modal-container,
.modal-leave-active .modal-container {
  @apply transform;
  @apply scale-90;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
}

// .fade {
//   @apply absolute;
//   @apply block;
//   @apply transition;
//   @apply ease-in-out;
//   @apply duration-150;

//   left: 16px;
//   right: 20px;
//   height: 32px;

//   &.top {
//     top: 56px;
//     background: linear-gradient(to bottom, var(--primary-color), transparent);
//   }

//   &.bottom {
//     bottom: 16px;
//     background: linear-gradient(to top, var(--primary-color), transparent);
//   }
// }
</style>
