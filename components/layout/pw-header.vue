<template>
  <header class="header">
    <div class="row-wrapper">
      <span class="slide-in">
        <nuxt-link :to="localePath('index')">
          <h1 class="hide-on-small-screen logo">Hoppscotch</h1>
          <h1 class="show-on-small-screen logo">Hs</h1>
        </nuxt-link>
        <iframe
          src="https://ghbtns.com/github-btn.html?user=hoppscotch&repo=hoppscotch&type=star&count=true"
          frameborder="0"
          scrolling="0"
          width="150"
          height="20"
          title="GitHub"
          class="ml-8"
          loading="lazy"
        ></iframe>
      </span>
      <span>
        <a
          href="https://www.deta.sh/?ref=hoppscotch"
          target="_blank"
          rel="noopener"
          class="px-4 py-2 mx-4 font-mono text-sm rounded-md bg-bgDarkColor hide-on-small-screen"
        >
          Deploy your api for free on Deta
          <img class="w-8 ml-2" src="~assets/images/deta_portal.svg" alt="Deta" />
        </a>
        <button
          class="icon"
          id="installPWA"
          @click.prevent="showInstallPrompt()"
          v-tooltip="$t('install_pwa')"
        >
          <i class="material-icons">offline_bolt</i>
        </button>
        <a
          href="https://github.com/hoppscotch/hoppscotch"
          target="_blank"
          aria-label="GitHub"
          rel="noopener"
        >
          <button class="icon" aria-label="GitHub" v-tooltip="'GitHub'">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" class="material-icons">
              <path
                d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"
              />
            </svg>
          </button>
        </a>
        <v-popover v-if="fb.currentUser === null">
          <button class="icon" v-tooltip="$t('login_with')">
            <i class="material-icons">login</i>
          </button>
          <template slot="popover">
            <login />
          </template>
        </v-popover>
        <v-popover v-else>
          <button
            class="icon"
            v-tooltip="
              (fb.currentUser.displayName || '<label><i>Name not found</i></label>') +
              '<br>' +
              (fb.currentUser.email || '<label><i>Email not found</i></label>')
            "
            aria-label="Account"
          >
            <img
              v-if="fb.currentUser.photoURL"
              :src="fb.currentUser.photoURL"
              class="rounded-full material-icons"
              alt="Profile image"
            />
            <i v-else class="material-icons">account_circle</i>
          </button>
          <template slot="popover">
            <div>
              <nuxt-link :to="localePath('settings')" v-close-popover>
                <button class="icon">
                  <i class="material-icons">settings</i>
                  <span>
                    {{ $t("settings") }}
                  </span>
                </button>
              </nuxt-link>
            </div>
            <div>
              <logout />
            </div>
          </template>
        </v-popover>
        <v-popover>
          <button class="icon" v-tooltip="$t('more')">
            <i class="material-icons">drag_indicator</i>
          </button>
          <template slot="popover">
            <button class="icon" @click="showExtensions = true" v-close-popover>
              <i class="material-icons">extension</i>
              <span>{{ $t("extensions") }}</span>
            </button>
            <button class="icon" @click="showShortcuts = true" v-close-popover>
              <i class="material-icons">keyboard</i>
              <span>{{ $t("shortcuts") }}</span>
            </button>
            <button class="icon" @click="showSupport = true" v-close-popover>
              <i class="material-icons">favorite</i>
              <span>{{ $t("support_us") }}</span>
            </button>
            <button
              class="icon"
              onClick="window.open('https://twitter.com/share?text=👽 Hoppscotch • A free, fast and beautiful API request builder - Helps you create requests faster, saving precious time on development.&url=https://hoppscotch.io&hashtags=hoppscotch&via=liyasthomas');"
              v-close-popover
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                <path
                  d="M24 4.557a9.83 9.83 0 01-2.828.775 4.932 4.932 0 002.165-2.724 9.864 9.864 0 01-3.127 1.195 4.916 4.916 0 00-3.594-1.555c-3.179 0-5.515 2.966-4.797 6.045A13.978 13.978 0 011.671 3.149a4.93 4.93 0 001.523 6.574 4.903 4.903 0 01-2.229-.616c-.054 2.281 1.581 4.415 3.949 4.89a4.935 4.935 0 01-2.224.084 4.928 4.928 0 004.6 3.419A9.9 9.9 0 010 19.54a13.94 13.94 0 007.548 2.212c9.142 0 14.307-7.721 13.995-14.646A10.025 10.025 0 0024 4.557z"
                />
              </svg>
              <span>{{ $t("tweet") }}</span>
            </button>
            <button
              v-if="navigatorShare"
              class="icon"
              @click="nativeShare"
              v-close-popover
              v-tooltip="$t('more')"
            >
              <i class="material-icons">share</i>
              <span>Share</span>
            </button>
          </template>
        </v-popover>
      </span>
    </div>
    <extensions :show="showExtensions" @hide-modal="showExtensions = false" />
    <shortcuts :show="showShortcuts" @hide-modal="showShortcuts = false" />
    <support :show="showSupport" @hide-modal="showSupport = false" />
  </header>
</template>

<style scoped lang="scss">
$responsiveWidth: 768px;

.logo {
  @apply text-xl;
  @apply transition-colors;
  @apply ease-in-out;
  @apply duration-150;

  &:hover {
    @apply text-acColor;
  }
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

.show-on-small-screen {
  @apply hidden;
}

@media (max-width: $responsiveWidth) {
  .show-on-small-screen {
    @apply inline-flex;
  }
}
</style>

<script>
import intializePwa from "~/helpers/pwa"
import { hasExtensionInstalled } from "~/helpers/strategies/ExtensionStrategy"
import { fb } from "~/helpers/fb"

export default {
  data() {
    return {
      // Once the PWA code is initialized, this holds a method
      // that can be called to show the user the installation
      // prompt.
      showInstallPrompt: null,
      showExtensions: false,
      showShortcuts: false,
      showSupport: false,
      navigatorShare: navigator.share,
      fb,
    }
  },
  async mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showExtensions = this.showShortcuts = this.showSupport = false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))

    // Initializes the PWA code - checks if the app is installed,
    // etc.
    this.showInstallPrompt = await intializePwa()
    let cookiesAllowed = localStorage.getItem("cookiesAllowed") === "yes"
    if (!cookiesAllowed) {
      this.$toast.show(this.$t("we_use_cookies"), {
        icon: "info",
        duration: 5000,
        theme: "toasted-primary",
        action: [
          {
            text: this.$t("dismiss"),
            onClick: (e, toastObject) => {
              localStorage.setItem("cookiesAllowed", "yes")
              toastObject.goAway(0)
            },
          },
        ],
      })
    }

    // let showAd = localStorage.getItem("showAd") === "no"
    // if (!showAd) {
    //   setTimeout(() => {
    //     this.$toast.clear()
    //     this.$toast.show(
    //       "<span><a href='https://github.com/sponsors/hoppscotch' target='_blank' rel='noopener'>Sponsor us to support Hoppscotch open source project 💖</a><br><sub>Whoosh this away to dismiss.</sub></span>",
    //       {
    //         icon: "",
    //         duration: 0,
    //         theme: "toasted-ad",
    //         action: [
    //           {
    //             text: "Sponsor",
    //             icon: "chevron_right",
    //             onClick: (e, toastObject) => {
    //               localStorage.setItem("showAd", "no")
    //               toastObject.goAway(0)
    //               window.open("https://github.com/sponsors/hoppscotch")
    //             },
    //           },
    //         ],
    //         onComplete() {
    //           localStorage.setItem("showAd", "no")
    //         },
    //       }
    //     )
    //   }, 8000)
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
    //             onClick: (e, toastObject) => {
    //               this.showExtensions = true
    //               localStorage.setItem("showExtensionsToast", "yes")
    //               toastObject.goAway(0)
    //             },
    //           },
    //           {
    //             text: this.$t("no"),
    //             onClick: (e, toastObject) => {
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
            text:
              "Hoppscotch • A free, fast and beautiful API request builder - Helps you create requests faster, saving precious time on development.",
            url: "https://hoppscotch.io",
          })
          .then(() => {})
          .catch(console.error)
      } else {
        // fallback
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
