<template>
  <vue-monaco-editor
    v-model:value="value"
    :theme="monacoEditorTheme"
    language="typescript"
    :options="MONACO_EDITOR_OPTIONS"
    :model="editorModel"
    @mounted="onEditorMounted"
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

const value = useVModel(props, "modelValue")
const theme = useColorMode()

const editorModel = ref<monaco.editor.ITextModel | null>(null)
let extraLibRef: monaco.IDisposable | null = null

const MONACO_EDITOR_OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions =
  {
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
  }

const ensureCompilerOptions = (() => {
  let applied = false
  return () => {
    if (applied) return
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      typeRoots: ["node_modules/@types"],
    })
    applied = true
  }
})()

const getLibDefs = (type: "pre-request" | "post-request") => {
  if (type === "pre-request") {
    return `
      declare const pw: {
        env: {
          get(key: string): string
          set(key: string, value: string): void
          unset(key: string): void
          getResolve(key: string): string
          resolve(value: string): string
        }
      }
    `
  }

  return `
  declare namespace pw {
    function test(name: string, func: () => void): void
    function expect(value: any): Expectation

    const response: {
      status: number
      headers: any
      body: any
    }

    namespace env {
      function set(key: string, value: string): void
      function unset(key: string): void
      function get(key: string): string
      function getResolve(key: string): string
      function resolve(value: string): string
    }
  }

  interface Expectation extends ExpectationMethods {
    not: BaseExpectation
  }

  interface BaseExpectation extends ExpectationMethods {}

  interface ExpectationMethods {
    toBe(value: any): void
    toBeLevel2xx(): void
    toBeLevel3xx(): void
    toBeLevel4xx(): void
    toBeLevel5xx(): void
    toBeType(type: string): void
    toHaveLength(length: number): void
    toInclude(value: any): void
  }
  `
}

onMounted(() => {
  ensureCompilerOptions()

  const uuid = uuidv4()
  const scriptFileURI = monaco.Uri.parse(`inmemory://model/${uuid}.ts`)
  const libFileURI = `inmemory://model/${uuid}/script-defs.d.ts`

  editorModel.value = monaco.editor.createModel(
    value.value,
    "typescript",
    scriptFileURI
  )

  extraLibRef = monaco.languages.typescript.typescriptDefaults.addExtraLib(
    getLibDefs(props.type),
    libFileURI
  )
})

onUnmounted(() => {
  editorModel.value?.dispose()
  extraLibRef?.dispose()
})

const monacoEditorTheme = computed(() =>
  ["dark", "black"].includes(theme.value) ? "vs-dark" : "vs"
)

const onEditorMounted = (editor: monaco.editor.IStandaloneCodeEditor) => {
  const model = editor.getModel()
  if (!model) {
    return
  }

  editor.onDidChangeModelContent(() => {
    const value = model.getValue()
    // ...
  })
}
</script>
