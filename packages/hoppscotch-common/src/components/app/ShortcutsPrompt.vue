<template>
  <div
    class="flex flex-col items-center justify-center text-secondaryLight"
    :class="{ 'h-[50vh]': !COLUMN_LAYOUT }"
  >
    <div class="mb-4 flex space-x-2">
      <div class="flex flex-col items-end space-y-4 text-right">
        <span class="flex flex-1 items-center">
          {{ t("shortcut.request.send_request") }}
        </span>
        <span class="flex flex-1 items-center">
          {{ t("shortcut.general.show_all") }}
        </span>
        <span class="flex flex-1 items-center">
          {{ t("shortcut.general.command_menu") }}
        </span>
        <span class="flex flex-1 items-center">
          {{ t("shortcut.general.help_menu") }}
        </span>
      </div>
      <div class="flex flex-col space-y-4">
        <div class="flex">
          <kbd class="shortcut-key">{{ getSpecialKey() }}</kbd>
          <kbd class="shortcut-key">↩</kbd>
        </div>
        <div class="flex">
          <kbd class="shortcut-key">{{ getSpecialKey() }}</kbd>
          <kbd class="shortcut-key">/</kbd>
        </div>
        <div class="flex">
          <kbd class="shortcut-key">{{ getSpecialKey() }}</kbd>
          <kbd class="shortcut-key">K</kbd>
        </div>
        <div class="flex">
          <kbd class="shortcut-key">?</kbd>
        </div>
      </div>
    </div>
    <HoppButtonSecondary
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
import { useI18n } from "~/composables/i18n"
import IconExternalLink from "~icons/lucide/external-link"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { useSetting } from "~/composables/settings"

const t = useI18n()
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
</script>
