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
import { computed, onMounted, ref } from "vue"

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

const MONACO_EDITOR_OPTIONS: Readonly<monaco.editor.IStandaloneEditorConstructionOptions> =
  {
    automaticLayout: true,
    formatOnType: true,
    formatOnPaste: true,
  }

// Static imports: import X from "URL"
const staticImportRegex =
  /import\s+(?:[\w*\s{},]+?\s+from\s+)?["']([^"']+)["']/g

// Dynamic imports: import("URL")
const dynamicImportRegex = /import\(\s*["']([^"']+)["']\s*\)/g

const typeDefCache = new Map<string, string>()

const extraLibRefs = new Map<string, monaco.IDisposable>()

const MODULE_PREFIX = "export {};\n" as const

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
  const initialValue = value.value
    ? `${MODULE_PREFIX}${value.value}`
    : MODULE_PREFIX

  editorModel.value = monaco.editor.createModel(
    initialValue,
    "typescript",
    scriptFileURI
  )
})

const value = computed({
  get: () => {
    const modelValue = props.modelValue
    return modelValue.startsWith(MODULE_PREFIX)
      ? modelValue.slice(MODULE_PREFIX.length) // Remove the prefix for display
      : modelValue
  },
  set: (newValue) => {
    // Always ensure the export prefix exists
    const finalValue = newValue.startsWith(MODULE_PREFIX.trim())
      ? newValue
      : `${MODULE_PREFIX}${newValue}`
    emit("update:modelValue", finalValue)
  },
})

const resolveAndAddDTS = async (url: string) => {
  if (
    typeDefCache.has(url) ||
    url.includes("?no-dts") ||
    !url.includes("esm.sh")
  ) {
    return
  }

  const headResp = await fetch(url, { method: "HEAD" }).catch(() => null)
  const typesHeader = headResp?.headers.get("X-TypeScript-Types")
  const dtsURL = typesHeader ? new URL(typesHeader, url).href : `${url}.d.ts`

  const dtsResp = await fetch(dtsURL).catch(() => null)
  if (!dtsResp?.ok) {
    return
  }

  let dtsText = await dtsResp.text()

  if (!/declare\s+module\s+["']/.test(dtsText)) {
    dtsText = `declare module "${url}" {\n${dtsText}\n}`
  }

  typeDefCache.set(url, dtsURL)

  const libUri = `inmemory://lib/${encodeURIComponent(url)}.d.ts`
  const disposable = monaco.languages.typescript.typescriptDefaults.addExtraLib(
    dtsText,
    libUri
  )

  // Clean up old one if already tracked
  extraLibRefs.get(url)?.dispose()
  extraLibRefs.set(url, disposable)
}

// Dispose libs no longer used
const updateExtraLibs = (newValue: string) => {
  const found = new Set<string>()

  const staticMatches = newValue.matchAll(staticImportRegex)
  const dynamicMatches = newValue.matchAll(dynamicImportRegex)

  for (const match of staticMatches) found.add(match[1])
  for (const match of dynamicMatches) found.add(match[1])

  // Remove stale imports
  for (const oldUrl of extraLibRefs.keys()) {
    if (!found.has(oldUrl)) {
      extraLibRefs.get(oldUrl)?.dispose()
      extraLibRefs.delete(oldUrl)
    }
  }

  // Resolve new ones
  found.forEach(resolveAndAddDTS)
}

watchDebounced(() => props.modelValue, updateExtraLibs, {
  debounce: 500,
  immediate: true,
})

const monacoEditorTheme = computed(() =>
  ["dark", "black"].includes(theme.value) ? "vs-dark" : "vs"
)
</script>
