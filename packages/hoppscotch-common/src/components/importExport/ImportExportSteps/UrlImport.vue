<template>
  <div class="space-y-4">
    <div v-if="showCorsError">
      <div class="flex items-start space-x-4">
        <icon-lucide-alert-triangle
          class="text-yellow-500 flex-shrink-0 mt-1"
        />
        <div>
          <p class="text-secondaryDark">
            {{ t("import.cors_error_modal.description") }}
          </p>
          <p class="text-secondaryLight mt-2">
            {{ t("import.cors_error_modal.explanation") }}
          </p>
        </div>
      </div>
    </div>
    <div v-else>
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

    <!-- Conflict / Update Options -->
    <div
      v-if="showUpdateOptions"
      class="flex flex-col space-y-3 px-1 py-2 border-t border-dividerLight"
    >
      <div class="flex items-start space-x-3">
        <HoppSmartCheckbox
          :on="preserveScripts"
          @change="preserveScripts = !preserveScripts"
        />
        <label
          class="cursor-pointer select-none text-secondary flex flex-col space-y-0.5"
          @click="preserveScripts = !preserveScripts"
        >
          <span class="font-medium text-sm">
            {{ t("collection.preserve_scripts") }}
          </span>
          <span class="text-tiny text-secondaryLight">
            {{ t("collection.preserve_scripts_description") }}
          </span>
        </label>
      </div>

      <div class="flex items-start space-x-3">
        <HoppSmartCheckbox
          :on="keepMissingRequests"
          @change="keepMissingRequests = !keepMissingRequests"
        />
        <label
          class="cursor-pointer select-none text-secondary flex flex-col space-y-0.5"
          @click="keepMissingRequests = !keepMissingRequests"
        >
          <span class="font-medium text-sm">
            {{ t("collection.keep_missing_requests") }}
          </span>
          <span class="text-tiny text-secondaryLight">
            {{ t("collection.keep_missing_requests_description") }}
          </span>
        </label>
      </div>
    </div>

    <div>
      <HoppButtonPrimary
        class="w-full"
        :label="
          showCorsError
            ? t('import.cors_error_modal.retry_with_proxy')
            : t(actionLabel)
        "
        :disabled="disableImportCTA"
        :loading="isFetchingUrl || loading"
        @click="showCorsError ? retryWithProxy() : fetchUrlData()"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import * as O from "fp-ts/Option"
import { computed, ref, watch } from "vue"
import { useToast } from "~/composables/toast"
import { parseBodyAsJSONOrYAML } from "~/helpers/functional/json"
import { ProxyKernelInterceptorService } from "~/platform/std/kernel-interceptors/proxy"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

const interceptorService = useService(KernelInterceptorService)
const proxyInterceptorService = useService(ProxyKernelInterceptorService)

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    caption: string
    actionLabel?: string
    fetchLogic?: (url: string) => Promise<E.Either<unknown, unknown>>
    loading?: boolean
    description?: string
    showUpdateOptions?: boolean
    initialUrl?: string
  }>(),
  {
    actionLabel: "import.title",
    fetchLogic: undefined,
    loading: false,
    description: undefined,
    showUpdateOptions: false,
    initialUrl: "",
  }
)

const preserveScripts = ref(true)
const keepMissingRequests = ref(true)

const emit = defineEmits<{
  (e: "importFromURL", content: unknown, ...additionalArgs: any[]): void
}>()

const inputChooseGistToImportFrom = ref<string>(props.initialUrl ?? "")
const hasURL = ref(!!props.initialUrl)
const isFetchingUrl = ref(false)
const showCorsError = ref(false)

watch(
  () => props.initialUrl,
  (val) => {
    if (val && !inputChooseGistToImportFrom.value) {
      inputChooseGistToImportFrom.value = val
      hasURL.value = true
    }
  },
  { immediate: true }
)

watch(inputChooseGistToImportFrom, (url) => {
  hasURL.value = !!url
})

const disableImportCTA = computed(() => !hasURL.value || props.loading)

const isCorsError = (error: any): boolean => {
  // Check for common CORS error patterns
  return (
    error?.kind === "network" ||
    error?.message?.includes("CORS") ||
    error?.message?.includes("Access to fetch") ||
    error?.message?.includes("Cross-Origin") ||
    error?.code === "ERR_NETWORK" ||
    error?.name === "TypeError"
  )
}

const urlFetchLogic =
  props.fetchLogic ??
  async function (url: string) {
    try {
      const { response } = interceptorService.execute({
        id: Date.now(),
        url: url,
        method: "GET",
        version: "HTTP/1.1",
      })

      const res = await response

      if (E.isRight(res)) {
        const responsePayload = parseBodyAsJSONOrYAML<unknown>(res.right.body)

        if (O.isSome(responsePayload)) {
          return E.right(JSON.stringify(responsePayload.value))
        }
      }

      // Return the actual error from the failed request
      return E.left(E.isLeft(res) ? res.left : "REQUEST_FAILED")
    } catch (error) {
      // Return the caught error for proper CORS detection
      return E.left(error)
    }
  }

const retryWithProxy = async () => {
  isFetchingUrl.value = true

  try {
    // Store the current interceptor to restore later
    const previousInterceptorId = interceptorService.getCurrentId()

    // Switch to proxy interceptor
    interceptorService.setActive(proxyInterceptorService.id)

    // Retry the request with proxy
    const res = await urlFetchLogic(inputChooseGistToImportFrom.value)

    // Restore previous interceptor
    if (previousInterceptorId) {
      interceptorService.setActive(previousInterceptorId)
    }

    if (E.isRight(res)) {
      showCorsError.value = false
      if (props.showUpdateOptions) {
        emit("importFromURL", res.right, {
          preserveScripts: preserveScripts.value,
          keepMissingRequests: keepMissingRequests.value,
          url: inputChooseGistToImportFrom.value,
        })
      } else {
        emit("importFromURL", res.right, {
          url: inputChooseGistToImportFrom.value,
        })
      }
    } else {
      toast.error(t("import.failed"))
    }
  } catch (_error) {
    toast.error(t("import.failed"))
  } finally {
    isFetchingUrl.value = false
  }
}

async function fetchUrlData() {
  isFetchingUrl.value = true
  const res = await urlFetchLogic(inputChooseGistToImportFrom.value)

  if (E.isLeft(res)) {
    // @ts-expect-error Assuming error is of type Error
    if (isCorsError(res.left?.error)) {
      showCorsError.value = true
    } else {
      toast.error(t("import.failed"))
    }
    isFetchingUrl.value = false
    return
  }

  if (props.showUpdateOptions) {
    emit("importFromURL", res.right, {
      preserveScripts: preserveScripts.value,
      keepMissingRequests: keepMissingRequests.value,
      url: inputChooseGistToImportFrom.value,
    })
  } else {
    emit("importFromURL", res.right, {
      url: inputChooseGistToImportFrom.value,
    })
  }
  isFetchingUrl.value = false
}
</script>
