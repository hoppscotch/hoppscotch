<template>
  <header class="flex flex-1 py-2 px-4 items-center justify-between">
    <div
      class="
        font-extrabold
        space-x-2
        flex-shrink-0
        text-sm
        inline-flex
        items-center
      "
    >
      <AppLogo />
    </div>
    <div class="space-x-2 flex-shrink-0 inline-flex items-center">
      <AppGitHubStarButton class="mt-1 mr-2" />
      <TabPrimary
        id="installPWA"
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('install_pwa')"
        icon="offline_bolt"
        @click.native="showInstallPrompt()"
      />
      <span tabindex="-1">
        <ButtonPrimary
          v-if="currentUser === null"
          label="Login"
          @click.native="showLogin = true"
        />
        <tippy
          v-else
          ref="user"
          interactive
          tabindex="-1"
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ProfilePicture
              v-if="currentUser.photoURL"
              v-tippy="{ theme: 'tooltip' }"
              :url="currentUser.photoURL"
              :alt="currentUser.displayName"
              :title="
                `${currentUser.displayName || 'Name not found'}` +
                '<br>' +
                `<sub>${currentUser.email || 'Email not found'}</sub>`
              "
              :indicator="isOnLine ? 'bg-green-500' : 'bg-red-500'"
            />
            <TabPrimary
              v-else
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('account')"
              icon="account_circle"
            />
          </template>
          <SmartItem
            to="/settings"
            icon="settings"
            :label="$t('settings')"
            @click.native="$refs.user.tippy().hide()"
          />
          <FirebaseLogout @confirm-logout="$refs.user.tippy().hide()" />
        </tippy>
      </span>
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
  </header>
</template>

<script>
import intializePwa from "~/helpers/pwa"
import { currentUser$ } from "~/helpers/fb/auth"
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence"

export default {
  data() {
    return {
      // Once the PWA code is initialized, this holds a method
      // that can be called to show the user the installation
      // prompt.
      showInstallPrompt: null,
      showLogin: false,
      isOnLine: navigator.onLine,
    }
  },
  subscriptions() {
    return {
      currentUser: currentUser$,
    }
  },
  async mounted() {
    window.addEventListener("online", () => {
      this.isOnLine = true
    })
    window.addEventListener("offline", () => {
      this.isOnLine = false
    })

    // Initializes the PWA code - checks if the app is installed,
    // etc.
    this.showInstallPrompt = await intializePwa()
    const cookiesAllowed = getLocalConfig("cookiesAllowed") === "yes"
    if (!cookiesAllowed) {
      this.$toast.show(this.$t("we_use_cookies"), {
        icon: "info",
        duration: 5000,
        theme: "toasted-primary",
        action: [
          {
            text: this.$t("dismiss"),
            onClick: (_, toastObject) => {
              setLocalConfig("cookiesAllowed", "yes")
              toastObject.goAway(0)
            },
          },
        ],
      })
    }
  },
}
</script>
