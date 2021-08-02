<template>
  <AppSection label="preRequest">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-24
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold">
        {{ $t("javascript_code") }}
      </label>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        to="https://github.com/hoppscotch/hoppscotch/wiki/Pre-Request-Scripts"
        blank
        :title="$t('wiki')"
        icon="help_outline"
      />
    </div>
    <SmartJsEditor
      v-model="preRequestScript"
      :options="{
        maxLines: Infinity,
        minLines: 16,
        fontSize: '12px',
        autoScrollEditorIntoView: true,
        showPrintMargin: false,
        useWorker: false,
      }"
      complete-mode="pre"
    />
  </AppSection>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { usePreRequestScript } from "~/newstore/RESTSession"

export default defineComponent({
  setup() {
    return {
      preRequestScript: usePreRequestScript(),
    }
  },
})
</script>
