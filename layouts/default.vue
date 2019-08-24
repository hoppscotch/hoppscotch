<template>
  <div>
    <header>
      <div class="slide-in">
        <nuxt-link to="/">
          <h1 class="logo"><img src="~static/icons/logo.svg" alt="" style="height: 24px; margin-right: 16px">Postwoman</h1>
        </nuxt-link>
        <h3>Lightweight API request builder</h3>
      </div>
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
</style>

<script>
  import intializePwa from '../assets/js/pwa';

  export default {
    data () {
      return {
        showInstallPrompt: null
      }
    },

    mounted () {
      (async () => {
        this.showInstallPrompt = await intializePwa();
      })();
    }
  }
</script>
