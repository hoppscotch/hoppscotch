<template>
  <div>
    <header
      class="flex items-center justify-between flex-1 px-2 py-2 overflow-x-auto overflow-y-hidden space-x-2"
    >
      <div class="inline-flex items-center space-x-2">
        <ButtonSecondary
          class="tracking-wide !font-bold !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark uppercase"
          :label="t('app.name')"
          to="/"
        />
        <AppGitHubStarButton class="mt-1.5 transition <sm:hidden" />
      </div>
      <div class="inline-flex items-center space-x-2">
        <ButtonSecondary
          v-if="showInstallButton"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('header.install_pwa')"
          :icon="IconDownload"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="installPWA()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t('app.search')} <kbd>/</kbd>`"
          :icon="IconSearch"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="invokeAction('modals.search.toggle')"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${
            mdAndLarger ? t('support.title') : t('app.options')
          } <kbd>?</kbd>`"
          :icon="IconLifeBuoy"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="invokeAction('modals.support.toggle')"
        />
        <ButtonSecondary
          v-if="currentUser === null"
          :icon="IconUploadCloud"
          :label="t('header.save_workspace')"
          filled
          class="hidden md:flex"
          @click="showLogin = true"
        />
        <ButtonPrimary
          v-if="currentUser === null"
          :label="t('header.login')"
          @click="showLogin = true"
        />
        <div v-else class="inline-flex items-center space-x-2">
          <ButtonPrimary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('team.invite_tooltip')"
            :label="t('team.invite')"
            :icon="IconUserPlus"
            class="!bg-green-500 !bg-opacity-15 !text-green-500 !hover:bg-opacity-10 !hover:bg-green-400 !hover:text-green-600"
            @click="showTeamsModal = true"
          />
          <span class="px-2">
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions.focus()"
            >
              <ProfilePicture
                v-if="currentUser.photoURL"
                v-tippy="{
                  theme: 'tooltip',
                }"
                :url="currentUser.photoURL"
                :alt="currentUser.displayName"
                :title="currentUser.displayName"
                indicator
                :indicator-styles="
                  network.isOnline ? 'bg-green-500' : 'bg-red-500'
                "
              />
              <ProfilePicture
                v-else
                v-tippy="{ theme: 'tooltip' }"
                :title="currentUser.displayName"
                :initial="currentUser.displayName"
                indicator
                :indicator-styles="
                  network.isOnline ? 'bg-green-500' : 'bg-red-500'
                "
              />
              <template #content="{ hide }">
                <div class="flex flex-col px-2 text-tiny">
                  <span class="inline-flex font-semibold truncate">
                    {{ currentUser.displayName }}
                  </span>
                  <span class="inline-flex truncate text-secondaryLight">
                    {{ currentUser.email }}
                  </span>
                </div>
                <hr />
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.enter="profile.$el.click()"
                  @keyup.s="settings.$el.click()"
                  @keyup.l="logout.$el.click()"
                  @keyup.escape="hide()"
                >
                  <SmartItem
                    ref="profile"
                    to="/profile"
                    :icon="IconUser"
                    :label="t('navigation.profile')"
                    :shortcut="['↩']"
                    @click="hide()"
                  />
                  <SmartItem
                    ref="settings"
                    to="/settings"
                    :icon="IconSettings"
                    :label="t('navigation.settings')"
                    :shortcut="['S']"
                    @click="hide()"
                  />
                  <FirebaseLogout
                    ref="logout"
                    :shortcut="['L']"
                    @confirm-logout="hide()"
                  />
                </div>
              </template>
            </tippy>
          </span>
        </div>
      </div>
    </header>
    <AppAnnouncement v-if="!network.isOnline" />
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    <TeamsModal :show="showTeamsModal" @hide-modal="showTeamsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import IconUser from "~icons/lucide/user"
import IconSettings from "~icons/lucide/settings"
import IconDownload from "~icons/lucide/download"
import IconSearch from "~icons/lucide/search"
import IconLifeBuoy from "~icons/lucide/life-buoy"
import IconUploadCloud from "~icons/lucide/upload-cloud"
import IconUserPlus from "~icons/lucide/user-plus"
import { breakpointsTailwind, useBreakpoints, useNetwork } from "@vueuse/core"
import { pwaDefferedPrompt, installPWA } from "@modules/pwa"
import { probableUser$ } from "@helpers/fb/auth"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { invokeAction } from "@helpers/actions"

const t = useI18n()

/**
 * Once the PWA code is initialized, this holds a method
 * that can be called to show the user the installation
 * prompt.
 */

const showInstallButton = computed(() => !!pwaDefferedPrompt.value)

const showLogin = ref(false)
const showTeamsModal = ref(false)

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const network = reactive(useNetwork())

const currentUser = useReadonlyStream(probableUser$, null)

// Template refs
const tippyActions = ref<any | null>(null)
const profile = ref<any | null>(null)
const settings = ref<any | null>(null)
const logout = ref<any | null>(null)
</script>
