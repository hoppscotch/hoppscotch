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
import { watchDebounced } from "@vueuse/core"
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

let extraLibRef: monaco.IDisposable | null = null

// Static imports: import X from "URL"
const staticImportRegex =
  /import\s+(?:[\w*\s{},]+?\s+from\s+)?["']([^"']+)["']/g

// Dynamic imports: import("URL")
const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g

const typeDefCache = new Map<string, string>()

const ensureCompilerOptions = (() => {
  let applied = false

  return () => {
    if (applied) {
      return
    }

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      allowJs: true,
      checkJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
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
  extraLibRef?.dispose()
})

watchDebounced(
  () => value.value,
  (newValue) => {
    const found = new Set<string>()

    const staticMatches = newValue.matchAll(staticImportRegex)
    const dynamicMatches = newValue.matchAll(dynamicImportRegex)

    for (const match of staticMatches) found.add(match[1])
    for (const match of dynamicMatches) found.add(match[1])

    found.forEach(resolveAndAddDTS)
  },
  { debounce: 500, immediate: true }
)

const monacoEditorTheme = computed(() =>
  ["dark", "black"].includes(theme.value) ? "vs-dark" : "vs"
)

const resolveAndAddDTS = async (url: string) => {
  // TODO: Define supported CDN URLs
  if (typeDefCache.has(url) || url.includes("?no-dts")) {
    return
  }

  const headResp = await fetch(url, { method: "HEAD" }).catch(() => null)
  const typesHeader = headResp?.headers.get("X-TypeScript-Types")

  let dtsURL: string
  if (typesHeader) {
    dtsURL = new URL(typesHeader, url).href
  } else {
    dtsURL = `${url}.d.ts`
  }

  const dtsResp = await fetch(dtsURL)
  if (!dtsResp.ok) {
    console.warn(`Could not fetch DTS for ${url}`)
    return
  }

  let dtsText = await dtsResp.text()

  // If the file does not contain `declare module "..."`, wrap it!
  // This is necessary for Monaco to associate the types with the module
  if (!/declare\s+module\s+["']/.test(dtsText)) {
    dtsText = `declare module "${url}" {\n${dtsText}\n}`
  }

  typeDefCache.set(url, dtsURL)

  // TODO: Make this a map of disposables to allow for cleanup
  extraLibRef = monaco.languages.typescript.typescriptDefaults.addExtraLib(
    dtsText,
    `inmemory://lib/${encodeURIComponent(url)}.d.ts`
  )
}
</script>
