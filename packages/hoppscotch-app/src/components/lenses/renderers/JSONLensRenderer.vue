<template>
  <div
    v-if="response.type === 'success' || response.type === 'fail'"
    class="flex flex-col flex-1"
  >
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex items-center">
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
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.filter_response')"
          :icon="IconFilter"
          :class="{ '!text-accent': toggleFilter }"
          @click.prevent="toggleFilterState"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :icon="downloadIcon"
          @click="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :icon="copyIcon"
          @click="copyResponse"
        />
      </div>
    </div>
    <div
      v-if="toggleFilter"
      class="sticky z-10 flex border-b bg-primary top-lowerTertiaryStickyFold border-dividerLight"
    >
      <div
        class="inline-flex items-center flex-1 bg-primaryLight border-divider text-secondaryDark"
      >
        <span class="inline-flex items-center flex-1 px-4">
          <icon-lucide-search class="w-4 h-4 text-secondaryLight" />
          <input
            v-model="filterQueryText"
            v-focus
            class="input !border-0 !px-2"
            :placeholder="`${t('response.filter_response_body')}`"
            type="text"
          />
        </span>
        <div
          v-if="filterResponseError"
          class="flex items-center justify-center px-2 py-1 rounded text-tiny text-accentContrast"
          :class="{
            'bg-red-500':
              filterResponseError.type === 'JSON_PARSE_FAILED' ||
              filterResponseError.type === 'JSON_PATH_QUERY_ERROR',
            'bg-amber-500': filterResponseError.type === 'RESPONSE_EMPTY',
          }"
        >
          <icon-lucide-info class="svg-icons mr-1.5" />
          <span>{{ filterResponseError.error }}</span>
        </div>
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
          to="https://github.com/JSONPath-Plus/JSONPath"
          blank
        />
      </div>
    </div>
    <div ref="jsonResponse" class="flex flex-col flex-1 h-auto h-full"></div>
    <div
      v-if="outlinePath"
      class="sticky bottom-0 z-10 flex px-2 overflow-auto border-t bg-primaryLight border-dividerLight flex-nowrap"
    >
      <div
        v-for="(item, index) in outlinePath"
        :key="`item-${index}`"
        class="flex items-center"
      >
        <tippy
          ref="outlineOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <div v-if="item.kind === 'RootObject'" class="outline-item">{}</div>
          <div v-if="item.kind === 'RootArray'" class="outline-item">[]</div>
          <div v-if="item.kind === 'ArrayMember'" class="outline-item">
            {{ item.index }}
          </div>
          <div v-if="item.kind === 'ObjectMember'" class="outline-item">
            {{ item.name }}
          </div>
          <template #content="{ hide }">
            <div
              v-if="item.kind === 'ArrayMember' || item.kind === 'ObjectMember'"
            >
              <div
                v-if="item.kind === 'ArrayMember'"
                class="flex flex-col"
                tabindex="0"
                role="menu"
                @keyup.escape="hide()"
              >
                <SmartItem
                  v-for="(arrayMember, astIndex) in item.astParent.values"
                  :key="`ast-${astIndex}`"
                  :label="`${astIndex}`"
                  @click="
                    () => {
                      jumpCursor(arrayMember)
                      hide()
                    }
                  "
                />
              </div>
              <div
                v-if="item.kind === 'ObjectMember'"
                class="flex flex-col"
                tabindex="0"
                role="menu"
                @keyup.escape="hide()"
              >
                <SmartItem
                  v-for="(objectMember, astIndex) in item.astParent.members"
                  :key="`ast-${astIndex}`"
                  :label="objectMember.key.value"
                  @click="
                    () => {
                      jumpCursor(objectMember)
                      hide()
                    }
                  "
                />
              </div>
            </div>
            <div
              v-if="item.kind === 'RootObject'"
              class="flex flex-col"
              role="menu"
            >
              <SmartItem
                label="{}"
                @click="
                  () => {
                    jumpCursor(item.astValue)
                    hide()
                  }
                "
              />
            </div>
            <div
              v-if="item.kind === 'RootArray'"
              class="flex flex-col"
              role="menu"
            >
              <SmartItem
                label="[]"
                @click="
                  () => {
                    jumpCursor(item.astValue)
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
        <icon-lucide-chevron-right
          v-if="index + 1 !== outlinePath.length"
          class="opacity-50 text-secondaryLight svg-icons"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconFilter from "~icons/lucide/filter"
import IconHelpCircle from "~icons/lucide/help-circle"
import * as LJSON from "lossless-json"
import * as O from "fp-ts/Option"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { computed, ref, reactive } from "vue"
import { JSONPath } from "jsonpath-plus"
import { useCodemirror } from "@composables/codemirror"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import jsonParse, { JSONObjectMember, JSONValue } from "~/helpers/jsonParse"
import { getJSONOutlineAtPos } from "~/helpers/newOutline"
import {
  convertIndexToLineCh,
  convertLineChToIndex,
} from "~/helpers/editor/utils"
import { useI18n } from "@composables/i18n"
import {
  useCopyResponse,
  useResponseBody,
  useDownloadResponse,
} from "@composables/lens-actions"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const { responseBodyText } = useResponseBody(props.response)

const toggleFilter = ref(false)
const filterQueryText = ref("")

type BodyParseError =
  | { type: "JSON_PARSE_FAILED" }
  | { type: "JSON_PATH_QUERY_FAILED"; error: Error }

const responseJsonObject = computed(() =>
  pipe(
    responseBodyText.value,
    E.tryCatchK(
      LJSON.parse,
      (): BodyParseError => ({ type: "JSON_PARSE_FAILED" })
    )
  )
)

const jsonResponseBodyText = computed(() => {
  if (filterQueryText.value.length > 0) {
    return pipe(
      responseJsonObject.value,
      E.chain((parsedJSON) =>
        E.tryCatch(
          () =>
            JSONPath({
              path: filterQueryText.value,
              json: parsedJSON,
            }) as undefined,
          (err): BodyParseError => ({
            type: "JSON_PATH_QUERY_FAILED",
            error: err as Error,
          })
        )
      ),
      E.map(JSON.stringify)
    )
  } else {
    return E.right(responseBodyText.value)
  }
})

const jsonBodyText = computed(() =>
  pipe(
    jsonResponseBodyText.value,
    E.getOrElse(() => responseBodyText.value),
    O.tryCatchK(LJSON.parse),
    O.map((val) => LJSON.stringify(val, undefined, 2)),
    O.getOrElse(() => responseBodyText.value)
  )
)

const ast = computed(() =>
  pipe(
    jsonBodyText.value,
    O.tryCatchK(jsonParse),
    O.getOrElseW(() => null)
  )
)

const filterResponseError = computed(() =>
  pipe(
    jsonResponseBodyText.value,
    E.match(
      (e) => {
        switch (e.type) {
          case "JSON_PATH_QUERY_FAILED":
            return { type: "JSON_PATH_QUERY_ERROR", error: e.error.message }
          case "JSON_PARSE_FAILED":
            return {
              type: "JSON_PARSE_FAILED",
              error: t("error.json_parsing_failed").toString(),
            }
        }
      },
      (result) =>
        result === "[]"
          ? {
              type: "RESPONSE_EMPTY",
              error: t("error.no_results_found").toString(),
            }
          : undefined
    )
  )
)

const { copyIcon, copyResponse } = useCopyResponse(jsonBodyText)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  jsonBodyText
)

const outlineOptions = ref<any | null>(null)
const jsonResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

const { cursor } = useCodemirror(
  jsonResponse,
  jsonBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

const jumpCursor = (ast: JSONValue | JSONObjectMember) => {
  const pos = convertIndexToLineCh(jsonBodyText.value, ast.start)
  pos.line--
  cursor.value = pos
}

const outlinePath = computed(() =>
  pipe(
    ast.value,
    O.fromNullable,
    O.map((ast) =>
      getJSONOutlineAtPos(
        ast,
        convertLineChToIndex(jsonBodyText.value, cursor.value)
      )
    ),
    O.getOrElseW(() => null)
  )
)

const toggleFilterState = () => {
  filterQueryText.value = ""
  toggleFilter.value = !toggleFilter.value
}
</script>

<style lang="scss" scoped>
.outline-item {
  @apply cursor-pointer;
  @apply flex-grow-0 flex-shrink-0;
  @apply text-secondaryLight;
  @apply inline-flex;
  @apply items-center;
  @apply px-2;
  @apply py-1;
  @apply transition;
  @apply hover: text-secondary;
}
</style>
