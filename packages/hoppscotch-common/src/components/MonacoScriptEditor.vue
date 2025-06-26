<template>
  <vue-monaco-editor
    v-model:value="value"
    :theme="monacoEditorTheme"
    language="typescript"
    :options="MONACO_EDITOR_OPTIONS"
    :model="editorModel"
  />
</template>

<script setup lang="ts">
import { VueMonacoEditor } from "@guolao/vue-monaco-editor"
import { useVModel } from "@vueuse/core"
import * as monaco from "monaco-editor"
import { v4 as uuidv4 } from "uuid"
import { computed, onMounted, onUnmounted, ref } from "vue"

import { useColorMode } from "~/composables/theming"

const props = withDefaults(
  defineProps<{
    modelValue: string
    type: "pre-request" | "post-request"
  }>(),
  {
    modelValue: "",
  }
)

const theme = useColorMode()

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const editorModel = ref<monaco.editor.ITextModel | null>(null)

const MONACO_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
  }

const ensureCompilerOptions = (() => {
  let applied = false

  return () => {
    if (applied) {
      return
    }

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: true,
      noEmit: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
    })

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    // Disable Cmd/Ctrl+Enter key binding
    monaco.editor.addKeybindingRule({
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      command: null,
    })

    applied = true
  }
})()

onMounted(() => {
  ensureCompilerOptions()

  ensureCompilerOptions()

  const uuid = uuidv4()
  const scriptFileURI = monaco.Uri.parse(
    `inmemory://model/${uuid}.${props.type}.ts`
  )

  // Add `export {}` to make it a module and isolate scope
  const modulePrefix = "export {};\n"
  const initialValue = value.value
    ? `${modulePrefix}${value.value}`
    : modulePrefix

  editorModel.value = monaco.editor.createModel(
    initialValue,
    "typescript",
    scriptFileURI
  )
})

const value = computed({
  get: () => {
    const modelValue = props.modelValue
    return modelValue.startsWith("export {};\n")
      ? modelValue.slice(11) // Remove the prefix for display
      : modelValue
  },
  set: (newValue) => {
    // Always ensure the export prefix exists
    const modulePrefix = "export {};\n"
    const finalValue = newValue.startsWith("export {};")
      ? newValue
      : `${modulePrefix}${newValue}`
    emit("update:modelValue", finalValue)
  },
})

onUnmounted(() => {
  editorModel.value?.dispose()
})

const monacoEditorTheme = computed(() =>
  ["dark", "black"].includes(theme.value) ? "vs-dark" : "vs"
)
</script>
