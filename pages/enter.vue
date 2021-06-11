<template>
  <div class="flex container flex-col min-h-screen">
    <span v-if="signingInWithEmail" class="info">{{ $t("loading") }}</span>
    <span v-else class="info">{{ $t("waiting_for_connection") }}</span>
    <pre v-if="error">{{ error }}</pre>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      signingInWithEmail: false,
      error: null,
    }
  },
  async mounted() {
    if (fb.isSignInWithEmailLink(window.location.href)) {
      this.signingInWithEmail = true
      let email = window.localStorage.getItem("emailForSignIn")
      if (!email) {
        email = window.prompt("Please provide your email for confirmation")
      }
      await fb
        .signInWithEmailLink(email, window.location.href)
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
}
</script>
