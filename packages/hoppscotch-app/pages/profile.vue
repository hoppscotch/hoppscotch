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
            :src="`/images/states/${$colorMode.value}/login.svg`"
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
            @click.native="showLogin = true"
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
                :alt="currentUser.displayName"
                class="ring-primary ring-4"
                size="16"
                rounded="lg"
              />
              <ProfilePicture
                v-else
                :initial="currentUser.displayName"
                rounded="lg"
                size="16"
                class="ring-primary ring-4"
              />
              <div class="ml-4">
                <label class="heading">
                  {{ currentUser.displayName || t("state.nothing_found") }}
                </label>
                <p class="flex items-center text-secondaryLight">
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
                    class="px-1 py-0 ml-2"
                    :loading="verifyingEmailAddress"
                    @click.native="sendEmailVerification"
                  />
                </p>
              </div>
            </div>
            <div class="flex items-end space-x-2">
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
          <SmartTabs v-model="selectedProfileTab">
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
                <section class="p-4">
                  <h4 class="font-semibold text-secondaryDark">
                    {{ t("settings.short_codes") }}
                  </h4>
                  <div class="my-1 text-secondaryLight">
                    {{ t("settings.short_codes_description") }}
                  </div>
                  <div class="relative py-4 overflow-x-auto hide-scrollbar">
                    <div
                      v-if="loading"
                      class="flex flex-col items-center justify-center"
                    >
                      <SmartSpinner class="mb-4" />
                      <span class="text-secondaryLight">{{
                        t("state.loading")
                      }}</span>
                    </div>
                    <div
                      v-if="!loading && myShortcodes.length === 0"
                      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
                    >
                      <img
                        :src="`/images/states/${$colorMode.value}/add_files.svg`"
                        loading="lazy"
                        class="inline-flex flex-col object-contain object-center w-16 h-16 mb-8"
                        :alt="`${t('empty.shortcodes')}`"
                      />
                      <span class="mb-4 text-center">
                        {{ t("empty.shortcodes") }}
                      </span>
                    </div>
                    <div
                      v-else-if="!loading"
                      class="table w-full border-collapse table-auto"
                    >
                      <div
                        class="bg-primaryLight hidden lg:flex rounded-t w-full"
                      >
                        <div
                          class="flex w-full overflow-y-scroll lg:divide-x divide-primaryLight"
                        >
                          <div class="flex flex-1 p-3 font-semibold">
                            {{ t("shortcodes.short_code") }}
                          </div>
                          <div class="flex flex-1 p-3 font-semibold">
                            {{ t("shortcodes.method") }}
                          </div>
                          <div class="flex flex-1 p-3 font-semibold">
                            {{ t("shortcodes.url") }}
                          </div>
                          <div class="flex flex-1 p-3 font-semibold">
                            {{ t("shortcodes.created_on") }}
                          </div>
                          <div
                            class="flex flex-1 p-3 font-semibold justify-center"
                          >
                            {{ t("shortcodes.actions") }}
                          </div>
                        </div>
                      </div>
                      <div
                        class="w-full max-h-sm flex flex-col items-center justify-between overflow-y-scroll rounded lg:rounded-t-none border lg:divide-y border-dividerLight divide-dividerLight"
                      >
                        <div
                          class="flex flex-col h-auto h-full border-r border-dividerLight w-full"
                        >
                          <ProfileShortcode
                            v-for="(shortcode, shortcodeIndex) in myShortcodes"
                            :key="`shortcode-${shortcodeIndex}`"
                            :shortcode="shortcode"
                            @delete-shortcode="deleteShortcode"
                          />
                          <SmartIntersection
                            v-if="hasMoreShortcodes && myShortcodes.length > 0"
                            @intersecting="loadMoreShortcodes()"
                          >
                            <div
                              v-if="adapterLoading"
                              class="flex flex-col items-center py-3"
                            >
                              <SmartSpinner />
                            </div>
                          </SmartIntersection>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="!loading && adapterError"
                      class="flex flex-col items-center py-4"
                    >
                      <i class="mb-4 material-icons">help_outline</i>
                      {{ getErrorMessage(adapterError) }}
                    </div>
                  </div>
                </section>
              </div>
            </SmartTab>
            <SmartTab :id="'teams'" :label="t('team.title')">
              <Teams :modal="false" />
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
  computed,
} from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { GQLError } from "~/helpers/backend/GQLClient"
import {
  currentUser$,
  probableUser$,
  setDisplayName,
  setEmailAddress,
  verifyEmailAddress,
  onLoggedIn,
} from "~/helpers/fb/auth"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import { toggleSetting, useSetting } from "~/newstore/settings"
import ShortcodeListAdapter from "~/helpers/shortcodes/ShortcodeListAdapter"
import { deleteShortcode as backendDeleteShortcode } from "~/helpers/backend/mutations/Shortcode"

type ProfileTabs = "sync" | "teams"

const selectedProfileTab = ref<ProfileTabs>("sync")

const t = useI18n()
const toast = useToast()

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

const adapter = new ShortcodeListAdapter(true)
const adapterLoading = useReadonlyStream(adapter.loading$, false)
const adapterError = useReadonlyStream(adapter.error$, null)
const myShortcodes = useReadonlyStream(adapter.shortcodes$, [])
const hasMoreShortcodes = useReadonlyStream(adapter.hasMoreShortcodes$, true)

const loading = computed(
  () => adapterLoading.value && myShortcodes.value.length === 0
)

onLoggedIn(() => {
  adapter.initialize()
})

const deleteShortcode = (codeID: string) => {
  pipe(
    backendDeleteShortcode(codeID),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err)}`)
      },
      () => {
        toast.success(`${t("shortcodes.deleted")}`)
      }
    )
  )()
}

const loadMoreShortcodes = () => {
  adapter.loadMore()
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

useMeta({
  title: `${t("navigation.profile")} • Hoppscotch`,
})
</script>

<script lang="ts">
export default defineComponent({
  head: {},
})
</script>
