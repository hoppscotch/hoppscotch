<template>
  <div>
    <div class="container">
      <div class="p-4">
        <div
          v-if="loadingCurrentUser"
          class="flex flex-1 flex-col items-center justify-center p-4"
        >
          <HoppSmartSpinner class="mb-4" />
        </div>
        <HoppSmartPlaceholder
          v-else-if="currentUser === null"
          :src="`/images/states/${colorMode.value}/login.svg`"
          :alt="`${t('empty.profile')}`"
          :text="`${t('empty.profile')}`"
        >
          <template #body>
            <HoppButtonPrimary
              :label="t('auth.login')"
              @click="invokeAction('modals.login.toggle')"
            />
          </template>
        </HoppSmartPlaceholder>
        <div v-else class="space-y-8">
          <div
            class="-mb-12 h-24 rounded bg-primaryLight md:h-32"
            style="background-image: url(/images/cover.svg)"
          ></div>
          <div class="flex flex-col justify-between space-y-8 px-4 md:flex-row">
            <div class="flex items-end">
              <HoppSmartPicture
                :name="currentUser.uid"
                class="ring-8 ring-primary"
                :size="64"
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
                    class="svg-icons ml-2 cursor-help text-green-500 focus:outline-none"
                  />
                  <HoppButtonSecondary
                    v-else
                    :label="t('settings.verify_email')"
                    :icon="IconVerified"
                    class="ml-2 px-1 py-0"
                    :loading="verifyingEmailAddress"
                    @click="sendEmailVerification"
                  />
                </p>
              </div>
            </div>
            <div class="flex items-end space-x-2">
              <div>
                <HoppSmartItem
                  to="/settings"
                  :icon="IconSettings"
                  :label="t('profile.app_settings')"
                  outline
                />
              </div>
              <FirebaseLogout outline />
            </div>
          </div>
          <HoppSmartTabs
            v-model="selectedProfileTab"
            styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10"
            render-inactive-tabs
          >
            <HoppSmartTab id="sync" :label="t('settings.account')">
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
                    <HoppSmartInput
                      v-model="displayName"
                      :autofocus="false"
                      styles="mt-2 md:max-w-sm"
                      :placeholder="`${t('settings.profile_name')}`"
                    >
                      <template #button>
                        <HoppButtonSecondary
                          filled
                          outline
                          :label="t('action.save')"
                          class="min-w-[4rem] ml-2"
                          type="submit"
                          :loading="updatingDisplayName"
                          @click="updateDisplayName"
                        />
                      </template>
                    </HoppSmartInput>
                  </div>
                  <div class="py-4">
                    <label for="emailAddress">
                      {{ t("settings.profile_email") }}
                    </label>
                    <HoppSmartInput
                      v-model="emailAddress"
                      :autofocus="false"
                      styles="flex mt-2 md:max-w-sm"
                      :placeholder="`${t('settings.profile_email')}`"
                      :disabled="!isEmailEditable"
                    >
                      <template #button>
                        <HoppButtonSecondary
                          v-if="isEmailEditable"
                          filled
                          outline
                          :label="t('action.save')"
                          class="min-w-[4rem] ml-2"
                          type="submit"
                          :loading="updatingEmailAddress"
                          @click="updateEmailAddress"
                        />
                      </template>
                    </HoppSmartInput>
                  </div>
                </section>

                <section class="p-4">
                  <h4 class="font-semibold text-secondaryDark">
                    {{ t("settings.sync") }}
                  </h4>
                  <div class="my-1 text-secondaryLight">
                    {{ t("settings.sync_description") }}
                  </div>
                  <div class="space-y-4 py-4">
                    <div class="flex items-center">
                      <HoppSmartToggle
                        :on="SYNC_COLLECTIONS"
                        @change="toggleSetting('syncCollections')"
                      >
                        {{ t("settings.sync_collections") }}
                      </HoppSmartToggle>
                    </div>
                    <div class="flex items-center">
                      <HoppSmartToggle
                        :on="SYNC_ENVIRONMENTS"
                        @change="toggleSetting('syncEnvironments')"
                      >
                        {{ t("settings.sync_environments") }}
                      </HoppSmartToggle>
                    </div>
                    <div class="flex items-center">
                      <HoppSmartToggle
                        :on="SYNC_HISTORY"
                        @change="toggleSetting('syncHistory')"
                      >
                        {{ t("settings.sync_history") }}
                      </HoppSmartToggle>
                    </div>
                  </div>
                </section>

                <template v-if="platform.ui?.additionalProfileSections?.length">
                  <template
                    v-for="item in platform.ui?.additionalProfileSections"
                    :key="item.id"
                  >
                    <component :is="item" />
                  </template>
                </template>

                <ProfileUserDelete />
              </div>
            </HoppSmartTab>

            <HoppSmartTab id="teams" :label="t('team.title')">
              <Teams :modal="false" class="p-4" />
            </HoppSmartTab>

            <HoppSmartTab id="tokens" :label="t('access_tokens.tab_title')">
              <AccessTokens />
            </HoppSmartTab>
          </HoppSmartTabs>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as E from "fp-ts/Either"
import { computed, ref, watchEffect } from "vue"

import { platform } from "~/platform"

import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { useSetting } from "@composables/settings"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { invokeAction } from "~/helpers/actions"

import { toggleSetting } from "~/newstore/settings"

import IconSettings from "~icons/lucide/settings"
import IconVerified from "~icons/lucide/verified"

type ProfileTabs = "sync" | "teams"

const selectedProfileTab = ref<ProfileTabs>("sync")

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

usePageHead({
  title: computed(() => t("navigation.profile")),
})

const SYNC_COLLECTIONS = useSetting("syncCollections")
const SYNC_ENVIRONMENTS = useSetting("syncEnvironments")
const SYNC_HISTORY = useSetting("syncHistory")
const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)
const probableUser = useReadonlyStream(
  platform.auth.getProbableUserStream(),
  platform.auth.getProbableUser()
)

const isEmailEditable = computed(() => {
  return platform.auth.isEmailEditable ?? false
})

const loadingCurrentUser = computed(() => {
  if (!probableUser.value) return false
  else if (!currentUser.value) return true
  return false
})

const displayName = ref(currentUser.value?.displayName || "")
const updatingDisplayName = ref(false)
watchEffect(() => (displayName.value = currentUser.value?.displayName || ""))

const updateDisplayName = async () => {
  const inputName = displayName.value.trim()
  if (!inputName) {
    toast.error(`${t("error.empty_profile_name")}`)
    return
  }

  if (currentUser.value?.displayName === inputName) {
    toast.error(`${t("error.same_profile_name")}`)
    return
  }

  updatingDisplayName.value = true

  const res = await platform.auth.setDisplayName(inputName)

  if (E.isLeft(res)) {
    toast.error(t("error.something_went_wrong"))
  } else if (E.isRight(res)) {
    toast.success(`${t("profile.updated")}`)
  }

  updatingDisplayName.value = false
}

const emailAddress = ref(currentUser.value?.email || "")
const updatingEmailAddress = ref(false)
watchEffect(() => (emailAddress.value = currentUser.value?.email || ""))

const updateEmailAddress = async () => {
  const inputEmailAddress = emailAddress.value.trim()
  if (!inputEmailAddress) {
    toast.error(`${t("error.empty_email_address")}`)
    return
  }

  if (currentUser.value?.email === inputEmailAddress) {
    toast.error(`${t("error.same_email_address")}`)
    return
  }

  updatingEmailAddress.value = true

  const result = await platform.auth.setEmailAddress(inputEmailAddress)

  if (!result) {
    toast.error(`${t("error.something_went_wrong")}`)
    updatingEmailAddress.value = false
    return
  }

  if (result.type === "success") {
    toast.success(`${t("profile.verified_email_sent")}`)
  } else if (result.type === "email-already-in-use") {
    toast.error(`${t("error.email_already_exists")}`)
  } else if (result.type === "requires-recent-login") {
    await result.link()
  } else {
    toast.error(`${t("error.something_went_wrong")}`)
  }
  updatingEmailAddress.value = false
}

const verifyingEmailAddress = ref(false)

const sendEmailVerification = () => {
  verifyingEmailAddress.value = true
  platform.auth
    .verifyEmailAddress()
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
</script>
