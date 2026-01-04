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
          <div class="flex flex-col space-y-2">
            <TabsNav
              :items="PROFILE_NAVIGATION"
              styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10"
            />

            <RouterView />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue"

import { platform } from "~/platform"

import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { invokeAction } from "~/helpers/actions"

import IconSettings from "~icons/lucide/settings"
import IconVerified from "~icons/lucide/verified"

import TabsNav from "~/components/TabsNav.vue"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

usePageHead({
  title: computed(() => t("navigation.profile")),
})

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)
const probableUser = useReadonlyStream(
  platform.auth.getProbableUserStream(),
  platform.auth.getProbableUser()
)

const loadingCurrentUser = computed(() => {
  if (!probableUser.value) return false
  else if (!currentUser.value) return true
  return false
})

const displayName = ref(currentUser.value?.displayName || "")

watchEffect(() => (displayName.value = currentUser.value?.displayName || ""))

const emailAddress = ref(currentUser.value?.email || "")

watchEffect(() => (emailAddress.value = currentUser.value?.email || ""))

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

const PROFILE_NAVIGATION = computed(() => [
  {
    route: "/profile",
    label: t("settings.account"),
    icon: null,
    exactMatch: true,
  },
  {
    route: "/profile/teams",
    label: t("team.title"),
    icon: null,
  },
  {
    route: "/profile/tokens",
    label: t("access_tokens.tab_title"),
    icon: null,
  },
])
</script>
