<template>
  <div
    class="table-row-groups lg:flex block my-6 lg:my-0 w-full border lg:border-0 divide-y lg:divide-y-0 lg:divide-x divide-dividerLight border-dividerLight"
  >
    <div
      class="table-column font-mono text-tiny"
      :data-label="t('shortcodes.short_code')"
    >
      {{ shortcode.id }}
    </div>
    <div
      class="table-column"
      :class="requestLabelColor"
      :data-label="t('shortcodes.method')"
    >
      {{ parseShortcodeRequest.method }}
    </div>
    <div class="table-column" :data-label="t('shortcodes.url')">
      {{ parseShortcodeRequest.endpoint }}
    </div>
    <div
      ref="timeStampRef"
      class="table-column"
      :data-label="t('shortcodes.created_on')"
    >
      <span v-tippy="{ theme: 'tooltip' }" :title="timeStamp">
        {{ dateStamp }}
      </span>
    </div>
    <div
      class="flex flex-1 items-center justify-center px-3"
      :data-label="t('shortcodes.actions')"
    >
      <SmartAnchor
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.open_workspace')"
        :to="`https://hopp.sh/r/${shortcode.id}`"
        blank
        svg="external-link"
        class="px-3 text-accent hover:text-accent"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.copy')"
        color="green"
        :svg="copyIconRefs"
        class="px-3"
        @click.native="copyShortcode(shortcode.id)"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="t('action.delete')"
        svg="trash"
        color="red"
        class="px-3"
        @click.native="deleteShortcode(shortcode.id)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "@nuxtjs/composition-api"
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
.table-column {
  @apply flex flex-1 items-center px-3 py-3 truncate;
}

.table-row-groups {
  .table-column {
    @apply before:text-secondary before:font-bold before:content-[attr(data-label)] lg:before:hidden;
  }
}
</style>
