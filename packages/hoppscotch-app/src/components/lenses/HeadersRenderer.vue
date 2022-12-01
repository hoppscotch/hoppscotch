<template>
  <div>
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("request.header_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="headers"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :icon="copyIcon"
          @click="copyHeaders"
        />
      </div>
    </div>
    <LensesHeadersRendererEntry
      v-for="(header, index) in headers"
      :key="index"
      :header="header"
    />
  </div>
</template>

<script setup lang="ts">
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { HoppRESTHeader } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

const t = useI18n()

const toast = useToast()

const props = defineProps<{
  headers: Array<HoppRESTHeader>
}>()

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyHeaders = () => {
  copyToClipboard(JSON.stringify(props.headers))
  copyIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}
</script>
