<template>
  <div class="block my-10 lg:my-0 lg:table-row lg:p-2">
    <div class="table-cell" :data-label="t('shortcodes.short_code')">
      <div class="truncate max-w-30">
        {{ shortCode.id }}
      </div>
    </div>
    <div
      class="table-cell"
      :class="
        getRequestLabelColor(parseShortcodeRequest(shortCode.request).method)
      "
      :data-label="t('shortcodes.method')"
    >
      {{ parseShortcodeRequest(shortCode.request).method }}
    </div>
    <div class="table-cell" :data-label="t('shortcodes.url')">
      <div class="mx-0 truncate max-w-45 lg:mx-auto hover:text-clip">
        {{ parseShortcodeRequest(shortCode.request).endpoint }}
      </div>
    </div>
    <div
      ref="timeStampRef"
      class="table-cell lg:w-25"
      :data-label="t('shortcodes.created_on')"
    >
      {{
        timestampHovered
          ? new Date(shortCode.createdOn).toLocaleTimeString()
          : new Date(shortCode.createdOn).toLocaleDateString()
      }}
    </div>
    <div class="table-cell" :data-label="t('shortcodes.actions')">
      <div class="flex justify-end lg:justify-center space-x-1">
        <SmartAnchor
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.open_workspace')"
          :to="`https://hopp.sh/r/${shortCode.id}`"
          blank
          svg="external-link"
          color="blue"
          class="p-2"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          color="green"
          :svg="copyIconRefs"
          @click.native="copyShortCode(shortCode.id)"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.delete')"
          svg="trash"
          color="red"
          @click.native="deleteShortCode(shortCode.id)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { useElementHover } from "@vueuse/core"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { copyToClipboard } from "~/helpers/utils/clipboard"

const t = useI18n()
const toast = useToast()

defineProps<{
  shortCode: {
    id: string
    request: string
    createdOn: string
  }
}>()

const emit = defineEmits<{
  (e: "delete-short-code", codeID: string): void
}>()

const deleteShortCode = (codeID: string) => {
  emit("delete-short-code", codeID)
}

const timeStampRef = ref()
const copyIconRefs = ref("copy")
const timestampHovered = useElementHover(timeStampRef)

const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
}

const copyShortCode = (codeID: string) => {
  copyToClipboard(`https://hopp.sh/r/${codeID}`)
  toast.success(`${t("state.copied_to_clipboard")}`)
  copyIconRefs.value = "check"
  setTimeout(() => (copyIconRefs.value = "copy"), 1000)
}

const parseShortcodeRequest = (request: string) => JSON.parse(request)

const getRequestLabelColor = (method: string) =>
  requestMethodLabels[
    method.toLowerCase() as keyof typeof requestMethodLabels
  ] || requestMethodLabels.default
</script>

<style lang="scss">
.table-cell {
  @apply flex justify-between items-center py-4 px-3 lg:py-3 lg:px-2 lg:table-cell border-1 border-dividerLight lg:text-center;
}
.table-row-group {
  .table-cell {
    @apply before:text-secondary before:font-bold before:content-[attr(data-label)] lg:before:hidden;
  }
}
</style>
