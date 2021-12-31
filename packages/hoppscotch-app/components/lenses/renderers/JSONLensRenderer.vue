<template>
  <div>
    <div
      class="bg-primary border-b border-dividerLight flex top-lowerSecondaryStickyFold pl-4 z-10 sticky items-center justify-between"
    >
      <label class="font-semibold text-secondaryLight">{{
        t("response.body")
      }}</label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="wrap-text"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :svg="downloadIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="copyResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :svg="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div ref="jsonResponse"></div>
    <div
      v-if="outlinePath"
      class="bg-primaryLight border-t border-dividerLight flex flex-nowrap flex-1 px-2 bottom-0 z-10 sticky overflow-auto hide-scrollbar"
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
          <template #trigger>
            <div v-if="item.kind === 'RootObject'" class="outline">{}</div>
            <div v-if="item.kind === 'RootArray'" class="outline">[]</div>
            <div v-if="item.kind === 'ArrayMember'" class="outline">
              {{ item.index }}
            </div>
            <div v-if="item.kind === 'ObjectMember'" class="outline">
              {{ item.name }}
            </div>
          </template>
          <div
            v-if="item.kind === 'ArrayMember' || item.kind === 'ObjectMember'"
          >
            <div v-if="item.kind === 'ArrayMember'" class="flex flex-col">
              <SmartItem
                v-for="(arrayMember, astIndex) in item.astParent.values"
                :key="`ast-${astIndex}`"
                :label="`${astIndex}`"
                @click.native="
                  () => {
                    jumpCursor(arrayMember)
                    outlineOptions[index].tippy().hide()
                  }
                "
              />
            </div>
            <div v-if="item.kind === 'ObjectMember'" class="flex flex-col">
              <SmartItem
                v-for="(objectMember, astIndex) in item.astParent.members"
                :key="`ast-${astIndex}`"
                :label="objectMember.key.value"
                @click.native="
                  () => {
                    jumpCursor(objectMember)
                    outlineOptions[index].tippy().hide()
                  }
                "
              />
            </div>
          </div>
          <div v-if="item.kind === 'RootObject'" class="flex flex-col">
            <SmartItem
              label="{}"
              @click.native="
                () => {
                  jumpCursor(item.astValue)
                  outlineOptions[index].tippy().hide()
                }
              "
            />
          </div>
          <div v-if="item.kind === 'RootArray'" class="flex flex-col">
            <SmartItem
              label="[]"
              @click.native="
                () => {
                  jumpCursor(item.astValue)
                  outlineOptions[index].tippy().hide()
                }
              "
            />
          </div>
        </tippy>
        <i
          v-if="index + 1 !== outlinePath.length"
          class="text-secondaryLight opacity-50 material-icons"
          >chevron_right</i
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import jsonParse, { JSONObjectMember, JSONValue } from "~/helpers/jsonParse"
import { getJSONOutlineAtPos } from "~/helpers/newOutline"
import {
  convertIndexToLineCh,
  convertLineChToIndex,
} from "~/helpers/editor/utils"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const toast = useToast()

const responseBodyText = computed(() => {
  if (
    props.response.type === "loading" ||
    props.response.type === "network_fail"
  )
    return ""
  if (typeof props.response.body === "string") return props.response.body
  else {
    const res = new TextDecoder("utf-8").decode(props.response.body)
    // HACK: Temporary trailing null character issue from the extension fix
    return res.replace(/\0+$/, "")
  }
})

const downloadIcon = ref("download")
const copyIcon = ref("copy")

const jsonBodyText = computed(() => {
  try {
    return JSON.stringify(JSON.parse(responseBodyText.value), null, 2)
  } catch (e) {
    // Most probs invalid JSON was returned, so drop prettification (should we warn ?)
    return responseBodyText.value
  }
})

const ast = computed(() => {
  try {
    return jsonParse(jsonBodyText.value)
  } catch (_: any) {
    return null
  }
})

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

const downloadResponse = () => {
  const dataToWrite = responseBodyText.value
  const file = new Blob([dataToWrite], { type: "application/json" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url
  // TODO get uri from meta
  a.download = `${url.split("/").pop().split("#")[0].split("?")[0]}`
  document.body.appendChild(a)
  a.click()
  downloadIcon.value = "check"
  toast.success(`${t("state.download_started")}`)
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadIcon.value = "download"
  }, 1000)
}

const outlinePath = computed(() => {
  if (ast.value) {
    return getJSONOutlineAtPos(
      ast.value,
      convertLineChToIndex(jsonBodyText.value, cursor.value)
    )
  } else return null
})

const copyResponse = () => {
  copyToClipboard(responseBodyText.value)
  copyIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}
</script>

<style lang="scss" scoped>
.outline {
  @apply cursor-pointer;
  @apply flex-grow-0 flex-shrink-0;
  @apply text-secondaryLight;
  @apply inline-flex;
  @apply items-center;
  @apply px-2;
  @apply py-1;
  @apply transition;
  @apply hover:text-secondary;
}
</style>
