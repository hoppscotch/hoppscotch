<template>
  <section class="p-4">
    <h4 class="font-semibold text-secondaryDark">
      {{ t("settings.delete_account") }}
    </h4>
    <div class="my-1 text-secondaryLight mb-4">
      {{ t("settings.delete_account_description") }}
    </div>

    <ButtonSecondary
      filled
      outline
      :label="t('settings.delete_account')"
      type="submit"
      @click="showDeleteAccountModal = true"
    />

    <SmartModal
      v-if="showDeleteAccountModal"
      dialog
      :title="t('settings.delete_account')"
      @close="showDeleteAccountModal = false"
    >
      <template #body>
        <div
          v-if="myTeams.length"
          class="flex flex-col p-4 space-y-2 border border-red-500 border-dashed rounded-lg text-secondaryDark bg-error"
        >
          <h2 class="font-bold text-red-500">
            {{ t("error.danger_zone") }}
          </h2>
          <div>
            {{ t("error.delete_account") }}
            <ul class="my-4 ml-8 space-y-2 list-disc">
              <li v-for="team in myTeams" :key="team.id">
                {{ team.name }}
              </li>
            </ul>
            <span class="font-semibold">
              {{ t("error.delete_account_description") }}
            </span>
          </div>
        </div>
        <div v-else>
          <div
            class="flex flex-col p-4 mb-4 space-y-2 border border-red-500 border-dashed rounded-lg text-secondaryDark bg-error"
          >
            <h2 class="font-bold text-red-500">
              {{ t("error.danger_zone") }}
            </h2>
            <div class="font-medium text-secondaryDark">
              {{ t("settings.delete_account_description") }}
            </div>
          </div>
          <div class="flex flex-col">
            <input
              id="deleteUserAccount"
              v-model="userVerificationInput"
              class="input floating-input"
              placeholder=" "
              type="text"
              autocomplete="off"
            />
            <label for="deleteUserAccount">
              Type
              <span class="font-bold"> delete my account </span>
              to confirm
            </label>
          </div>
        </div>
      </template>
      <template #footer>
        <span class="flex space-x-2">
          <ButtonPrimary
            :label="t('settings.delete_account')"
            :loading="deletingUser"
            filled
            outline
            :disabled="
              myTeams.length > 0 ||
              userVerificationInput !== 'delete my account'
            "
            class="!bg-red-500 !hover:bg-red-600 !border-red-500 !hover:border-red-600"
            @click="deleteUserAccount"
          />
          <ButtonSecondary
            :label="t('action.cancel')"
            outline
            filled
            @click="showDeleteAccountModal = false"
          />
        </span>
      </template>
    </SmartModal>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { GQLError } from "~/helpers/backend/GQLClient"

import { useReadonlyStream } from "@composables/stream"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { signOutUser } from "~/helpers/fb/auth"
import { useRouter } from "vue-router"
import { deleteUser } from "~/helpers/backend/mutations/Profile"
import { onAuthEvent, onLoggedIn } from "~/composables/auth"

const t = useI18n()
const toast = useToast()
const router = useRouter()

const showDeleteAccountModal = ref(false)
const userVerificationInput = ref("")

const adapter = new TeamListAdapter(true)
const myAllTeams = useReadonlyStream(adapter.teamList$, null)

const myTeams = computed(() => {
  if (!myAllTeams.value) return []
  return myAllTeams.value.filter((team) => {
    return team.ownersCount === 1 && team.myRole === "OWNER"
  })
})

const deletingUser = ref(false)

const deleteUserAccount = async () => {
  if (deletingUser.value) return
  deletingUser.value = true

  pipe(
    deleteUser(),
    TE.match(
      (err: GQLError<string>) => {
        deletingUser.value = false
        toast.error(getErrorMessage(err))
      },
      () => {
        deletingUser.value = false
        showDeleteAccountModal.value = false
        toast.success(t("settings.account_deleted"))
        signOutUser()
        router.push(`/`)
      }
    )
  )()
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "shortcode/not_found":
        return t("shortcodes.not_found")
      default:
        return t("error.something_went_wrong")
    }
  }
}

onLoggedIn(() => {
  adapter.initialize()
})

onAuthEvent((ev) => {
  if (ev.event === "logout") {
    adapter.dispose()
    return
  }
})
</script>
