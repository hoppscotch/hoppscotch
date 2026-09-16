<template>
  <div v-if="shouldEnableAIFeatures && !instanceDisabled" class="contents">
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

      <div ref="scrollEl" class="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <div
          v-if="chat.messages.value.length === 0"
          class="flex h-full flex-col items-center justify-center px-4 text-center"
        >
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

      <div class="shrink-0 border-t border-dividerLight px-3 py-3">
        <div
          v-if="noModelsConfigured"
          class="mb-2 rounded-lg border border-dividerLight bg-primaryLight px-3 py-2"
        >
          <p class="text-xs font-semibold text-secondaryDark">
            {{ t("ai_experiments.chat.no_models_title") }}
          </p>
          <p class="mt-0.5 text-tiny leading-relaxed text-secondaryLight">
            {{ t("ai_experiments.chat.no_models_subtitle") }}
          </p>
        </div>

        <div
          v-if="skillMenuOpen"
          ref="skillMenuEl"
          class="mb-2 max-h-56 overflow-y-auto rounded-lg border border-divider bg-primary py-1 shadow-[0_8px_24px_-8px_rgb(0_0_0_/_0.45)]"
          role="listbox"
          :aria-label="t('ai_experiments.chat.skills')"
        >
          <button
            v-for="(skill, index) in matchingSkills"
            :id="`hopp-skill-${index}`"
            :key="skill.slug"
            role="option"
            :aria-selected="index === skillIndex"
            class="flex w-full flex-col gap-0.5 px-3 py-1.5 text-left transition"
            :class="
              index === skillIndex
                ? '[background:color-mix(in_srgb,var(--accent-color)_12%,var(--primary-light-color))]'
                : 'hover:bg-primaryLight'
            "
            @mousemove="skillIndex = index"
            @click="applySkill(skill)"
          >
            <span class="flex min-w-0 items-center gap-1.5">
              <span
                class="min-w-0 truncate text-xs font-medium"
                :class="
                  index === skillIndex ? 'text-accent' : 'text-secondaryDark'
                "
                :title="`/${skill.slug}`"
                >/{{ skill.slug }}</span
              >
              <span
                v-if="skill.custom"
                class="shrink-0 rounded border border-dividerLight px-1 text-[0.6rem] uppercase tracking-wide text-secondaryLight"
                >{{ t("ai_experiments.chat.skill_custom") }}</span
              >
            </span>
            <span
              class="line-clamp-2 [overflow-wrap:anywhere] text-tiny text-secondaryLight"
              >{{ skill.description }}</span
            >
          </button>

          <p
            v-if="!matchingSkills.length"
            class="px-3 py-2 text-tiny text-secondaryLight"
          >
            {{ t("ai_experiments.chat.skills_empty") }}
          </p>
        </div>

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
            :disabled="noModelsConfigured"
            role="combobox"
            :aria-expanded="skillMenuOpen"
            aria-controls="hopp-skill-menu"
            :aria-activedescendant="
              skillMenuHasChoices ? `hopp-skill-${skillIndex}` : undefined
            "
            @input="autoResize"
            @keydown="onKeydown"
          ></textarea>
          <div class="flex items-center justify-between gap-2 px-2 pb-1.5 pt-1">
            <!-- Only worth a control when there is a choice to make. -->
            <tippy
              v-if="chat.modelOptions.value.length > 1"
              interactive
              trigger="click"
              theme="popover"
              placement="top-start"
              :on-shown="() => modelDropdown?.focus()"
            >
              <button
                v-tippy="{ theme: 'tooltip' }"
                :title="selectedModelLabel"
                class="flex min-w-0 max-w-[9rem] items-center gap-1 rounded px-1.5 py-0.5 text-tiny text-secondaryLight transition hover:bg-primaryDark hover:text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="chat.isStreaming.value"
                :aria-label="t('ai_experiments.chat.model_picker')"
              >
                <component
                  :is="selectedLogo"
                  class="h-3 w-3 shrink-0"
                  aria-hidden="true"
                />
                <span class="truncate">{{ selectedModelLabel }}</span>
                <IconChevronDown class="h-3 w-3 shrink-0" />
              </button>

              <template #content="{ hide }">
                <div
                  ref="modelDropdown"
                  tabindex="0"
                  role="menu"
                  class="flex max-h-64 flex-col overflow-y-auto focus:outline-none"
                  @keyup.escape="hide"
                >
                  <template
                    v-for="group in groupedModels"
                    :key="group.connectionID"
                  >
                    <div
                      class="flex items-center gap-1.5 px-3 pb-1 pt-2 text-tiny font-semibold uppercase tracking-wide text-secondaryLight"
                    >
                      <component
                        :is="logoForPreset(group.preset)"
                        class="h-3 w-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span class="truncate">{{ group.label }}</span>
                    </div>
                    <HoppSmartItem
                      v-for="option in group.models"
                      :key="`${option.connectionID}:${option.model}`"
                      :label="option.model"
                      :icon="isSelected(option) ? IconCircleDot : IconCircle"
                      :active="isSelected(option)"
                      :aria-selected="isSelected(option)"
                      @click="
                        () => {
                          chat.selectModel(option)
                          hide()
                        }
                      "
                    />
                  </template>
                </div>
              </template>
            </tippy>

            <button
              v-tippy="{ theme: 'tooltip' }"
              :title="t('ai_experiments.chat.send')"
              class="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-accentContrast transition enabled:hover:-translate-y-px enabled:hover:bg-accentDark enabled:hover:[box-shadow:0_4px_12px_-4px_color-mix(in_srgb,var(--accent-color)_55%,transparent)] enabled:active:translate-y-0 enabled:active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed motion-reduce:transition-none motion-reduce:enabled:hover:translate-y-0"
              :class="{ 'disabled:opacity-40': !chat.isStreaming.value }"
              :aria-label="t('ai_experiments.chat.send')"
              :disabled="
                !input.trim() || chat.isStreaming.value || noModelsConfigured
              "
              @click="send()"
            >
              <IconLoaderCircle
                v-if="chat.isStreaming.value"
                class="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
              />
              <IconCornerDownLeft v-else class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>

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

    <!-- The model chose this target from a sentence the user typed, so the
         prompt names what is about to go. Dismissing counts as "no". -->
    <HoppSmartConfirmModal
      :show="!!chat.pendingConfirmation.value"
      :title="confirmTitle"
      @hide-modal="chat.resolveConfirmation(false)"
      @resolve="chat.resolveConfirmation(true)"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type Component,
} from "vue"
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
import type { AIChatModelOption } from "~/platform/experiments"
import { logoForPreset } from "~/helpers/aichat/provider-logos"
import {
  filterSkills,
  skillQueryIn,
  type ChatSkill,
} from "~/helpers/aichat/skills"
import IconActivity from "~icons/lucide/activity"
import IconArrowUpRight from "~icons/lucide/arrow-up-right"
import IconBraces from "~icons/lucide/braces"
import IconBriefcase from "~icons/lucide/briefcase"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconCircle from "~icons/lucide/circle"
import IconCircleDot from "~icons/lucide/circle-dot"
import IconCornerDownLeft from "~icons/lucide/corner-down-left"
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

// The availability query needs a session, and the answer decides whether the
// launcher belongs on screen at all — so it is asked as soon as there is one,
// not deferred until the pane opens.
watch(
  currentUser,
  (user) => {
    if (user) void chat.loadAvailability()
  },
  { immediate: true }
)

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
const modelDropdown = ref<HTMLElement | null>(null)
const scrollEl = ref<HTMLElement | null>(null)

const groupedModels = computed(() => {
  const groups = new Map<string, AIChatModelOption[]>()
  // Keyed by connection, not by label: two connections may share a label, and
  // merging them would attach one provider's mark to the other's models.
  for (const option of chat.modelOptions.value) {
    const existing = groups.get(option.connectionID)
    if (existing) existing.push(option)
    else groups.set(option.connectionID, [option])
  }
  return [...groups.values()].map((models) => ({
    connectionID: models[0].connectionID,
    label: models[0].connectionLabel,
    preset: models[0].preset,
    models,
  }))
})

const isSelected = (option: AIChatModelOption) =>
  chat.selectedModel.value?.connectionID === option.connectionID &&
  chat.selectedModel.value?.model === option.model

const selectedModelLabel = computed(
  () => chat.selectedModel.value?.model ?? t("ai_experiments.chat.model")
)

/**
 * Dismissed with Escape, and reset the moment the query changes — otherwise a
 * user who escaped once could never reopen the menu without clearing the input.
 */
const skillMenuDismissed = ref(false)
const skillIndex = ref(0)
const skillMenuEl = ref<HTMLElement | null>(null)

const skillQuery = computed(() => skillQueryIn(input.value))

const matchingSkills = computed(() =>
  skillQuery.value === null
    ? []
    : filterSkills(chat.skills.value, skillQuery.value)
)

// The handler is awaiting this promise. If the pane goes away with one open,
// nothing would ever settle it and the turn would hang.
onBeforeUnmount(() => chat.resolveConfirmation(false))

const confirmTitle = computed(() => {
  const pending = chat.pendingConfirmation.value
  if (!pending) return ""
  return pending.kind === "collection"
    ? t("ai_experiments.confirm_delete_collection", { name: pending.name })
    : t("ai_experiments.confirm_delete_mock_server", { name: pending.name })
})

const skillMenuOpen = computed(
  () =>
    skillQuery.value !== null &&
    !skillMenuDismissed.value &&
    !noModelsConfigured.value
)

/**
 * Whether the menu has something to choose.
 *
 * The menu stays open on a query that matches nothing, so it can say so — but
 * it must not claim the keys that move through and pick a skill. Consuming
 * Enter there left "/health" unsendable, and the wrap-around arithmetic ran
 * modulo zero.
 */
const skillMenuHasChoices = computed(
  () => skillMenuOpen.value && matchingSkills.value.length > 0
)

watch(skillQuery, () => {
  skillMenuDismissed.value = false
  skillIndex.value = 0
  // A shorter list after filtering would otherwise stay scrolled where the
  // longer one left it, showing empty space instead of the first match.
  nextTick(() => skillMenuEl.value?.scrollTo({ top: 0 }))
})

/**
 * Keeps the highlighted option in view.
 *
 * The menu is capped at max-h-56 and scrolls, so arrowing past its edge would
 * move the selection somewhere the user cannot see — and the only feedback
 * that anything happened is the highlight itself. `block: "nearest"` scrolls
 * the minimum needed rather than recentring on every keystroke.
 */
watch(skillIndex, (index) => {
  nextTick(() => {
    skillMenuEl.value
      ?.querySelector<HTMLElement>(`#hopp-skill-${index}`)
      ?.scrollIntoView({ block: "nearest" })
  })
})

/**
 * Fills the composer with the skill's prompt instead of sending it.
 *
 * The prompt is a starting point — "debug this request" is more useful with
 * "the 401 only happens in staging" appended — so the user gets to edit it.
 */
const applySkill = (skill: ChatSkill) => {
  input.value = skill.prompt
  skillMenuDismissed.value = false
  nextTick(() => {
    textareaEl.value?.focus()
    autoResize()
  })
}

const selectedLogo = computed(() => {
  const selected = chat.modelOptions.value.find(isSelected)
  return selected ? logoForPreset(selected.preset) : IconSparkles
})

/**
 * True only once the server has actually answered with an empty list. A lookup
 * that failed leaves this false, so a flaky request cannot disable a chat that
 * would have worked.
 */
const noModelsConfigured = computed(
  () => chat.availabilityKnown.value && chat.modelOptions.value.length === 0
)

/**
 * Only true once the server has actually said "off". Null means we have not
 * asked yet, and the launcher shows meanwhile rather than flickering in on
 * every page load.
 */
const instanceDisabled = computed(() => chat.instanceEnabled.value === false)
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
  if (skillMenuOpen.value) {
    if (
      skillMenuHasChoices.value &&
      (e.key === "ArrowDown" || e.key === "ArrowUp")
    ) {
      e.preventDefault()
      const step = e.key === "ArrowDown" ? 1 : -1
      const count = matchingSkills.value.length
      skillIndex.value = (skillIndex.value + step + count) % count
      return
    }
    if (e.key === "Escape") {
      e.preventDefault()
      // The pane closes on Escape too. Dismissing the menu has to consume the
      // key, or one press would shut the whole assistant.
      e.stopPropagation()
      skillMenuDismissed.value = true
      return
    }
    if (
      skillMenuHasChoices.value &&
      (e.key === "Enter" || e.key === "Tab") &&
      !e.isComposing
    ) {
      e.preventDefault()
      const chosen = matchingSkills.value[skillIndex.value]
      if (chosen) applySkill(chosen)
      return
    }
  }

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
