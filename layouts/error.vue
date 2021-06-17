<template>
  <div class="page page-error">
    <h1 class="mb-4 font-mono text-4xl">{{ statusCode }}</h1>
    <h3 class="mb-4 font-mono text-xs">{{ message }}</h3>
    <p class="mt-4 border-t border-tooltip">
      <nuxt-link to="/">
        <button class="icon">
          <i class="material-icons">home</i>
          <span>
            {{ $t("go_home") }}
          </span>
        </button>
      </nuxt-link>
      <button class="icon" @click="reloadApplication">
        <i class="material-icons">refresh</i>
        <span>
          {{ $t("reload") }}
        </span>
      </button>
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

  head() {
    return {
      bodyAttrs: {
        class: "sticky-footer",
      },
    }
  },
  beforeMount() {
    initializeFirebase()
  },
  computed: {
    statusCode() {
      return (this.error && this.error.statusCode) || 500
    },
    message() {
      return this.error.message || this.$t("something_went_wrong")
    },
  },

  methods: {
    reloadApplication() {
      window.location.reload()
    },
  },
}
</script>

<style scoped lang="scss">
// Center the error page in the viewport.
.page-error {
  @apply flex;
  @apply items-center;
  @apply justify-center;
  @apply flex-col;
  @apply text-center;
}

.error_banner {
  @apply w-24;
  @apply mb-12;
}
</style>
