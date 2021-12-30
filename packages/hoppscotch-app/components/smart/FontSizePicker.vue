<template>
  <span class="inline-flex">
    <tippy ref="fontSize" interactive trigger="click" theme="popover" arrow>
      <template #trigger>
        <span class="select-wrapper">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('settings.change_font_size')"
            class="pr-8"
            svg="type"
            outline
            :label="`${getFontSizeName(
              fontSizes.find((size) => size === active)
            )}`"
          />
        </span>
      </template>
      <SmartItem
        v-for="(size, index) in fontSizes"
        :key="`size-${index}`"
        :label="`${getFontSizeName(size)}`"
        :icon="
          size === active ? 'radio_button_checked' : 'radio_button_unchecked'
        "
        :active="size === active"
        @click.native="
          () => {
            setActiveFont(size)
            fontSize.tippy().hide()
          }
        "
      />
    </tippy>
  </span>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import {
  HoppFontSizes,
  HoppFontSize,
  applySetting,
  useSetting,
} from "~/newstore/settings"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const fontSizes = HoppFontSizes
const active = useSetting("FONT_SIZE")
const fontSize = ref<any | null>(null)

const getFontSizeName = (size: HoppFontSize) => {
  return t(`settings.font_size_${size}`)
}

const setActiveFont = (size: HoppFontSize) => {
  document.documentElement.setAttribute("data-font-size", size)
  applySetting("FONT_SIZE", size)
}
</script>
