<template>
  <div
    class="bg-primary hide-scrollbar whitespace-nowrap sticky top-0 z-10 flex items-center p-4 overflow-auto"
  >
    <div
      v-if="response == null"
      class="text-secondaryLight flex flex-col items-center justify-center flex-1"
    >
      <div class="flex pb-4 my-4 space-x-2">
        <div class="flex flex-col items-end space-y-4 text-right">
          <span class="flex items-center flex-1">
            {{ t("shortcut.request.send_request") }}
          </span>
          <span class="flex items-center flex-1">
            {{ t("shortcut.general.show_all") }}
          </span>
          <span class="flex items-center flex-1">
            {{ t("shortcut.general.command_menu") }}
          </span>
          <span class="flex items-center flex-1">
            {{ t("shortcut.general.help_menu") }}
          </span>
        </div>
        <div class="flex flex-col space-y-4">
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">G</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">K</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">/</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">?</span>
          </div>
        </div>
      </div>
      <ButtonSecondary
        :label="t('app.documentation')"
        to="https://docs.hoppscotch.io/features/response"
        svg="external-link"
        blank
        outline
        reverse
      />
    </div>
    <div v-else class="flex flex-col flex-1">
      <div
        v-if="response.type === 'loading'"
        class="flex flex-col items-center justify-center"
      >
        <SmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-if="response.type === 'network_fail'"
        class="flex flex-col items-center justify-center flex-1 p-4"
      >
        <img
          :src="`/images/states/${$colorMode.value}/youre_lost.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-32 h-32 my-4"
          :alt="`${t('error.network_fail')}`"
        />
        <span class="mb-2 font-semibold text-center">
          {{ t("error.network_fail") }}
        </span>
        <span class="text-secondaryLight max-w-sm mb-4 text-center">
          {{ t("helpers.network_fail") }}
        </span>
        <AppInterceptor />
      </div>
      <div
        v-if="response.type === 'success' || 'fail'"
        :class="statusCategory.className"
        class="space-x-4 font-semibold"
      >
        <span v-if="response.statusCode">
          <span class="text-secondary"> {{ t("response.status") }}: </span>
          {{ response.statusCode || t("state.waiting_send_request") }}
        </span>
        <span v-if="response.meta && response.meta.responseDuration">
          <span class="text-secondary"> {{ t("response.time") }}: </span>
          {{ `${response.meta.responseDuration} ms` }}
        </span>
        <span v-if="response.meta && response.meta.responseSize">
          <span class="text-secondary"> {{ t("response.size") }}: </span>
          {{ `${response.meta.responseSize} B` }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "@nuxtjs/composition-api"
import findStatusGroup from "~/helpers/findStatusGroup"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const statusCategory = computed(() => {
  if (
    props.response.type === "loading" ||
    props.response.type === "network_fail"
  )
    return ""
  return findStatusGroup(props.response.statusCode)
})
</script>

<style lang="scss" scoped>
.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
