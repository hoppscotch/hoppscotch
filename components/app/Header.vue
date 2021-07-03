<template>
  <header class="flex container items-center justify-between p-2 flex-1">
    <div class="inline-flex space-x-2 items-center flex-shrink-0">
      <AppLogo class="h-6" />
    </div>
    <div class="inline-flex space-x-2 items-center flex-shrink-0">
      <TabPrimary
        id="installPWA"
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('install_pwa')"
        icon="offline_bolt"
        @click.native="showInstallPrompt()"
      />
      <span tabindex="-1">
        <span v-if="currentUser === null">
          <ButtonSecondary label="Sign in" @click.native="showLogin = true" />
          <ButtonPrimary label="Sign up" @click.native="showLogin = true" />
        </span>
        <tippy v-else tabindex="-1" trigger="click" theme="popover" arrow>
          <template #trigger>
            <ProfilePicture
              v-if="currentUser.photoURL"
              v-tippy="{ theme: 'tooltip' }"
              :url="currentUser.photoURL"
              class="mr-4"
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
          <SmartItem to="/settings" icon="settings" :label="$t('settings')" />
          <FirebaseLogout />
        </tippy>
      </span>
      <span tabindex="-1">
        <tippy
          ref="options"
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
    <AppLogin :show="showLogin" @hide-modal="showLogin = false" />
    <AppExtensions
      :show="showExtensions"
      @hide-modal="showExtensions = false"
    />
    <AppShortcuts :show="showShortcuts" @hide-modal="showShortcuts = false" />
    <FirebaseEmail :show="showEmail" @hide-modal="showEmail = false" />
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
      showEmail: false,
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

    // const showAd = localStorage.getItem("showAd") === "no"
    // if (!showAd) {
    //   setTimeout(() => {
    //     this.$toast.clear()
    //     this.$toast.show(
    //       "<span><a href='https://fundoss.org/collective/hoppscotch' target='_blank' rel='noopener'>Sponsor us to support Hoppscotch open source project 💖</a><br><sub>Whoosh this away to dismiss.</sub></span>",
    //       {
    //         icon: "",
    //         duration: 0,
    //         theme: "toasted-ad",
    //         action: [
    //           {
    //             text: "Donate",
    //             icon: "chevron_right",
    //             onClick: (_, toastObject) => {
    //               localStorage.setItem("showAd", "no")
    //               toastObject.goAway(0)
    //               window.open("https://fundoss.org/collective/hoppscotch")
    //             },
    //           },
    //         ],
    //         onComplete() {
    //           localStorage.setItem("showAd", "no")
    //         },
    //       }
    //     )
    //   }, 6000)
    // }

    // let showExtensionsToast = localStorage.getItem("showExtensionsToast") === "yes"
    // if (!showExtensionsToast) {
    //   setTimeout(() => {
    //     if (!hasExtensionInstalled()) {
    //       this.$toast.show(this.$t("extensions_info2"), {
    //         icon: "extension",
    //         duration: 5000,
    //         theme: "toasted-primary",
    //         action: [
    //           {
    //             text: this.$t("yes"),
    //             onClick: (_, toastObject) => {
    //               this.showExtensions = true
    //               localStorage.setItem("showExtensionsToast", "yes")
    //               toastObject.goAway(0)
    //             },
    //           },
    //           {
    //             text: this.$t("no"),
    //             onClick: (_, toastObject) => {
    //               this.$store.commit("setMiscState", {
    //                 value: false,
    //                 attribute: "showExtensionsToast",
    //               })
    //               localStorage.setItem("showExtensionsToast", "no")
    //               toastObject.goAway(0)
    //             },
    //           },
    //         ],
    //       })
    //     }
    //   }, 5000)
    // }
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

<style scoped lang="scss">
.logo {
  @apply text-xl;
  @apply transition-colors;
  @apply ease-in-out;
  @apply duration-150;
  @apply hover:text-accent;
}

@keyframes slideIn {
  0% {
    @apply opacity-0;
    @apply -left-4;
  }

  100% {
    @apply opacity-100;
    @apply left-0;
  }
}

.slide-in {
  @apply relative;

  animation: slideIn 0.2s forwards ease-in-out;
}
</style>
