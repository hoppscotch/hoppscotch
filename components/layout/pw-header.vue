<template>
  <header class="header">
    <div class="flex-wrap">
      <span class="slide-in">
        <nuxt-link :to="localePath('index')">
          <h1 class="logo hide-on-small-screen">Hoppscotch</h1>
          <h1 class="logo show-on-small-screen">Hs</h1>
        </nuxt-link>
      </span>
      <span>
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
              class="material-icons"
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
    <modal v-if="showExtensions" @close="showExtensions = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">{{ $t("extensions") }}</h3>
              <div>
                <button class="icon" @click="showExtensions = false">
                  <closeIcon class="material-icons" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <p class="info">
          {{ $t("extensions_info1") }}
        </p>
        <div>
          <a
            href="https://addons.mozilla.org/en-US/firefox/addon/postwoman"
            target="_blank"
            rel="noopener"
          >
            <button class="icon">
              <svg class="material-icons" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                <path
                  d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm8.003 8.657c-1.276-3.321-4.46-4.605-5.534-4.537 3.529 1.376 4.373 6.059 4.06 7.441-.307-1.621-1.286-3.017-1.872-3.385 3.417 8.005-4.835 10.465-7.353 7.687.649.168 1.931.085 2.891-.557.898-.602.983-.638 1.56-.683.686-.053-.041-1.406-1.539-1.177-.616.094-1.632.819-2.88.341-1.508-.576-1.46-2.634.096-2.015.337-.437.088-1.263.088-1.263.452-.414 1.022-.706 1.37-.911.228-.135.829-.507.795-1.23-.123-.096-.32-.219-.766-.193-1.736.11-1.852-.518-1.967-.808.078-.668.524-1.534 1.361-1.931-1.257-.193-2.28.397-2.789 1.154-.809-.174-1.305-.183-2.118-.031-.316-.24-.666-.67-.878-1.181C6.36 3.312 9.027 2 12 2c5.912 0 8.263 4.283 8.003 6.657z"
                />
              </svg>
              <span>Firefox</span>
              <span class="icon" v-if="hasFirefoxExtInstalled" v-tooltip="$t('installed')">
                <i class="material-icons">done</i>
              </span>
            </button>
          </a>
        </div>
        <div>
          <a
            href="https://chrome.google.com/webstore/detail/postwoman-extension-for-c/amknoiejhlmhancpahfcfcfhllgkpbld"
            target="_blank"
            rel="noopener"
          >
            <button class="icon">
              <svg class="material-icons" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
                <path
                  d="M2.897 4.181A11.87 11.87 0 0111.969 0c4.288 0 8.535 2.273 10.717 6.554h-9.293c-1.674.001-2.755-.037-3.926.579-1.376.724-2.415 2.067-2.777 3.644L2.897 4.181zM8.007 12c0 2.2 1.789 3.99 3.988 3.99s3.988-1.79 3.988-3.99-1.789-3.991-3.988-3.991S8.007 9.8 8.007 12zm5.536 5.223c-2.238.666-4.858-.073-6.293-2.549-1.095-1.891-3.989-6.933-5.305-9.225A11.856 11.856 0 000 11.956c0 5.448 3.726 10.65 9.673 11.818l3.87-6.551zm2.158-9.214a5.463 5.463 0 011.007 6.719 1815.43 1815.43 0 01-5.46 9.248C18.437 24.419 24 18.616 24 12.004c0-1.313-.22-2.66-.69-3.995h-7.609z"
                />
              </svg>
              <span>Chrome</span>
              <span class="icon" v-if="hasChromeExtInstalled" v-tooltip="$t('installed')">
                <i class="material-icons">done</i>
              </span>
            </button>
          </a>
        </div>
      </div>
      <div slot="footer"></div>
    </modal>
    <modal v-if="showShortcuts" @close="showShortcuts = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">{{ $t("shortcuts") }}</h3>
              <div>
                <button class="icon" @click="showShortcuts = false">
                  <closeIcon class="material-icons" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <div>
          <kbd>{{ getSpecialKey() }}</kbd>
          +
          <kbd>G</kbd>
          <label>{{ $t("send_request") }}</label>
        </div>
        <div>
          <kbd>{{ getSpecialKey() }}</kbd
          >+<kbd>S</kbd>
          <label>{{ $t("save_to_collections") }}</label>
        </div>
        <div>
          <kbd>{{ getSpecialKey() }}</kbd
          >+<kbd>K</kbd>
          <label>{{ $t("copy_request_link") }}</label>
        </div>
        <div>
          <kbd>{{ getSpecialKey() }}</kbd
          >+<kbd>L</kbd>
          <label>{{ $t("reset_request") }}</label>
        </div>
        <hr />
        <div>
          <kbd>Alt</kbd>+<kbd>🠋</kbd>
          <label>{{ $t("select_next_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>🠉</kbd>
          <label>{{ $t("select_previous_method") }}</label>
        </div>
        <hr />
        <div>
          <kbd>Alt</kbd>+<kbd>G</kbd>
          <label>{{ $t("select_get_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>H</kbd>
          <label>{{ $t("select_head_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>P</kbd>
          <label>{{ $t("select_post_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>U</kbd>
          <label>{{ $t("select_put_method") }}</label>
        </div>
        <div>
          <kbd>Alt</kbd>+<kbd>D</kbd>
          <label>{{ $t("select_delete_method") }}</label>
        </div>
      </div>
      <div slot="footer"></div>
    </modal>
    <modal v-if="showSupport" @close="showSupport = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">{{ $t("support_us") }}</h3>
              <div>
                <button class="icon" @click="showSupport = false">
                  <closeIcon class="material-icons" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <contributors />
      </div>
      <div slot="footer"></div>
    </modal>
  </header>
</template>

<style scoped lang="scss">
$responsiveWidth: 768px;

@keyframes slideIn {
  0% {
    opacity: 0;
    left: -16px;
  }

  100% {
    opacity: 1;
    left: 0px;
  }
}

.slide-in {
  position: relative;
  animation: slideIn 0.2s forwards ease-in-out;
}

.logo {
  font-size: 22px;

  &:hover {
    color: var(--ac-color);
  }
}

.show-on-small-screen {
  display: none;
}

@media (max-width: $responsiveWidth) {
  .show-on-small-screen {
    display: inline-flex;
  }
}
</style>

<script>
import intializePwa from "~/assets/js/pwa"
import {
  hasExtensionInstalled,
  hasChromeExtensionInstalled,
  hasFirefoxExtensionInstalled,
} from "~/helpers/strategies/ExtensionStrategy"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import firebase from "firebase/app"
import { fb } from "~/helpers/fb"
import closeIcon from "~/static/icons/close-24px.svg?inline"

export default {
  components: {
    closeIcon,
  },
  data() {
    return {
      // Once the PWA code is initialized, this holds a method
      // that can be called to show the user the installation
      // prompt.
      showInstallPrompt: null,
      showExtensions: false,
      hasChromeExtInstalled: hasChromeExtensionInstalled(),
      hasFirefoxExtInstalled: hasFirefoxExtensionInstalled(),
      showShortcuts: false,
      showSupport: false,
      fb,
      navigatorShare: navigator.share,
    }
  },

  mounted() {
    // Initializes the PWA code - checks if the app is installed,
    // etc.
    ;(async () => {
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
      //       "<span>Get <u><a href='https://gum.co/keky' target='_blank' rel='noopener'>De-Coding The Passion Project</a></u> book, expertly crafted by the creator of Hoppscotch. Whoosh this away to dismiss →</span>",
      //       {
      //         icon: "",
      //         duration: 0,
      //         theme: "toasted-ad",
      //         action: [
      //           {
      //             text: "Get",
      //             icon: "chevron_right",
      //             onClick: (e, toastObject) => {
      //               localStorage.setItem("showAd", "no")
      //               toastObject.goAway(0)
      //               window.open("https://gum.co/keky")
      //             },
      //           },
      //         ],
      //         onComplete() {
      //           localStorage.setItem("showAd", "no")
      //         },
      //       }
      //     )
      //   }, 11000)
      // }

      let showExtensionsToast = localStorage.getItem("showExtensionsToast") === "yes"

      // Just return if showExtensionsToast is "no"
      if (!showExtensionsToast) return

      setTimeout(() => {
        if (!hasExtensionInstalled()) {
          this.$toast.show(this.$t("extensions_info2"), {
            icon: "extension",
            duration: 5000,
            theme: "toasted-primary",
            action: [
              {
                text: this.$t("yes"),
                onClick: (e, toastObject) => {
                  this.showExtensions = true
                  localStorage.setItem("showExtensionsToast", "yes")
                  toastObject.goAway(0)
                },
              },
              {
                text: this.$t("no"),
                onClick: (e, toastObject) => {
                  this.$store.commit("setMiscState", {
                    value: false,
                    attribute: "showExtensionsToast",
                  })
                  localStorage.setItem("showExtensionsToast", "no")
                  toastObject.goAway(0)
                },
              },
            ],
          })
        }
      }, 5000)

      this._keyListener = function (e) {
        if (e.key === "Escape") {
          e.preventDefault()
          this.showExtensions = this.showShortcuts = this.showSupport = false
        }
      }
      document.addEventListener("keydown", this._keyListener.bind(this))
    })()
  },

  methods: {
    getSpecialKey: getPlatformSpecialKey,
    nativeShare() {
      if (navigator.share) {
        navigator
          .share({
            title: "Hoppscotch",
            text:
              "Hoppscotch • A free, fast and beautiful API request builder - Helps you create requests faster, saving precious time on development.",
            url: "https://hoppscotch.io/",
          })
          .then(() => {})
          .catch(console.error)
      } else {
        // fallback
      }
    },
  },

  computed: {
    availableLocales() {
      return this.$i18n.locales.filter((i) => i.code !== this.$i18n.locale)
    },
  },
}
</script>
