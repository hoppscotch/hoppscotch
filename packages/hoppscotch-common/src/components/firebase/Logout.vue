<template>
  <div class="flex" @click="openLogoutModal()">
    <HoppSmartItem
      ref="logoutItem"
      :icon="IconLogOut"
      :label="`${t('auth.logout')}`"
      :outline="outline"
      :shortcut="shortcut"
      @click="openLogoutModal()"
    />
    <HoppSmartConfirmModal
      :show="confirmLogout"
      :title="`${t('confirm.logout')}`"
      @hide-modal="confirmLogout = false"
      @resolve="logout"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import IconLogOut from "~icons/lucide/log-out"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { platform } from "~/platform"
import { defineActionHandler } from "~/helpers/actions"

defineProps({
  outline: {
    type: Boolean,
    default: false,
  },
  shortcut: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits<{
  (e: "confirm-logout"): void
}>()

const confirmLogout = ref(false)
const logoutItem = ref<HTMLButtonElement>()

const toast = useToast()
const t = useI18n()

const logout = async () => {
  try {
    await platform.auth.signOutUser()
    toast.success(`${t("auth.logged_out")}`)
  } catch (e) {
    console.error(e)
    toast.error(`${t("error.something_went_wrong")}`)
  }
}

const openLogoutModal = () => {
  emit("confirm-logout")
  confirmLogout.value = true
}

defineActionHandler("user.logout", () => {
  openLogoutModal()
})
</script>
