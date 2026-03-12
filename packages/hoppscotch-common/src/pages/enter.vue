<template>
  <div class="flex min-h-screen flex-col items-center justify-center">
    <HoppSmartSpinner v-if="signingInWithEmail" />
    <AppLogo v-else class="h-16 w-16 rounded" />
    <pre v-if="error" class="mt-4 text-secondaryLight">{{ error }}</pre>
  </div>
</template>

<script lang="ts">
import { useI18n } from "@composables/i18n"
import { defineComponent } from "vue"
import { useRoute } from "vue-router"
import { initializeApp } from "~/helpers/app"
import { platform } from "~/platform"

export default defineComponent({
  setup() {
    return {
      t: useI18n(),
      route: useRoute(),
    }
  },
  data() {
    return {
      signingInWithEmail: false,
      error: null,
    }
  },
  beforeMount() {
    initializeApp()
  },
  methods: {
    getSafeRedirectUrl(rawRedirect: string): URL | null {
      // Reject backslashes to prevent WHATWG URL parser \ -> / normalization bypass
      if (rawRedirect.includes("\\")) return null

      try {
        const target = new URL("https://" + rawRedirect)
        const rootDomain = platform.organization?.getRootDomain()
        if (!rootDomain) return null

        const isAllowed =
          target.hostname.endsWith("." + rootDomain) ||
          target.hostname === rootDomain

        return isAllowed ? target : null
      } catch {
        return null
      }
    },
  },
  async mounted() {
    const { redirect, ...queryParams } = this.route.query

    // Redirect param is only generated for cloud org subdomains (not the default instance)
    if (platform.organization && typeof redirect === "string") {
      const redirectTarget = this.getSafeRedirectUrl(redirect)

      if (
        redirectTarget &&
        platform.auth.isSignInWithEmailLink(window.location.href)
      ) {
        Object.entries(queryParams).forEach(([key, value]) => {
          if (typeof value === "string") {
            redirectTarget.searchParams.set(key, value)
          }
        })

        window.location.href = redirectTarget.href
        return
      }
    }

    this.signingInWithEmail = true

    try {
      await platform.auth.processMagicLink()
    } catch (e) {
      this.error = e.message
    } finally {
      this.signingInWithEmail = false
    }
  },
})
</script>

<route lang="yaml">
meta:
  layout: empty
  onlyGuest: true
</route>
