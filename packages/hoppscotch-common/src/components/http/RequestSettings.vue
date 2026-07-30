<template>
  <div class="flex flex-col">
    <div
      class="sticky top-upperMobileSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary px-4 py-2 sm:top-upperSecondaryStickyFold"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t('tab.settings') || 'Settings' }}
      </label>
    </div>
    <div class="flex flex-col p-4 space-y-4">
      <div class="flex flex-col">
        <div class="flex items-center justify-between">
          <span class="font-semibold text-secondaryDark">
            {{ t('request.disable_cookies') }}
            <span class="text-secondaryLight font-normal text-xs ml-2">{{ t('request.disable_cookies_default') }}</span>
          </span>
          <HoppSmartToggle
            :on="disableCookies"
            @change="disableCookies = !disableCookies"
          >
            {{ disableCookies ? 'ON' : 'OFF' }}
          </HoppSmartToggle>
        </div>
        <p class="mt-2 text-secondaryLight text-tiny">
          {{ t('request.disable_cookies_description') }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useVModel } from "@vueuse/core"
import { HoppRESTRequestOptions } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const props = defineProps<{
  modelValue?: HoppRESTRequestOptions
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTRequestOptions): void
}>()

const requestOptions = useVModel(props, "modelValue", emit)

const disableCookies = computed({
  get: () => requestOptions.value?.disableCookies ?? false,
  set: (val: boolean) => {
    requestOptions.value = {
      ...(requestOptions.value || {}),
      disableCookies: val,
    }
  },
})
</script>
