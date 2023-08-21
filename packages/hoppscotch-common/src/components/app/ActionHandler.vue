<template>
  <AppShortcuts :show="showShortcuts" @close="showShortcuts = false" />
  <AppShare :show="showShare" @hide-modal="showShare = false" />
  <AppSocial :show="showSocial" @hide-modal="showSocial = false" />
  <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />

  <HoppSmartConfirmModal
    :show="confirmRemove"
    :title="t('confirm.remove_team')"
    @hide-modal="confirmRemove = false"
    @resolve="deleteTeam()"
  />
</template>

<script setup lang="ts">
import { ref } from "vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { deleteTeam as backendDeleteTeam } from "~/helpers/backend/mutations/Team"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { showChat } from "~/modules/crisp"
import { useToast } from "~/composables/toast"
import { useI18n } from "~/composables/i18n"

const toast = useToast()
const t = useI18n()

const showShortcuts = ref(false)
const showShare = ref(false)
const showSocial = ref(false)
const showLogin = ref(false)

const confirmRemove = ref(false)

const teamID = ref<string | null>(null)

const deleteTeam = () => {
  if (!teamID.value) return
  pipe(
    backendDeleteTeam(teamID.value),
    TE.match(
      (err) => {
        // TODO: Better errors ? We know the possible errors now
        toast.error(`${t("error.something_went_wrong")}`)
        console.error(err)
      },
      () => {
        invokeAction("workspace.switch.personal")
        toast.success(`${t("team.deleted")}`)
      }
    )
  )() // Tasks (and TEs) are lazy, so call the function returned
}

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

defineActionHandler("modals.team.delete", ({ teamId }) => {
  teamID.value = teamId
  confirmRemove.value = true
})
</script>
