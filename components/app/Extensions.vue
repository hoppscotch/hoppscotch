<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("extensions") }}</h3>
      <div>
        <ButtonSecondary icon="close" @click.native="hideModal" />
      </div>
    </template>
    <template #body>
      <div class="flex flex-col space-y-2 px-2">
        <SmartItem
          to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
          blank
          svg="firefox"
          label="Firefox"
          :info-icon="hasFirefoxExtInstalled ? 'check_circle' : ''"
        />
        <SmartItem
          to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
          blank
          svg="chrome"
          label="Chrome"
          :info-icon="hasChromeExtInstalled ? 'check_circle' : ''"
        />
      </div>
    </template>
    <template #footer>
      <div class="text-secondaryLight text-xs px-2">
        {{ $t("extensions_info1") }}
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
