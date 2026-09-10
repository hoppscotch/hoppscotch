<template>
  <div v-if="shouldEnableAIFeatures" class="contents">
    <!-- Docked, resizable chat pane -->
    <aside
      v-if="chat.isOpen.value"
      class="chat-pane flex flex-col bg-primary"
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

      <header
        class="relative flex shrink-0 items-center justify-between gap-2 border-b border-dividerLight px-3 py-2.5"
      >
        <!-- A short accent segment glides along the divider while a reply
             streams in; a still, half-opacity hairline under reduced motion. -->
        <span
          v-if="chat.isStreaming.value"
          class="pointer-events-none absolute inset-x-0 -bottom-px h-px overflow-hidden"
          aria-hidden="true"
        >
          <span
            class="block h-full w-[28%] -translate-x-full animate-[hopp-chat-sweep-line_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] bg-accent opacity-75 motion-reduce:w-full motion-reduce:translate-x-0 motion-reduce:animate-none motion-reduce:opacity-50"
          />
        </span>
        <div class="flex min-w-0 items-center gap-2">
          <span :class="[ORB, 'h-6 w-6 rounded-md']">
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

      <!-- Context: off = dimmed text, no frame; on = hairline frame, accent icon -->
      <div
        class="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-dividerLight px-3 py-2"
      >
        <span
          class="mr-0.5 text-tiny font-medium uppercase tracking-wide text-secondaryLight"
        >
          {{ t("ai_experiments.chat.context") }}
        </span>
        <template v-if="context.items.value.length">
          <button
            v-for="item in context.items.value"
            :key="item.id"
            v-tippy="{ theme: 'tooltip' }"
            :title="item.detail"
            class="inline-flex max-w-[10rem] items-center gap-1.5 rounded-full border px-2 py-0.5 text-tiny transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            :class="
              context.isIncluded(item.id)
                ? 'border-divider bg-primaryLight text-secondaryDark'
                : 'border-transparent text-secondaryLight opacity-[0.55] hover:bg-primaryLight hover:text-secondary hover:opacity-100 focus-visible:opacity-100'
            "
            :aria-pressed="context.isIncluded(item.id)"
            @click="context.toggle(item.id)"
          >
            <component
              :is="contextIcon(item.id)"
              class="h-3 w-3 shrink-0"
              :class="{ 'text-accent': context.isIncluded(item.id) }"
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
          <!-- Hero mark over a soft halo that breathes very slowly -->
          <span
            class="relative inline-flex before:absolute before:-inset-5 before:animate-[hopp-chat-breathe_4s_ease-in-out_infinite] before:rounded-full before:content-[''] before:[background:radial-gradient(circle,color-mix(in_srgb,var(--accent-color)_18%,transparent),transparent_70%)] motion-reduce:before:animate-none"
          >
            <span :class="[ORB, 'relative h-11 w-11 rounded-xl']">
              <IconSparkles class="h-5 w-5" />
            </span>
          </span>
          <p class="mt-4 text-sm font-semibold text-secondaryDark">
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
              :key="s.label"
              class="group flex w-full items-center gap-2 rounded-lg border border-dividerLight bg-primaryLight px-2.5 py-2 text-left text-xs text-secondary transition hover:-translate-y-px hover:border-dividerDark hover:text-secondaryDark hover:shadow-[0_4px_12px_-6px_rgb(0_0_0_/_0.35)] focus-visible:-translate-y-px focus-visible:border-dividerDark focus-visible:text-secondaryDark focus-visible:outline-none active:translate-y-0 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
              @click="send(t(s.label))"
            >
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primaryDark text-secondaryLight transition group-hover:text-accent group-hover:[background:color-mix(in_srgb,var(--accent-color)_12%,var(--primary-light-color))] group-focus-visible:text-accent motion-reduce:transition-none"
              >
                <component :is="s.icon" class="h-3.5 w-3.5" />
              </span>
              <span class="min-w-0 flex-1 truncate">{{ t(s.label) }}</span>
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
            class="group inline-flex items-center gap-1 rounded-full border border-dividerLight bg-primaryLight py-1 pl-2 pr-2.5 text-tiny text-secondary transition hover:-translate-y-px hover:border-dividerDark hover:text-secondaryDark focus-visible:border-dividerDark focus-visible:text-secondaryDark focus-visible:outline-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            @click="send(t(s))"
          >
            <IconArrowUpRight
              class="h-3 w-3 shrink-0 text-secondaryLight transition group-hover:text-accent group-focus-visible:text-accent motion-reduce:transition-none"
            />
            <span class="truncate">{{ t(s) }}</span>
          </button>
        </div>
      </div>

      <!-- Composer: a quiet focus state (tinted border, no ring) -->
      <div class="shrink-0 border-t border-dividerLight px-3 py-3">
        <div
          class="flex flex-col rounded-xl border border-divider bg-primaryLight transition-colors focus-within:[border-color:color-mix(in_srgb,var(--accent-color)_45%,var(--divider-color))]"
          :class="{
            '[border-color:color-mix(in_srgb,var(--accent-color)_35%,var(--divider-color))]':
              chat.isStreaming.value,
          }"
        >
          <textarea
            ref="textareaEl"
            v-model="input"
            v-focus
            rows="1"
            :placeholder="t('ai_experiments.chat.placeholder')"
            class="max-h-40 min-w-0 w-full resize-none whitespace-pre-wrap [overflow-wrap:anywhere] bg-transparent px-3 pt-2.5 text-xs text-secondaryDark placeholder:text-secondaryLight focus:outline-none"
            @input="autoResize"
            @keydown="onKeydown"
          ></textarea>
          <div class="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
            <span
              class="hidden items-center gap-1 text-tiny text-secondaryLight sm:flex"
            >
              <kbd :class="KBD">↵</kbd>
              <span>{{ t("ai_experiments.chat.hint_send") }}</span>
              <span class="mx-0.5 opacity-50">·</span>
              <kbd :class="KBD">⇧ ↵</kbd>
              <span>{{ t("ai_experiments.chat.hint_newline") }}</span>
            </span>
            <button
              v-tippy="{ theme: 'tooltip' }"
              :title="t('ai_experiments.chat.send')"
              class="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accentContrast transition enabled:hover:-translate-y-px enabled:hover:bg-accentDark enabled:hover:[box-shadow:0_4px_12px_-4px_color-mix(in_srgb,var(--accent-color)_55%,transparent)] enabled:active:translate-y-0 enabled:active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:enabled:hover:translate-y-0"
              :class="{ 'disabled:opacity-40': !chat.isStreaming.value }"
              :aria-label="t('ai_experiments.chat.send')"
              :disabled="!input.trim() || chat.isStreaming.value"
              @click="send()"
            >
              <IconLoaderCircle
                v-if="chat.isStreaming.value"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              />
              <IconArrowUp v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>

    <!-- Launcher: a quiet surface circle; accent border and glow only on hover -->
    <button
      v-if="!chat.isOpen.value"
      v-tippy="{ theme: 'tooltip', placement: 'left' }"
      :title="t('ai_experiments.chat.title')"
      class="fixed bottom-4 right-4 z-[1100] flex h-11 w-11 items-center justify-center rounded-full border border-dividerLight bg-primary text-accent shadow-[0_2px_10px_-2px_rgb(0_0_0_/_0.25)] transition hover:scale-105 hover:bg-primaryLight hover:[border-color:color-mix(in_srgb,var(--accent-color)_45%,transparent)] hover:[box-shadow:0_4px_16px_-4px_color-mix(in_srgb,var(--accent-color)_35%,transparent)] focus-visible:scale-105 focus-visible:outline-none focus-visible:[border-color:color-mix(in_srgb,var(--accent-color)_45%,transparent)] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100"
      :aria-label="t('ai_experiments.chat.title')"
      @click="openChat"
    >
      <IconSparkles class="h-5 w-5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from "vue"
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
import IconActivity from "~icons/lucide/activity"
import IconArrowUp from "~icons/lucide/arrow-up"
import IconArrowUpRight from "~icons/lucide/arrow-up-right"
import IconBraces from "~icons/lucide/braces"
import IconBriefcase from "~icons/lucide/briefcase"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconFileText from "~icons/lucide/file-text"
import IconFlaskConical from "~icons/lucide/flask-conical"
import IconFolder from "~icons/lucide/folder"
import IconGlobe from "~icons/lucide/globe"
import IconKeyRound from "~icons/lucide/key-round"
import IconLoaderCircle from "~icons/lucide/loader-circle"
import IconMessageSquareText from "~icons/lucide/message-square-text"
import IconPanelRightClose from "~icons/lucide/panel-right-close"
import IconPlay from "~icons/lucide/play"
import IconSparkles from "~icons/lucide/sparkles"
import IconTrash2 from "~icons/lucide/trash-2"

/** Accent-tinted badge behind the sparkles mark (header, empty state). */
const ORB =
  "inline-flex shrink-0 items-center justify-center border text-accent [background:color-mix(in_srgb,var(--accent-color)_12%,var(--primary-light-color))] [border-color:color-mix(in_srgb,var(--accent-color)_25%,transparent)]"

/** Keycap in the composer hint. */
const KBD =
  "inline-flex min-w-[1.1rem] items-center rounded border border-divider bg-primaryDark px-1 font-sans text-[0.6rem] leading-4 text-secondary"

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

// Logging out closes an open pane and drops the conversation — its history
// (and any credentials typed into it) belongs to the session that ended.
watch(currentUser, (user) => {
  if (!user) {
    chat.close()
    // reset, not clear: clear defers while a reply is streaming, which is
    // exactly when the transcript and its secrets must not survive.
    chat.reset()
  }
})

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const input = ref("")
const scrollEl = ref<HTMLElement | null>(null)
const textareaEl = ref<HTMLTextAreaElement | null>(null)

const suggestions: Array<{ label: string; icon: Component }> = [
  {
    label: "ai_experiments.chat.suggestion_explain",
    icon: IconMessageSquareText,
  },
  { label: "ai_experiments.chat.suggestion_add_header", icon: IconKeyRound },
  {
    label: "ai_experiments.chat.suggestion_write_tests",
    icon: IconFlaskConical,
  },
  { label: "ai_experiments.chat.suggestion_run", icon: IconPlay },
]

/** Icon for each kind of context chip (ids come from useChatContext). */
const CONTEXT_ICONS: Record<string, Component> = {
  workspace: IconBriefcase,
  request: IconFileText,
  response: IconActivity,
  schema: IconBraces,
  environment: IconGlobe,
  collections: IconFolder,
}
const contextIcon = (id: string): Component =>
  CONTEXT_ICONS[id] ?? IconCircleDot

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

const MIN_WIDTH = 320
const MAX_WIDTH = 640
const storedWidth = useLocalStorage("hopp-ai-chat-width", 400)
// A corrupt stored value (NaN / garbage) must not yield a "NaNpx" pane.
const clampWidth = (w: number) =>
  Number.isFinite(w) ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, w)) : 400

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
  // Enter during IME composition confirms the candidate, not the message.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
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

<style>
@keyframes hopp-chat-sweep-line {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(360%);
  }
}
@keyframes hopp-chat-breathe {
  0%,
  100% {
    opacity: 0.6;
    transform: scale(0.95);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}
</style>
