<template>
  <div
    class="flex items-center justify-center rounded border border-dotted border-dividerDark p-5"
  >
    <span
      :class="{
        'border-b border-secondary': label,
      }"
    >
      {{ text }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  link?: string | undefined
  label?: string | undefined
}>()

const text = computed(() => {
  return props.label ? t(props.label) : `hopp.sh/r/${props.link ?? "xxxx"}`
})
</script>
