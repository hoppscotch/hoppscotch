<template>
  <div class="flex container flex-col min-h-screen">
    <span v-if="signingInWithEmail" class="info">{{ $t("loading") }}</span>
    <span v-else class="info">{{ $t("waiting_for_connection") }}</span>
    <pre v-if="error">{{ error }}</pre>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { initializeFirebase } from "~/helpers/fb"
import { isSignInWithEmailLink, signInWithEmailLink } from "~/helpers/fb/auth"

export default Vue.extend({
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

      let email = window.localStorage.getItem("emailForSignIn")

      if (!email) {
        email = window.prompt(
          "Please provide your email for confirmation"
        ) as string
      }

      await signInWithEmailLink(email, window.location.href)
        .then(() => {
          window.localStorage.removeItem("emailForSignIn")
          this.$router.push({ path: "/" })
        })
        .catch((error) => {
          this.signingInWithEmail = false
          this.error = error.message
        })
        .finally(() => {
          this.signingInWithEmail = false
        })
    }
  },
})
</script>
