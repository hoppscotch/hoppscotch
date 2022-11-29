<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'action.download_file'
          )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
          :icon="downloadIcon"
          @click="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'action.copy'
          )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
          :icon="copyIcon"
          @click="copyResponse"
        />
      </div>
    </div>
    <div ref="xmlResponse" class="flex flex-col flex-1"></div>
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import { computed, ref, reactive } from "vue"
import { flow, pipe } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { useCodemirror } from "@composables/codemirror"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n } from "@composables/i18n"
import {
  useResponseBody,
  useDownloadResponse,
  useCopyResponse,
} from "@composables/lens-actions"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { objFieldMatches } from "~/helpers/functional/object"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse & { type: "success" | "fail" }
}>()

const { responseBodyText } = useResponseBody(props.response)

const responseType = computed(() =>
  pipe(
    props.response,
    O.fromPredicate(objFieldMatches("type", ["fail", "success"] as const)),
    O.chain(
      // Try getting content-type
      flow(
        (res) => res.headers,
        A.findFirst((h) => h.key.toLowerCase() === "content-type"),
        O.map(flow((h) => h.value, S.split(";"), RNEA.head, S.toLowerCase))
      )
    ),
    O.getOrElse(() => "text/plain")
  )
)

const { downloadIcon, downloadResponse } = useDownloadResponse(
  responseType.value,
  responseBodyText
)

const { copyIcon, copyResponse } = useCopyResponse(responseBodyText)

const xmlResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  xmlResponse,
  responseBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "application/xml",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

defineActionHandler("response.file.download", () => downloadResponse())
defineActionHandler("response.copy", () => copyResponse())
</script>
