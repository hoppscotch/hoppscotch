<template>
  <div class="flex min-h-screen flex-col items-center justify-between bg-primary">
    <div class="flex flex-1 flex-col items-center justify-center">
      <img
        src="/logo.svg"
        alt="Hoppscotch"
        class="mb-6 h-16 w-16"
      />
      <h1 class="heading text-xl font-semibold text-secondaryDark">
        {{ t('auth.login_to_hoppscotch') }}
      </h1>
      <p class="mt-2 text-center text-secondaryLight">
        {{ t('state.login_to_continue') }}
      </p>
      <HoppButtonPrimary
        :label="t('auth.login')"
        class="mt-8"
        @click="showLoginModal = true"
      />
    </div>

    <footer class="p-4">
      <HoppButtonSecondary
        class="!font-bold tracking-wide !text-secondaryDark"
        label="HOPPSCOTCH"
        to="/"
      />
    </footer>

    <FirebaseLogin
      v-if="showLoginModal"
      @hide-modal="onLoginModalClose"
    />
  </div>
</template>

<script setup lang="ts">
import { useReadonlyStream } from "@hoppscotch/common/composables/stream"
import { platform } from "@hoppscotch/common/platform"
import { useI18n } from "@hoppscotch/common/composables/i18n"
import { onBeforeMount, ref, watch } from "vue"
import { initializeApp } from "@hoppscotch/common/helpers/app"
import { useRouter } from "vue-router"

const t = useI18n()
const router = useRouter()

const showLoginModal = ref(false)

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

onBeforeMount(() => {
  initializeApp()
})

// Watch for user login and redirect to home
watch(currentUser, (user) => {
  if (user) {
    // Get redirect URL from query params or default to home
    const urlParams = new URLSearchParams(window.location.search)
    const redirect = urlParams.get('redirect') || '/'
    router.push(redirect)
  }
}, { immediate: true })

const onLoginModalClose = () => {
  showLoginModal.value = false
}
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
