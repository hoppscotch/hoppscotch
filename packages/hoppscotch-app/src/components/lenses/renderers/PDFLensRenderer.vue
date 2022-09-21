<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :icon="downloadIcon"
          @click="downloadResponse"
        />
      </div>
    </div>
    <vue-pdf-embed
      :source="pdfsrc"
      class="flex flex-1 overflow-auto border-b border-dividerLight"
      type="application/pdf"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import VuePdfEmbed from "vue-pdf-embed"
import { useI18n } from "@composables/i18n"
import { useDownloadResponse } from "@composables/lens-actions"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse & {
    type: "success" | "fail"
  }
}>()

const pdfsrc = computed(() =>
  URL.createObjectURL(
    new Blob([props.response.body], {
      type: "application/pdf",
    })
  )
)

const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/pdf",
  computed(() => props.response.body)
)
</script>
