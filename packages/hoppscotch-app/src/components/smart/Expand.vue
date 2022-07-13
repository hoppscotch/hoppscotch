<template>
  <div
    class="relative flex flex-col overflow-hidden space-y-2"
    :class="expand ? 'h-full' : 'max-h-32'"
  >
    <slot name="body"></slot>
    <div class="sticky inset-x-0 bottom-0 flex items-center justify-center">
      <ButtonSecondary
        :icon="expand ? IconExpandLess : IconExpandMore"
        :label="expand ? t('action.less') : t('action.more')"
        filled
        rounded
        @click.native="expand = !expand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import IconExpandLess from "~icons/ic/sharp-expand-less"
import IconExpandMore from "~icons/ic/sharp-expand-more"
import { ref } from "vue"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const expand = ref(false)
</script>
