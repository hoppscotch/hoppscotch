<template>
  <header class="header">
    <div class="flex-wrap">
      <span class="slide-in">
        <nuxt-link :to="localePath('index')">
          <h1 class="logo">Postwoman</h1>
        </nuxt-link>
      </span>
      <span>
        <button
          class="icon"
          id="installPWA"
          @click.prevent="showInstallPrompt()"
          v-tooltip="$t('install_pwa')"
        >
          <icon :icon="'offline_bolt'" />
        </button>
        <a
          href="https://github.com/liyasthomas/postwoman"
          target="_blank"
          aria-label="GitHub"
          rel="noopener"
        >
          <button class="icon" aria-label="GitHub" v-tooltip="'GitHub'">
            <icon :icon="'github'" />
          </button>
        </a>
        <v-popover v-if="fb.currentUser === null">
          <button class="icon" v-tooltip="$t('login_with')">
            <icon :icon="'login'" />
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
            <icon v-else icon="account_circle" />
          </button>
          <template slot="popover">
            <div>
              <nuxt-link :to="localePath('settings')" v-close-popover>
                <button class="icon">
                  <icon :icon="'settings'" />
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
            <icon :icon="'drag_indicator'" />
          </button>
          <template slot="popover">
            <button class="icon" @click="showExtensions = true" v-close-popover>
              <icon :icon="'extension'" />
              <span>{{ $t("extensions") }}</span>
            </button>
            <button class="icon" @click="showShortcuts = true" v-close-popover>
              <icon :icon="'keyboard'" />
              <span>{{ $t("shortcuts") }}</span>
            </button>
            <button class="icon" @click="showSupport = true" v-close-popover>
              <icon :icon="'favorite'" />
              <span>{{ $t("support_us") }}</span>
            </button>
            <button
              class="icon"
              onClick="window.open('https://twitter.com/share?text=👽 Postwoman • A free, fast and beautiful API request builder - Helps you create requests faster, saving precious time on development.&url=https://postwoman.io&hashtags=postwoman&via=liyasthomas');"
              v-close-popover
            >
              <icon :icon="'twitter'" />
              <span>{{ $t("tweet") }}</span>
            </button>
            <button
              v-if="navigatorShare"
              class="icon"
              @click="nativeShare"
              v-close-popover
              v-tooltip="$t('more')"
            >
              <icon :icon="'share'" />
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
                  <icon :icon="'close'" />
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
              <icon :icon="'firefox'" />
              <span>Firefox</span>
              <span class="icon" v-if="hasFirefoxExtInstalled" v-tooltip="$t('installed')">
                <icon :icon="'done'" />
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
              <icon :icon="'chrome'" />
              <span>Chrome</span>
              <span class="icon" v-if="hasChromeExtInstalled" v-tooltip="$t('installed')">
                <icon :icon="'done'" />
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
                  <icon :icon="'close'" />
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <div>
          <label>{{ $t("send_request") }}</label>
          <kbd>{{ getSpecialKey() }} G</kbd>
        </div>
        <div>
          <label>{{ $t("save_to_collections") }}</label>
          <kbd>{{ getSpecialKey() }} S</kbd>
        </div>
        <div>
          <label>{{ $t("copy_request_link") }}</label>
          <kbd>{{ getSpecialKey() }} K</kbd>
        </div>
        <div>
          <label>{{ $t("reset_request") }}</label>
          <kbd>{{ getSpecialKey() }} L</kbd>
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
                  <icon :icon="'close'" />
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

export default {
  components: {
    modal: () => import("../ui/modal"),
    login: () => import("../firebase/login"),
    logout: () => import("../firebase/logout"),
    contributors: () => import("./contributors"),
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
      //       "<span>Get <u><a href='https://gum.co/keky' target='_blank' rel='noopener'>De-Coding The Passion Project</a></u> book, expertly crafted by the creator of Postwoman. Whoosh this away to dismiss →</span>",
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
            title: "Postwoman",
            text:
              "Postwoman • A free, fast and beautiful API request builder - Helps you create requests faster, saving precious time on development.",
            url: "https://postwoman.io/",
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
