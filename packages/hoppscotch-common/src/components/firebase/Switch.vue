<template>
    <div class="flex" @click="openLoginModal()">
      <HoppSmartItem
        ref="switchItem"
        :icon="IconLogOut"
        :label="`${t('auth.logout')}`"
        :outline="outline"
        :shortcut="shortcut"
      />
      <HoppSmartModal
        v-if="chooseLogin"
        dialog
        :title="`${t('auth.login_to_hoppscotch')}`"
        styles="sm:max-w-md"
        @close="hideModal"
      >
        <template #body>
          <template>
            <div>
              <h1>TESTING</h1>
            </div>
          </template>
        </template>
      </HoppSmartModal>
      <!-- <HoppSmartConfirmModal
        :show="confirmSwitch"
        :title="`${t('confirm.logout')}`"
        @hide-modal="confirmLogout = false"
        @resolve="logout"
      /> -->
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from "vue"
  import IconLogOut from "~icons/lucide/log-out"
  import { useToast } from "@composables/toast"
  import { useI18n } from "@composables/i18n"
  import { platform } from "~/platform"
  import { defineActionHandler, invokeAction } from "~/helpers/actions"
  
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
    (e: "confirm-switch"): void
  }>()
  
  const chooseLogin = ref(false)
  const switchItem = ref<HTMLButtonElement>()
  
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
  
  const openLoginModal = () => {
    emit("confirm-switch")
    console.log("Opened Login Modal 2")
    invokeAction("modals.switch.toggle")
    //chooseLogin.value = true
    console.log(chooseLogin.value)
  }
  
  defineActionHandler("user.switch", () => {
    openLoginModal()
  })

  defineActionHandler("modals.switch.toggle", () => {
    chooseLogin.value = !chooseLogin.value
    console.log("toggled")
  })

  const hideModal = () => {
  //mode.value = "sign-i"
  toast.clear()
  chooseLogin.value = false
  emit("hide-modal")
}
  </script>
  