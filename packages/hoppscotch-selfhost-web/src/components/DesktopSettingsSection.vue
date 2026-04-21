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

        <!-- Manual update check control. Button has a fixed `min-width`
             wide enough for the longest label ("Restart to apply update")
             so label changes across states never resize the control.
             Progress percentage lives inside the button label during
             downloads, so the separate progress-bar element can be dropped
             and the whole control keeps a stable height. The helper text
             area below has `min-h` reserved so the toggle underneath never
             shifts vertically between states. Transient status feedback
             ("Up to date", error messages) fades back to the baseline
             description after a linger so the description stays visible
             most of the time. -->
        <div class="mt-4">
          <div class="flex items-center space-x-3">
            <HoppButtonSecondary
              class="!min-w-[15rem] !justify-start"
              :icon="buttonIcon"
              :label="buttonLabel"
              :disabled="buttonDisabled"
              outline
              @click="handleButtonClick"
            />
            <HoppButtonSecondary
              v-if="showCancelButton"
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { HoppButtonSecondary, HoppSmartToggle } from "@hoppscotch/ui"
import { useI18n } from "@hoppscotch/common/composables/i18n"

import IconLucideDownload from "~icons/lucide/download"
import IconLucideRefreshCw from "~icons/lucide/refresh-cw"
import IconLucideLoader from "~icons/lucide/loader"
import IconLucideCheckCircle from "~icons/lucide/check-circle"
import IconLucideAlertCircle from "~icons/lucide/alert-circle"

import { useDesktopSettings } from "@app/composables/useDesktopSettings"
import { useUpdateCheck, UpdateStatus } from "@app/composables/useUpdateCheck"

const t = useI18n()

const desktopSettings = useDesktopSettings()
const updateCheck = useUpdateCheck()

// Button label, disabled state, icon, and click handler are all driven
// from the single `UpdateStatus` value. Every status renders
// deterministically so a reader of this file can see the full state
// machine at a glance. The `DOWNLOADING` label interpolates the progress
// percentage so the button itself communicates progress, no separate
// progress-bar element needed.
const buttonLabel = computed(() => {
  switch (updateCheck.status.value) {
    case UpdateStatus.CHECKING:
      return t("settings.update_checking")
    case UpdateStatus.AVAILABLE:
      return t("settings.update_download_version", {
        version: updateCheck.latestVersion.value ?? "",
      })
    case UpdateStatus.DOWNLOADING:
      return t("settings.update_downloading_percent", {
        percent: Math.round(updateCheck.progress.value?.percentage ?? 0),
      })
    case UpdateStatus.INSTALLING:
      return t("settings.update_installing")
    case UpdateStatus.READY_TO_RESTART:
      return t("settings.update_restart_now")
    case UpdateStatus.IDLE:
    case UpdateStatus.NOT_AVAILABLE:
    case UpdateStatus.ERROR:
    default:
      return t("settings.update_check_now")
  }
})

const buttonDisabled = computed(() => {
  switch (updateCheck.status.value) {
    case UpdateStatus.CHECKING:
    case UpdateStatus.DOWNLOADING:
    case UpdateStatus.INSTALLING:
      return true
    default:
      return false
  }
})

// Icon per state. Uses the same lucide set as `UpdateFlow.vue` so the
// iconography stays consistent between the startup flow and this page.
const buttonIcon = computed(() => {
  switch (updateCheck.status.value) {
    case UpdateStatus.CHECKING:
    case UpdateStatus.DOWNLOADING:
    case UpdateStatus.INSTALLING:
      return IconLucideLoader
    case UpdateStatus.AVAILABLE:
      return IconLucideDownload
    case UpdateStatus.READY_TO_RESTART:
      return IconLucideRefreshCw
    case UpdateStatus.NOT_AVAILABLE:
      return IconLucideCheckCircle
    case UpdateStatus.ERROR:
      return IconLucideAlertCircle
    case UpdateStatus.IDLE:
    default:
      return IconLucideRefreshCw
  }
})

const showCancelButton = computed(
  () =>
    updateCheck.status.value === UpdateStatus.DOWNLOADING ||
    updateCheck.status.value === UpdateStatus.INSTALLING
)

// Helper text below the button shows the baseline description by default.
// Transient status feedback ("Up to date", error message) appears on entry
// into `NOT_AVAILABLE` or `ERROR` and fades back to the description after
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
  () => updateCheck.status.value,
  (newStatus) => {
    if (
      newStatus !== UpdateStatus.NOT_AVAILABLE &&
      newStatus !== UpdateStatus.ERROR
    ) {
      return
    }

    showTransientFeedback.value = true
    if (feedbackTimer) clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(
      () => {
        showTransientFeedback.value = false
      },
      newStatus === UpdateStatus.ERROR
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
    if (
      updateCheck.status.value === UpdateStatus.ERROR &&
      updateCheck.errorMessage.value
    ) {
      return updateCheck.errorMessage.value
    }
    if (updateCheck.status.value === UpdateStatus.NOT_AVAILABLE) {
      return t("settings.update_up_to_date")
    }
  }
  return t("settings.update_check_description")
})

const helperTextClasses = computed(() => {
  const base = "text-xs"
  return showTransientFeedback.value &&
    updateCheck.status.value === UpdateStatus.ERROR
    ? `${base} text-red-500`
    : `${base} text-secondaryLight`
})

async function handleButtonClick(): Promise<void> {
  switch (updateCheck.status.value) {
    case UpdateStatus.AVAILABLE:
      await updateCheck.download()
      break
    case UpdateStatus.READY_TO_RESTART:
      await updateCheck.restart()
      break
    case UpdateStatus.IDLE:
    case UpdateStatus.NOT_AVAILABLE:
    case UpdateStatus.ERROR:
    default:
      await updateCheck.check()
      break
  }
}

async function toggleDisableUpdateChecks(): Promise<void> {
  await desktopSettings.update(
    "disableUpdateChecks",
    !desktopSettings.settings.disableUpdateChecks
  )
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
