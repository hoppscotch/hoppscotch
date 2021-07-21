<template>
  <AppSection label="postRequestTests">
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-110px
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-xs">
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
        maxLines: '16',
        minLines: '8',
        fontSize: '14px',
        autoScrollEditorIntoView: true,
        showPrintMargin: false,
        useWorker: false,
      }"
      complete-mode="test"
    />
    <div v-if="testReports.length !== 0">
      <div class="flex flex-1 pl-4 items-center justify-between">
        <label class="font-semibold text-xs"> Test Reports </label>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent('tests', $event)"
        />
      </div>
      <div
        v-for="(testReport, index) in testReports"
        :key="`testReport-${index}`"
        class="px-4"
      >
        <div v-if="testReport.startBlock">
          <hr />
          <h4 class="heading">
            {{ testReport.startBlock }}
          </h4>
        </div>
        <p
          v-else-if="testReport.result"
          class="flex font-mono flex-1 text-xs info"
        >
          <span :class="testReport.styles.class" class="flex items-center">
            <i class="text-sm material-icons">
              {{ testReport.styles.icon }}
            </i>
            <span>&nbsp;{{ testReport.result }}</span>
            <span v-if="testReport.message">
              <label>: {{ testReport.message }}</label>
            </span>
          </span>
        </p>
        <div v-else-if="testReport.endBlock"><hr /></div>
      </div>
    </div>
  </AppSection>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { useTestScript } from "~/newstore/RESTSession"

export default defineComponent({
  setup() {
    return {
      testScript: useTestScript(),
      testReports: [],
    }
  },
})
</script>
