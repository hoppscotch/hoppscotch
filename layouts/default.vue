<template>
  <div class="wrapper">
    <header class="header">
      <div class="flex-wrap">
        <div class="slide-in">
          <nuxt-link to="/">
            <h1 class="logo">Postwoman</h1>
          </nuxt-link>
        </div>
        <div class="flex-wrap">
          <a
            href="https://github.com/liyasthomas/postwoman"
            target="_blank"
            aria-label="GitHub"
            rel="noopener"
          >
            <button class="icon" aria-label="GitHub" v-tooltip="'GitHub'">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                />
              </svg>
            </button>
          </a>
          <button
            class="icon"
            id="installPWA"
            @click.prevent="showInstallPrompt()"
            v-tooltip="'Install PWA'"
          >
            <i class="material-icons">offline_bolt</i>
          </button>
          <v-popover>
            <button class="tooltip-target icon" v-tooltip="'More'">
              <i class="material-icons">more_vert</i>
            </button>
            <template slot="popover">
              <div>
                <button
                  class="icon"
                  @click="showShortcuts = true"
                  v-close-popover
                >
                  <i class="material-icons">keyboard</i>
                  <span>Shortcuts</span>
                </button>
              </div>
              <div>
                <a
                  href="https://opencollective.com/postwoman"
                  target="_blank"
                  rel="noopener"
                  v-close-popover
                >
                  <button class="icon">
                    <i class="material-icons">favorite</i>
                    <span>Donate</span>
                  </button>
                </a>
              </div>
              <div>
                <button
                  class="icon"
                  onClick="window.open('https://twitter.com/share?text=👽 Postwoman • API request builder - Helps you create your requests faster, saving you precious time on your development&url=https://postwoman.io&hashtags=postwoman&via=liyasthomas');"
                  v-close-popover
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <path
                      d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
                    />
                  </svg>
                  <span>Tweet</span>
                </button>
              </div>
            </template>
          </v-popover>
        </div>
      </div>
    </header>
    <div class="content">
      <div class="columns">
        <aside class="nav-first">
          <nav class="primary-nav">
            <!--
              We're using manual checks for linkActive because the query string
              seems to mess up the nuxt-link active class.
            -->
            <nuxt-link
              to="/"
              :class="linkActive('/')"
              v-tooltip.right="'Home'"
              aria-label="Home"
            >
              <logo alt style="height: 24px;"></logo>
            </nuxt-link>
            <nuxt-link
              to="/websocket"
              :class="linkActive('/websocket')"
              v-tooltip.right="'WebSocket'"
            >
              <i class="material-icons">cloud</i>
            </nuxt-link>
            <nuxt-link
              to="/settings"
              :class="linkActive('/settings')"
              v-tooltip.right="'Settings'"
              aria-label="Settings"
            >
              <i class="material-icons">settings</i>
            </nuxt-link>
          </nav>
          <div v-if="['/'].includes($route.path)">
            <nav class="secondary-nav">
              <ul>
                <li>
                  <a href="#request" v-tooltip.right="'Request'">
                    <i class="material-icons">cloud_upload</i>
                  </a>
                </li>
                <li>
                  <a href="#options" v-tooltip.right="'Options'">
                    <i class="material-icons">toc</i>
                  </a>
                </li>
                <li>
                  <a href="#response" v-tooltip.right="'Response'">
                    <i class="material-icons">cloud_download</i>
                  </a>
                </li>
                <li>
                  <a href="#collections" v-tooltip.right="'Collections'">
                    <i class="material-icons">folder_special</i>
                  </a>
                </li>
                <li>
                  <a href="#history" v-tooltip.right="'History'">
                    <i class="material-icons">watch_later</i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div v-else-if="['/websocket'].includes($route.path)">
            <nav class="secondary-nav">
              <ul>
                <li>
                  <a href="#request" v-tooltip.right="'Request'">
                    <i class="material-icons">cloud_upload</i>
                  </a>
                </li>
                <li>
                  <a href="#response" v-tooltip.right="'Response'">
                    <i class="material-icons">cloud_download</i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div v-else-if="['/settings'].includes($route.path)">
            <nav class="secondary-nav">
              <ul>
                <li>
                  <a href="#theme" v-tooltip.right="'Theme'">
                    <i class="material-icons">brush</i>
                  </a>
                </li>
                <li>
                  <a href="#proxy" v-tooltip.right="'Proxy'">
                    <i class="material-icons">public</i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </aside>
        <nuxt id="main" class="main" />
        <aside class="nav-second"></aside>
      </div>
    </div>
    <footer class="footer">
      <!-- Bottom section of footer: version/author information -->
      <p class="align-center mono">
        <span v-if="version.name">
          <a
            v-bind:href="
              'https://github.com/liyasthomas/postwoman/releases/tag/' +
                version.name
            "
            target="_blank"
            rel="noopener"
            >{{ version.name }}</a
          >
          <!-- <span v-if="version.hash">
            -
            <a
              v-bind:href="'https://github.com/liyasthomas/postwoman/commit/' + version.hash"
              target="_blank"
              rel="noopener"
            >{{version.hash}}</a>
          </span> -->
          <!-- <span v-if="version.variant">({{version.variant}})</span> -->
          &#x2022;
        </span>
        <a href="https://liyasthomas.web.app" target="_blank" rel="noopener"
          >🦄</a
        >
        &#x2022;
        <a href="https://postwoman.launchaco.com" target="_blank" rel="noopener"
          >Subscribe</a
        >
      </p>
    </footer>
    <modal v-if="showShortcuts" @close="showShortcuts = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">Shortcuts</h3>
              <div>
                <button class="icon" @click="showShortcuts = false">
                  <i class="material-icons">close</i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <div class="flex-wrap">
          <div>
            <label>Save to Collection</label>
            <kbd>Ctrl</kbd><kbd>S</kbd>
          </div>
          <div>
            <label>Copy Sharable URL</label>
            <kbd>Ctrl</kbd><kbd>K</kbd>
          </div>
        </div>
      </div>
      <div slot="footer"></div>
    </modal>
  </div>
</template>

<style lang="scss"></style>

<script>
import intializePwa from "../assets/js/pwa";
import logo from "../components/logo";
import * as version from "../.postwoman/version.json";
import modal from "../components/modal";

export default {
  components: {
    logo,
    modal
  },

  methods: {
    linkActive(path) {
      return {
        "nuxt-link-exact-active": this.$route.path === path,
        "nuxt-link-active": this.$route.path === path
      };
    }
  },

  data() {
    return {
      // Once the PWA code is initialized, this holds a method
      // that can be called to show the user the installation
      // prompt.
      showInstallPrompt: null,
      version: {},
      showShortcuts: false
    };
  },

  beforeMount() {
    // Set version data
    this.version = version.default;

    // Load theme settings
    (() => {
      // Apply theme from settings.
      document.documentElement.className =
        this.$store.state.postwoman.settings.THEME_CLASS || "";
      // Load theme color data from settings, or use default color.
      let color = this.$store.state.postwoman.settings.THEME_COLOR || "#50fa7b";
      let vibrant = this.$store.state.postwoman.settings.THEME_COLOR_VIBRANT;
      if (vibrant == null) vibrant = true;
      document.documentElement.style.setProperty("--ac-color", color);
      document.documentElement.style.setProperty(
        "--act-color",
        vibrant ? "rgb(37, 38, 40)" : "#ffffff"
      );
    })();
  },

  mounted() {
    if (process.client) {
      document.body.classList.add("afterLoad");
    }

    document
      .querySelector("meta[name=theme-color]")
      .setAttribute(
        "content",
        this.$store.state.postwoman.settings.THEME_TAB_COLOR || "#252628"
      );

    // Initializes the PWA code - checks if the app is installed,
    // etc.
    (async () => {
      this.showInstallPrompt = await intializePwa();
      let cookiesAllowed = localStorage.getItem("cookiesAllowed") === "yes";
      if (!cookiesAllowed) {
        this.$toast.show("We use cookies", {
          icon: "info",
          duration: 5000,
          theme: "toasted-primary",
          action: [
            {
              text: "Dismiss",
              onClick: (e, toastObject) => {
                localStorage.setItem("cookiesAllowed", "yes");
                toastObject.goAway(0);
              }
            }
          ]
        });
      }
    })();

    window.addEventListener("scroll", event => {
      let mainNavLinks = document.querySelectorAll("nav ul li a");
      let fromTop = window.scrollY;
      mainNavLinks.forEach(link => {
        let section = document.querySelector(link.hash);

        if (
          section &&
          section.offsetTop <= fromTop &&
          section.offsetTop + section.offsetHeight > fromTop
        ) {
          link.classList.add("current");
        } else {
          link.classList.remove("current");
        }
      });
    });
  },

  watch: {
    $route() {
      this.$toast.clear();
    }
  }
};
</script>
