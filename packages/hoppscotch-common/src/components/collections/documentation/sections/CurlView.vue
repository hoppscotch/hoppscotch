<template>
  <div v-if="request" class="space-y-2">
    <div class="rounded-md border border-divider overflow-hidden">
      <div
        class="flex items-center justify-between p-2 bg-divider/30 border-b border-divider"
      >
        <div class="text-sm font-medium text-secondaryDark flex items-center">
          <icon-lucide-terminal class="mr-2" size="14" />
          cURL
        </div>
        <div class="flex items-center space-x-2">
          <div>
            <tippy
              interactive
              trigger="click"
              theme="popover"
              placement="bottom"
              :on-shown="() => tippyActions?.focus()"
            >
              <HoppSmartSelectWrapper>
                <HoppButtonSecondary
                  :label="
                    CodegenDefinitions.find((x) => x.name === codegenType)!
                      .caption
                  "
                  outline
                  class="flex-1 pr-8"
                />
              </HoppSmartSelectWrapper>
              <template #content="{ hide }">
                <div class="flex flex-col space-y-2">
                  <div class="sticky top-0 z-10 flex-shrink-0 overflow-x-auto">
                    <input
                      v-model="searchQuery"
                      type="search"
                      autocomplete="off"
                      class="input flex w-full !bg-primaryContrast p-4 py-2"
                      :placeholder="`${t('action.search')}`"
                    />
                  </div>
                  <div
                    ref="tippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      v-for="codegen in filteredCodegenDefinitions"
                      :key="codegen.name"
                      :label="codegen.caption"
                      :info-icon="
                        codegen.name === codegenType ? IconCheck : undefined
                      "
                      :active-info-icon="codegen.name === codegenType"
                      @click="
                        () => {
                          codegenType = codegen.name
                          codegenMode = codegen.lang
                          hide()
                        }
                      "
                    />

                    <HoppSmartPlaceholder
                      v-if="
                        searchQuery.length !== 0 &&
                        filteredCodegenDefinitions.length === 0
                      "
                      :text="`${t('state.nothing_found')} ‟${searchQuery}”`"
                    >
                      <template #icon>
                        <icon-lucide-search class="svg-icons opacity-75" />
                      </template>
                    </HoppSmartPlaceholder>
                  </div>
                </div>
              </template>
            </tippy>
          </div>
          <div class="flex space-x-2">
            <HoppSmartItem
              :icon="curlCopied ? IconCheck : IconCopy"
              title="Copy to clipboard"
              @click="copyCurlCommand"
            />
          </div>
        </div>
      </div>

      <div class="curl-editor max-w-full p-4 overflow-auto">
        <pre ref="curlCodeContainer" class="hljs-container"><code
          class="hljs language-bash"
          v-html="highlightedCode"
        ></code></pre>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  Environment,
  HoppCollectionVariable,
  HoppRESTRequest,
  makeRESTRequest,
} from "@hoppscotch/data"
import { ref, computed, onMounted } from "vue"
import {
  CodegenDefinitions,
  CodegenLang,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import { useI18n } from "~/composables/i18n"
import * as O from "fp-ts/Option"
import { useToast } from "~/composables/toast"
import { useService } from "dioc/vue"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { cascadeParentCollectionForProperties } from "~/newstore/collections"
import {
  getEffectiveRESTRequest,
  resolvesEnvsInBody,
} from "~/helpers/utils/EffectiveURL"
import { computedAsync } from "@vueuse/core"
import {
  AggregateEnvironment,
  getCurrentEnvironment,
} from "~/newstore/environments"
import { CurrentValueService } from "~/services/current-environment-value.service"
import hljs from "highlight.js/lib/core"
import javascript from "highlight.js/lib/languages/javascript"
import python from "highlight.js/lib/languages/python"
import php from "highlight.js/lib/languages/php"
import go from "highlight.js/lib/languages/go"
import ruby from "highlight.js/lib/languages/ruby"
import java from "highlight.js/lib/languages/java"
import csharp from "highlight.js/lib/languages/csharp"
import powershell from "highlight.js/lib/languages/powershell"
import http from "highlight.js/lib/languages/http"
import r from "highlight.js/lib/languages/r"
import rust from "highlight.js/lib/languages/rust"
import swift from "highlight.js/lib/languages/swift"
import kotlin from "highlight.js/lib/languages/kotlin"
import clojure from "highlight.js/lib/languages/clojure"
import hljsCurl from "highlightjs-curl"

// Import highlight.js CSS for base styling
import "highlight.js/styles/github-dark.css"
// Import line numbers plugin

// Register all languages for highlight.js
hljs.registerLanguage("bash", hljsCurl)
hljs.registerLanguage("shell", hljsCurl)
hljs.registerLanguage("javascript", javascript)
hljs.registerLanguage("python", python)
hljs.registerLanguage("php", php)
hljs.registerLanguage("go", go)
hljs.registerLanguage("ruby", ruby)
hljs.registerLanguage("java", java)
hljs.registerLanguage("csharp", csharp)
hljs.registerLanguage("powershell", powershell)
hljs.registerLanguage("http", http)
hljs.registerLanguage("r", r)
hljs.registerLanguage("rust", rust)
hljs.registerLanguage("swift", swift)
hljs.registerLanguage("kotlin", kotlin)
hljs.registerLanguage("clojure", clojure)
hljs.registerLanguage("c", hljsCurl) // Use hljsCurl highlighting for C curl examples
hljs.registerLanguage("objc", hljsCurl) // Use hljsCurl for Objective-C examples
hljs.registerLanguage("ocaml", hljsCurl) // Use hljsCurl for OCaml examples

onMounted(() => {
  hljs.highlightAll()
  // hljs.initLineNumbersOnLoad()
})

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    request?: HoppRESTRequest | null
    collectionID?: string
    collectionPath?: string | null
    folderPath?: string | null
    requestIndex?: number | null
    teamID?: string
  }>(),
  {
    request: null,
    collectionID: "",
    collectionPath: null,
    folderPath: null,
    requestIndex: null,
    teamID: undefined,
  }
)

const curlCodeContainer = ref<HTMLElement | null>(null)
const curlCopied = ref<boolean>(false)
const codegenType = ref<CodegenName>("shell-curl")
const codegenMode = ref<CodegenLang>("shell")

const tippyActions = ref<HTMLElement | null>(null)

const searchQuery = ref("")

const filteredCodegenDefinitions = computed(() => {
  return CodegenDefinitions.filter((obj) =>
    Object.values(obj).some((val) =>
      val.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
})

const currentEnvironmentValueService = useService(CurrentValueService)
const teamCollectionsService = useService(TeamCollectionsService)

const getCurrentValue = (env: AggregateEnvironment) => {
  const currentSelectedEnvironment = getCurrentEnvironment()

  if (env && env.secret) {
    return env.currentValue
  }
  return currentEnvironmentValueService.getEnvironmentByKey(
    env?.sourceEnv !== "Global" ? currentSelectedEnvironment.id : "Global",
    env?.key ?? ""
  )?.currentValue
}

const getFinalURL = (input: string): string => {
  if (!input) {
    return "https://"
  }

  let url = input.trim()

  url = url.replace(/^https?:\s*\/+\s*/i, (match) =>
    match.toLowerCase().startsWith("https") ? "https://" : "http://"
  )

  if (!/^https?:\/\//i.test(url) && !url.startsWith("<<")) {
    const endpoint = url
    const domain = endpoint.split(/[/:#?]+/)[0]

    const isLocalOrIP = /^(localhost|(\d{1,3}\.){3}\d{1,3})$/.test(domain)
    url = (isLocalOrIP ? "http://" : "https://") + endpoint
  }

  return url
}

const getEffectiveRequest = async () => {
  if (!props.request) return null

  let collectionVariables: HoppCollectionVariable[] = []

  if (props.teamID && props.collectionID) {
    const inheritedProperties =
      teamCollectionsService.cascadeParentCollectionForProperties(
        props.collectionID
      )

    collectionVariables = inheritedProperties.variables.flatMap((parentVar) =>
      parentVar.inheritedVariables.map((variable) => ({
        key: variable.key,
        initialValue: variable.initialValue,
        currentValue: variable.currentValue,
        secret: variable.secret,
      }))
    )
  } else if (props.folderPath) {
    const inheritedProperties = cascadeParentCollectionForProperties(
      props.folderPath,
      "rest"
    )

    collectionVariables = inheritedProperties.variables.flatMap((parentVar) =>
      parentVar.inheritedVariables.map((variable) => ({
        key: variable.key,
        initialValue: variable.initialValue,
        currentValue: variable.currentValue,
        secret: variable.secret,
      }))
    )
  }

  const requestVariables = props.request.requestVariables.map(
    (requestVariable) => {
      if (requestVariable.active)
        return {
          key: requestVariable.key,
          currentValue: requestVariable.value,
          initialValue: requestVariable.value,
          secret: false,
        }
      return {}
    }
  )

  const env: Environment = {
    v: 2,
    id: "env",
    name: "Env",
    variables: [
      ...(requestVariables as Environment["variables"]),
      ...collectionVariables.map((envVar) => ({
        ...envVar,
        currentValue:
          getCurrentValue({
            ...envVar,
            sourceEnv: "Global",
          } as AggregateEnvironment) || envVar.initialValue,
      })),
    ],
  }

  const effectiveReq = await getEffectiveRESTRequest(
    makeRESTRequest({
      ...props.request,
    }),
    env,
    true
  )

  return { effectiveRequest: effectiveReq, env }
}

const curlCommand = computedAsync(async () => {
  if (!props.request) return "# No request data available"

  const lang = codegenType.value

  const res = await getEffectiveRequest()

  if (!res) return ""

  const { effectiveRequest, env } = res

  const result = generateCode(
    lang,
    makeRESTRequest({
      ...effectiveRequest,
      body: resolvesEnvsInBody(effectiveRequest.body, env),
      headers: effectiveRequest.effectiveFinalHeaders.map((header) => ({
        ...header,
        active: true,
      })),
      params: effectiveRequest.effectiveFinalParams.map((param) => ({
        ...param,
        active: true,
      })),
      endpoint: getFinalURL(effectiveRequest.effectiveFinalURL),
      requestVariables: effectiveRequest.effectiveFinalRequestVariables.map(
        (requestVariable) => ({
          ...requestVariable,
          active: true,
        })
      ),
    })
  )

  if (O.isSome(result)) {
    return result.value
  }
  return ""
}, "")

const highlightedCode = computed(() => {
  if (!curlCommand.value) return ""

  try {
    // Map codegen language to highlight.js language
    const languageMap: Record<string, string> = {
      shell: "bash",
      javascript: "javascript",
      python: "python",
      php: "php",
      go: "go",
      ruby: "ruby",
      java: "java",
      csharp: "csharp",
      powershell: "powershell",
      http: "http",
      r: "r",
      rust: "rust",
      swift: "swift",
      kotlin: "kotlin",
      clojure: "clojure",
      c: "bash", // C curl examples are essentially bash
      objc: "bash", // Objective-C examples
      ocaml: "bash", // OCaml examples
    }

    const language = languageMap[codegenMode.value] || "bash"

    const highlighted = hljs.highlight(curlCommand.value, {
      language,
      ignoreIllegals: true,
    })
    return highlighted.value
  } catch (error) {
    console.error("Syntax highlighting failed:", error)
    console.log("Raw cURL command:", curlCommand.value)
    console.log("Language mode:", codegenMode.value)

    // Fallback to auto-detection
    try {
      const autoHighlighted = hljs.highlightAuto(curlCommand.value, [
        "bash",
        "shell",
      ])
      return autoHighlighted.value
    } catch (autoError) {
      console.error("Auto highlighting also failed:", autoError)
      // Final fallback to plain text with HTML escaping
      return curlCommand.value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
    }
  }
})

const copyCurlCommand = async () => {
  if (!curlCommand.value) return
  try {
    await navigator.clipboard.writeText(curlCommand.value)
    curlCopied.value = true
    setTimeout(() => {
      curlCopied.value = false
    }, 2000)
    toast.success("cURL command copied to clipboard!")
  } catch (err) {
    console.error("Failed to copy cURL command: ", err)
  }
}
</script>

<style scoped>
/* Override highlight.js theme colors to match Hoppscotch theme */
:deep(.hljs) {
  background: rgb(var(--primary-light-color)) !important;
  color: rgb(var(--secondary-dark-color)) !important;
  padding: 0;
  margin: 0;
  overflow: visible;
  display: block;
  font-size: 0.875rem;
  line-height: 1.5;
}

:deep(.hljs-container) {
  background-color: rgb(var(--primary-light-color));
  border-radius: 0;
  margin: 0;
  padding: 0;
}

/* for block of numbers */
.hljs-ln-numbers {
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;

  text-align: center;
  color: #ccc;
  border-right: 1px solid #ccc;
  vertical-align: top;
  padding-right: 5px;

  /* your custom style here */
}

/* for block of code */
.hljs-ln-code {
  padding-left: 10px;
}

/* Line numbers styling */
/*  */
</style>
