<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-lowerSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'action.download_file'
          )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
          :icon="downloadIcon"
          @click="downloadResponse"
        />
      </div>
    </div>
    <div class="flex flex-1 items-center justify-center overflow-auto">
      <audio controls :src="audiosrc"></audio>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "@composables/i18n"
import { useDownloadResponse } from "@composables/lens-actions"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { flow, pipe } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { objFieldMatches } from "~/helpers/functional/object"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse & {
    type: "success" | "fail"
  }
}>()

const audiosrc = computed(() =>
  URL.createObjectURL(
    new Blob([props.response.body], {
      type: "audio/mp3",
    })
  )
)

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
  computed(() => props.response.body),
  t("filename.lens", {
    request_name: props.response.req.name,
  })
)

defineActionHandler("response.file.download", () => downloadResponse())
</script>
