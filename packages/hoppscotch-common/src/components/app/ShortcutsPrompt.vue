<template>
  <div class="flex flex-col items-center justify-center text-secondaryLight">
    <div class="mb-4 flex space-x-2">
      <div class="flex flex-col items-end space-y-4 text-right">
        <span
          v-for="shortcut in shortcutList"
          :key="shortcut.label"
          class="flex flex-1 items-center"
        >
          {{ shortcut.label }}
        </span>
      </div>
      <div class="flex flex-col space-y-4">
        <div
          v-for="shortcut in shortcutList"
          :key="`${shortcut.label}-keys`"
          class="flex"
        >
          <kbd
            v-for="key in shortcut.keys"
            :key="`${shortcut.label}-${key}`"
            class="shortcut-key"
          >
            {{ key }}
          </kbd>
        </div>
      </div>
    </div>
    <div
      v-if="primaryActionLabel || secondaryActionLabel"
      class="mb-4 flex flex-col gap-3 sm:flex-row"
    >
      <HoppButtonPrimary
        v-if="primaryActionLabel"
        :label="primaryActionLabel"
        outline
        @click="emit('primary-action')"
      />
      <HoppButtonSecondary
        v-if="secondaryActionLabel"
        :label="secondaryActionLabel"
        outline
        filled
        @click="emit('secondary-action')"
      />
    </div>
    <HoppButtonSecondary
      v-if="showDocumentation"
      :label="`${t('app.documentation')}`"
      to="https://docs.hoppscotch.io/documentation/features/rest-api-testing#response"
      :icon="IconExternalLink"
      blank
      outline
      reverse
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import type { ShortcutDef } from "~/helpers/shortcuts"
import IconExternalLink from "~icons/lucide/external-link"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"

const props = withDefaults(
  defineProps<{
    shortcuts?: ShortcutDef[]
    primaryActionLabel?: string
    secondaryActionLabel?: string
    showDocumentation?: boolean
  }>(),
  {
    shortcuts: () => [],
    primaryActionLabel: undefined,
    secondaryActionLabel: undefined,
    showDocumentation: true,
  }
)

const emit = defineEmits<{
  (event: "primary-action"): void
  (event: "secondary-action"): void
}>()

const t = useI18n()

const shortcutList = computed(() =>
  props.shortcuts.length > 0
    ? props.shortcuts
    : [
        {
          label: t("shortcut.request.send_request"),
          keys: [getSpecialKey(), "Enter"],
          section: t("shortcut.request.title"),
        },
        {
          label: t("shortcut.general.show_all"),
          keys: [getSpecialKey(), "/"],
          section: t("shortcut.general.title"),
        },
        {
          label: t("shortcut.general.command_menu"),
          keys: [getSpecialKey(), "K"],
          section: t("shortcut.general.title"),
        },
        {
          label: t("shortcut.general.help_menu"),
          keys: ["?"],
          section: t("shortcut.general.title"),
        },
      ]
)
</script>
