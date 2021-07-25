<template>
  <div class="page page-error">
    <h1 class="font-mono mb-4 text-4xl heading">{{ statusCode }}</h1>
    <h3 class="font-mono text-xs">{{ message }}</h3>
    <p class="mt-4">
      <ButtonSecondary to="/" icon="home" :label="$t('go_home')" />
      <ButtonSecondary
        icon="refresh"
        :label="$t('reload')"
        @click.native="reloadApplication"
      />
    </p>
  </div>
</template>

<script>
import { initializeFirebase } from "~/helpers/fb"

export default {
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
      return this.error.message || this.$t("something_went_wrong")
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
