<template>
  <div class="flex flex-col min-h-screen items-center justify-center">
    <div v-if="signingInWithEmail">
      <SmartSpinner />
    </div>
    <div v-else class="text-sm text-secondaryLight animate-pulse">
      <AppLogo class="h-8 w-8" />
    </div>
    <pre v-if="error">{{ error }}</pre>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { initializeFirebase } from "~/helpers/fb"
import { isSignInWithEmailLink, signInWithEmailLink } from "~/helpers/fb/auth"
import { getLocalConfig, removeLocalConfig } from "~/newstore/localpersistence"

export default defineComponent({
  layout: "empty",
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
