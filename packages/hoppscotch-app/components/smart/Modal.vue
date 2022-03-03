<template>
  <transition name="fade" appear @leave="onTransitionLeaveStart">
    <div
      ref="modal"
      class="fixed inset-0 z-10 z-50 overflow-y-auto transition hide-scrollbar"
      role="dialog"
      aria-modal="true"
    >
      <div
        class="flex items-end justify-center min-h-screen text-center sm:block"
      >
        <transition name="fade" appear>
          <div
            class="fixed inset-0 transition bg-primaryLight opacity-90"
            @touchstart="!dialog ? close() : null"
            @touchend="!dialog ? close() : null"
            @mouseup="!dialog ? close() : null"
            @mousedown="!dialog ? close() : null"
          ></div>
        </transition>
        <span
          v-if="placement === 'center'"
          class="sm:h-screen <sm:hidden sm:align-middle"
          aria-hidden="true"
          >&#8203;</span
        >
        <transition
          appear
          enter-active-class="transition"
          enter-class="scale-95 translate-y-4"
          enter-to-class="scale-100 translate-y-0"
          leave-active-class="transition"
          leave-class="scale-100 translate-y-0"
          leave-to-class="scale-95 translate-y-4"
        >
          <div
            class="inline-block w-full overflow-hidden text-left align-bottom shadow-lg transition-all transform bg-primary sm:rounded-xl sm:align-middle"
            :class="[
              { 'mt-24 md:mb-8': placement === 'top' },
              { 'p-4': !fullWidth },
              maxWidth,
            ]"
          >
            <div
              v-if="title"
              class="flex items-center justify-between pl-2 mb-4"
            >
              <h3 class="heading">{{ title }}</h3>
              <span class="flex">
                <slot name="actions"></slot>
                <ButtonSecondary
                  v-if="dimissible"
                  svg="x"
                  @click.native="close"
                />
              </span>
            </div>
            <div
              class="flex flex-col overflow-y-auto max-h-md hide-scrollbar"
              :class="{ 'py-2': !fullWidth }"
            >
              <slot name="body"></slot>
            </div>
            <div
              v-if="hasFooterSlot"
              class="flex items-center justify-between flex-1 p-2 mt-4"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </transition>
      </div>
    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent, onBeforeUnmount } from "@nuxtjs/composition-api"
import { useKeybindingDisabler } from "~/helpers/keybindings"

const PORTAL_DOM_ID = "hoppscotch-modal-portal"

// Why ?
const stack = (() => {
  const stack: number[] = []
  return {
    push: stack.push.bind(stack),
    pop: stack.pop.bind(stack),
    peek: () => (stack.length === 0 ? undefined : stack[stack.length - 1]),
  }
})()

export default defineComponent({
  props: {
    dialog: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: "",
    },
    dimissible: {
      type: Boolean,
      default: true,
    },
    placement: {
      type: String,
      default: "top",
    },
    fullWidth: {
      type: Boolean,
      default: false,
    },
    maxWidth: {
      type: String,
      default: "sm:max-w-lg",
    },
  },
  setup() {
    const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

    onBeforeUnmount(() => {
      enableKeybindings()
    })

    return {
      disableKeybindings,
    }
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
    hasFooterSlot(): boolean {
      return !!this.$slots.footer
    },
  },
  mounted() {
    const $portal = this.$getPortal()
    $portal.appendChild(this.$refs.modal as any)
    stack.push(this.stackId)
    document.addEventListener("keydown", this.onKeyDown)
    this.disableKeybindings()
  },
  beforeDestroy() {
    const $modal = this.$refs.modal
    if (this.shouldCleanupDomOnUnmount && $modal) {
      this.$getPortal().removeChild($modal as any)
    }
    stack.pop()
    document.removeEventListener("keydown", this.onKeyDown)
  },
  methods: {
    close() {
      this.$emit("close")
    },
    onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && this.stackId === stack.peek()) {
        e.preventDefault()
        this.close()
      }
    },
    onTransitionLeaveStart() {
      this.close()
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
})
</script>
