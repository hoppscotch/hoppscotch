<template>
  <div
    class="relative flex flex-col space-y-2 overflow-hidden"
    :class="expand ? 'h-full' : 'max-h-32'"
  >
    <slot name="body"></slot>
    <div
      class="sticky inset-x-0 bottom-0 flex items-center justify-center flex-shrink-0 overflow-x-auto"
    >
      <ButtonSecondary
        :icon="expand ? IconChevronUp : IconChevronDown"
        :label="expand ? t('action.less') : t('action.more')"
        filled
        rounded
        @click="expand = !expand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconChevronUp from "~icons/lucide/chevron-up"
import IconChevronDown from "~icons/lucide/chevron-down"
import { ref } from "vue"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const expand = ref(false)
</script>
