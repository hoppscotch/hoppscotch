<template>
  <div class="wrapper">
    <header class="header">
      <div>
        <div class="slide-in">
          <nuxt-link to="/">
            <h1 class="logo">Postwoman</h1>
          </nuxt-link>
          <h3 class="tagline">API request builder</h3>
        </div>
        <a href="https://github.com/liyasthomas/postwoman" target="_blank" rel="noopener">
          <button class="icon">
            <img id="imgGitHub" src="~static/icons/github.svg" alt="GitHub" :style="logoStyle()" />
            <span>GitHub</span>
          </button>
        </a>
      </div>
    </header>
    <div class="content">
      <div class="columns">
        <nuxt id="main" class="main" />
        <aside class="nav-first">
          <nav class="primary-nav">
            <!--
              We're using manual checks for linkActive because the query string
              seems to mess up the nuxt-link active class.
            -->
            <nuxt-link to="/" :class="linkActive('/')" v-tooltip.right="'Home'">
              <logo alt style="height: 24px;"></logo>
            </nuxt-link>
            <nuxt-link to="/websocket" :class="linkActive('/websocket')" v-tooltip.right="'WebSocket'">
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
        <aside class="nav-second"></aside>
      </div>
    </div>
    <footer class="footer">
      <!-- Top section of footer: GitHub/install links -->
      <div class="flex-wrap">
        <button class="icon" id="installPWA" @click.prevent="showInstallPrompt()">
          <i class="material-icons">add_to_home_screen</i>
          <span>Install PWA</span>
        </button>
        <button
          class="icon"
          onClick="window.open('https://twitter.com/share?text=👽 Postwoman • API request builder - Helps you create your requests faster, saving you precious time on your development&url=https://postwoman.io&hashtags=postwoman&via=liyasthomas');"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
            />
          </svg>
          <span>Tweet</span>
        </button>
      </div>
      <!-- Bottom section of footer: version/author information -->
      <p class="align-center">
        <span v-if="version.name">
          <a
            v-bind:href="'https://github.com/liyasthomas/postwoman/releases/tag/' + version.name"
            target="_blank"
            rel="noopener"
          >{{version.name}}</a>
          <span v-if="version.hash">
            -
            <a
              v-bind:href="'https://github.com/liyasthomas/postwoman/commit/' + version.hash"
              target="_blank"
              rel="noopener"
            >{{version.hash}}</a>
          </span>
          <span v-if="version.variant">({{version.variant}})</span>
          &#x2022;
        </span> by
        <a href="https://liyasthomas.web.app" target="_blank" rel="noopener">Liyas Thomas 🦄</a> &#x2022;
        <a href="https://postwoman.launchaco.com" target="_blank" rel="noopener">Subscribe</a>
      </p>
    </footer>
  </div>
</template>

<style lang="scss">
  html {
    scroll-behavior: smooth;
  }

  header,
  footer {
    & > div {
      display: flex;
      padding: 16px;
      width: 100%;
      align-items: center;
      justify-content: space-between;
    }
  }

  body.sticky-footer footer {
    opacity: 0.25;
  }

  .wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .header,
  .content,
  .columns,
  .footer {
    display: flex;
    flex: 1;
  }

  .logo {
    font-size: 22px;
    color: var(--ac-color);
  }

  .tagline {
    font-size: 18px;
  }

  .nav-first {
    display: flex;
    order: 1;
    flex-flow: column;
    position: sticky;
    top: 0;
    align-self: flex-start;
  }

  .main {
    flex: 1;
    order: 2;
    position: relative;
    padding: 0 8px;
  }

  .nav-second {
    display: flex;
    width: 10%;
    order: 3;
    // comment this to display
    display: none;
  }

  nav.secondary-nav {
    display: flex;
    align-items: center;
    justify-content: center;

    ul {
      display: flex;
      flex-flow: column;

      li {
        display: flex;

        a {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          border-radius: 50%;
          background-color: var(--bg-dark-color);
          color: var(--fg-light-color);
          margin: 8px;

          &:hover {
            color: var(--fg-color);
          }

          &.current {
            color: var(--ac-color);
            fill: var(--ac-color);
          }
        }
      }
    }
  }

  .slide-in {
    position: relative;
    animation: slideIn 0.2s forwards ease-in-out;
  }

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

  .footer {
    flex-direction: column;
  }

  nav.primary-nav {
    display: flex;
    flex-flow: column;
    border-bottom: 1px solid var(--brd-color);

    svg {
      fill: var(--fg-light-color);
    }

    a {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      border-radius: 8px;
      background-color: var(--brd-color);
      color: var(--fg-light-color);
      margin: 8px;

      &:hover {
        color: var(--fg-color);

        svg {
          fill: var(--fg-color);
        }
      }

      &.nuxt-link-exact-active {
        background-color: var(--ac-color);
        color: var(--act-color);

        svg {
          fill: var(--act-color);
        }
      }
    }
  }

  $responsiveWidth: 720px;

  @media (max-width: $responsiveWidth) {
    .columns {
      flex-flow: column;
    }
    .nav-first {
      width: 100%;
      background-color: var(--bg-color);
    }
    nav.primary-nav {
      flex-flow: row;
    }
    nav.secondary-nav {
      display: none;
    }
  }
</style>

<script>
  import intializePwa from "../assets/js/pwa";
  import logo from "../components/logo";
  import * as version from "../.postwoman/version.json";

  export default {
    components: {
      logo
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
        logoStyle() {
          return (
            this.$store.state.postwoman.settings.THEME_CLASS || ""
          ).includes("light")
            ? " filter: invert(100%); -webkit-filter: invert(100%);"
            : "";
        },

        version: {}
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
