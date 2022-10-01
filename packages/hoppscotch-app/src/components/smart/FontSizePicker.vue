<template>
  <span class="inline-flex">
    <tippy
      interactive
      trigger="click"
      theme="popover"
      :on-shown="() => tippyActions.focus()"
    >
      <span class="select-wrapper">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('settings.change_font_size')"
          class="pr-8"
          :icon="IconType"
          outline
          :label="`${getFontSizeName(
            fontSizes.find((size) => size === active)
          )}`"
        />
      </span>
      <template #content="{ hide }">
        <div
          ref="tippyActions"
          class="flex flex-col focus:outline-none"
          tabindex="0"
          @keyup.escape="hide()"
        >
          <SmartItem
            v-for="(size, index) in fontSizes"
            :key="`size-${index}`"
            :label="`${getFontSizeName(size)}`"
            :icon="size === active ? IconCircleDot : IconCircle"
            :active="size === active"
            @click="
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
import IconCircleDot from "~icons/lucide/circle-dot"
import IconCircle from "~icons/lucide/circle"
import IconType from "~icons/lucide/type"
import { HoppFontSizes, HoppFontSize, applySetting } from "~/newstore/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"
import { ref } from "vue"

const t = useI18n()

const fontSizes = HoppFontSizes
const active = useSetting("FONT_SIZE")

const getFontSizeName = (size: HoppFontSize) => {
  return t(`settings.font_size_${size}`)
}

const setActiveFont = (size: HoppFontSize) => {
  applySetting("FONT_SIZE", size)
}

// Template refs
const tippyActions = ref<any | null>(null)
</script>
