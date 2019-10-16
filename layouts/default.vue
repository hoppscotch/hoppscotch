<template>
  <div>
    <header>
      <div>
        <div class="slide-in">
          <nuxt-link to="/">
            <h1 class="logo"><logo alt="" style="height: 24px; margin-right: 16px"></logo>Postwoman</h1>
          </nuxt-link>
          <h3>API request builder</h3>
        </div>
        <nav>
          <nuxt-link to="/">HTTP</nuxt-link>
          <nuxt-link to="/websocket">WebSocket</nuxt-link>
          <nuxt-link to="/settings" aria-label="Settings">
            <!-- Settings cog -->
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"/>
            </svg>
          </nuxt-link>
        </nav>
      </div>
    </header>
    <nuxt id="main" />
    <footer>
      <!-- Top section of footer: GitHub/install links -->
      <div class="flex-wrap">
        <a href="https://github.com/liyasthomas/postwoman" target="_blank" rel="noopener">
          <button class="icon">
            <img id="imgGitHub" src="~static/icons/github.svg" alt="GitHub" :style="logoStyle()">
            <span>GitHub</span>
          </button>
        </a>
        <button class="icon" id="installPWA" @click.prevent="showInstallPrompt()">
          <i class="material-icons">add_to_home_screen</i>
          <span>Install PWA</span>
        </button>
        <button class="icon" onClick="window.open('https://twitter.com/share?text=👽 Postwoman • API request builder - Helps you create your requests faster, saving you precious time on your development&url=https://postwoman.io&hashtags=postwoman&via=liyasthomas');">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
            <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
          </svg>
          <span>Tweet</span>
        </button>
      </div>
      <!-- Bottom section of footer: version/author information -->
      <p class="align-center">
        <span v-if="version.name">
          <a v-bind:href="'https://github.com/liyasthomas/postwoman/releases/tag/' + version.name" target="_blank" rel="noopener">{{version.name}}</a>
          <span v-if="version.hash">
            - <a v-bind:href="'https://github.com/liyasthomas/postwoman/commit/' + version.hash" target="_blank" rel="noopener">{{version.hash}}</a>
          </span>
          <span v-if="version.variant"> ({{version.variant}})</span>
          &#x2022;
        </span> by <a href="https://liyasthomas.web.app" target="_blank" rel="noopener">Liyas Thomas 🦄</a> &#x2022; <a href="https://postwoman.launchaco.com" target="_blank" rel="noopener">Subscribe</a>
      </p>
    </footer>
  </div>
</template>
<style lang="scss">
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

  header,
  #main,
  footer {
    margin: 0 auto;
    max-width: 1200px;
  }

  footer {
    margin: 32px auto;
  }

  nav {
    svg {
      vertical-align: sub;
    }

    a {
      display: inline-block;
      position: relative;
      padding: 8px 16px;
      fill: var(--fg-color);
      color: var(--fg-color);

      &.nuxt-link-exact-active {
        color: var(--act-color);
        fill: var(--act-color);

        &:before {
          width: 100%;
          height: 100%
        }
      }

      &:before {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        z-index: -1;
        background-color: var(--ac-color);
        border-radius: 8px;
        margin: auto;
      }

      &:not(.nuxt-link-exact-active):hover:before {
        animation: linkHover 0.2s forwards ease-in-out;
      }

      @keyframes linkHover {
        0% {
          width: 0;
          height: 2px;
        }

        100% {
          width: 100%;
          height: 2px;
        }
      }
    }
  }

</style>
<script>
  import intializePwa from '../assets/js/pwa';
  import logo from "../components/logo";
  import * as version from '../.postwoman/version.json';

  export default {
    components: {
      logo
    },

    data() {
      return {
        // Once the PWA code is initialized, this holds a method
        // that can be called to show the user the installation
        // prompt.
        showInstallPrompt: null,
        logoStyle() {
          return (((this.$store.state.postwoman.settings.THEME_CLASS || '').includes("light")) ? " filter: invert(100%); -webkit-filter: invert(100%);" : '')
        },

        version: {}
      }
    },

    beforeMount() {
      // Set version data
      this.version = version.default;

      // Load theme settings
      (() => {
        // Apply theme from settings.
        document.documentElement.className = this.$store.state.postwoman.settings.THEME_CLASS || '';
        // Load theme color data from settings, or use default color.
        let color = this.$store.state.postwoman.settings.THEME_COLOR || '#50fa7b';
        let vibrant = this.$store.state.postwoman.settings.THEME_COLOR_VIBRANT;
        if (vibrant == null) vibrant = true;
        document.documentElement.style.setProperty('--ac-color', color);
        document.documentElement.style.setProperty('--act-color', vibrant ? 'rgb(37, 38, 40)' : '#ffffff');
      })();
    },

    mounted() {
      // Initializes the PWA code - checks if the app is installed,
      // etc.
      (async () => {
        this.showInstallPrompt = await intializePwa();
        let cookiesAllowed = localStorage.getItem('cookiesAllowed') === 'yes';
        if(!cookiesAllowed) {
          this.$toast.show('We use cookies', {
            icon: 'info',
            duration: 5000,
            theme: 'toasted-primary',
            action: [
              {
                text: 'Dismiss',
                onClick: (e, toastObject) => {
                  localStorage.setItem('cookiesAllowed', 'yes');
                  toastObject.goAway(0);
                }
              }
            ]
          });
        }
      })();
    }
  }

</script>
