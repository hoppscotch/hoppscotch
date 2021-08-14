<template>
  <AppSection label="preRequest">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-upperSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
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
    <div class="border-b border-dividerLight flex">
      <div class="border-r border-dividerLight w-2/3">
        <SmartJsEditor
          v-model="preRequestScript"
          :options="{
            maxLines: Infinity,
            minLines: 16,
            autoScrollEditorIntoView: true,
            showPrintMargin: false,
            useWorker: false,
          }"
          complete-mode="pre"
        />
      </div>
      <div
        class="
          h-full
          top-upperTertiaryStickyFold
          min-w-46
          max-w-1/3
          p-4
          z-9
          sticky
          overflow-auto
        "
      >
        <div class="text-secondaryLight pb-2">
          {{ $t("helpers.pre_request_script") }}
        </div>
        <SmartAnchor
          class="link"
          :label="$t('action.learn_more')"
          to="https://github.com/hoppscotch/hoppscotch/wiki/Pre-Request-Scripts"
          blank
        />
      </div>
    </div>
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
