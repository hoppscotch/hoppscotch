<template>
  <header class="flex items-center justify-between p-2 flex-1">
    <div class="inline-flex space-x-2 items-center font-bold flex-shrink-0">
      <AppLogo class="h-6 mx-4" /> Hoppscotch
    </div>
    <div class="inline-flex space-x-2 items-center flex-shrink-0">
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
          label="Get Started"
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
                (currentUser.displayName ||
                  '<label><i>Name not found</i></label>') +
                '<br>' +
                (currentUser.email || '<label><i>Email not found</i></label>')
              "
            />
            <TabPrimary
              v-else
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('account')"
              icon="account_circle"
            />
          </template>
          <SmartItem
            to="/profile"
            icon="person"
            :label="$t('profile')"
            @click.native="$refs.user.tippy().hide()"
          />
          <SmartItem
            to="/settings"
            icon="settings"
            :label="$t('settings')"
            @click.native="$refs.user.tippy().hide()"
          />
          <FirebaseLogout @confirm-logout="$refs.user.tippy().hide()" />
        </tippy>
      </span>
      <span tabindex="-1">
        <tippy
          ref="options"
          interactive
          tabindex="-1"
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <TabPrimary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('more')"
              icon="drag_indicator"
            />
          </template>
          <SmartItem
            icon="extension"
            :label="$t('extensions')"
            @click.native="
              showExtensions = true
              $refs.options.tippy().hide()
            "
          />
          <SmartItem
            icon="keyboard"
            :label="$t('shortcuts')"
            @click.native="
              showShortcuts = true
              $refs.options.tippy().hide()
            "
          />
          <SmartItem
            v-if="navigatorShare"
            icon="share"
            :label="$t('share')"
            @click.native="
              nativeShare()
              $refs.options.tippy().hide()
            "
          />
        </tippy>
      </span>
    </div>
    <FirebaseLogin :show="showLogin" @hide-modal="showLogin = false" />
    <AppExtensions
      :show="showExtensions"
      @hide-modal="showExtensions = false"
    />
    <AppShortcuts :show="showShortcuts" @hide-modal="showShortcuts = false" />
  </header>
</template>

<script>
import intializePwa from "~/helpers/pwa"
import { currentUser$ } from "~/helpers/fb/auth"
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence"
// import { hasExtensionInstalled } from "~/helpers/strategies/ExtensionStrategy"

export default {
  data() {
    return {
      // Once the PWA code is initialized, this holds a method
      // that can be called to show the user the installation
      // prompt.
      showInstallPrompt: null,
      showLogin: false,
      showExtensions: false,
      showShortcuts: false,
      navigatorShare: navigator.share,
    }
  },
  subscriptions() {
    return {
      currentUser: currentUser$,
    }
  },
  async mounted() {
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
  methods: {
    nativeShare() {
      if (navigator.share) {
        navigator
          .share({
            title: "Hoppscotch",
            text: "Hoppscotch • Open source API development ecosystem - Helps you create requests faster, saving precious time on development.",
            url: "https://hoppscotch.io",
          })
          .then(() => {})
          .catch(console.error)
      } else {
        // fallback
      }
    },
  },
}
</script>
