<template>
  <div class="flex min-h-screen flex-col items-center justify-between">
    <div
      v-if="loginConfirmState === 'done'"
      class="flex flex-1 flex-col items-center justify-center"
    >
      <h1 class="heading">Login Complete</h1>
      <p class="mt-2 text-center">
        You have logged in to the desktop app. <br />
        You can close this browser window.
      </p>
    </div>
    <div
      v-else-if="loginConfirmState === 'error'"
      class="flex flex-1 flex-col items-center justify-center"
    >
      <h1 class="heading">Login Error</h1>
      <p class="mt-2 text-center">
        There was an error while logging you in to the desktop app. <br />
        Make sure you are using the desktop app on the same device and it is
        open and try again.
      </p>
    </div>
    <div
      v-else-if="!currentUser"
      class="flex flex-1 flex-col items-center justify-center"
    >
      <h1 class="heading">Login to Hoppscotch Desktop</h1>
      <p class="mt-2 text-center">Please login to continue.</p>
      <HoppButtonPrimary
        :label="t('auth.login_to_hoppscotch')"
        class="mt-8"
        @click="showLoginModal = true"
      />
    </div>
    <div v-else class="flex flex-1 flex-col items-center justify-center">
      <h1 class="heading">Confirm Desktop Login</h1>
      <p class="mt-2 text-center">
        Are you sure you want to confirm login to your account in Hoppscotch
        Desktop ?
      </p>

      <div class="flex flex-col justify-center pt-4 space-y-4">
        <HoppButtonPrimary
          :label="'Proceed'"
          :loading="loginConfirmState === 'loading'"
          @click="proceedLogin"
        />
        <FirebaseLogout />
      </div>
    </div>

    <footer class="p-4">
      <HoppButtonSecondary
        class="!font-bold tracking-wide !text-secondaryDark"
        label="HOPPSCOTCH"
        to="/"
      />
    </footer>

    <FirebaseLogin
      v-if="!currentUser && showLoginModal"
      @hide-modal="showLoginModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useReadonlyStream } from "@hoppscotch/common/composables/stream"
import { platform } from "@hoppscotch/common/platform"
import { useI18n } from "@hoppscotch/common/composables/i18n"
import { onBeforeMount, ref } from "vue"
import { initializeApp } from "@hoppscotch/common/helpers/app"
import axios from "axios"
import { z } from "zod"

const t = useI18n()

const showLoginModal = ref(false)

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

// Key under which we stash the inner `redirect_uri` query param across an
// auth-redirect roundtrip. The web auth adapter forwards `redirect_uri` through
// OAuth `state`; this is the defensive backstop for paths where that
// passthrough does not fire (e.g. third-party cookie blocking, stale OAuth
// state, email magic-link flow that lands the user back on the page without
// query params).
const REDIRECT_URI_STORAGE_KEY = "hopp_device_login_redirect_uri"

const readRedirectUriFromUrl = (): string | null => {
  try {
    return new URL(window.location.href).searchParams.get("redirect_uri")
  } catch {
    return null
  }
}

onBeforeMount(() => {
  initializeApp()

  // Stash `redirect_uri` before any potential auth redirect so we can restore
  // it after the user comes back.
  const incoming = readRedirectUriFromUrl()
  if (incoming) {
    try {
      window.sessionStorage.setItem(REDIRECT_URI_STORAGE_KEY, incoming)
    } catch {
      // sessionStorage may be unavailable (privacy mode, cross-origin iframe);
      // the URL-derived path still works for the happy case.
    }
  }
})

type LoginConfirmState = "initial" | "loading" | "error" | "done"

const loginConfirmState = ref<LoginConfirmState>("initial")

const DeviceTokenResponse = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
})

function isLoopbackUri(uri: string): boolean {
  try {
    const url = new URL(uri)
    const loopbackHosts = ["localhost", "127.0.0.1", "[::1]"]
    return (
      url.protocol === "http:" &&
      !url.username &&
      !url.password &&
      loopbackHosts.includes(url.hostname)
    )
  } catch {
    return false
  }
}

const readStashedRedirectUri = (): string | null => {
  try {
    return window.sessionStorage.getItem(REDIRECT_URI_STORAGE_KEY)
  } catch {
    return null
  }
}

const clearStashedRedirectUri = () => {
  try {
    window.sessionStorage.removeItem(REDIRECT_URI_STORAGE_KEY)
  } catch {
    /* noop */
  }
}

async function proceedLogin() {
  loginConfirmState.value = "loading"

  try {
    // Prefer the URL-bound value; fall back to the sessionStorage stash for
    // the auth-redirect-lost-the-query-string case (see onBeforeMount).
    const redirect_uri = readRedirectUriFromUrl() ?? readStashedRedirectUri()

    if (!redirect_uri) {
      throw new Error("Redirect URI not found")
    }

    if (!isLoopbackUri(redirect_uri)) {
      throw new Error("Invalid redirect URI: must be a loopback address")
    }

    const res = await axios.get(
      `${import.meta.env.VITE_BACKEND_API_URL}/auth/desktop?redirect_uri=${encodeURIComponent(redirect_uri)}`,
      {
        withCredentials: true,
      }
    )

    const parseResult = DeviceTokenResponse.safeParse(res.data)

    if (!parseResult.success) {
      throw new Error("Token data returned from backend was invalid")
    }

    const tokens = parseResult.data

    await axios.get(
      `${redirect_uri}?access_token=${encodeURIComponent(tokens.access_token)}&refresh_token=${encodeURIComponent(tokens.refresh_token)}`
    )

    clearStashedRedirectUri()
    loginConfirmState.value = "done"
  } catch (e) {
    console.error(e)
    loginConfirmState.value = "error"
  }
}
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
