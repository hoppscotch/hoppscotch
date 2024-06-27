<template>
  <div
    class="flex flex-col py-2 px-4 w-72 relative border border-[#BCB78B] bg-[#FEFFD2] rounded-md text-[#7E7103]"
  >
    <button
      class="absolute top-2 right-2 hover:text-black"
      @click="$emit('close-toast')"
    >
      <IconLucideX />
    </button>
    <div class="flex flex-col space-y-3">
      <p class="leading-5 font-semibold">
        {{ t("app.updated_text", { version: version }) }}
      </p>
      <button
        class="flex items-center space-x-1 hover:underline"
        @click="openWhatsNew"
      >
        <span>
          {{ t("app.see_whats_new") }}
        </span>
        <IconLucideArrowUpRight />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { platform } from "~/platform"

const t = useI18n()

const props = defineProps<{
  notesUrl: string
  version: string
}>()

defineEmits<{
  (e: "close-toast"): void
}>()

const openWhatsNew = () => {
  if (props.notesUrl) platform.io.openExternalLink(props.notesUrl)
}
</script>
