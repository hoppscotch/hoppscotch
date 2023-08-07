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

    <div>
      <div
        v-for="interceptor in interceptors"
        :key="interceptor.interceptorID"
        class="flex flex-col"
      >
        <HoppSmartRadio
          :value="interceptor.interceptorID"
          :label="unref(interceptor.name(t))"
          :selected="interceptorSelection === interceptor.interceptorID"
          @change="interceptorSelection = interceptor.interceptorID"
        />

        <component
          :is="interceptor.selectorSubtitle"
          v-if="interceptor.selectorSubtitle"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { Ref, unref } from "vue"
import { InterceptorService } from "~/services/interceptor.service"

const t = useI18n()

const interceptorService = useService(InterceptorService)

const interceptorSelection =
  interceptorService.currentInterceptorID as Ref<string>

const interceptors = interceptorService.availableInterceptors
</script>
