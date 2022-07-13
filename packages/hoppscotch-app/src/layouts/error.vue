<template>
  <div class="page page-error">
    <img
      :src="`/images/states/${colorMode.value}/youre_lost.svg`"
      loading="lazy"
      class="inline-flex flex-col object-contain object-center my-4 h-46 w-46"
      :alt="message"
    />
    <h1 class="mb-4 text-4xl heading">{{ statusCode }}</h1>
    <h3 class="select-text">{{ message }}</h3>
    <p class="mt-4">
      <ButtonSecondary to="/" :svg="IconHome" filled :label="t('app.home')" />
      <ButtonSecondary
        :svg="IconRefreshCW"
        :label="t('app.reload')"
        filled
        @click.native="reloadApplication"
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

const colorMode = useColorMode()
const t = useI18n()

const props = defineProps({
  error: {
    type: Object as PropType<{ message?: string, statusCode ?: number } | null>,
    default: null,
  },
})

const statusCode = computed(() =>
  props.error?.statusCode ?? 500
)

const message = computed(() =>
  props.error?.message ?? t("error.something_went_wrong")
)

const reloadApplication = () => {
  window.location.reload()
}
</script>

<style scoped lang="scss">
.page-error {
  @apply flex flex-col;
  @apply items-center;
  @apply justify-center;
  @apply text-center;
}

.error_banner {
  @apply w-24;
  @apply mb-12;
}
</style>
