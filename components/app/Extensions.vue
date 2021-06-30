<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("extensions") }}</h3>
      <div>
        <button class="icon button" @click="hideModal">
          <i class="material-icons">close</i>
        </button>
      </div>
    </template>
    <template #body>
      <p class="info">
        {{ $t("extensions_info1") }}
      </p>
      <div class="px-2">
        <a
          href="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
          target="_blank"
          rel="noopener"
        >
          <button class="icon button">
            <svg
              class="material-icons"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm8.003 8.657c-1.276-3.321-4.46-4.605-5.534-4.537 3.529 1.376 4.373 6.059 4.06 7.441-.307-1.621-1.286-3.017-1.872-3.385 3.417 8.005-4.835 10.465-7.353 7.687.649.168 1.931.085 2.891-.557.898-.602.983-.638 1.56-.683.686-.053-.041-1.406-1.539-1.177-.616.094-1.632.819-2.88.341-1.508-.576-1.46-2.634.096-2.015.337-.437.088-1.263.088-1.263.452-.414 1.022-.706 1.37-.911.228-.135.829-.507.795-1.23-.123-.096-.32-.219-.766-.193-1.736.11-1.852-.518-1.967-.808.078-.668.524-1.534 1.361-1.931-1.257-.193-2.28.397-2.789 1.154-.809-.174-1.305-.183-2.118-.031-.316-.24-.666-.67-.878-1.181C6.36 3.312 9.027 2 12 2c5.912 0 8.263 4.283 8.003 6.657z"
              />
            </svg>
            <span>Firefox</span>
            <span
              v-if="hasFirefoxExtInstalled"
              v-tooltip="$t('installed')"
              class="icon button"
            >
              <i class="material-icons">done</i>
            </span>
          </button>
        </a>
      </div>
      <div class="px-2">
        <a
          href="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
          target="_blank"
          rel="noopener"
        >
          <button class="icon button">
            <svg
              class="material-icons"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
            >
              <path
                d="M2.897 4.181A11.87 11.87 0 0111.969 0c4.288 0 8.535 2.273 10.717 6.554h-9.293c-1.674.001-2.755-.037-3.926.579-1.376.724-2.415 2.067-2.777 3.644L2.897 4.181zM8.007 12c0 2.2 1.789 3.99 3.988 3.99s3.988-1.79 3.988-3.99-1.789-3.991-3.988-3.991S8.007 9.8 8.007 12zm5.536 5.223c-2.238.666-4.858-.073-6.293-2.549-1.095-1.891-3.989-6.933-5.305-9.225A11.856 11.856 0 000 11.956c0 5.448 3.726 10.65 9.673 11.818l3.87-6.551zm2.158-9.214a5.463 5.463 0 011.007 6.719 1815.43 1815.43 0 01-5.46 9.248C18.437 24.419 24 18.616 24 12.004c0-1.313-.22-2.66-.69-3.995h-7.609z"
              />
            </svg>
            <span>Chrome</span>
            <span
              v-if="hasChromeExtInstalled"
              v-tooltip="$t('installed')"
              class="icon button"
            >
              <i class="material-icons">done</i>
            </span>
          </button>
        </a>
      </div>
    </template>
  </SmartModal>
</template>

<script>
import {
  hasChromeExtensionInstalled,
  hasFirefoxExtensionInstalled,
} from "~/helpers/strategies/ExtensionStrategy"

export default {
  props: {
    show: Boolean,
  },
  data() {
    return {
      hasChromeExtInstalled: hasChromeExtensionInstalled(),
      hasFirefoxExtInstalled: hasFirefoxExtensionInstalled(),
    }
  },
  watch: {
    show() {
      this.hasChromeExtInstalled = hasChromeExtensionInstalled()
      this.hasFirefoxExtInstalled = hasFirefoxExtensionInstalled()
    },
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
