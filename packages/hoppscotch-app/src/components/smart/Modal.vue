<template>
  <Transition name="fade" appear @leave="onTransitionLeaveStart">
    <div
      ref="modal"
      class="fixed inset-0 z-50 overflow-y-auto transition"
      role="dialog"
    >
      <div
        class="flex items-end justify-center min-h-screen text-center sm:block"
      >
        <Transition name="fade" appear>
          <div
            class="fixed inset-0 transition-opacity"
            @touchstart="!dialog ? close() : null"
            @touchend="!dialog ? close() : null"
            @mouseup="!dialog ? close() : null"
            @mousedown="!dialog ? close() : null"
          >
            <div
              class="absolute inset-0 opacity-80 bg-primaryLight focus:outline-none"
              tabindex="0"
              @click="!dialog ? close() : null"
            ></div>
          </div>
        </Transition>
        <span
          v-if="placement === 'center'"
          class="sm:h-screen <sm:hidden sm:align-middle"
          aria-hidden="true"
          >&#8203;</span
        >
        <Transition name="bounce" appear>
          <div
            class="inline-block w-full overflow-hidden text-left align-bottom border shadow-lg transition-all transform border-dividerDark bg-primary sm:rounded-xl sm:align-middle"
            :class="[{ 'mt-24 md:mb-8': placement === 'top' }, maxWidth]"
          >
            <div
              v-if="title"
              class="flex items-center justify-between border-b border-dividerLight"
              :class="{ 'p-4': !fullWidth }"
            >
              <h3 class="heading" :class="{ 'ml-4': !fullWidth }">
                {{ title }}
              </h3>
              <span class="flex items-center">
                <slot name="actions"></slot>
                <kbd class="mr-2 shortcut-key">ESC</kbd>
                <ButtonSecondary
                  v-if="dimissible"
                  v-tippy="{ theme: 'tooltip', delay: [500, 20] }"
                  :title="t('action.close')"
                  :icon="IconX"
                  @click="close"
                />
              </span>
            </div>
            <div
              class="flex flex-col overflow-y-auto max-h-lg"
              :class="{ 'p-4': !fullWidth }"
            >
              <slot name="body"></slot>
            </div>
            <div
              v-if="hasFooterSlot"
              class="flex items-center justify-between flex-1 border-t border-dividerLight bg-primaryContrast"
              :class="{ 'p-4': !fullWidth }"
            >
              <slot name="footer"></slot>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
const PORTAL_DOM_ID = "hoppscotch-modal-portal"

// An ID ticker for generating consistently unique modal IDs
let stackIDTicker = 0

// Why ?
const stack = (() => {
  const stack: number[] = []
  return {
    push: stack.push.bind(stack),
    pop: stack.pop.bind(stack),
    peek: () => (stack.length === 0 ? undefined : stack[stack.length - 1]),
  }
})()
</script>

<script setup lang="ts">
import IconX from "~icons/lucide/x"
import { ref, computed, useSlots, onMounted, onBeforeUnmount } from "vue"
import { useKeybindingDisabler } from "~/helpers/keybindings"
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps({
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
})

const emit = defineEmits<{
  (e: "close"): void
}>()

const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

onBeforeUnmount(() => {
  enableKeybindings()
})

const stackId = ref(stackIDTicker++)
const shouldCleanupDomOnUnmount = ref(true)

const slots = useSlots()

const hasFooterSlot = computed(() => {
  return !!slots.footer
})

const modal = ref<Element>()

onMounted(() => {
  const portal = getPortal()
  portal.appendChild(modal.value!)
  stack.push(stackId.value)
  document.addEventListener("keydown", onKeyDown)

  disableKeybindings()
})

onBeforeUnmount(() => {
  if (shouldCleanupDomOnUnmount.value && modal.value) {
    getPortal().removeChild(modal.value)
  }
  stack.pop()
  document.removeEventListener("keydown", onKeyDown)
})

const close = () => {
  emit("close")
}

const onKeyDown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && stackId.value === stack.peek()) {
    e.preventDefault()
    close()
  }
}

const onTransitionLeaveStart = () => {
  close()
  shouldCleanupDomOnUnmount.value = false
}

const getPortal = () => {
  let el = document.querySelector("#" + PORTAL_DOM_ID)
  if (el) {
    return el
  }
  el = document.createElement("DIV")
  el.id = PORTAL_DOM_ID
  document.body.appendChild(el)
  return el
}
</script>

<style lang="scss" scoped>
.bounce-enter-active {
  @apply transition;
  animation: bounce-in 150ms;
}

@keyframes bounce-in {
  0% {
    transform: scale(0.95);
  }

  100% {
    transform: scale(1);
  }
}
</style>
