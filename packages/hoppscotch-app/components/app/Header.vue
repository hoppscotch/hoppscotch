<template>
  <div>
    <header
      class="flex space-x-2 flex-1 py-2 px-2 items-center justify-between"
    >
      <div class="space-x-2 inline-flex items-center">
        <ButtonSecondary
          class="tracking-wide !font-bold !text-secondaryDark"
          label="HOPPSCOTCH"
          to="/"
        />
        <AppGitHubStarButton class="mt-1.5 transition hidden sm:flex" />
      </div>
      <div class="space-x-2 inline-flex items-center">
        <ButtonSecondary
          id="installPWA"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('header.install_pwa')"
          svg="download"
          class="rounded"
          @click.native="showInstallPrompt()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${$t('app.search')} <kbd>/</kbd>`"
          svg="search"
          class="rounded"
          @click.native="showSearch = true"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${$t('support.title')} <kbd>?</kbd>`"
          svg="life-buoy"
          class="rounded"
          @click.native="showSupport = true"
        />
        <ButtonSecondary
          v-if="currentUser === null"
          svg="upload-cloud"
          :label="$t('header.save_workspace')"
          filled
          class="hidden !font-semibold md:flex"
          @click.native="showLogin = true"
        />
        <ButtonPrimary
          v-if="currentUser === null"
          :label="$t('header.login')"
          @click.native="showLogin = true"
        />
        <div v-else class="space-x-2 inline-flex items-center">
          <ButtonPrimary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('team.invite_tooltip')"
            :label="$t('team.invite')"
            svg="user-plus"
            class="
              !bg-green-500
              !text-green-500
              !bg-opacity-10
              !hover:bg-opacity-10 !hover:text-green-400 !hover:bg-green-400
            "
            @click.native="showTeamsModal = true"
          />
          <span class="px-2">
            <tippy ref="user" interactive trigger="click" theme="popover" arrow>
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
                  :title="$t('header.account')"
                  class="rounded"
                  svg="user"
                />
              </template>
              <SmartItem
                to="/profile"
                svg="user"
                :label="$t('navigation.profile')"
                @click.native="$refs.user.tippy().hide()"
              />
              <SmartItem
                to="/settings"
                svg="settings"
                :label="$t('navigation.settings')"
                @click.native="$refs.user.tippy().hide()"
              />
              <FirebaseLogout @confirm-logout="$refs.user.tippy().hide()" />
            </tippy>
          </span>
        </div>
      </div>
    </header>
    <AppAnnouncement v-if="!isOnLine" />
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    <AppSupport :show="showSupport" @hide-modal="showSupport = false" />
    <AppPowerSearch :show="showSearch" @hide-modal="showSearch = false" />
    <TeamsModal :show="showTeamsModal" @hide-modal="showTeamsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, useContext } from "@nuxtjs/composition-api"
import intializePwa from "~/helpers/pwa"
import { probableUser$ } from "~/helpers/fb/auth"
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { defineActionHandler } from "~/helpers/actions"

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

/**
 * Once the PWA code is initialized, this holds a method
 * that can be called to show the user the installation
 * prompt.
 */
const showInstallPrompt = ref<undefined | null>(null)

const showSupport = ref(false)
const showSearch = ref(false)
const showLogin = ref(false)
const showTeamsModal = ref(false)

const isOnLine = ref(navigator.onLine)

const currentUser = useReadonlyStream(probableUser$, null)

defineActionHandler("modals.support.toggle", () => {
  showSupport.value = !showSupport.value
})
defineActionHandler("modals.search.toggle", () => {
  showSearch.value = !showSearch.value
})

onMounted(async () => {
  window.addEventListener("online", () => {
    isOnLine.value = true
  })
  window.addEventListener("offline", () => {
    isOnLine.value = false
  })

  // Initializes the PWA code - checks if the app is installed,
  // etc.
  // TODO: @liyasthomas, check this out (initializePwa is a () => Promise<void>)
  await intializePwa()
  showInstallPrompt.value = undefined

  const cookiesAllowed = getLocalConfig("cookiesAllowed") === "yes"
  if (!cookiesAllowed) {
    $toast.show(t("app.we_use_cookies").toString(), {
      icon: "cookie",
      duration: 0,
      action: [
        {
          text: t("action.learn_more").toString(),
          onClick: (_, toastObject) => {
            setLocalConfig("cookiesAllowed", "yes")
            toastObject.goAway(0)
            window.open("https://docs.hoppscotch.io/privacy", "_blank")?.focus()
          },
        },
        {
          text: t("action.dismiss").toString(),
          onClick: (_, toastObject) => {
            setLocalConfig("cookiesAllowed", "yes")
            toastObject.goAway(0)
          },
        },
      ],
    })
  }
})
</script>
