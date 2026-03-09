<template>
  <button
    class="relative flex flex-1 cursor-text items-center justify-between self-stretch rounded bg-primaryDark px-2 text-secondaryLight transition hover:border-dividerDark hover:bg-primaryLight hover:text-secondary focus-visible:border-dividerDark focus-visible:bg-primaryLight focus-visible:text-secondary overflow-hidden"
    @click="invokeAction('modals.search.toggle', undefined, 'mouseclick')"
  >
    <span class="inline-flex flex-1 items-center">
      <icon-lucide-search class="svg-icons mr-2" />

      {{ t("app.search") }}
    </span>
    <span class="flex space-x-1">
      <kbd class="shortcut-key">{{ getPlatformSpecialKey() }}</kbd>
      <kbd class="shortcut-key">K</kbd>
    </span>
  </button>
</template>

<script lang="ts" setup>
import { useI18n } from "~/composables/i18n"
import { invokeAction } from "~/helpers/actions"
import { getPlatformSpecialKey } from "~/helpers/platformutils"

const t = useI18n()
</script>
