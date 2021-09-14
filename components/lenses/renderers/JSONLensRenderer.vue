<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-lowerSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">{{
        $t("response.body")
      }}</label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="corner-down-left"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.download_file')"
          :svg="downloadIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="copyResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.copy')"
          :svg="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div ref="jsonResponse"></div>
    <div
      v-if="outlinePath"
      class="
        h-32
        bg-primaryLight
        border-t border-dividerLight
        flex flex-nowrap flex-1
        py-2
        px-4
        bottom-0
        z-10
        sticky
        overflow-auto
        hide-scrollbar
      "
    >
      <div v-for="(item, index) in outlinePath" :key="`item-${index}`">
        <tippy ref="options" interactive trigger="click" theme="popover" arrow>
          <template #trigger>
            <ButtonSecondary
              v-if="item.kind === 'RootObject'"
              :label="item.kind"
            />
            <ButtonSecondary
              v-if="item.kind === 'RootArray'"
              :label="item.kind"
            />
            <ButtonSecondary
              v-if="item.kind === 'ArrayMember'"
              :label="item.index.toString()"
            />
            <ButtonSecondary
              v-if="item.kind === 'ObjectMember'"
              :label="item.name"
            />
          </template>
          <div
            v-if="item.kind === 'ArrayMember' || item.kind === 'ObjectMember'"
          >
            <div v-if="item.kind === 'ArrayMember'">
              <ButtonSecondary
                v-for="(ast, astIndex) in item.astParent.values"
                :key="`ast-${astIndex}`"
                :label="astIndex.toString()"
                @click.native="jumpCursor(ast)"
              />
            </div>
            <div v-if="item.kind === 'ObjectMember'">
              <ButtonSecondary
                v-for="(ast, astIndex) in item.astParent.members"
                :key="`ast-${astIndex}`"
                :label="ast.key.value"
                @click.native="jumpCursor(ast)"
              />
            </div>
          </div>
        </tippy>
        <i v-if="index + 1 !== outlinePath.length" class="mx-2 material-icons"
          >chevron_right</i
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  ref,
  watchEffect,
  useContext,
  reactive,
} from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import "codemirror/mode/javascript/javascript"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import jsonParse, { JSONObjectMember, JSONValue } from "~/helpers/jsonParse"
import { getJSONOutlineAtPos } from "~/helpers/newOutline"
import {
  convertIndexToLineCh,
  convertLineChToIndex,
} from "~/helpers/editor/utils"

const props = defineProps<{
  response: HoppRESTResponse
}>()

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

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
  })
)

const jumpCursor = (ast: JSONValue | JSONObjectMember) => {
  console.log(jsonBodyText.value)
  console.log(ast.start)
  console.log(convertIndexToLineCh(jsonBodyText.value, ast.start))
  cursor.value = convertIndexToLineCh(jsonBodyText.value, ast.start)
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
  $toast.success(t("state.download_started").toString(), {
    icon: "downloading",
  })
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

watchEffect(() => {
  console.log(outlinePath.value)
})

const copyResponse = () => {
  copyToClipboard(responseBodyText.value)
  copyIcon.value = "check"
  $toast.success(t("state.copied_to_clipboard").toString(), {
    icon: "content_paste",
  })
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}
</script>
