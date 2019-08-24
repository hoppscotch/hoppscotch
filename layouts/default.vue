<template>
  <div>
    <header>
      <div class="slide-in">
        <nuxt-link to="/">
          <h1 class="logo"><img src="~static/icons/logo.svg" alt="" style="height: 24px; margin-right: 16px">Postwoman</h1>
        </nuxt-link>
        <h3>Lightweight API request builder</h3>
      </div>

      <nav>
        <nuxt-link to="/">HTTP</nuxt-link>
        <nuxt-link to="/websocket">WebSocket</nuxt-link>
      </nav>
    </header>

    <nuxt id="main" />

    <footer>
      <a href="https://github.com/liyasthomas/postwoman" target="_blank"><img src="~static/icons/github.svg" alt="" style="margin-right: 16px">GitHub</a>
      <button id="installPWA" @click.prevent="showInstallPrompt()">
        Install PWA
      </button>
    </footer>
  </div>
</template>

<style lang="scss">
  .slide-in {
    position: relative;
    animation: slideIn 0.4s forwards ease-in-out;
  }

  @keyframes slideIn {
    0% {
      opacity: 0;
      left: -30px;
    }
    100% {
      opacity: 1;
      left: 0px;
    }
  }

  header, #main, footer {
    margin: 0 auto;
    max-width: 1200px;
  }

  header { padding-right: 0; }

  nav {
    a {
      display: inline-block;
      position: relative;
      padding: 8px 16px;

      &.nuxt-link-exact-active {
        color: black;
        &:before { width: 100%; height: 100% }
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
        0% { width: 0; height: 2px; }
        100% { width: 100%; height: 2px; }
      }
    }
  }
</style>

<script>
  import intializePwa from '../assets/js/pwa';

  export default {
    data () {
      return {
        // Once the PWA code is initialized, this holds a method
        // that can be called to show the user the installation
        // prompt.
        showInstallPrompt: null
      }
    },

    mounted () {
      // Initializes the PWA code - checks if the app is installed,
      // etc.
      (async () => {
        this.showInstallPrompt = await intializePwa();
      })();
    }
  }
</script>
