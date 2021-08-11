<template>
  <div class="flex flex-col min-h-screen items-center justify-center">
    <span v-if="signingInWithEmail">
      <SmartSpinner />
    </span>
    <span v-else class="text-secondaryLight">
      {{ $t("waiting_for_connection") }}
    </span>
    <pre v-if="error" class="font-mono">{{ error }}</pre>
  </div>
</template>

<script lang="ts">
import Vue from "vue"
import { initializeFirebase } from "~/helpers/fb"
import { isSignInWithEmailLink, signInWithEmailLink } from "~/helpers/fb/auth"
import { getLocalConfig, removeLocalConfig } from "~/newstore/localpersistence"

export default Vue.extend({
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
