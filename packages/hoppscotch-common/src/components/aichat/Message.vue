<template>
  <div :class="message.role === 'user' ? 'flex justify-end' : 'group'">
    <!-- User message: a whisper of accent over the surface, soft edge, tiny lift -->
    <div
      v-if="message.role === 'user'"
      class="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md border border-dividerLight bg-primaryLight px-3.5 py-2 text-xs text-secondaryDark shadow-sm [background:linear-gradient(135deg,color-mix(in_srgb,var(--accent-color)_10%,var(--primary-light-color)),var(--primary-light-color)_70%)]"
    >
      {{ message.content }}
    </div>

    <!-- Tool steps: one timeline of the actions this turn executed -->
    <ol
      v-else-if="message.kind === 'tool'"
      role="list"
      class="flex flex-col gap-1.5"
    >
      <li
        v-for="(step, index) in steps"
        :key="index"
        class="relative flex animate-[hopp-chat-step-in_240ms_ease-out_both] items-start gap-2 before:absolute before:-bottom-[0.4375rem] before:left-[calc(0.5625rem-0.5px)] before:top-[1.1875rem] before:w-px before:bg-dividerDark before:content-[''] last:before:hidden motion-reduce:animate-none"
      >
        <span
          class="relative z-[1] mt-px inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full border transition-colors"
          :class="TONE_STYLES[step.tone].icon"
        >
          <component
            :is="STEP_ICONS[step.kind]"
            class="h-3 w-3"
            :class="{
              'animate-spin motion-reduce:animate-none':
                step.kind === 'running',
            }"
            aria-hidden="true"
          />
          <span v-if="TONE_LABELS[step.tone]" class="sr-only">
            {{ t(TONE_LABELS[step.tone]!) }}
          </span>
        </span>
        <!-- Sanitized by DOMPurify -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="chat-md chat-step-text min-w-0 flex-1 break-words pt-0.5 text-tiny leading-normal"
          :class="TONE_STYLES[step.tone].text"
          v-html="render(step.text)"
        ></div>
        <!-- eslint-enable vue/no-v-html -->
      </li>
    </ol>

    <!-- Assistant message -->
    <template v-else>
      <!-- Thinking indicator (until the first token arrives): a pill with an
           accent sweep gliding across and shimmering text -->
      <div
        v-if="message.pending && !message.content"
        class="relative isolate inline-flex items-center gap-2 overflow-hidden rounded-full border border-dividerLight bg-primaryLight px-3.5 py-1.5 after:absolute after:inset-0 after:-z-10 after:-translate-x-full after:animate-[hopp-chat-sweep_1.8s_ease-in-out_infinite] after:content-[''] after:[background:linear-gradient(110deg,transparent_25%,color-mix(in_srgb,var(--accent-color)_10%,transparent)_50%,transparent_75%)] motion-reduce:after:animate-none"
        aria-live="polite"
      >
        <IconSparkles
          class="h-3.5 w-3.5 shrink-0 animate-[hopp-chat-glow_1.8s_ease-in-out_infinite] text-accent motion-reduce:animate-none"
        />
        <span
          class="animate-[hopp-chat-shimmer_1.5s_linear_infinite] bg-clip-text text-xs font-medium text-transparent [background-image:linear-gradient(90deg,var(--secondary-light-color),var(--secondary-dark-color),var(--secondary-light-color))] [background-size:200%_100%] motion-reduce:animate-none"
        >
          {{ t("ai_experiments.chat.thinking") }}
        </span>
      </div>

      <div v-else>
        <!-- The thinking indicator settles into a quiet duration note -->
        <div
          v-if="thoughtDuration"
          class="mb-1.5 flex items-center gap-1 text-tiny text-secondaryLight"
        >
          <IconSparkles class="h-3 w-3 shrink-0" />
          <span>{{
            t("ai_experiments.chat.thought_for", { duration: thoughtDuration })
          }}</span>
        </div>

        <!-- Sanitized by DOMPurify -->
        <!-- eslint-disable vue/no-v-html -->
        <div
          class="chat-md break-words text-xs text-secondary"
          :class="{ 'is-streaming': message.pending }"
          v-html="rendered"
        ></div>
        <!-- eslint-enable vue/no-v-html -->

        <!-- Actions -->
        <div
          v-if="!message.pending && message.content"
          class="mt-1 flex h-6 items-center opacity-0 transition focus-within:opacity-100 group-hover:opacity-100"
        >
          <button
            class="-ml-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-tiny transition hover:bg-primaryLight focus-visible:bg-primaryLight focus-visible:outline-none"
            :class="
              copied
                ? 'text-accent'
                : 'text-secondaryLight hover:text-secondaryDark focus-visible:text-secondaryDark'
            "
            @click="copy"
          >
            <component :is="copied ? IconCheck : IconCopy" class="h-3 w-3" />
            <span>{{
              copied
                ? t("ai_experiments.chat.copied")
                : t("ai_experiments.chat.copy")
            }}</span>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it"
import DOMPurify from "dompurify"
import { computed, ref, type Component } from "vue"
import { useI18n } from "~/composables/i18n"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  parseStepLines,
  type StepKind,
  type StepTone,
} from "~/helpers/aichat/step-lines"
import type { ChatMessage } from "~/services/ai-chat.service"

import IconArrowLeftRight from "~icons/lucide/arrow-left-right"
import IconBan from "~icons/lucide/ban"
import IconBookOpen from "~icons/lucide/book-open"
import IconCheck from "~icons/lucide/check"
import IconCircleCheck from "~icons/lucide/circle-check"
import IconCircleX from "~icons/lucide/circle-x"
import IconClock from "~icons/lucide/clock"
import IconCopy from "~icons/lucide/copy"
import IconCornerDownRight from "~icons/lucide/corner-down-right"
import IconFileText from "~icons/lucide/file-text"
import IconFlaskConical from "~icons/lucide/flask-conical"
import IconFolder from "~icons/lucide/folder"
import IconGlobe from "~icons/lucide/globe"
import IconHouse from "~icons/lucide/house"
import IconLibrary from "~icons/lucide/library"
import IconLoaderCircle from "~icons/lucide/loader-circle"
import IconPanelsTopLeft from "~icons/lucide/panels-top-left"
import IconPencil from "~icons/lucide/pencil"
import IconPlug from "~icons/lucide/plug"
import IconSave from "~icons/lucide/save"
import IconSlidersHorizontal from "~icons/lucide/sliders-horizontal"
import IconSparkles from "~icons/lucide/sparkles"
import IconTrash2 from "~icons/lucide/trash-2"
import IconTriangleAlert from "~icons/lucide/triangle-alert"
import IconUsers from "~icons/lucide/users"
import IconWrench from "~icons/lucide/wrench"
import IconX from "~icons/lucide/x"

const props = defineProps<{
  message: ChatMessage
}>()

const t = useI18n()

/** Each step kind gets its Lucide icon; the tone (colour) comes from the parser. */
const STEP_ICONS: Record<StepKind, Component> = {
  done: IconCheck,
  verified: IconCircleCheck,
  warn: IconTriangleAlert,
  error: IconCircleX,
  running: IconLoaderCircle,
  waiting: IconClock,
  cancelled: IconBan,
  environment: IconGlobe,
  collection: IconFolder,
  properties: IconSlidersHorizontal,
  tab: IconPanelsTopLeft,
  closed: IconX,
  deleted: IconTrash2,
  saved: IconSave,
  team: IconUsers,
  personal: IconHouse,
  renamed: IconPencil,
  documented: IconFileText,
  published: IconBookOpen,
  mock: IconFlaskConical,
  protocol: IconArrowLeftRight,
  interceptor: IconPlug,
  tools: IconWrench,
  context: IconLibrary,
  note: IconCornerDownRight,
}

// Accent tones mix the theme's accent variable; status tones use the same
// Tailwind greens/ambers/reds the response meta uses elsewhere in the app.
const ACCENT_ICON =
  "text-accent [border-color:color-mix(in_srgb,var(--accent-color)_35%,var(--divider-color))] [background:color-mix(in_srgb,var(--accent-color)_12%,var(--primary-light-color))]"

/** Icon node + text colour classes per step tone. */
const TONE_STYLES: Record<StepTone, { icon: string; text: string }> = {
  neutral: {
    icon: "border-divider bg-primaryLight text-secondaryLight",
    text: "text-secondary",
  },
  accent: { icon: ACCENT_ICON, text: "text-secondary" },
  pending: { icon: ACCENT_ICON, text: "text-secondaryDark" },
  success: {
    icon: "border-green-500/35 bg-green-500/10 text-green-500",
    text: "text-secondary",
  },
  warning: {
    icon: "border-amber-500/35 bg-amber-500/10 text-amber-500",
    text: "text-secondaryDark",
  },
  error: {
    icon: "border-red-500/35 bg-red-500/10 text-red-500",
    text: "text-secondaryDark",
  },
  muted: {
    icon: "border-dashed border-divider bg-primaryLight text-secondaryLight",
    text: "text-secondaryLight",
  },
}

/** Spoken status for the tones that carry one; the rest read as plain text. */
const TONE_LABELS: Partial<Record<StepTone, string>> = {
  accent: "ai_experiments.chat.step_done",
  success: "ai_experiments.chat.step_done",
  warning: "ai_experiments.chat.step_warning",
  error: "ai_experiments.chat.step_error",
  pending: "ai_experiments.chat.step_running",
}

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

// Render external links with rel/target for safety.
const defaultLinkRender =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet("target", "_blank")
  tokens[idx].attrSet("rel", "noopener noreferrer")
  return defaultLinkRender(tokens, idx, options, env, self)
}

// A remote image would load unasked and could carry context out; link it instead.
md.renderer.rules.image = (tokens, idx) => {
  const src = tokens[idx].attrGet("src") ?? ""
  const label = tokens[idx].content
  // Inside a link (a badge) a nested <a> would split it: keep the outer
  // link's target, labelled by the alt text or that target.
  let depth = 0
  for (let i = idx - 1; i >= 0; i--) {
    if (tokens[i].type === "link_close") depth--
    if (tokens[i].type !== "link_open") continue
    depth++
    if (depth > 0) {
      return md.utils.escapeHtml(label || tokens[i].attrGet("href") || "")
    }
  }
  // A data: URL has no page to open.
  if (/^data:/i.test(src.trim())) return md.utils.escapeHtml(label)
  return `<a href="${md.utils.escapeHtml(src)}" target="_blank" rel="noopener noreferrer">${md.utils.escapeHtml(label || src)}</a>`
}

const render = (text: string) =>
  DOMPurify.sanitize(md.render(text), {
    ADD_ATTR: ["target"],
    FORBID_TAGS: ["img"],
  })

const rendered = computed(() => render(props.message.content || ""))

const steps = computed(() =>
  props.message.kind === "tool" ? parseStepLines(props.message.content) : []
)

// Sub-second waits aren't worth a note; longer ones settle into "Thought
// for …" above the reply.
const thoughtDuration = computed(() => {
  const ms = props.message.thinkingMs
  if (!ms || ms < 1000 || props.message.kind === "tool") return null
  return ms < 10_000
    ? `${(ms / 1000).toFixed(1)}s`
    : `${Math.round(ms / 1000)}s`
})

const copied = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

const copy = () => {
  copyToClipboard(props.message.content)
  copied.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<style>
@keyframes hopp-chat-step-in {
  from {
    opacity: 0;
    transform: translateY(3px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes hopp-chat-sweep {
  0% {
    transform: translateX(-100%);
  }
  60%,
  100% {
    transform: translateX(100%);
  }
}
@keyframes hopp-chat-glow {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}
@keyframes hopp-chat-shimmer {
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
}
@keyframes hopp-chat-blink {
  50% {
    opacity: 0;
  }
}
</style>

<!-- Rendered markdown (v-html) can't carry utility classes, so its typography
     lives here. -->
<style scoped>
.chat-md :deep(> *:first-child) {
  margin-top: 0;
}
.chat-md :deep(> *:last-child) {
  margin-bottom: 0;
}
.chat-md :deep(p) {
  margin: 0 0 0.5rem;
  line-height: 1.55;
}
.chat-md :deep(ul),
.chat-md :deep(ol) {
  margin: 0 0 0.5rem;
  padding-left: 1.15rem;
}
.chat-md :deep(ul) {
  list-style: disc;
}
.chat-md :deep(ol) {
  list-style: decimal;
}
.chat-md :deep(li) {
  margin: 0.15rem 0;
}
.chat-md :deep(li > ul),
.chat-md :deep(li > ol) {
  margin: 0.15rem 0;
}

/* Step lines are one dense row each, not prose. */
.chat-step-text :deep(p) {
  margin: 0;
}
.chat-step-text :deep(ul),
.chat-step-text :deep(ol) {
  margin: 0.2rem 0 0;
}
.chat-md :deep(a) {
  color: var(--accent-color);
  text-decoration: underline;
  text-underline-offset: 2px;
}
.chat-md :deep(strong) {
  font-weight: 600;
  color: var(--secondary-dark-color);
}
.chat-md :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.8em;
  background: var(--divider-light-color);
  color: var(--secondary-dark-color);
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
}
.chat-md :deep(pre) {
  margin: 0 0 0.5rem;
  padding: 0.6rem 0.75rem;
  background: var(--primary-dark-color);
  border: 1px solid var(--divider-color);
  border-radius: 0.5rem;
  overflow-x: auto;
}
.chat-md :deep(pre code) {
  background: transparent;
  padding: 0;
  font-size: 0.78rem;
  color: var(--secondary-dark-color);
}
.chat-md :deep(h1),
.chat-md :deep(h2),
.chat-md :deep(h3),
.chat-md :deep(h4) {
  margin: 0.7rem 0 0.35rem;
  font-weight: 600;
  line-height: 1.3;
  color: var(--secondary-dark-color);
}
.chat-md :deep(h1) {
  font-size: 1rem;
}
.chat-md :deep(h2) {
  font-size: 0.95rem;
}
.chat-md :deep(h3),
.chat-md :deep(h4) {
  font-size: 0.9rem;
}
.chat-md :deep(blockquote) {
  margin: 0 0 0.5rem;
  padding-left: 0.6rem;
  border-left: 2px solid var(--divider-dark-color);
  color: var(--secondary-light-color);
}
.chat-md :deep(hr) {
  margin: 0.7rem 0;
  border: 0;
  border-top: 1px solid var(--divider-color);
}
.chat-md :deep(table) {
  width: 100%;
  margin: 0 0 0.5rem;
  border-collapse: collapse;
}
.chat-md :deep(th),
.chat-md :deep(td) {
  border: 1px solid var(--divider-color);
  padding: 0.25rem 0.5rem;
  text-align: left;
}

/* Blinking caret at the end of the reply while it streams in. */
.chat-md.is-streaming :deep(> *:last-child)::after {
  content: "";
  display: inline-block;
  width: 0.45em;
  height: 1em;
  margin-left: 2px;
  vertical-align: text-bottom;
  border-radius: 1px;
  background: var(--accent-color);
  animation: hopp-chat-blink 1s step-start infinite;
}
@media (prefers-reduced-motion: reduce) {
  .chat-md.is-streaming :deep(> *:last-child)::after {
    animation: none;
  }
}
</style>
