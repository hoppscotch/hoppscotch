<template>
  <!-- v-else-if="step.name === 'URL_IMPORT'" -->
  <div class="space-y-4">
    <p class="flex items-center">
      <span
        class="inline-flex items-center justify-center flex-shrink-0 mr-4 border-4 rounded-full border-primary text-dividerDark"
        :class="{
          '!text-green-500': hasURL,
        }"
      >
        <icon-lucide-check-circle class="svg-icons" />
      </span>
      <span>
        {{ t(caption) }}
      </span>
    </p>
    <p class="flex flex-col ml-10">
      <input
        v-model="inputChooseGistToImportFrom"
        type="url"
        class="input"
        :placeholder="`${t('import.from_url')}`"
      />
    </p>

    <p>
      <HoppButtonPrimary
        class="w-full"
        :label="t('import.title')"
        :disabled="!hasURL"
        :loading="isFetchingUrl"
        @click="fetchUrlData"
      />
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "~/composables/toast"
import axios, { AxiosResponse } from "axios"

const t = useI18n()

const toast = useToast()

const props = defineProps<{
  caption: string
  fetchLogic?: (url: string) => Promise<AxiosResponse<any>>
}>()

const emit = defineEmits<{
  (e: "importFromURL", content: string): void
}>()

const inputChooseGistToImportFrom = ref<string>("")
const hasURL = ref(false)

const isFetchingUrl = ref(false)

watch(inputChooseGistToImportFrom, (url) => {
  if (url === "") {
    hasURL.value = false
  } else {
    hasURL.value = true
  }
})

const urlFetchLogic =
  props.fetchLogic ??
  async function (url: string) {
    const res = await axios.get(url, {
      transitional: {
        forcedJSONParsing: false,
        silentJSONParsing: false,
        clarifyTimeoutError: true,
      },
    })

    return res
  }

async function fetchUrlData() {
  isFetchingUrl.value = true

  try {
    const res = await urlFetchLogic(inputChooseGistToImportFrom.value)

    if (res.status === 200) {
      emit("importFromURL", res.data)
    }
  } catch (e) {
    toast.error(t("import.error"))
    console.log(e)
  } finally {
    isFetchingUrl.value = false
  }
}
</script>
