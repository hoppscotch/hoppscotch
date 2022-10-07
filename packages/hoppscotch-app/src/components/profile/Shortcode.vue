<template>
  <div
    class="block w-full my-6 border divide-y lg:flex lg:my-0 lg:border-0 lg:divide-y-0 lg:divide-x divide-dividerLight border-dividerLight"
  >
    <div class="font-mono text-tiny table-box">
      {{ shortcode.id }}
    </div>
    <div class="table-box" :class="requestLabelColor">
      {{ parseShortcodeRequest.method }}
    </div>
    <div class="table-box">
      {{ parseShortcodeRequest.endpoint }}
    </div>
    <div ref="timeStampRef" class="table-box">
      {{ dateStamp }}
    </div>
    <div class="justify-center table-box">
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.open_workspace')"
        :to="`${shortcodeBaseURL}/r/${shortcode.id}`"
        blank
        :icon="IconExternalLink"
        class="px-3 text-accent hover:text-accent"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        color="green"
        :icon="copyIconRefs"
        class="px-3"
        @click="copyShortcode(shortcode.id)"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.delete')"
        :icon="IconTrash"
        color="red"
        class="px-3"
        @click="deleteShortcode(shortcode.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { pipe } from "fp-ts/function"
import * as RR from "fp-ts/ReadonlyRecord"
import * as O from "fp-ts/Option"
import { translateToNewRequest } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { Shortcode } from "~/helpers/shortcodes/Shortcode"
import { shortDateTime } from "~/helpers/utils/date"

import IconTrash from "~icons/lucide/trash"
import IconExternalLink from "~icons/lucide/external-link"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  shortcode: Shortcode
}>()

const emit = defineEmits<{
  (e: "delete-shortcode", codeID: string): void
}>()

const deleteShortcode = (codeID: string) => {
  emit("delete-shortcode", codeID)
}

const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
} as const

const timeStampRef = ref()

const copyIconRefs = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const parseShortcodeRequest = computed(() =>
  pipe(props.shortcode.request, JSON.parse, translateToNewRequest)
)

const requestLabelColor = computed(() =>
  pipe(
    requestMethodLabels,
    RR.lookup(parseShortcodeRequest.value.method.toLowerCase()),
    O.getOrElseW(() => requestMethodLabels.default)
  )
)

const dateStamp = computed(() => shortDateTime(props.shortcode.createdOn))

const shortcodeBaseURL =
  import.meta.env.VITE_SHORTCODE_BASE_URL ?? "https://hopp.sh"

const copyShortcode = (codeID: string) => {
  copyToClipboard(`${shortcodeBaseURL}/r/${codeID}`)
  toast.success(`${t("state.copied_to_clipboard")}`)
  copyIconRefs.value = IconCheck
}
</script>

<style lang="scss" scoped>
.table-box {
  @apply flex flex-1 items-center px-4 py-1 truncate;
}
</style>
