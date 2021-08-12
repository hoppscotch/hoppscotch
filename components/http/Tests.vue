<template>
  <AppSection id="script" :label="$t('test.script')">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-upperSecondaryStickyFold
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
        to="https://github.com/hoppscotch/hoppscotch/wiki/Post-Request-Tests"
        blank
        :title="$t('wiki')"
        icon="help_outline"
      />
    </div>
    <SmartJsEditor
      v-model="testScript"
      :options="{
        maxLines: Infinity,
        minLines: 16,
        fontSize: '12px',
        autoScrollEditorIntoView: true,
        showPrintMargin: false,
        useWorker: false,
      }"
      complete-mode="test"
    />
  </AppSection>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { useTestScript } from "~/newstore/RESTSession"

export default defineComponent({
  setup() {
    return {
      testScript: useTestScript(),
    }
  },
})
</script>
