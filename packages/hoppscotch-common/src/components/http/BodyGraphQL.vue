<template>
  <div class="flex flex-row">
    <!-- Query Column -->
    <div class="flex-1">
      <label class="font-semibold text-secondaryLight label">
        {{ t("request.query") }}
      </label>
      <div ref="queryEditor" class="editor"></div>
    </div>

    <!-- Variables Column -->
    <div class="flex-1">
      <label class="font-semibold text-secondaryLight label">
        {{ t("request.variables") }}
      </label>
      <div ref="variableEditor" class="editor"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  defineProps,
  defineEmits,
  ref,
  watch,
  reactive,
  onMounted,
  computed,
} from "vue"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { HoppRESTReqBody, ValidContentTypes } from "@hoppscotch/data"
import jsonLinter from "@helpers/editor/linting/json"

type PossibleContentTypes = Exclude<
  ValidContentTypes,
  | "multipart/form-data"
  | "application/x-www-form-urlencoded"
  | "application/octet-stream"
>

type Body = HoppRESTReqBody & { contentType: PossibleContentTypes }

const props = defineProps<{
  modelValue: Body
}>()

const emit = defineEmits<{
  (e: "update:modelValue", val: Body): void
}>()

const body = reactive({
  contentType: props.modelValue.contentType,
  body: props.modelValue.body,
})

const parseInitialBody = () => {
  if (body.body) {
    const parsed = JSON.parse(body.body)
    queryValue.value = parsed.query || ""
    operationName.value = parsed.operationName || ""
    variableValue.value = JSON.stringify(parsed.variables || {})
  }
}

const updateBody = () => {
  const updatedBody = JSON.stringify({
    query: queryValue.value,
    ...(operationName.value ? { operationName: operationName.value } : {}),
    variables: JSON.parse(variableValue.value || "{}"),
  })
  emit("update:modelValue", {
    contentType: body.contentType,
    body: updatedBody,
  })
}

const queryEditor = ref<any | null>(null)
const variableEditor = ref<any | null>(null)
const queryValue = ref<string>("")
const variableValue = ref<any>("")
const operationName = ref<any | null>(null)
const t = useI18n()

const queryOptions = {
  extendedEditorConfig: {
    mode: "graphql",
    placeholder: "Type your query here...",
    readOnly: false,
    lineWrapping: true,
  },
  linter: null,
  completer: null,
  environmentHighlights: true,
  predefinedVariablesHighlights: true,
  additionalExts: [],
}

const variableOptions = {
  extendedEditorConfig: {
    mode: "application/ld+json",
    placeholder: "Type your variables here...",
    readOnly: false,
    lineWrapping: true,
  },
  linter: computed(() => (variableValue.value.length > 0 ? jsonLinter : null)),
  completer: null,
  environmentHighlights: true,
  predefinedVariablesHighlights: true,
  additionalExts: [],
  onChange: (value: string) => {
    if (value.length) {
      try {
        const jsonObj = JSON.parse(value)
        variableValue.value = JSON.stringify(jsonObj, null, 2)
      } catch (e) {
        console.log("Error while updating variables:", e)
      }
    }
  },
}

onMounted(() => {
  parseInitialBody()
})

useCodemirror(queryEditor, queryValue, reactive(queryOptions))
useCodemirror(variableEditor, variableValue, reactive(variableOptions))

watch([queryValue, variableValue], () => {
  try {
    updateBody()
  } catch (err) {
    console.log("err", err)
  }
})
</script>

<style scoped>
.editor {
  height: 400px;
  border: 1px solid var(--divider-light-color);
}
.label {
  display: block;
  padding: 0.5rem;
  border-right: 1px solid var(--divider-light-color);
}
</style>
