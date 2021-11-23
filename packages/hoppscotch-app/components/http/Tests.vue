<template>
  <AppSection id="script" :label="`${t('test.script')}`">
    <div
      class="
        bg-primary
        border-dividerLight
        top-upperSecondaryStickyFold
        sticky
        z-10
        flex
        items-center
        justify-between
        flex-1
        pl-4
        border-b
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("test.javascript_code") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/tests"
          blank
          :title="t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="corner-down-left"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          svg="trash-2"
          @click.native="clearContent"
        />
      </div>
    </div>
    <div class="flex border-b border-dividerLight">
      <div class="w-2/3 border-r border-dividerLight">
        <div ref="testScriptEditor"></div>
      </div>
      <div
        class="
          bg-primary
          top-upperTertiaryStickyFold
          min-w-46
          max-w-1/3
          z-9
          sticky
          h-full
          p-4
          overflow-auto
        "
      >
        <div class="pb-2 text-secondaryLight">
          {{ t("helpers.post_request_tests") }}
        </div>
        <SmartAnchor
          :label="`${t('test.learn')}`"
          to="https://docs.hoppscotch.io/features/tests"
          blank
        />
        <h4 class="pt-6 font-bold text-secondaryLight">
          {{ t("test.snippets") }}
        </h4>
        <div class="flex flex-col pt-4">
          <TabSecondary
            v-for="(snippet, index) in testSnippets"
            :key="`snippet-${index}`"
            :label="snippet.name"
            active
            @click.native="useSnippet(snippet.script)"
          />
        </div>
      </div>
    </div>
  </AppSection>
</template>

<script setup lang="ts">
import { reactive, ref } from "@nuxtjs/composition-api"
import { useTestScript } from "~/newstore/RESTSession"
import testSnippets from "~/helpers/testSnippets"
import { useCodemirror } from "~/helpers/editor/codemirror"
import linter from "~/helpers/editor/linting/testScript"
import completer from "~/helpers/editor/completion/testScript"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const testScript = useTestScript()

const testScriptEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  testScriptEditor,
  testScript,
  reactive({
    extendedEditorConfig: {
      mode: "application/javascript",
      lineWrapping: linewrapEnabled,
      placeholder: `${t("test.javascript_code")}`,
    },
    linter,
    completer,
  })
)

const useSnippet = (script: string) => {
  testScript.value += script
}

const clearContent = () => {
  testScript.value = ""
}
</script>
