<template>
  <div class="flex flex-col items-center p-4 border rounded border-dividerDark">
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

const shortcodeBaseURL =
  import.meta.env.VITE_SHORTCODE_BASE_URL ?? "https://hopp.sh"

const text = computed(() => {
  return props.label
    ? t(props.label)
    : `${shortcodeBaseURL}/r/${props.link ?? "xxxx"}`
})
</script>
