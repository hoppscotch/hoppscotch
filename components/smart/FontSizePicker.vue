<template>
  <span class="inline-flex">
    <span class="select-wrapper">
      <tippy ref="fontSize" interactive trigger="click" theme="popover" arrow>
        <template #trigger>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('settings.change_font_size')"
            class="pr-8"
            icon="format_size"
            outline
            :label="`${fontSizes.find(({ code }) => code == active.code).name}`"
          />
        </template>
        <SmartItem
          v-for="(size, index) in fontSizes"
          :key="`size-${index}`"
          :label="size.name"
          :info-icon="size.code === active.code ? 'done' : ''"
          :active-info-icon="size.code === active.code"
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
    setActiveFont(size: HoppFontSize) {
      document.documentElement.setAttribute("data-font-size", size.code)
      applySetting("FONT_SIZE", size)
    },
  },
})
</script>
