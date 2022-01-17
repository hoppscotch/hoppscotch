<template>
  <div
    class="relative flex flex-col space-y-2 overflow-hidden"
    :class="expand ? 'h-full' : 'max-h-32'"
  >
    <slot name="body"></slot>
    <div class="flex sticky bottom-0 inset-x-0 items-center justify-center">
      <ButtonSecondary
        :icon="expand ? 'expand_less' : 'expand_more'"
        :label="expand ? t('action.less') : t('action.more')"
        filled
        rounded
        @click.native="expand = !expand"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const expand = ref(false)
</script>
