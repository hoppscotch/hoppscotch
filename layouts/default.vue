<template>
  <div>
    <header>
      <div>
        <div class="slide-in">
          <nuxt-link to="/">
            <h1 class="logo">
              <logo alt="" style="height: 24px; margin-right: 16px" />Postwoman</h1>
          </nuxt-link>
          <h3>API request builder</h3>
        </div>
        <nav>
          <nuxt-link to="/">HTTP</nuxt-link>
          <nuxt-link to="/websocket">WebSocket</nuxt-link>
          <nuxt-link to="/settings">
            <!-- Settings cog -->
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
              <path d="M24 14.187v-4.374c-2.148-.766-2.726-.802-3.027-1.529-.303-.729.083-1.169 1.059-3.223l-3.093-3.093c-2.026.963-2.488 1.364-3.224 1.059-.727-.302-.768-.889-1.527-3.027h-4.375c-.764 2.144-.8 2.725-1.529 3.027-.752.313-1.203-.1-3.223-1.059l-3.093 3.093c.977 2.055 1.362 2.493 1.059 3.224-.302.727-.881.764-3.027 1.528v4.375c2.139.76 2.725.8 3.027 1.528.304.734-.081 1.167-1.059 3.223l3.093 3.093c1.999-.95 2.47-1.373 3.223-1.059.728.302.764.88 1.529 3.027h4.374c.758-2.131.799-2.723 1.537-3.031.745-.308 1.186.099 3.215 1.062l3.093-3.093c-.975-2.05-1.362-2.492-1.059-3.223.3-.726.88-.763 3.027-1.528zm-4.875.764c-.577 1.394-.068 2.458.488 3.578l-1.084 1.084c-1.093-.543-2.161-1.076-3.573-.49-1.396.581-1.79 1.693-2.188 2.877h-1.534c-.398-1.185-.791-2.297-2.183-2.875-1.419-.588-2.507-.045-3.579.488l-1.083-1.084c.557-1.118 1.066-2.18.487-3.58-.579-1.391-1.691-1.784-2.876-2.182v-1.533c1.185-.398 2.297-.791 2.875-2.184.578-1.394.068-2.459-.488-3.579l1.084-1.084c1.082.538 2.162 1.077 3.58.488 1.392-.577 1.785-1.69 2.183-2.875h1.534c.398 1.185.792 2.297 2.184 2.875 1.419.588 2.506.045 3.579-.488l1.084 1.084c-.556 1.121-1.065 2.187-.488 3.58.577 1.391 1.689 1.784 2.875 2.183v1.534c-1.188.398-2.302.791-2.877 2.183zm-7.125-5.951c1.654 0 3 1.346 3 3s-1.346 3-3 3-3-1.346-3-3 1.346-3 3-3zm0-2c-2.762 0-5 2.238-5 5s2.238 5 5 5 5-2.238 5-5-2.238-5-5-5z" />
            </svg>
          </nuxt-link>
        </nav>
      </div>
    </header>
    <nuxt id="main" />
    <footer>
      <!-- Top section of footer: GitHub/install links -->
      <div>
        <div>
          <a href="https://github.com/liyasthomas/postwoman" target="_blank"><img id="imgGitHub" src="~static/icons/github.svg" alt="" :style="logoStyle()">GitHub</a>
        </div>
        <button id="installPWA" @click.prevent="showInstallPrompt()">
          Install PWA
        </button>
      </div>

      <!-- Bottom section of footer: version/author information -->
      <p class="align-center">
        <span v-if="version.name">{{ version.name }}
          <span v-if="version.hash">- {{ version.hash }}</span>
          <span v-if="version.variant"> ({{ version.variant }})</span>
          &#x2022; </span>by <a href="https://liyasthomas.web.app" target="_blank">Liyas Thomas 🦄</a>
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
    margin: 40px auto;
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
        border-radius: 4px;
        margin: auto;
      }

      &:not(.nuxt-link-exact-active):hover:before {
        animation: linkHover 0.3s forwards ease-in-out;
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
          return "margin-right: 16px;" + (((this.$store.state.postwoman.settings.THEME_CLASS || '').includes("light")) ? " filter: invert(100%); -webkit-filter: invert(100%);" : '')
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
        let color = this.$store.state.postwoman.settings.THEME_COLOR || '#51FF0D';
        let vibrant = this.$store.state.postwoman.settings.THEME_COLOR_VIBRANT;
        if (vibrant == null) vibrant = true;
        document.documentElement.style.setProperty('--ac-color', color);
        document.documentElement.style.setProperty('--act-color', vibrant ? '#121212' : '#fff');
      })();
    },

    mounted() {
      // Initializes the PWA code - checks if the app is installed,
      // etc.
      (async () => {
        this.showInstallPrompt = await intializePwa();
      })();
    }
  }

</script>
