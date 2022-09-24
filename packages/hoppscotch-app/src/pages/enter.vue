<template>
  <div class="flex flex-col items-center justify-center min-h-screen">
    <div v-if="signingInWithEmail">
      <SmartSpinner />
      <div class="mt-2 text-sm text-secondaryLight">
        {{ t("state.loading") }}
      </div>
    </div>
    <div v-else>
      <AppLogo class="w-16 h-16 rounded" />
    </div>
    <pre v-if="error" class="mt-4 text-secondaryLight">{{ error }}</pre>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import { useI18n } from "@composables/i18n"
import { initializeFirebase } from "~/helpers/fb"
import { isSignInWithEmailLink, signInWithEmailLink } from "~/helpers/fb/auth"
import { getLocalConfig, removeLocalConfig } from "~/newstore/localpersistence"

export default defineComponent({
  setup() {
    return {
      t: useI18n(),
    }
  },
  data() {
    return {
      signingInWithEmail: false,
      error: null,
    }
  },
  beforeMount() {
    initializeFirebase()
  },
  async mounted() {
    if (isSignInWithEmailLink(window.location.href)) {
      this.signingInWithEmail = true

      let email = getLocalConfig("emailForSignIn")

      if (!email) {
        email = window.prompt(
          "Please provide your email for confirmation"
        ) as string
      }

      await signInWithEmailLink(email, window.location.href)
        .then(() => {
          removeLocalConfig("emailForSignIn")
          this.$router.push({ path: "/" })
        })
        .catch((e) => {
          this.signingInWithEmail = false
          this.error = e.message
        })
        .finally(() => {
          this.signingInWithEmail = false
        })
    }
  },
})
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
