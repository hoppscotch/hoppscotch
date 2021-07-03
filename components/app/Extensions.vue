<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("extensions") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <p class="info">
        {{ $t("extensions_info1") }}
      </p>
      <div class="px-2">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
          blank
          :title="{ hasFirefoxExtInstalled: $t('installed') }"
          svg="firefox"
          label="Firefox"
        />
      </div>
      <div class="px-2">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
          blank
          :title="{ hasChromeExtInstalled: $t('installed') }"
          svg="chrome"
          label="Chrome"
        />
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
