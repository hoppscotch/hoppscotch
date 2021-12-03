<template>
  <div class="page page-error">
    <img
      :src="`/images/states/${$colorMode.value}/youre_lost.svg`"
      loading="lazy"
      class="flex-col object-contain object-center h-46 my-4 w-46 inline-flex"
      :alt="message"
    />
    <h1 class="mb-4 text-4xl heading">{{ statusCode }}</h1>
    <h3 class="select-text">{{ message }}</h3>
    <p class="mt-4">
      <ButtonSecondary to="/" svg="home" filled :label="$t('app.home')" />
      <ButtonSecondary
        svg="refresh-cw"
        :label="$t('app.reload')"
        filled
        @click.native="reloadApplication"
      />
    </p>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { initializeFirebase } from "~/helpers/fb"

export default defineComponent({
  props: {
    error: {
      type: Object,
      default: null,
    },
  },

  computed: {
    statusCode() {
      return (this.error && this.error.statusCode) || 500
    },
    message() {
      return this.error.message || this.$t("error.something_went_wrong")
    },
  },

  beforeMount() {
    initializeFirebase()
  },

  methods: {
    reloadApplication() {
      window.location.reload()
    },
  },
})
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
