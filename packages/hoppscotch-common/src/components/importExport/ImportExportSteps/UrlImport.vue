<template>
  <div class="space-y-4">
    <div>
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

      <p v-if="description" class="ml-10 mt-2 text-secondaryLight">
        {{ t(description) }}
      </p>
    </div>

    <p class="flex flex-col">
      <input
        v-model="inputChooseGistToImportFrom"
        v-focus
        :placeholder="t('import.from_url')"
        type="url"
        class="input"
      />
    </p>

    <div>
      <HoppButtonPrimary
        class="w-full"
        :label="t('import.title')"
        :disabled="disableImportCTA"
        :loading="isFetchingUrl || loading"
        @click="fetchUrlData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "~/composables/toast"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { parseBodyAsJSONOrYAML } from "~/helpers/functional/json"

const interceptorService = useService(KernelInterceptorService)

const t = useI18n()

const toast = useToast()

const props = withDefaults(
  defineProps<{
    caption: string
    fetchLogic?: (url: string) => Promise<E.Either<unknown, unknown>>
    loading?: boolean
    description?: string
  }>(),
  { fetchLogic: undefined, loading: false, description: undefined }
)

const emit = defineEmits<{
  (e: "importFromURL", content: unknown): void
}>()

const inputChooseGistToImportFrom = ref<string>("")
const hasURL = ref(false)

const isFetchingUrl = ref(false)

watch(inputChooseGistToImportFrom, (url) => {
  hasURL.value = !!url
})

const disableImportCTA = computed(() => !hasURL.value || props.loading)

const urlFetchLogic =
  props.fetchLogic ??
  async function (url: string) {
    const { response } = interceptorService.execute({
      id: Date.now(),
      url: url,
      method: "GET",
      version: "HTTP/1.1",
    })

    const res = await response

    if (E.isLeft(res)) {
      return E.left("REQUEST_FAILED")
    }

    const responsePayload = parseBodyAsJSONOrYAML<unknown>(res.right.body)

    if (O.isSome(responsePayload)) {
      // stringify the response payload
      return E.right(JSON.stringify(responsePayload.value))
    }

    return E.left("REQUEST_FAILED")
  }

async function fetchUrlData() {
  isFetchingUrl.value = true
  const res = await urlFetchLogic(inputChooseGistToImportFrom.value)

  if (E.isLeft(res)) {
    toast.error(t("import.failed"))
    isFetchingUrl.value = false
    return
  }

  emit("importFromURL", res.right)

  isFetchingUrl.value = false
}
</script>
