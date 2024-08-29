<template>
  <AppShortcuts :show="showShortcuts" @close="showShortcuts = false" />
  <AppShare :show="showShare" @hide-modal="showShare = false" />
  <FirebaseLogin v-if="showLogin" @hide-modal="showLogin = false" />
  <HoppSmartSlideOver
    :show="isDrawerOpen"
    :title="t('response.data_schema')"
    @close="closeDrawer()"
  >
    <template #content>
      <HttpResponseInterface :show="isDrawerOpen" />
    </template>
  </HoppSmartSlideOver>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "~/composables/i18n"
import { defineActionHandler } from "~/helpers/actions"

const t = useI18n()

const showShortcuts = ref(false)
const showShare = ref(false)
const showLogin = ref(false)
const isDrawerOpen = ref(false)

const closeDrawer = () => {
  isDrawerOpen.value = false
}

defineActionHandler("flyouts.keybinds.toggle", () => {
  showShortcuts.value = !showShortcuts.value
})

defineActionHandler("modals.share.toggle", () => {
  showShare.value = !showShare.value
})

defineActionHandler("modals.login.toggle", () => {
  showLogin.value = !showLogin.value
})

defineActionHandler("response.schema.toggle", () => {
  isDrawerOpen.value = !isDrawerOpen.value
})
</script>
