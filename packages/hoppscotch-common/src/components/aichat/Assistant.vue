<template>
  <div v-if="shouldEnableAIFeatures" class="contents">
    <!-- Docked, resizable chat pane -->
    <aside
      v-if="chat.isOpen.value"
      class="flex flex-col bg-primary"
      :class="
        mdAndLarger
          ? 'relative h-full shrink-0 border-l border-dividerLight'
          : 'fixed inset-0 z-[1100]'
      "
      :style="mdAndLarger ? { width: paneWidth } : undefined"
      @keydown.esc="chat.close()"
    >
      <!-- Resize handle (desktop only) -->
      <div
        v-if="mdAndLarger"
        class="group absolute inset-y-0 left-0 z-20 w-1.5 -translate-x-1/2 cursor-col-resize"
        @mousedown="startResize"
      >
        <span
          class="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors"
          :class="
            isResizing ? 'bg-accent' : 'bg-transparent group-hover:bg-accent'
          "
        />
      </div>

      <!-- Header -->
      <header
        class="relative flex shrink-0 items-center justify-between gap-2 border-b border-dividerLight px-3 py-2.5 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:opacity-0 after:transition-opacity after:duration-300 after:content-[''] after:[background:linear-gradient(90deg,transparent,color-mix(in_srgb,var(--accent-color)_45%,transparent),transparent)] after:[background-size:200%_100%]"
        :class="{
          'after:animate-[chat-header-sweep_1.6s_linear_infinite] after:opacity-100 motion-reduce:after:animate-none':
            chat.isStreaming.value,
        }"
      >
        <div class="flex min-w-0 items-center gap-2">
          <span
            class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primaryLight text-accent [background:color-mix(in_srgb,var(--accent-color)_10%,var(--primary-light-color))]"
          >
            <IconSparkles class="h-3.5 w-3.5" />
          </span>
          <span class="truncate text-sm font-semibold text-secondaryDark">
            {{ t("ai_experiments.chat.title") }}
          </span>
          <span
            class="shrink-0 rounded border border-dividerLight px-1 py-px text-[0.6rem] font-medium uppercase tracking-wide text-secondaryLight"
          >
            Beta
          </span>
        </div>
        <div class="flex shrink-0 items-center">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('ai_experiments.chat.clear')"
            :icon="IconTrash2"
            :disabled="
              chat.messages.value.length === 0 || chat.isStreaming.value
            "
            @click="chat.clear()"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('ai_experiments.chat.collapse')"
            :icon="IconPanelRightClose"
            @click="chat.close()"
          />
        </div>
      </header>

      <!-- Context -->
      <div
        class="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-dividerLight px-3 py-2"
      >
        <span
          class="text-tiny font-medium uppercase tracking-wide text-secondaryLight"
        >
          {{ t("ai_experiments.chat.context") }}
        </span>
        <template v-if="context.items.value.length">
          <button
            v-for="item in context.items.value"
            :key="item.id"
            v-tippy="{ theme: 'tooltip' }"
            :title="item.detail"
            class="flex max-w-[10rem] items-center gap-1 rounded-full border px-2 py-0.5 text-tiny transition"
            :class="
              context.isIncluded(item.id)
                ? 'border-dividerDark bg-primaryDark text-secondaryDark'
                : 'border-dividerLight text-secondaryLight opacity-60 hover:opacity-100'
            "
            @click="context.toggle(item.id)"
          >
            <component
              :is="context.isIncluded(item.id) ? IconCheck : IconPlus"
              class="h-3 w-3 shrink-0"
              :class="context.isIncluded(item.id) ? 'text-accent' : ''"
            />
            <span class="truncate">{{ item.label }}</span>
          </button>
        </template>
        <span v-else class="text-tiny text-secondaryLight">
          {{ t("ai_experiments.chat.no_context") }}
        </span>
      </div>

      <!-- Messages -->
      <div ref="scrollEl" class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <!-- Empty state -->
        <div
          v-if="chat.messages.value.length === 0"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
          <span
            class="flex h-11 w-11 items-center justify-center rounded-xl bg-primaryLight text-accent [background:color-mix(in_srgb,var(--accent-color)_10%,var(--primary-light-color))]"
          >
            <IconSparkles class="h-5 w-5" />
          </span>
          <p class="mt-3 text-sm font-semibold text-secondaryDark">
            {{ t("ai_experiments.chat.empty_title") }}
          </p>
          <p
            class="mt-1 max-w-xs text-tiny leading-relaxed text-secondaryLight"
          >
            {{ t("ai_experiments.chat.empty_subtitle") }}
          </p>

          <div class="mt-5 w-full max-w-xs space-y-1.5 text-left">
            <button
              v-for="s in suggestions"
              :key="s"
              class="group flex w-full items-center gap-2 rounded-lg border border-dividerLight bg-primaryLight px-3 py-2 text-xs text-secondary transition hover:border-divider hover:text-secondaryDark"
              @click="send(t(s))"
            >
              <IconArrowUpRight
                class="h-3.5 w-3.5 shrink-0 text-secondaryLight transition group-hover:text-accent"
              />
              <span class="truncate">{{ t(s) }}</span>
            </button>
          </div>
        </div>

        <AichatMessage
          v-for="message in chat.messages.value"
          :key="message.id"
          :message="message"
        />

        <!-- Contextual next-step suggestions for the completed turn -->
        <div v-if="followUps.length" class="flex flex-wrap gap-1.5 pt-1">
          <button
            v-for="s in followUps"
            :key="s"
            class="group flex items-center gap-1 rounded-full border border-dividerLight bg-primaryLight px-2.5 py-1 text-tiny text-secondary transition hover:-translate-y-px hover:border-divider hover:text-secondaryDark"
            @click="send(t(s))"
          >
            <IconArrowUpRight
              class="h-3 w-3 shrink-0 text-secondaryLight transition group-hover:text-accent"
            />
            <span class="truncate">{{ t(s) }}</span>
          </button>
        </div>
      </div>

      <!-- Input -->
      <div class="shrink-0 border-t border-dividerLight px-3 py-3">
        <div
          class="flex items-end gap-2 rounded-xl border border-divider bg-primaryLight px-3 py-2 transition focus-within:border-accent"
        >
          <textarea
            ref="textareaEl"
            v-model="input"
            v-focus
            rows="1"
            :placeholder="t('ai_experiments.chat.placeholder')"
            class="max-h-40 min-w-0 flex-1 resize-none self-center whitespace-pre-wrap [overflow-wrap:anywhere] bg-transparent text-xs text-secondaryDark placeholder:text-secondaryLight focus:outline-none"
            @input="autoResize"
            @keydown="onKeydown"
          ></textarea>
          <button
            v-tippy="{ theme: 'tooltip' }"
            :title="t('ai_experiments.chat.send')"
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-accentContrast transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!input.trim() || chat.isStreaming.value"
            @click="send()"
          >
            <IconArrowUp class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Launcher -->
    <button
      v-if="!chat.isOpen.value"
      v-tippy="{ theme: 'tooltip', placement: 'left' }"
      :title="t('ai_experiments.chat.title')"
      class="fixed bottom-4 right-4 z-[1100] flex h-11 w-11 items-center justify-center rounded-full border border-dividerLight bg-primary text-accent shadow-[0_2px_10px_-2px_rgb(0_0_0_/_0.25)] transition hover:scale-105 hover:border-accent hover:bg-primaryLight hover:[border-color:color-mix(in_srgb,var(--accent-color)_45%,transparent)] hover:[box-shadow:0_4px_16px_-4px_color-mix(in_srgb,var(--accent-color)_35%,transparent)] active:scale-95"
      @click="openChat"
    >
      <IconSparkles class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue"
import {
  breakpointsTailwind,
  useBreakpoints,
  useEventListener,
  useLocalStorage,
} from "@vueuse/core"
import { useService } from "dioc/vue"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { useAIExperiments } from "~/composables/ai-experiments"
import { useChatContext } from "~/composables/chat-context"
import { AIChatService } from "~/services/ai-chat.service"
import { getFollowUpSuggestions } from "~/helpers/aichat/suggestions"
import { invokeAction } from "~/helpers/actions"
import { platform } from "~/platform"
import IconSparkles from "~icons/lucide/sparkles"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPanelRightClose from "~icons/lucide/panel-right-close"
import IconArrowUp from "~icons/lucide/arrow-up"
import IconArrowUpRight from "~icons/lucide/arrow-up-right"
import IconCheck from "~icons/lucide/check"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const { shouldEnableAIFeatures } = useAIExperiments("chat")
const chat = useService(AIChatService)
const context = useChatContext()

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

// The chat backend only serves authenticated sessions — funnel logged-out
// users into the login modal instead of opening a pane that can only error.
const openChat = () => {
  if (!currentUser.value) {
    invokeAction("modals.login.toggle")
    return
  }
  chat.open()
}

// Logging out closes an open pane (its context/history belong to the session).
watch(currentUser, (user) => {
  if (!user) chat.close()
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const input = ref("")
const scrollEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const suggestions = [
  "ai_experiments.chat.suggestion_explain",
  "ai_experiments.chat.suggestion_add_header",
  "ai_experiments.chat.suggestion_write_tests",
  "ai_experiments.chat.suggestion_run",
]

// Next-step chips for the last completed turn, derived from what it executed.
const followUps = computed(() => {
  if (
    chat.isStreaming.value ||
    chat.messages.value.length === 0 ||
    chat.lastTurnStatus.value !== "ok"
  ) {
    return []
  }
  return getFollowUpSuggestions(chat.lastTurnTools.value)
})

// --- Resizable width (persisted) ---
const MIN_WIDTH = 320
const MAX_WIDTH = 640
const storedWidth = useLocalStorage("hopp-ai-chat-width", 400)
const clampWidth = (w: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w))

const paneWidth = computed(() =>
  mdAndLarger.value ? `${clampWidth(storedWidth.value)}px` : "100%"
)

const isResizing = ref(false)
let startX = 0
let startWidth = 0

const startResize = (e: MouseEvent) => {
  if (!mdAndLarger.value) return
  isResizing.value = true
  startX = e.clientX
  startWidth = clampWidth(storedWidth.value)
  document.body.style.userSelect = "none"
  document.body.style.cursor = "col-resize"
  e.preventDefault()
}

useEventListener(window, "mousemove", (e: MouseEvent) => {
  if (!isResizing.value) return
  // Handle is on the pane's left edge — dragging left widens the pane.
  storedWidth.value = clampWidth(startWidth + (startX - e.clientX))
})

useEventListener(window, "mouseup", () => {
  if (!isResizing.value) return
  isResizing.value = false
  document.body.style.userSelect = ""
  document.body.style.cursor = ""
})

// --- Input ---
const autoResize = () => {
  const el = textareaEl.value
  if (!el) return
  el.style.height = "auto"
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`
}

const resetInputHeight = () => {
  if (textareaEl.value) textareaEl.value.style.height = "auto"
}

const scrollToBottom = () => {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

const send = async (text?: string) => {
  const value = (text ?? input.value).trim()
  if (!value || chat.isStreaming.value) return
  input.value = ""
  resetInputHeight()
  await chat.sendMessage(value, context.contextString.value)
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

// Keep the conversation scrolled to the bottom as it streams / opens — and
// when the follow-up chips appear after a turn settles.
watch(
  () => [
    chat.messages.value.length,
    chat.messages.value[chat.messages.value.length - 1]?.content,
    chat.isOpen.value,
    chat.isStreaming.value,
  ],
  scrollToBottom
)
</script>

<style scoped>
@keyframes chat-header-sweep {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
