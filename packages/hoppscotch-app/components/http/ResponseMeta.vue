<template>
  <div class="bg-primary flex p-4 top-0 z-10 sticky items-center">
    <div
      v-if="response == null"
      class="
        flex flex-col flex-1
        text-secondaryLight
        items-center
        justify-center
      "
    >
      <div class="flex space-x-2 pb-4 my-4">
        <div class="flex flex-col space-y-4 text-right items-end">
          <span class="flex flex-1 items-center">
            {{ t("shortcut.request.send_request") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ t("shortcut.general.show_all") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ t("shortcut.general.command_menu") }}
          </span>
          <span class="flex flex-1 items-center">
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
        to="https://docs.hoppscotch.io"
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
        class="flex flex-col flex-1 p-4 items-center justify-center"
      >
        <img
          :src="`/images/states/${$colorMode.value}/youre_lost.svg`"
          loading="lazy"
          class="
            flex-col
            my-4
            object-contain object-center
            h-32
            w-32
            inline-flex
          "
          :alt="`${t('error.network_fail')}`"
        />
        <span class="text-center font-semibold mb-2">
          {{ t("error.network_fail") }}
        </span>
        <span class="text-center text-secondaryLight mb-4 max-w-sm">
          {{ t("helpers.network_fail") }}
        </span>
        <AppInterceptor />
      </div>
      <div
        v-if="response.type === 'success' || 'fail'"
        :class="statusCategory.className"
        class="font-semibold space-x-4"
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
