<template>
  <div class="flex flex-col space-y-2">
    <div class="flex flex-col px-4 pt-2">
      <h2 class="inline-flex pb-1 font-semibold text-secondaryDark">
        {{ t("settings.interceptor") }}
      </h2>
      <p class="inline-flex text-tiny">
        {{ t("settings.interceptor_description") }}
      </p>
    </div>
    <HoppSmartRadioGroup
      v-model="interceptorSelection"
      :radios="interceptors"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { Ref, computed, unref } from "vue"
import { InterceptorService } from "~/services/interceptor.service"

const t = useI18n()

const interceptorService = useService(InterceptorService)

const interceptorSelection =
  interceptorService.currentInterceptorID as Ref<string>

const interceptors = computed(() =>
  interceptorService.availableInterceptors.value.map((interceptor) => ({
    value: interceptor.interceptorID,
    label: unref(interceptor.name(t)),
  }))
)
</script>
