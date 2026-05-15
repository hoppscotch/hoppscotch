<template>
  <!-- Three-column grid identical to the shared settings page's other
       sections (General / Theme / Kernel interceptor), so this block falls
       into the same visual rhythm when it renders. -->
  <div class="md:grid md:grid-cols-3 md:gap-4">
    <div class="p-8 md:col-span-1">
      <h3 class="heading">
        {{ t("settings.desktop") }}
      </h3>
      <p class="my-1 text-secondaryLight">
        {{ t("settings.desktop_description") }}
      </p>
    </div>
    <div class="space-y-8 p-8 md:col-span-2">
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t("settings.desktop_updates") }}
        </h4>

        <!-- Manual update check control. The button's label, icon,
             disabled-ness, and click behavior all come from one view
             descriptor computed from the update state, so adding or
             renaming a state means touching one `case` instead of five
             parallel switches. A fixed `min-width` holds the button
             size stable across label changes. Download progress rides
             inline in the label rather than in a separate progress bar,
             so the control stays the same size across every state. -->
        <div class="mt-4">
          <div class="flex items-center space-x-3">
            <HoppButtonSecondary
              class="!min-w-[15rem] !justify-start"
              :icon="view.icon"
              :label="view.label"
              :disabled="view.disabled"
              outline
              @click="view.action"
            />
            <HoppButtonSecondary
              v-if="view.showCancel"
              :label="t('action.cancel')"
              outline
              @click="updateCheck.cancel()"
            />
          </div>
          <div class="mt-3 min-h-[1.25rem]">
            <Transition name="helper-fade" mode="out-in">
              <p :key="helperText" :class="helperTextClasses">
                {{ helperText }}
              </p>
            </Transition>
          </div>
        </div>

        <!-- Auto-check toggle with its own description. The inner
             `flex items-center` wrapper matches the convention used by
             other toggles on the shared settings page (see
             `settings/Native.vue`), so the toggle sits at the same left
             edge as the check button above instead of stretching to fill
             the `flex-col` parent. -->
        <div class="mt-6">
          <div class="flex items-center">
            <HoppSmartToggle
              :on="desktopSettings.settings.disableUpdateChecks"
              @change="toggleDisableUpdateChecks"
            >
              {{ t("settings.disable_update_checks") }}
            </HoppSmartToggle>
          </div>
          <p class="mt-3 text-xs text-secondaryLight">
            {{ t("settings.disable_update_checks_description") }}
          </p>
        </div>
      </section>

      <!-- Keyboard layout strategy. Three radios, each with a one-line
           description so the user can pick without trial and error.
           Selection writes to `keyboardLayoutStrategy` through the
           desktop settings composable, which mirrors it into the
           keyboard-strategy holder so the next keypress respects the
           change. -->
      <section>
        <h4 class="font-semibold text-secondaryDark">
          {{ t("settings.desktop_keyboard") }}
        </h4>

        <div class="mt-4">
          <p class="text-secondaryLight">
            {{ t("settings.desktop_keyboard_strategy_label") }}
          </p>
          <p class="mt-1 text-xs text-secondaryLight">
            {{ t("settings.desktop_keyboard_strategy_description") }}
          </p>

          <div class="mt-4 space-y-4">
            <div v-for="option in keyboardStrategyOptions" :key="option.value">
              <HoppSmartRadio
                :value="option.value"
                :label="option.label"
                :selected="
                  desktopSettings.settings.keyboardLayoutStrategy ===
                  option.value
                "
                class="!px-0 hover:bg-transparent"
                @change="setKeyboardStrategy(option.value)"
              />
              <p class="ml-8 mt-1 text-xs text-secondaryLight">
                {{ option.description }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type Component } from "vue"
import {
  HoppButtonSecondary,
  HoppSmartRadio,
  HoppSmartToggle,
} from "@hoppscotch/ui"
import { useI18n } from "~/composables/i18n"
import type { DesktopSettings } from "~/platform/desktop-settings"

import IconLucideDownload from "~icons/lucide/download"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"
import IconLucideLoader from "~icons/lucide/loader"
import IconLucideCheckCircle from "~icons/lucide/check-circle"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"

import { useDesktopSettings } from "~/composables/desktop-settings"
import { useUpdateCheck } from "~/composables/update-check"

// The shared settings page iterates `additionalSettingsSections`
// with `:key="item.id"`. Without an explicit `id` on the component
// options, Vue would use `undefined` as the key, which causes
// keyed-list warnings at runtime and means the renderer loses its
// cross-update identity for this node (so a re-registration by any
// consumer would force a full remount instead of a reconcile).
// Registering a stable `id` closes that.
defineOptions({
  name: "DesktopSettingsSection",
  id: "desktop-settings",
})

const t = useI18n()

const desktopSettings = useDesktopSettings()
const updateCheck = useUpdateCheck()

// Composed view descriptor for the manual-check button. Every field the
// template binds comes from the same function so adding, renaming, or
// deleting an update state is a single-case edit. The alternative of
// parallel computeds for `label`, `icon`, `disabled`, and click handler
// spreads the behavior for each state across four functions and leaves
// no single place to read what state X renders as.
type ButtonView = {
  label: string
  icon: Component
  disabled: boolean
  showCancel: boolean
  action: () => Promise<void> | void
}

const noop = (): void => undefined

const view = computed<ButtonView>(() => {
  const s = updateCheck.state.value
  switch (s.kind) {
    case "idle":
      return {
        label: t("settings.update_check_now"),
        icon: IconLucideRefreshCw,
        disabled: false,
        showCancel: false,
        action: updateCheck.check,
      }
    case "checking":
      return {
        label: t("settings.update_checking"),
        icon: IconLucideLoader,
        disabled: true,
        showCancel: false,
        action: noop,
      }
    case "available":
      return {
        label: t("settings.update_download_version", {
          version: s.latestVersion,
        }),
        icon: IconLucideDownload,
        disabled: false,
        showCancel: false,
        action: updateCheck.download,
      }
    case "not_available":
      return {
        label: t("settings.update_check_now"),
        icon: IconLucideCheckCircle,
        disabled: false,
        showCancel: false,
        action: updateCheck.check,
      }
    case "downloading":
      return {
        label: t("settings.update_downloading_percent", {
          percent: Math.round(s.progress.percentage),
        }),
        icon: IconLucideLoader,
        disabled: true,
        showCancel: true,
        action: noop,
      }
    case "installing":
      return {
        label: t("settings.update_installing"),
        icon: IconLucideLoader,
        disabled: true,
        showCancel: true,
        action: noop,
      }
    case "ready_to_restart":
      return {
        label: t("settings.update_restart_now"),
        icon: IconLucideRefreshCw,
        disabled: false,
        showCancel: false,
        action: updateCheck.restart,
      }
    case "error":
      return {
        label: t("settings.update_check_now"),
        icon: IconLucideAlertCircle,
        disabled: false,
        showCancel: false,
        action: updateCheck.check,
      }
    default: {
      // Exhaustiveness check. TypeScript narrows `s` to `never` here if
      // every variant of `UpdateState["kind"]` is handled above, so
      // adding a new variant without a matching `case` fails to compile.
      // The throw also satisfies eslint's `vue/return-in-computed-property`,
      // which does not do TS-level exhaustiveness analysis.
      const unreachable: never = s
      throw new Error(`Unhandled update state: ${JSON.stringify(unreachable)}`)
    }
  }
})

// Helper text below the button shows the baseline description by default.
// Transient status feedback ("Up to date", error message) appears on entry
// into `not_available` or `error` and fades back to the description after
// a linger, so the description stays visible most of the time and the
// status feedback reads as transient confirmation rather than permanent
// replacement. The `<Transition>` wrapping the `<p>` fades between
// content changes.
const TRANSIENT_FEEDBACK_MS = {
  notAvailable: 4_000,
  error: 6_000,
} as const

const showTransientFeedback = ref(false)
let feedbackTimer: ReturnType<typeof setTimeout> | undefined

watch(
  () => updateCheck.state.value.kind,
  (kind) => {
    if (kind !== "not_available" && kind !== "error") return

    showTransientFeedback.value = true
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(
      () => {
        showTransientFeedback.value = false
      },
      kind === "error"
        ? TRANSIENT_FEEDBACK_MS.error
        : TRANSIENT_FEEDBACK_MS.notAvailable
    )
  }
)

onBeforeUnmount(() => {
  if (feedbackTimer) clearTimeout(feedbackTimer)
})

const helperText = computed(() => {
  if (showTransientFeedback.value) {
    const s = updateCheck.state.value
    if (s.kind === "error") {
      return s.message
    }
    if (s.kind === "not_available") {
      return t("settings.update_up_to_date")
    }
  }
  return t("settings.update_check_description")
})

const helperTextClasses = computed(() => {
  const base = "text-xs"
  return showTransientFeedback.value && updateCheck.state.value.kind === "error"
    ? `${base} text-red-500`
    : `${base} text-secondaryLight`
})

async function toggleDisableUpdateChecks(): Promise<void> {
  await desktopSettings.update(
    "disableUpdateChecks",
    !desktopSettings.settings.disableUpdateChecks
  )
}

// Keyboard layout strategy radios. Order is recommended-first so users
// without a preference get the smart default. Labels and descriptions
// are i18n keys, rebuilt as a `computed` so a locale change updates
// the rendered text.
type KeyboardStrategy = DesktopSettings["keyboardLayoutStrategy"]

const keyboardStrategyOptions = computed<
  Array<{ value: KeyboardStrategy; label: string; description: string }>
>(() => [
  {
    value: "hybrid",
    label: t("settings.desktop_keyboard_strategy_hybrid"),
    description: t("settings.desktop_keyboard_strategy_hybrid_description"),
  },
  {
    value: "key",
    label: t("settings.desktop_keyboard_strategy_key"),
    description: t("settings.desktop_keyboard_strategy_key_description"),
  },
  {
    value: "code",
    label: t("settings.desktop_keyboard_strategy_code"),
    description: t("settings.desktop_keyboard_strategy_code_description"),
  },
])

async function setKeyboardStrategy(value: KeyboardStrategy): Promise<void> {
  await desktopSettings.update("keyboardLayoutStrategy", value)
}
</script>

<style scoped>
.helper-fade-enter-active,
.helper-fade-leave-active {
  transition: opacity 0.3s ease;
}
.helper-fade-enter-from,
.helper-fade-leave-to {
  opacity: 0;
}
</style>
