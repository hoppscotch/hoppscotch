<template>
  <AppShortcuts :show="showShortcuts" @close="showShortcuts = false" />
  <AppShare :show="showShare" @hide-modal="showShare = false" />
  <AppSocial :show="showSocial" @hide-modal="showSocial = false" />
  <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
</template>

<script setup lang="ts">
import { ref } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { showChat } from "~/modules/crisp"

const showShortcuts = ref(false)
const showShare = ref(false)
const showSocial = ref(false)
const showLogin = ref(false)

defineActionHandler("flyouts.keybinds.toggle", () => {
  showShortcuts.value = !showShortcuts.value
})

defineActionHandler("modals.share.toggle", () => {
  showShare.value = !showShare.value
})

defineActionHandler("modals.social.toggle", () => {
  showSocial.value = !showSocial.value
})

defineActionHandler("modals.login.toggle", () => {
  showLogin.value = !showLogin.value
})

defineActionHandler("flyouts.chat.open", () => {
  showChat()
})
</script>
