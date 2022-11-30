<template>
  <div>
    <div class="container">
      <div class="p-4">
        <div
          v-if="loadingCurrentUser"
          class="flex flex-col items-center justify-center flex-1 p-4"
        >
          <SmartSpinner class="mb-4" />
        </div>
        <div
          v-else-if="currentUser === null"
          class="flex flex-col items-center justify-center"
        >
          <img
            :src="`/images/states/${colorMode.value}/login.svg`"
            loading="lazy"
            class="inline-flex flex-col object-contain object-center w-24 h-24 my-4"
            :alt="`${t('empty.parameters')}`"
          />
          <p class="pb-4 text-center text-secondaryLight">
            {{ t("empty.profile") }}
          </p>
          <ButtonPrimary
            :label="t('auth.login')"
            class="mb-4"
            @click="showLogin = true"
          />
        </div>
        <div v-else class="space-y-8">
          <div
            class="h-24 rounded bg-primaryLight -mb-11 md:h-32"
            style="background-image: url('/images/cover.svg')"
          ></div>
          <div class="flex flex-col justify-between px-4 space-y-8 md:flex-row">
            <div class="flex items-end">
              <ProfilePicture
                v-if="currentUser.photoURL"
                :url="currentUser.photoURL"
                :alt="
                  currentUser.displayName || t('profile.default_displayname')
                "
                class="ring-primary ring-4"
                size="16"
                rounded="lg"
              />
              <ProfilePicture
                v-else
                :initial="currentUser.displayName || currentUser.email"
                rounded="lg"
                size="16"
                class="ring-primary ring-4"
              />
              <div class="ml-4">
                <label class="heading">
                  {{
                    currentUser.displayName ||
                    t("profile.default_hopp_displayname")
                  }}
                </label>
                <p class="flex items-center text-secondaryLight">
                  {{ currentUser.email }}
                  <icon-lucide-verified
                    v-if="currentUser.emailVerified"
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('settings.verified_email')"
                    class="ml-2 text-green-500 svg-icons cursor-help"
                  />
                  <ButtonSecondary
                    v-else
                    :label="t('settings.verify_email')"
                    :icon="IconVerified"
                    class="px-1 py-0 ml-2"
                    :loading="verifyingEmailAddress"
                    @click="sendEmailVerification"
                  />
                </p>
              </div>
            </div>
            <div class="flex items-end space-x-2">
              <div>
                <SmartItem
                  to="/settings"
                  :icon="IconSettings"
                  :label="t('profile.app_settings')"
                  outline
                />
              </div>
              <FirebaseLogout outline />
            </div>
          </div>
          <SmartTabs
            v-model="selectedProfileTab"
            styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10"
            render-inactive-tabs
          >
            <SmartTab :id="'sync'" :label="t('settings.account')">
              <div class="grid grid-cols-1">
                <section class="p-4">
                  <h4 class="font-semibold text-secondaryDark">
                    {{ t("settings.profile") }}
                  </h4>
                  <div class="my-1 text-secondaryLight">
                    {{ t("settings.profile_description") }}
                  </div>
                  <div class="py-4">
                    <label for="displayName">
                      {{ t("settings.profile_name") }}
                    </label>
                    <form
                      class="flex mt-2 md:max-w-sm"
                      @submit.prevent="updateDisplayName"
                    >
                      <input
                        id="displayName"
                        v-model="displayName"
                        class="input"
                        :placeholder="`${t('settings.profile_name')}`"
                        type="text"
                        autocomplete="off"
                        required
                      />
                      <ButtonSecondary
                        filled
                        outline
                        :label="t('action.save')"
                        class="ml-2 min-w-16"
                        type="submit"
                        :loading="updatingDisplayName"
                      />
                    </form>
                  </div>
                  <div class="py-4">
                    <label for="emailAddress">
                      {{ t("settings.profile_email") }}
                    </label>
                    <form
                      class="flex mt-2 md:max-w-sm"
                      @submit.prevent="updateEmailAddress"
                    >
                      <input
                        id="emailAddress"
                        v-model="emailAddress"
                        class="input"
                        :placeholder="`${t('settings.profile_name')}`"
                        type="email"
                        autocomplete="off"
                        required
                      />
                      <ButtonSecondary
                        filled
                        outline
                        :label="t('action.save')"
                        class="ml-2 min-w-16"
                        type="submit"
                        :loading="updatingEmailAddress"
                      />
                    </form>
                  </div>
                </section>

                <section class="p-4">
                  <h4 class="font-semibold text-secondaryDark">
                    {{ t("settings.sync") }}
                  </h4>
                  <div class="my-1 text-secondaryLight">
                    {{ t("settings.sync_description") }}
                  </div>
                  <div class="py-4 space-y-4">
                    <div class="flex items-center">
                      <SmartToggle
                        :on="SYNC_COLLECTIONS"
                        @change="toggleSetting('syncCollections')"
                      >
                        {{ t("settings.sync_collections") }}
                      </SmartToggle>
                    </div>
                    <div class="flex items-center">
                      <SmartToggle
                        :on="SYNC_ENVIRONMENTS"
                        @change="toggleSetting('syncEnvironments')"
                      >
                        {{ t("settings.sync_environments") }}
                      </SmartToggle>
                    </div>
                    <div class="flex items-center">
                      <SmartToggle
                        :on="SYNC_HISTORY"
                        @change="toggleSetting('syncHistory')"
                      >
                        {{ t("settings.sync_history") }}
                      </SmartToggle>
                    </div>
                  </div>
                </section>

                <ProfileShortcodes />

                <section class="p-4">
                  <div class="p-4 border border-dividerDark rounded">
                    <h4 class="font-semibold text-secondaryDark text-red-500">
                      {{ t("settings.delete_account") }}
                    </h4>
                    <div class="my-1 text-secondaryLight mb-4">
                      {{ t("settings.delete_account_description") }}
                    </div>
                    <div v-if="myTeams.length" class="space-y-4 mb-4">
                      <p>
                        Your account is currently an owner in these teams:
                        <span
                          v-for="(team, i) in myTeams"
                          :key="team.id"
                          class="font-bold"
                        >
                          <span v-if="i > 0" class="font-normal">
                            {{ i === myTeams.length - 1 ? " and" : "," }}
                          </span>
                          {{ team.name }}
                        </span>
                      </p>
                      <p>
                        You must remove yourself, transfer ownership, or delete
                        these teams before you can delete your user.
                      </p>
                    </div>
                    <ButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      filled
                      outline
                      :title="t('action.delete')"
                      :label="t('settings.delete_your_account')"
                      type="submit"
                      class="text-red-500"
                      :disabled="myTeams.length > 0"
                      @click="showDeleteAccountModal = true"
                    />
                  </div>

                  <SmartModal
                    v-if="showDeleteAccountModal"
                    dialog
                    :title="t('settings.delete_account')"
                    @close="showDeleteAccountModal = false"
                  >
                    <template #body>
                      <p class="mb-4">
                        Write
                        <kbd class="mr-2 shortcut-key" data-v-38fdb034="">
                          {{ displayName || "Unnamed User" }}
                        </kbd>
                        to confirm.
                      </p>
                      <div class="flex flex-col">
                        <input
                          id="deleteUserAccount"
                          v-model="userVerificationInput"
                          v-focus
                          class="input floating-input"
                          placeholder=" "
                          type="text"
                          autocomplete="off"
                          @keyup.enter="deleteUserAccount"
                        />
                        <label for="deleteUserAccount">
                          {{ t("Enter display name") }}
                        </label>
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
                            userVerificationInput !==
                            (displayName || 'Unnamed User')
                          "
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
              </div>
            </SmartTab>
            <SmartTab :id="'teams'" :label="t('team.title')">
              <Teams :modal="false" class="p-4" />
            </SmartTab>
          </SmartTabs>
        </div>
      </div>
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, watchEffect, computed } from "vue"
import {
  currentUser$,
  probableUser$,
  setDisplayName,
  setEmailAddress,
  signOutUser,
  verifyEmailAddress,
} from "~/helpers/fb/auth"

import { pipe } from "fp-ts/lib/function"
import * as TE from "fp-ts/TaskEither"

import { onAuthEvent, onLoggedIn } from "@composables/auth"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useSetting } from "@composables/settings"
import { useColorMode } from "@composables/theming"
import { usePageHead } from "@composables/head"

import { toggleSetting } from "~/newstore/settings"

import IconVerified from "~icons/lucide/verified"
import IconSettings from "~icons/lucide/settings"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { GQLError } from "~/helpers/backend/GQLClient"
import { deleteUser } from "~/helpers/backend/mutations/Profile"
import { useRouter } from "vue-router"

type ProfileTabs = "sync" | "teams"

const selectedProfileTab = ref<ProfileTabs>("sync")

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()
const router = useRouter()

usePageHead({
  title: computed(() => t("navigation.profile")),
})

const showLogin = ref(false)

const SYNC_COLLECTIONS = useSetting("syncCollections")
const SYNC_ENVIRONMENTS = useSetting("syncEnvironments")
const SYNC_HISTORY = useSetting("syncHistory")
const currentUser = useReadonlyStream(currentUser$, null)
const probableUser = useReadonlyStream(probableUser$, null)

const loadingCurrentUser = computed(() => {
  if (!probableUser.value) return false
  else if (!currentUser.value) return true
  else return false
})

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
        toast.error(`${getErrorMessage(err)}`)
      },
      () => {
        deletingUser.value = false
        showDeleteAccountModal.value = false
        toast.success(`${t("settings.account_deleted")}`)
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

const displayName = ref(currentUser.value?.displayName)
const updatingDisplayName = ref(false)
watchEffect(() => (displayName.value = currentUser.value?.displayName))

const updateDisplayName = () => {
  updatingDisplayName.value = true
  setDisplayName(displayName.value as string)
    .then(() => {
      toast.success(`${t("profile.updated")}`)
    })
    .catch(() => {
      toast.error(`${t("error.something_went_wrong")}`)
    })
    .finally(() => {
      updatingDisplayName.value = false
    })
}

const emailAddress = ref(currentUser.value?.email)
const updatingEmailAddress = ref(false)
watchEffect(() => (emailAddress.value = currentUser.value?.email))

const updateEmailAddress = () => {
  updatingEmailAddress.value = true
  setEmailAddress(emailAddress.value as string)
    .then(() => {
      toast.success(`${t("profile.updated")}`)
    })
    .catch(() => {
      toast.error(`${t("error.something_went_wrong")}`)
    })
    .finally(() => {
      updatingEmailAddress.value = false
    })
}

const verifyingEmailAddress = ref(false)

const sendEmailVerification = () => {
  verifyingEmailAddress.value = true
  verifyEmailAddress()
    .then(() => {
      toast.success(`${t("profile.email_verification_mail")}`)
    })
    .catch(() => {
      toast.error(`${t("error.something_went_wrong")}`)
    })
    .finally(() => {
      verifyingEmailAddress.value = false
    })
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
