<template>
  <header class="flex container items-center justify-between p-2 flex-1">
    <div class="flex items-center relative ml-2">
      <nuxt-link :to="localePath('index')">
        <h1 class="heading logo">Hoppscotch</h1>
      </nuxt-link>
      <AppGitHubStarButton class="ml-8" />
    </div>
    <div class="flex">
      <button
        id="installPWA"
        v-tooltip="$t('install_pwa')"
        class="icon button"
        @click.prevent="showInstallPrompt()"
      >
        <i class="material-icons">offline_bolt</i>
      </button>
      <a
        href="https://github.com/hoppscotch/hoppscotch"
        target="_blank"
        aria-label="GitHub"
        rel="noopener"
      >
        <button v-tooltip="'GitHub'" class="icon button" aria-label="GitHub">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            class="material-icons"
          >
            <path
              d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
            />
          </svg>
        </button>
      </a>
      <v-popover v-if="currentUser === null">
        <button v-tooltip="$t('login_with')" class="icon button">
          <i class="material-icons">login</i>
        </button>
        <template #popover>
          <FirebaseLogin @show-email="showEmail = true" />
        </template>
      </v-popover>
      <v-popover v-else>
        <button
          v-tooltip="
            (currentUser.displayName ||
              '<label><i>Name not found</i></label>') +
            '<br>' +
            (currentUser.email || '<label><i>Email not found</i></label>')
          "
          class="icon button"
          aria-label="Account"
        >
          <img
            v-if="currentUser.photoURL"
            :src="currentUser.photoURL"
            class="w-6 h-6 rounded-full material-icons"
            alt="Profile image"
          />
          <i v-else class="material-icons">account_circle</i>
        </button>
        <template #popover>
          <div>
            <nuxt-link v-close-popover :to="localePath('settings')">
              <button class="icon button">
                <i class="material-icons">settings</i>
                <span>
                  {{ $t("settings") }}
                </span>
              </button>
            </nuxt-link>
          </div>
          <div>
            <FirebaseLogout />
          </div>
        </template>
      </v-popover>
      <v-popover>
        <button v-tooltip="$t('more')" class="icon button">
          <i class="material-icons">drag_indicator</i>
        </button>
        <template #popover>
          <button
            v-close-popover
            class="icon button"
            @click="showExtensions = true"
          >
            <i class="material-icons">extension</i>
            <span>{{ $t("extensions") }}</span>
          </button>
          <button
            v-close-popover
            class="icon button"
            @click="showShortcuts = true"
          >
            <i class="material-icons">keyboard</i>
            <span>{{ $t("shortcuts") }}</span>
          </button>
          <button
            v-close-popover
            class="icon button"
            onClick="window.open('https://twitter.com/share?text=👽 Hoppscotch • Open source API development ecosystem - Helps you create requests faster, saving precious time on development.&url=https://hoppscotch.io&hashtags=hoppscotch&via=hoppscotch_io');"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
              <path
                d="M24 4.557a9.83 9.83 0 01-2.828.775 4.932 4.932 0 002.165-2.724 9.864 9.864 0 01-3.127 1.195 4.916 4.916 0 00-3.594-1.555c-3.179 0-5.515 2.966-4.797 6.045A13.978 13.978 0 011.671 3.149a4.93 4.93 0 001.523 6.574 4.903 4.903 0 01-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.935 4.935 0 01-2.224.084 4.928 4.928 0 004.6 3.419A9.9 9.9 0 010 19.54a13.94 13.94 0 007.548 2.212c9.142 0 14.307-7.721 13.995-14.646A10.025 10.025 0 0024 4.557z"
              />
            </svg>
            <span>Tweet</span>
          </button>
          <button
            v-if="navigatorShare"
            v-close-popover
            v-tooltip="$t('more')"
            class="icon button"
            @click="nativeShare"
          >
            <i class="material-icons">share</i>
            <span>Share</span>
          </button>
        </template>
      </v-popover>
    </div>
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
