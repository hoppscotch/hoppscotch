<template>
  <span class="inline-flex">
    <tippy ref="fontSize" interactive trigger="click" theme="popover" arrow>
      <template #trigger>
        <span class="select-wrapper">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('settings.change_font_size')"
            class="pr-8"
            svg="type"
            outline
            :label="`${getFontSizeName(
              fontSizes.find((size) => size == active)
            )}`"
          />
        </span>
      </template>
      <SmartItem
        v-for="(size, index) in fontSizes"
        :key="`size-${index}`"
        :label="`${getFontSizeName(size)}`"
        :info-icon="size === active ? 'done' : ''"
        :active-info-icon="size === active"
        @click.native="
          () => {
            setActiveFont(size)
            $refs.fontSize.tippy().hide()
          }
        "
      />
    </tippy>
  </span>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  HoppFontSizes,
  HoppFontSize,
  applySetting,
  useSetting,
} from "~/newstore/settings"

export default defineComponent({
  setup() {
    return {
      fontSizes: HoppFontSizes,
      active: useSetting("FONT_SIZE"),
    }
  },
  methods: {
    getFontSizeName(size: HoppFontSize) {
      return this.$t(`settings.font_size_${size}`)
    },
    setActiveFont(size: HoppFontSize) {
      document.documentElement.setAttribute("data-font-size", size)
      applySetting("FONT_SIZE", size)
    },
  },
})
</script>
