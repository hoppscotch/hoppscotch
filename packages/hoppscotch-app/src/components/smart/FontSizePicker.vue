<template>
  <span class="inline-flex">
    <tippy interactive trigger="click" theme="popover" arrow>
        <span class="select-wrapper">
          <SmartItem
            v-tippy="{ theme: 'tooltip' }"
            :title="t('settings.change_font_size')"
            :svg="IconType"
            :info-icon="IconChevronDown"
            outline
            :label="`${getFontSizeName(
              fontSizes.find((size) => size === active)
            )}`"
          />
        </span>
      <template #content="{ hide }">
        <div class="flex flex-col" role="menu">
          <SmartItem
            v-for="(size, index) in fontSizes"
            :key="`size-${index}`"
            :label="`${getFontSizeName(size)}`"
            :icon="
              size === active ? IconRadioChecked : IconRadioUnchecked
            "
            :active="size === active"
            @click.native="
              () => {
                setActiveFont(size)
                hide()
              }
            "
          />
        </div>
      </template>
    </tippy>
  </span>
</template>

<script setup lang="ts">
import { ref } from "vue"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconRadioChecked from "~icons/ic/sharp-radio-button-checked"
import IconRadioUnchecked from "~icons/ic/sharp-radio-button-unchecked"
import IconType from "~icons/lucide/type"
import {
  HoppFontSizes,
  HoppFontSize,
  applySetting
} from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const fontSizes = HoppFontSizes
const active = useSetting("FONT_SIZE")
const fontSize = ref<any | null>(null)

const getFontSizeName = (size: HoppFontSize) => {
  return t(`settings.font_size_${size}`)
}

const setActiveFont = (size: HoppFontSize) => {
  applySetting("FONT_SIZE", size)
}
</script>
