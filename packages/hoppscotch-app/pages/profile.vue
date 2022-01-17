<template>
  <div>
    <div class="container">
      <div class="p-4">
        <div
          v-if="currentUser === null"
          class="flex flex-col items-center justify-center"
        >
          <img
            :src="`/images/states/${$colorMode.value}/login.svg`"
            loading="lazy"
            class="flex-col object-contain object-center h-24 my-4 w-24 inline-flex"
            :alt="`${t('empty.parameters')}`"
          />
          <p class="text-center text-secondaryLight pb-4">
            {{ t("empty.profile") }}
          </p>
          <ButtonPrimary
            :label="t('auth.login')"
            class="mb-4"
            @click.native="showLogin = true"
          />
        </div>
        <div v-else class="space-y-8">
          <div
            class="bg-primaryLight rounded h-24 -mb-11 md:h-32"
            style="background-image: url('/images/cover.svg')"
          ></div>
          <div class="flex flex-col space-y-8 px-4 justify-between md:flex-row">
            <div class="flex items-end">
              <img
                v-if="currentUser.photoURL"
                :src="currentUser.photoURL"
                class="rounded-lg h-16 ring-primary ring-4 w-16"
                :alt="currentUser.displayName"
              />
              <SmartIcon v-else name="user" class="svg-icons" />
              <div class="ml-4">
                <label class="heading">
                  {{ currentUser.displayName || t("state.nothing_found") }}
                </label>
                <p class="flex text-secondaryLight items-center">
                  {{ currentUser.email }}
                  <SmartIcon
                    v-if="currentUser.emailVerified"
                    name="verified"
                    class="ml-2 text-green-500 svg-icons"
                  />
                  <ButtonSecondary
                    v-else
                    :label="t('settings.verify_email')"
                    svg="verified"
                    class="ml-2 py-0 px-1"
                    :loading="verifyingEmailAddress"
                    @click.native="sendEmailVerification"
                  />
                </p>
              </div>
            </div>
            <div class="flex space-x-2 items-end">
              <div>
                <SmartItem
                  to="/settings"
                  svg="settings"
                  :label="t('profile.app_settings')"
                  outline
                />
              </div>
              <FirebaseLogout outline />
            </div>
          </div>
          <SmartTabs>
            <SmartTab
              :id="'sync'"
              :label="t('settings.account')"
              :selected="true"
            >
              <section class="p-4">
                <h4 class="font-semibold text-secondaryDark">
                  {{ t("settings.profile") }}
                </h4>
                <div class="mt-1 text-secondaryLight">
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
                <div class="mt-1 text-secondaryLight">
                  {{ t("settings.sync_description") }}
                </div>
                <div class="space-y-4 py-4">
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
            </SmartTab>
            <SmartTab :id="'teams'" :label="t('team.title')">
              <AppSection label="teams">
                <Teams :modal="false" />
              </AppSection>
            </SmartTab>
          </SmartTabs>
        </div>
      </div>
      <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  useMeta,
  defineComponent,
  watchEffect,
} from "@nuxtjs/composition-api"
import {
  currentUser$,
  setDisplayName,
  setEmailAddress,
  verifyEmailAddress,
} from "~/helpers/fb/auth"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import { toggleSetting, useSetting } from "~/newstore/settings"

const t = useI18n()
const toast = useToast()

const showLogin = ref(false)

const SYNC_COLLECTIONS = useSetting("syncCollections")
const SYNC_ENVIRONMENTS = useSetting("syncEnvironments")
const SYNC_HISTORY = useSetting("syncHistory")
const currentUser = useReadonlyStream(currentUser$, null)

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

useMeta({
  title: `${t("navigation.profile")} • Hoppscotch`,
})
</script>

<script lang="ts">
export default defineComponent({
  head: {},
})
</script>
