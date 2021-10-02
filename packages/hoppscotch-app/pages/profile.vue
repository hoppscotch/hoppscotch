<template>
  <div>
    <div class="container">
      <div class="py-8 px-4">
        <div v-if="currentUser === null">
          <ButtonPrimary
            :label="$t('auth.login')"
            @click.native="showLogin = true"
          />
        </div>
        <div v-else class="space-y-4">
          <div class="flex px-4 items-center">
            <img
              v-if="currentUser.photoURL"
              :src="currentUser.photoURL"
              class="rounded-full h-16 w-16"
            />
            <SmartIcon v-else name="user" class="svg-icons" />
            <div class="ml-4">
              <label class="heading">
                {{ currentUser.displayName || $t("state.nothing_found") }}
              </label>
              <p class="flex text-secondaryLight items-center">
                {{ currentUser.email || $t("state.nothing_found") }}
                <SmartIcon
                  v-if="currentUser.emailVerified"
                  name="verified"
                  class="ml-2 text-green-500 svg-icons"
                />
              </p>
            </div>
          </div>
          <SmartTabs styles="sticky bg-primary z-10 top-0">
            <SmartTab
              :id="'sync'"
              :label="$t('settings.account')"
              :selected="true"
            >
              <section class="p-4">
                <h4 class="font-semibold text-secondaryDark">
                  {{ $t("settings.sync") }}
                </h4>
                <div class="mt-1 text-secondaryLight">
                  {{ $t("settings.sync_description") }}
                </div>
                <div class="space-y-4 py-4">
                  <div class="flex items-center">
                    <SmartToggle
                      :on="SYNC_COLLECTIONS"
                      @change="
                        toggleSettings('syncCollections', !SYNC_COLLECTIONS)
                      "
                    >
                      {{ $t("settings.sync_collections") }}
                    </SmartToggle>
                  </div>
                  <div class="flex items-center">
                    <SmartToggle
                      :on="SYNC_ENVIRONMENTS"
                      @change="
                        toggleSettings('syncEnvironments', !SYNC_ENVIRONMENTS)
                      "
                    >
                      {{ $t("settings.sync_environments") }}
                    </SmartToggle>
                  </div>
                  <div class="flex items-center">
                    <SmartToggle
                      :on="SYNC_HISTORY"
                      @change="toggleSettings('syncHistory', !SYNC_HISTORY)"
                    >
                      {{ $t("settings.sync_history") }}
                    </SmartToggle>
                  </div>
                </div>
              </section>
            </SmartTab>
            <SmartTab
              v-if="currentBackendUser && currentBackendUser.eaInvited"
              :id="'teams'"
              :label="$t('team.title')"
            >
              <AppSection label="teams">
                <Teams />
              </AppSection>
            </SmartTab>
          </SmartTabs>
        </div>
      </div>
      <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { currentUserInfo$ } from "~/helpers/teams/BackendUserInfo"
import { currentUser$ } from "~/helpers/fb/auth"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { applySetting, SettingsType, useSetting } from "~/newstore/settings"
import { KeysMatching } from "~/types/ts-utils"

export default defineComponent({
  setup() {
    return {
      SYNC_COLLECTIONS: useSetting("syncCollections"),
      SYNC_ENVIRONMENTS: useSetting("syncEnvironments"),
      SYNC_HISTORY: useSetting("syncHistory"),
      currentUser: useReadonlyStream(currentUser$, currentUser$.value),
      currentBackendUser: useReadonlyStream(
        currentUserInfo$,
        currentUserInfo$.value
      ),
    }
  },
  data() {
    return {
      showLogin: false,
    }
  },
  head() {
    return {
      title: `${this.$t("navigation.profile")} • Hoppscotch`,
    }
  },
  methods: {
    applySetting<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
      applySetting(key, value)
    },
    toggleSettings<K extends KeysMatching<SettingsType, boolean>>(
      name: K,
      value: SettingsType[K]
    ) {
      this.applySetting(name, value)
    },
  },
})
</script>
