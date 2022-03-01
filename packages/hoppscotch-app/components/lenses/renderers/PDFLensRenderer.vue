<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.download_file')"
          :svg="downloadIcon"
          @click.native="downloadResponse"
        />
      </div>
    </div>
    <vue-pdf-embed
      :source="pdfsrc"
      class="flex flex-1 overflow-auto border-b hide-scrollbar border-dividerLight"
      type="application/pdf"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "@nuxtjs/composition-api"
import VuePdfEmbed from "vue-pdf-embed/dist/vue2-pdf-embed"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n, useToast } from "~/helpers/utils/composables"

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const pdfsrc = computed(() =>
  props.response.type === "success"
    ? URL.createObjectURL(
        new Blob([props.response.body], {
          type: "application/pdf",
        })
      )
    : null
)

const downloadIcon = ref("download")

const responseType = computed(() => {
  return (
    props.response.headers.find((h) => h.key.toLowerCase() === "content-type")
      .value || ""
  )
    .split(";")[0]
    .toLowerCase()
})

const downloadResponse = () => {
  const dataToWrite = props.response.body
  const file = new Blob([dataToWrite], { type: responseType.value })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  // TODO get uri from meta
  a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
  document.body.appendChild(a)
  a.click()
  downloadIcon.value = "check"
  toast.success(t("state.download_started"))
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadIcon.value = "download"
  }, 1000)
}
</script>
