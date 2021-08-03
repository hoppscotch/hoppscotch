<template>
  <span class="inline-flex">
    <span class="select-wrapper">
      <tippy
        ref="fontSize"
        interactive
        tabindex="-1"
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('settings.change_font_size')"
            class="pr-8"
            outline
            :label="`${fontSizes.find(({ code }) => code == active.code).name}`"
          />
        </template>
        <!-- text-xs -->
        <!-- text-sm -->
        <!-- text-base -->
        <SmartItem
          v-for="(size, index) in fontSizes"
          :key="`size-${index}`"
          :class="`text-${size.code}`"
          :label="size.name"
          @click.native="
            setActiveFont(size)
            $refs.fontSize.tippy().hide()
          "
        />
      </tippy>
    </span>
  </span>
</template>

<script lang="ts">
import Vue from "vue"
import {
  HoppFontSizes,
  getSettingSubject,
  HoppFontSize,
  settingsStore,
  applySetting,
} from "~/newstore/settings"

export default Vue.extend({
  data() {
    return {
      fontSizes: HoppFontSizes,
      active: settingsStore.value.FONT_SIZE,
    }
  },
  subscriptions() {
    return {
      active: getSettingSubject("FONT_SIZE"),
    }
  },
  methods: {
    setActiveFont(size: HoppFontSize) {
      document.documentElement.setAttribute("data-font-size", size.code)
      applySetting("FONT_SIZE", size)
    },
  },
})
</script>
