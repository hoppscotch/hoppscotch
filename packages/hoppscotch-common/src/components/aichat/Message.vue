<template>
  <div :class="message.role === 'user' ? 'flex justify-end' : 'group'">
    <!-- User message -->
    <div
      v-if="message.role === 'user'"
      class="chat-user-bubble max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm px-3.5 py-2 text-xs text-secondaryDark"
    >
      {{ message.content }}
    </div>

    <!-- Tool step (compact, one block of executed actions) -->
    <!-- eslint-disable vue/no-v-html -->
    <div
      v-else-if="message.kind === 'tool'"
      class="chat-md chat-step break-words text-tiny text-secondaryLight"
      v-html="rendered"
    ></div>
    <!-- eslint-enable vue/no-v-html -->

    <!-- Assistant message -->
    <template v-else>
      <!-- Thinking indicator (until the first token arrives) -->
      <div
        v-if="message.pending && !message.content"
        class="chat-thinking-card"
        aria-live="polite"
      >
        <IconSparkles class="h-3.5 w-3.5 shrink-0 text-accent" />
        <span class="chat-thinking text-xs font-medium">
          {{ t("ai_experiments.chat.thinking") }}
        </span>
      </div>

      <div v-else>
        <!-- The thinking indicator settles into a quiet duration note -->
        <div
          v-if="thoughtDuration"
          class="mb-1 flex items-center gap-1 text-tiny text-secondaryLight"
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
          class="mt-1 flex h-5 items-center opacity-0 transition focus-within:opacity-100 group-hover:opacity-100"
        >
          <button
            class="flex items-center gap-1 rounded text-tiny text-secondaryLight transition hover:text-secondary"
            @click="copy"
          >
            <component :is="copied ? IconCheck : IconCopy" class="h-3 w-3" />
            {{
              copied
                ? t("ai_experiments.chat.copied")
                : t("ai_experiments.chat.copy")
            }}
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it"
import DOMPurify from "dompurify"
import { computed, ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import type { ChatMessage } from "~/services/ai-chat.service"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconSparkles from "~icons/lucide/sparkles"

const props = defineProps<{
  message: ChatMessage
}>()

const t = useI18n()

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

const rendered = computed(() =>
  DOMPurify.sanitize(md.render(props.message.content || ""), {
    ADD_ATTR: ["target"],
  })
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

<style scoped>
/* User bubble — a whisper of accent over the surface, soft edge, tiny lift. */
.chat-user-bubble {
  border: 1px solid var(--divider-light-color);
  background: var(--primary-light-color);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--accent-color) 9%, var(--primary-light-color)),
    var(--primary-light-color) 65%
  );
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.08);
}

.chat-md :deep(> *:first-child) {
  margin-top: 0;
}
.chat-md :deep(> *:last-child) {
  margin-bottom: 0;
}
/* Compact "executed action" step block. */
.chat-step {
  border-left: 2px solid var(--divider-color);
  padding-left: 0.6rem;
}
.chat-step :deep(p) {
  margin: 0;
  line-height: 1.5;
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
.chat-md :deep(img) {
  max-width: 100%;
  border-radius: 0.375rem;
}

/* Pill around the "Thinking…" state, with a gradient sweep gliding across. */
.chat-thinking-card {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid var(--divider-light-color);
  background: var(--primary-light-color);
  overflow: hidden;
  isolation: isolate;
}
.chat-thinking-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  /* Fallback for browsers without color-mix */
  background: linear-gradient(
    110deg,
    transparent 25%,
    var(--divider-light-color) 50%,
    transparent 75%
  );
  background: linear-gradient(
    110deg,
    transparent 25%,
    color-mix(in srgb, var(--accent-color) 10%, transparent) 50%,
    transparent 75%
  );
  transform: translateX(-100%);
  animation: chat-sweep 1.8s ease-in-out infinite;
}
.chat-thinking-card :deep(svg) {
  animation: chat-glow 1.8s ease-in-out infinite;
}

/* Shimmering "Thinking…" text while waiting for the first token. */
.chat-thinking {
  background: linear-gradient(
    90deg,
    var(--secondary-light-color),
    var(--secondary-dark-color),
    var(--secondary-light-color)
  );
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: chat-shimmer 1.5s linear infinite;
}
@keyframes chat-shimmer {
  0% {
    background-position: 200% center;
  }
  100% {
    background-position: -200% center;
  }
}
@keyframes chat-sweep {
  0% {
    transform: translateX(-100%);
  }
  60%,
  100% {
    transform: translateX(100%);
  }
}
@keyframes chat-glow {
  0%,
  100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
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
  animation: chat-blink 1s step-start infinite;
}
@keyframes chat-blink {
  50% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chat-thinking,
  .chat-thinking-card::after,
  .chat-thinking-card :deep(svg) {
    animation: none;
  }
  .chat-md.is-streaming :deep(> *:last-child)::after {
    animation: none;
  }
}
</style>
