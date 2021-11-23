<template>
  <div>
    <div
      class="bg-primary border-b border-dividerLight flex flex-1 top-lowerSecondaryStickyFold pl-4 z-10 sticky items-center justify-between"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("request.header_list") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="headers"
          ref="copyHeaders"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :svg="copyIcon"
          @click.native="copyHeaders"
        />
      </div>
    </div>
    <div
      v-for="(header, index) in headers"
      :key="`header-${index}`"
      class="divide-dividerLight divide-x border-b border-dividerLight flex group"
    >
      <span
        class="flex flex-1 min-w-0 py-2 px-4 transition group-hover:text-secondaryDark"
      >
        <span class="rounded-sm truncate select-all">
          {{ header.key }}
        </span>
      </span>
      <span
        class="flex flex-1 min-w-0 py-2 px-4 transition group-hover:text-secondaryDark"
      >
        <span class="rounded-sm truncate select-all">
          {{ header.value }}
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { HoppRESTHeader } from "@hoppscotch/data"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const toast = useToast()

const props = defineProps<{
  headers: Array<HoppRESTHeader>
}>()

const copyIcon = ref("copy")

const copyHeaders = () => {
  copyToClipboard(JSON.stringify(props.headers))
  copyIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}
</script>
