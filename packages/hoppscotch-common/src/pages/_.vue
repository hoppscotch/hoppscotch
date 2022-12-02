<!-- The Catch-All Page -->
<!-- Reserved for Critical Errors and 404 ONLY -->
<template>
  <div
    class="flex flex-col items-center justify-center"
    :class="{ 'min-h-screen': statusCode !== 404 }"
  >
    <img
      :src="`/images/states/${colorMode.value}/youre_lost.svg`"
      loading="lazy"
      class="inline-flex flex-col object-contain object-center mb-2 h-46 w-46"
      :alt="message"
    />
    <h1 class="mb-2 text-4xl heading">
      {{ statusCode }}
    </h1>
    <p class="mb-4 text-secondaryLight">{{ message }}</p>
    <p class="mt-4 space-x-2">
      <ButtonSecondary to="/" :icon="IconHome" filled :label="t('app.home')" />
      <ButtonSecondary
        :icon="IconRefreshCW"
        :label="t('app.reload')"
        filled
        @click="reloadApplication"
      />
    </p>
  </div>
</template>

<script setup lang="ts">
import IconRefreshCW from "~icons/lucide/refresh-cw"
import IconHome from "~icons/lucide/home"
import { PropType, computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"

export type ErrorPageData = {
  message: string
  statusCode: number
}

const colorMode = useColorMode()
const t = useI18n()

const props = defineProps({
  error: {
    type: Object as PropType<ErrorPageData | null>,
    default: null,
  },
})

const statusCode = computed(() => props.error?.statusCode ?? 404)

const message = computed(
  () => props.error?.message ?? t("error.page_not_found")
)

const reloadApplication = () => {
  window.location.reload()
}
</script>
