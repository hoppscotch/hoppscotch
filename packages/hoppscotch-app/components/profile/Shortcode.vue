<template>
  <div class="block my-10 lg:my-0 lg:table-row lg:p-2">
    <div class="table-col" :data-label="t('shortcodes.short_code')">
      {{ shortCode.id }}
    </div>
    <div
      class="table-col"
      :class="
        getRequestLabelColor(parseShortcodeRequest(shortCode.request).method)
      "
      :data-label="t('shortcodes.method')"
    >
      {{ parseShortcodeRequest(shortCode.request).method }}
    </div>
    <div class="table-col" :data-label="t('shortcodes.url')">
      {{ parseShortcodeRequest(shortCode.request).endpoint }}
    </div>
    <div
      ref="timeStampRef"
      class="table-col"
      :data-label="t('shortcodes.created_on')"
    >
      {{
        timestampHovered
          ? new Date(shortCode.createdOn).toLocaleTimeString()
          : new Date(shortCode.createdOn).toLocaleDateString()
      }}
    </div>
    <div
      class="flex items-center justify-center border divide-x lg:table-cell border-dividerLight divide-dividerLight"
      :data-label="t('shortcodes.actions')"
    >
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
.table-col {
  @apply flex items-center justify-center lg:table-cell border border-dividerLight px-4 py-2;
}

.table-row-group {
  .table-col {
    @apply before:text-secondary before:font-bold before:content-[attr(data-label)] lg:before:hidden;
  }
}
</style>
