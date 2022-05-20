<template>
  <div class="block my-10 lg:my-0 lg:table-row lg:p-2">
    <div class="table-col lg:w-70" :data-label="t('shortcodes.short_code')">
      {{ shortcode.id }}
    </div>
    <div
      class="table-col lg:w-30"
      :class="requestLabelColor"
      :data-label="t('shortcodes.method')"
    >
      {{ parseShortcodeRequest.method }}
    </div>
    <div class="table-col" :data-label="t('shortcodes.url')">
      <div class="max-w-50 lg:max-w-100 xl:max-w-170 truncate">
        {{ parseShortcodeRequest.endpoint }}
      </div>
    </div>
    <div
      ref="timeStampRef"
      class="table-col lg:w-40"
      :data-label="t('shortcodes.created_on')"
    >
      {{ timestampHovered ? timeStamp : dateStamp }}
    </div>
    <div
      class="flex items-center justify-center lg:w-60 border divide-x lg:table-cell border-dividerLight divide-dividerLight"
      :data-label="t('shortcodes.actions')"
    >
      <SmartAnchor
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.open_workspace')"
        :to="`https://hopp.sh/r/${shortcode.id}`"
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
        @click.native="copyShortcode(shortcode.id)"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.delete')"
        svg="trash"
        color="red"
        @click.native="deleteShortcode(shortcode.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "@nuxtjs/composition-api"
import { useElementHover } from "@vueuse/core"
import { pipe } from "fp-ts/function"
import * as RR from "fp-ts/ReadonlyRecord"
import * as O from "fp-ts/Option"
import { translateToNewRequest } from "@hoppscotch/data"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { Shortcode } from "~/helpers/shortcodes/Shortcode"

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
const copyIconRefs = ref<"copy" | "check">("copy")
const timestampHovered = useElementHover(timeStampRef)

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

const dateStamp = computed(() =>
  new Date(props.shortcode.createdOn).toLocaleDateString()
)
const timeStamp = computed(() =>
  new Date(props.shortcode.createdOn).toLocaleTimeString()
)

const copyShortcode = (codeID: string) => {
  copyToClipboard(`https://hopp.sh/r/${codeID}`)
  toast.success(`${t("state.copied_to_clipboard")}`)
  copyIconRefs.value = "check"
  setTimeout(() => (copyIconRefs.value = "copy"), 1000)
}
</script>

<style lang="scss">
.table-col {
  @apply flex items-center justify-between lg:table-cell border border-dividerLight px-3 py-2;
}

.table-row-group {
  .table-col {
    @apply before:text-secondary before:font-bold before:content-[attr(data-label)] lg:before:hidden;
  }
}
</style>
