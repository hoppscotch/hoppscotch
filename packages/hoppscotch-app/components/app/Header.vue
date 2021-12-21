<template>
  <div>
    <header
      class="flex space-x-2 flex-1 py-2 px-2 items-center justify-between"
    >
      <div class="space-x-2 inline-flex items-center">
        <ButtonSecondary
          class="tracking-wide !font-bold !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark"
          label="HOPPSCOTCH"
          to="/"
        />
        <AppGitHubStarButton class="mt-1.5 transition hidden sm:flex" />
      </div>
      <div class="space-x-2 inline-flex items-center">
        <ButtonSecondary
          id="installPWA"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('header.install_pwa')"
          svg="download"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click.native="showInstallPrompt()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${t('app.search')} <kbd>/</kbd>`"
          svg="search"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click.native="invokeAction('modals.search.toggle')"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${t('support.title')} <kbd>?</kbd>`"
          svg="life-buoy"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click.native="showSupport = true"
        />
        <ButtonSecondary
          v-if="currentUser === null"
          svg="upload-cloud"
          :label="t('header.save_workspace')"
          filled
          class="hidden md:flex"
          @click.native="showLogin = true"
        />
        <ButtonPrimary
          v-if="currentUser === null"
          :label="t('header.login')"
          @click.native="showLogin = true"
        />
        <div v-else class="space-x-2 inline-flex items-center">
          <ButtonPrimary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('team.invite_tooltip')"
            :label="t('team.invite')"
            svg="user-plus"
            class="!bg-green-500 !bg-opacity-15 !text-green-500 !hover:bg-opacity-10 !hover:bg-green-400 !hover:text-green-600"
            @click.native="showTeamsModal = true"
          />
          <span class="px-2">
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              arrow
              :on-shown="() => tippyActions.focus()"
            >
              <template #trigger>
                <ProfilePicture
                  v-if="currentUser.photoURL"
                  v-tippy="{
                    theme: 'tooltip',
                  }"
                  :url="currentUser.photoURL"
                  :alt="currentUser.displayName"
                  :title="currentUser.displayName"
                  indicator
                  :indicator-styles="isOnLine ? 'bg-green-500' : 'bg-red-500'"
                />
                <ButtonSecondary
                  v-else
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('header.account')"
                  class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
                  svg="user"
                />
              </template>
              <div
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.enter="profile.$el.click()"
                @keyup.s="settings.$el.click()"
                @keyup.l="logout.$el.click()"
                @keyup.escape="options.tippy().hide()"
              >
                <SmartItem
                  ref="profile"
                  to="/profile"
                  svg="user"
                  :label="t('navigation.profile')"
                  :shortcut="['↩']"
                  @click.native="options.tippy().hide()"
                />
                <SmartItem
                  ref="settings"
                  to="/settings"
                  svg="settings"
                  :label="t('navigation.settings')"
                  :shortcut="['S']"
                  @click.native="options.tippy().hide()"
                />
                <FirebaseLogout
                  ref="logout"
                  :shortcut="['L']"
                  @confirm-logout="options.tippy().hide()"
                />
              </div>
            </tippy>
          </span>
        </div>
      </div>
    </header>
    <AppAnnouncement v-if="!isOnLine" />
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    <AppSupport :show="showSupport" @hide-modal="showSupport = false" />
    <TeamsModal :show="showTeamsModal" @hide-modal="showTeamsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "@nuxtjs/composition-api"
import intializePwa from "~/helpers/pwa"
import { probableUser$ } from "~/helpers/fb/auth"
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence"
import {
  useReadonlyStream,
  useI18n,
  useToast,
} from "~/helpers/utils/composables"
import { defineActionHandler, invokeAction } from "~/helpers/actions"

const t = useI18n()

const toast = useToast()

/**
 * Once the PWA code is initialized, this holds a method
 * that can be called to show the user the installation
 * prompt.
 */
const showInstallPrompt = ref(() => Promise.resolve()) // Async no-op till it is initialized

const showSupport = ref(false)
const showLogin = ref(false)
const showTeamsModal = ref(false)

const isOnLine = ref(navigator.onLine)

const currentUser = useReadonlyStream(probableUser$, null)

defineActionHandler("modals.support.toggle", () => {
  showSupport.value = !showSupport.value
})

onMounted(() => {
  window.addEventListener("online", () => {
    isOnLine.value = true
  })
  window.addEventListener("offline", () => {
    isOnLine.value = false
  })

  // Initializes the PWA code - checks if the app is installed,
  // etc.
  showInstallPrompt.value = intializePwa()

  const cookiesAllowed = getLocalConfig("cookiesAllowed") === "yes"
  if (!cookiesAllowed) {
    toast.show(`${t("app.we_use_cookies")}`, {
      duration: 0,
      action: [
        {
          text: `${t("action.learn_more")}`,
          onClick: (_, toastObject) => {
            setLocalConfig("cookiesAllowed", "yes")
            toastObject.goAway(0)
            window.open("https://docs.hoppscotch.io/privacy", "_blank")?.focus()
          },
        },
        {
          text: `${t("action.dismiss")}`,
          onClick: (_, toastObject) => {
            setLocalConfig("cookiesAllowed", "yes")
            toastObject.goAway(0)
          },
        },
      ],
    })
  }
})

// Template refs
const tippyActions = ref<any | null>(null)
const profile = ref<any | null>(null)
const settings = ref<any | null>(null)
const logout = ref<any | null>(null)
const options = ref<any | null>(null)
</script>
