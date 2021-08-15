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
            class="bg-primaryDark opacity-90 inset-0 transition fixed"
            @touchstart="!dialog ? close() : null"
            @touchend="!dialog ? close() : null"
            @mouseup="!dialog ? close() : null"
            @mousedown="!dialog ? close() : null"
          ></div>
        </transition>
        <span
          v-if="placement === 'center'"
          class="hidden sm:h-screen sm:inline-block sm:align-middle"
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
              shadow-lg
              text-left
              w-full
              p-4
              transform
              transition-all
              inline-block
              align-bottom
              overflow-hidden
              sm:max-w-md sm:align-middle
              md:rounded-lg
            "
            :class="{ 'mt-24 md:mb-8': placement === 'top' }"
          >
            <div
              v-if="title"
              class="flex mb-4 pl-2 items-center justify-between"
            >
              <h3 class="heading">{{ title }}</h3>
              <span class="flex">
                <slot name="actions"></slot>
                <ButtonSecondary
                  v-if="dimissible"
                  class="rounded"
                  icon="close"
                  @click.native="close"
                />
              </span>
            </div>
            <div
              class="flex flex-col max-h-md py-2 overflow-y-auto hide-scrollbar"
            >
              <slot name="body"></slot>
            </div>
            <div
              v-if="hasFooterSlot"
              class="flex flex-1 mt-4 p-2 items-center justify-between"
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
import { defineComponent } from "@nuxtjs/composition-api"
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
  },
  setup() {
    const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

    return {
      disableKeybindings,
      enableKeybindings,
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
      this.enableKeybindings()
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
