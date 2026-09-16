import { Service } from "dioc"
import { nextTick, ref, shallowRef, watch, type ShallowRef } from "vue"
import * as E from "fp-ts/Either"
import type {
  HoppCollection,
  HoppCollectionVariable,
  HoppGQLRequest,
  HoppRESTAuth,
  HoppRESTHeader,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { populateValuesInInheritedCollectionVars } from "~/helpers/utils/inheritedCollectionVarTransformer"
import {
  Environment,
  EnvironmentSchemaVersion,
  generateUniqueRefId,
  isRESTRequest,
  makeCollection,
  translateToNewEnvironmentVariables,
} from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { TeamCollectionsService } from "~/services/team-collection.service"
import type { TeamCollection } from "~/helpers/teams/TeamCollection"
import type { TeamRequest } from "~/helpers/teams/TeamRequest"
import type { TeamEnvironment } from "~/helpers/teams/TeamEnvironment"
import type { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import {
  createNewRootCollection,
  deleteCollection as deleteTeamCollectionByID,
  renameCollection as renameTeamCollectionByID,
  updateTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"
import {
  createRequestInCollection,
  updateTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import { createTeam, renameTeam } from "~/helpers/backend/mutations/Team"
import { TeamNameCodec } from "~/helpers/backend/types/TeamName"
import { runGQLQuery, type GQLError } from "~/helpers/backend/GQLClient"
import {
  GetTeamEnvironmentsDocument,
  TeamAccessRole,
  WorkspaceType,
  type CreatePublishedDocsArgs,
  type GetMyTeamsQuery,
  type UpdatePublishedDocsArgs,
} from "~/helpers/backend/graphql"
import { applyLocalState } from "~/newstore/localstate"
import { parse as parseGQLDocument } from "graphql"
import type { OperationDefinitionNode } from "graphql"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { GQLQueryBuilderService } from "~/services/gql-query-builder.service"
import {
  GQLTabConnectionService,
  type GQLResponseEvent,
} from "~/services/gql-tab-connection.service"
import { ScrollService } from "~/services/scroll.service"
import {
  switchActiveTabToGQL,
  switchActiveTabToREST,
} from "~/helpers/tab/protocol-switch"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { WorkspaceService } from "~/services/workspace.service"
import { platform } from "~/platform"
import type { AIChatModelOption, AIChatSelection } from "~/platform/experiments"
import {
  BUILT_IN_SKILLS,
  mergeSkills,
  type ChatSkill,
} from "~/helpers/aichat/skills"
import {
  invokeAction,
  isActionBound,
  type HoppAction,
  type HoppActionWithOptionalArgs,
} from "~/helpers/actions"
import { settingsStore } from "~/newstore/settings"
import { getI18n } from "~/modules/i18n"
import {
  createEnvironment,
  environmentsStore,
  getCurrentEnvironment,
  getSelectedEnvironmentIndex,
  setEnvironmentVariables,
  setSelectedEnvironmentIndex,
} from "~/newstore/environments"
import {
  createTeamEnvironment,
  updateTeamEnvironment,
} from "~/helpers/backend/mutations/TeamEnvironment"
import {
  populateLocalStoresFromVariables,
  stripClientLocalValuesForWire,
} from "~/helpers/clientLocalVariables"
import { uniqueID } from "~/helpers/utils/uniqueID"
import {
  addRESTCollection,
  cascadeParentCollectionForProperties,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  removeRESTCollection,
  removeRESTFolder,
  restCollectionStore,
  saveRESTRequestAs,
} from "~/newstore/collections"
import {
  addMockServer,
  deleteMockServer as deleteMockServerInStore,
  updateMockServer as updateMockServerInStore,
} from "~/newstore/mockServers"
import type { MockServer } from "~/helpers/backend/types/MockServer"
import type { CollectionDataProps } from "~/helpers/backend/helpers"
import { updateInheritedPropertiesForAffectedRequests } from "~/helpers/collection/collection"
import {
  serializeCollections,
  serializeGQLSchema,
} from "~/helpers/aichat/context-serializers"
import {
  DocumentationService,
  type PublishedDocInfo,
} from "~/services/documentation.service"
import {
  findCollectionByName,
  findRequestInTree,
  findTopLevelCollection,
  listRequestNames,
} from "~/helpers/aichat/collections"
import {
  runChatCommand,
  applyToolCall,
  applyGQLToolCall,
} from "~/helpers/aichat/commands"
import {
  buildCollectionRequest,
  parseCollectionRequestDefinitions,
} from "~/helpers/aichat/collection-requests"
import {
  containsLocalSecretReference,
  LOCAL_SECRET_REFERENCE_GLOBAL,
  redactSensitiveChatValues,
  replaceSensitiveChatValues,
} from "~/helpers/aichat/secret-references"
import {
  APP_ACTION_TOOLS,
  parseAppActionCommand,
  splitCommands,
} from "~/helpers/aichat/app-actions"
import { repliesFailure } from "~/helpers/aichat/step-lines"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import type {
  HoppTabSaveContext,
  HoppTestRunnerDocument,
  TestRunnerMeta,
} from "~/helpers/tab/document"
import { CurrentValueService } from "~/services/current-environment-value.service"
import { SecretEnvironmentService } from "~/services/secret-environment.service"
import { TestRunnerService } from "~/services/test-runner/test-runner.service"
import type { HoppTab } from "~/services/tab"

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  /** Sanitized content sent to the model when the displayed text has a secret. */
  modelContent?: string
  /** True while the assistant message is still streaming in. */
  pending?: boolean
  /**
   * `"tool"` marks a compact "step" line describing one executed action (run,
   * edit, env change…), shown distinctly from normal assistant prose.
   */
  kind?: "tool" | "error"
  /**
   * How long the model "thought" before this reply's first token — set once
   * the round-trip resolves, so the thinking indicator settles into a
   * "Thought for …" note instead of vanishing.
   */
  thinkingMs?: number
}

/**
 * A single attachable piece of context for the AI chat (the active request, its
 * response, the environment, or ad-hoc context registered by an open modal).
 */
export interface ChatContextItem {
  id: string
  /** Short chip label. */
  label: string
  /** Secondary text shown on hover. */
  detail: string
  /** Serializes this context into the string sent to the model. */
  serialize: () => string
}

/** A v2 environment variable as edited from the chat. */
interface EnvVar {
  key: string
  currentValue: string
  initialValue: string
  secret: boolean
}

interface CollectionRunSnapshot {
  status: "idle" | "running" | "stopped" | "error"
  meta: TestRunnerMeta
  resultCollection?: HoppCollection
}

/** A handle to the active REST request tab, used to apply + commit edits. */
interface ActiveRequestHandle {
  request: HoppRESTRequest
  /** Reactive getter for the request's latest run response. */
  getResponse: () => HoppRESTResponse | null | undefined
  /** Reassign the request with fresh array refs so the editor re-renders. */
  commit: () => void
  /**
   * Binds the tab to a collection entry after a save-as (mirrors the Save
   * dialog): the tab shows the saved copy and is no longer dirty.
   */
  bindToCollection: (
    saveContext: HoppTabSaveContext,
    saved: HoppRESTRequest,
    inheritedProperties?: HoppInheritedProperty
  ) => void
}

/** A team from the user's team list (id, name, role). */
type TeamListEntry = GetMyTeamsQuery["myTeams"][number]

/** Longest we wait for a team's collection tree / a mutation echo to land. */
const TEAM_TREE_TIMEOUT_MS = 10_000
/** Most root collections expanded when searching a team by name. */
const MAX_TEAM_ROOTS_TO_EXPAND = 20

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** A handle to the active GraphQL request tab (unified workspace). */
interface ActiveGQLRequestHandle {
  request: HoppGQLRequest
  /** Reactive getter for the tab's run/subscription event stream. */
  getEvents: () => GQLResponseEvent[] | null | undefined
  /** Reassign the request with fresh array refs so the editor re-renders. */
  commit: () => void
}

/** A content block in a model-format chat message (Anthropic shape). */
type ChatContentBlock =
  | { type: "text"; text: string }
  | {
      type: "tool_use"
      id: string
      name: string
      input: Record<string, unknown>
    }
  | {
      type: "tool_result"
      tool_use_id: string
      content: string
      /** Marks a tool that did not do what was asked. */
      is_error?: boolean
    }

/** A chat message in model format — plain text, or content blocks mid tool loop. */
interface ChatRequestMessage {
  role: ChatRole
  // Plain text, our tool_use/tool_result blocks, or the assistant's own
  // blocks echoed back verbatim (they may carry tool-search results and
  // thinking blocks the API must see unchanged).
  content: string | ChatContentBlock[] | unknown[]
}

/** A tool call returned by the backend chat endpoint. */
interface ChatToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

/** The backend chat function (LLM + tool use). */
type ChatFn = (
  messages: ChatRequestMessage[],
  context: string,
  selection?: AIChatSelection
) => Promise<
  E.Either<
    string,
    {
      content: string
      tool_calls: ChatToolCall[]
      trace_id: string
      /** The model that served the turn, where the backend reports one. */
      model?: string
      usage?: ChatUsage
      assistant_content?: unknown[]
      loaded_tools?: string[]
    }
  >
>

/**
 * Token accounting for one model round-trip. Every counter is optional: the
 * cache figures exist only where the provider implements prompt caching.
 */
interface ChatUsage {
  input_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
  output_tokens?: number
}

/** Most recent messages sent as conversation history to the model. */
const MAX_HISTORY_MESSAGES = 12

/**
 * Total history budget (chars) and per-message caps for older turns: the
 * assistant's prose is summarizable, but a user's earlier message may be the
 * spec (a pasted body, an endpoint list) a follow-up refers to, so it keeps
 * far more before the oldest-first budget trim takes over.
 */
const MAX_HISTORY_CHARS = 8_000
const MAX_OLD_ASSISTANT_CHARS = 800
const MAX_OLD_USER_CHARS = 4_000

/** Cuts `text` at `max` without splitting a `<<local-ref:…>>` token. */
const truncateForHistory = (text: string, max: number): string => {
  if (text.length <= max) return text
  let cut = max
  const open = text.lastIndexOf("<<", cut)
  if (open !== -1 && text.indexOf(">>", open) >= cut) cut = open
  return `${text.slice(0, cut)}\n[… ${text.length - cut} more characters from this earlier message were omitted — ask the user to re-send them if needed]`
}

/** Longest tool reply echoed back to the model (the UI still shows it all). */
const MAX_TOOL_RESULT_CHARS = 800

/**
 * Context-fetching tools: their whole point is a large result for the model,
 * so they get a bigger echo budget and only a short line in the UI.
 */
const CONTEXT_FETCH_TOOLS = new Map<string, string>([
  ["get_graphql_schema", "📚 Shared the GraphQL schema with the assistant."],
  ["list_collections", "📚 Shared the collection outline with the assistant."],
])
const MAX_CONTEXT_RESULT_CHARS = 8_000

/** App actions after which the turn's pinned tab must follow the active tab. */
const TAB_CHANGING_TOOLS = new Set<string>([
  "open_new_tab",
  "close_tab",
  "duplicate_tab",
  "switch_tab",
  "switch_protocol",
  "open_request",
  "run_collection",
  "create_team",
  "switch_workspace",
])

/** Max model round-trips per user message (bounds the agentic tool loop). */
const MAX_TOOL_STEPS = 6

/**
 * Tools that take `<<local-ref:…>>` values as-is: `toEnvVars` resolves the
 * reference itself and insists the target variable is a secret.
 */
const ENV_VARIABLE_TOOLS = new Set<string>([
  "create_environment",
  "add_or_update_environment_variables",
])

/** Longest message the offline (regex) command parser will look at. */
const MAX_OFFLINE_COMMAND_LENGTH = 4000

/** Human-readable capability families for the "loaded tools" step line. */
const TOOL_FAMILIES: Array<[RegExp, string]> = [
  [/mock_server/, "mock servers"],
  [/documentation|description/, "documentation"],
  [/team|workspace/, "teams and workspaces"],
  [/collection|open_request/, "collections"],
  [/environment/, "environments"],
  [/tab|protocol/, "tabs"],
  [/interceptor/, "the interceptor"],
]

/** Maps tool names to the distinct families they belong to, in order. */
const describeToolFamilies = (names: string[]): string[] => {
  const out: string[] = []
  for (const name of names) {
    const family = TOOL_FAMILIES.find(([re]) => re.test(name))?.[1]
    if (family && !out.includes(family)) out.push(family)
  }
  return out
}

/**
 * Holds the state for the single, global AI chat thread.
 *
 * It is a `dioc` service (singleton) so the conversation + open state persist as
 * the user navigates around the app — there is one assistant that "follows" the
 * user and reads whatever context is currently in scope.
 *
 * A turn is a loop, not one round-trip: the backend owns the model and the tool
 * contract but executes nothing, so every tool runs here — against the pinned
 * tab and the surrounding workspace — and its result is fed back until the model
 * stops calling tools or hits `MAX_TOOL_STEPS`. `turnTabId` pins the turn to the
 * tab it was sent from, secrets travel as `<<local-ref:id>>` placeholders only
 * `localSecretValues` can resolve, and bulky context (schemas, collection trees)
 * is fetched on demand by tool call. With no backend chat function the service
 * falls back to an offline regex parser.
 */
export class AIChatService extends Service {
  public static readonly ID = "AI_CHAT_SERVICE"

  /** Whether the chat panel is open. */
  public readonly isOpen = ref(false)

  /** The conversation history (single thread). */
  public readonly messages = ref<ChatMessage[]>([])

  /** True while an assistant reply is streaming. */
  public readonly isStreaming = ref(false)

  /**
   * Tool names executed during the most recently completed turn (empty for a
   * prose-only answer). Drives the contextual follow-up suggestion chips.
   */
  public readonly lastTurnTools = ref<string[]>([])

  /** Outcome of the most recent turn — follow-ups only show after "ok". */
  public readonly lastTurnStatus = ref<"idle" | "ok" | "error">("idle")

  /**
   * Models this instance offers, refreshed when the pane opens.
   *
   * Empty is meaningful: it means an administrator has registered nothing, and
   * every message would fail. `availabilityKnown` separates that from "not
   * asked yet", because a failed lookup must not be read as "no models".
   */
  public readonly modelOptions = ref<AIChatModelOption[]>([])

  /**
   * Whether the administrator has switched the assistant on. Null until the
   * server has answered, so the launcher can show optimistically rather than
   * flickering in on every page load.
   */
  public readonly instanceEnabled = ref<boolean | null>(null)

  /** True once a lookup has succeeded, whatever it returned. */
  public readonly availabilityKnown = ref(false)

  /**
   * The skills the composer offers under "/": the built-in set with any the
   * admin defined laid over it. Starts as the built-ins so the menu works
   * before the first lookup answers.
   */
  public readonly skills = ref<ChatSkill[]>(BUILT_IN_SKILLS)

  /**
   * The connection and model the next turn will use.
   *
   * Never read inside a turn — `sendMessage` snapshots it, so changing the
   * choice mid-reply cannot swap the provider between steps of one turn.
   */
  public readonly selectedModel = ref<AIChatSelection | null>(null)

  /**
   * Ad-hoc context registered by currently-open surfaces (e.g. modals), merged
   * into the chat context alongside the active request/response/environment.
   */
  public readonly registeredContext = ref<ChatContextItem[]>([])

  private readonly tabService = this.bind(WorkspaceTabsService)

  private readonly interceptorService = this.bind(KernelInterceptorService)

  private readonly workspaceService = this.bind(WorkspaceService)

  private readonly gqlQueryBuilder = this.bind(GQLQueryBuilderService)

  private readonly gqlTabConnection = this.bind(GQLTabConnectionService)

  private readonly scrollService = this.bind(ScrollService)

  private readonly secretEnvironmentService = this.bind(
    SecretEnvironmentService
  )

  private readonly currentEnvironmentValueService =
    this.bind(CurrentValueService)

  private readonly testRunnerService = this.bind(TestRunnerService)

  private readonly teamCollectionService = this.bind(TeamCollectionsService)

  private readonly documentationService = this.bind(DocumentationService)

  private readonly t = getI18n()

  private idCounter = 0

  private secretReferenceCounter = 0

  private readonly localSecretValues = new Map<string, string>()

  /**
   * Bumped whenever the conversation is torn down or a new turn starts. A turn
   * captures the value when it begins and abandons itself once it no longer
   * matches, so a round-trip that outlives its conversation cannot write back
   * into the one that replaced it.
   */
  private turnGeneration = 0

  /**
   * The tab the current turn acts on, pinned when the message was sent so a
   * user switching tabs while the model thinks does not redirect its edits.
   * Tab tools (open/close/switch/…) move the pin to the tab they activated.
   */
  private turnTabId: string | null = null

  private nextId(): string {
    this.idCounter += 1
    return `msg_${Date.now()}_${this.idCounter}`
  }

  private captureLocalSecret(secret: string): string {
    const id = `secret_${++this.secretReferenceCounter}`
    this.localSecretValues.set(id, secret)
    return id
  }

  private contentForModel(content: string): string {
    return replaceSensitiveChatValues(content, (secret) =>
      this.captureLocalSecret(secret)
    )
  }

  public open() {
    this.isOpen.value = true
    void this.loadAvailability()
  }

  /**
   * Asks the server whether the assistant is on and what it offers.
   *
   * A failed lookup changes nothing: an instance that chatted fine a moment ago
   * should not be declared switched-off by one flaky request. Called when a
   * session starts and again whenever the pane opens, because an administrator
   * can change either while the app is loaded.
   */
  public async loadAvailability() {
    const getAvailability =
      platform.experiments?.aiExperiments?.getChatAvailability
    if (!getAvailability) return

    const result = await getAvailability()
    if (E.isLeft(result)) return

    this.instanceEnabled.value = result.right.enabled
    this.modelOptions.value = result.right.models
    this.skills.value = mergeSkills(result.right.skills)
    this.availabilityKnown.value = true
    this.reconcileSelection()
  }

  /**
   * Keeps the choice pointing at something the instance still offers.
   *
   * Falls back to the instance default, then to whatever is first: a default
   * can go missing (an admin disabling that connection), and a picker with
   * nothing selected would send no selection at all.
   */
  private reconcileSelection() {
    const options = this.modelOptions.value
    const current = this.selectedModel.value

    const stillOffered =
      current &&
      options.some(
        (option) =>
          option.connectionID === current.connectionID &&
          option.model === current.model
      )
    if (stillOffered) return

    const fallback = options.find((option) => option.isDefault) ?? options[0]
    this.selectedModel.value = fallback
      ? { connectionID: fallback.connectionID, model: fallback.model }
      : null
  }

  /** Records the user's choice for subsequent turns. */
  public selectModel(option: AIChatModelOption) {
    this.selectedModel.value = {
      connectionID: option.connectionID,
      model: option.model,
    }
  }

  public close() {
    this.isOpen.value = false
  }

  public toggle() {
    this.isOpen.value = !this.isOpen.value
  }

  /**
   * Clears the conversation, unless a reply is arriving — a user should not be
   * able to wipe a turn out from under itself. Use `reset` when the teardown is
   * not the user's choice.
   */
  public clear() {
    if (this.isStreaming.value) return
    this.reset()
  }

  /**
   * Tears the conversation down unconditionally and abandons any turn still in
   * flight. Unlike `clear`, this never defers: it exists for the case where the
   * session itself has ended (logout), and the transcript, the pinned tab and
   * the local secret values all belong to the session that just ended.
   *
   * A turn already awaiting a round-trip cannot be interrupted, so it is
   * invalidated instead — it discards its result rather than repopulating a
   * conversation that is meant to be gone.
   */
  public reset() {
    this.turnGeneration++
    this.isStreaming.value = false
    this.messages.value = []
    this.lastTurnTools.value = []
    this.lastTurnStatus.value = "idle"
    this.localSecretValues.clear()
    // The counter is deliberately NOT rewound. A turn abandoned mid-batch can
    // still resolve `<<local-ref:secret_N>>`, so re-minting that id would hand
    // it the next session's credential. Monotonic ids make a stale reference
    // resolve to nothing, which every consumer already handles.
    this.turnTabId = null
    this.runStepMessageId = null
    this.awaitingRunStep = false
    this.pendingRunOutcome = null
  }

  /** True once `reset` (or a newer turn) has abandoned the given turn. */
  private isStaleTurn(generation: number): boolean {
    return generation !== this.turnGeneration
  }

  /** Records a tool/action executed by the current turn. */
  private recordTool(name: string) {
    this.lastTurnTools.value = [...this.lastTurnTools.value, name]
  }

  /**
   * Registers an ad-hoc context item (e.g. the doc being edited in an open
   * modal). Returns an unregister function. Re-registering the same `id`
   * replaces the previous entry.
   */
  public registerContext(item: ChatContextItem): () => void {
    this.registeredContext.value = [
      ...this.registeredContext.value.filter((i) => i.id !== item.id),
      item,
    ]
    return () => {
      this.registeredContext.value = this.registeredContext.value.filter(
        (i) => i.id !== item.id
      )
    }
  }

  /**
   * Sends a user message and streams back an assistant reply.
   * @param text The user's message.
   * @param contextString A serialized snapshot of the currently-attached context.
   */
  public async sendMessage(text: string, contextString: string) {
    const content = text.trim()
    if (!content || this.isStreaming.value) return

    const generation = ++this.turnGeneration

    // Snapshotted, not read per step: one turn is served by one connection,
    // even if the user changes the picker while the reply is still arriving.
    const selection = this.selectedModel.value
      ? { ...this.selectedModel.value }
      : undefined

    this.messages.value.push({
      id: this.nextId(),
      role: "user",
      content,
      modelContent: this.contentForModel(content),
    })
    this.isStreaming.value = true
    this.lastTurnTools.value = []
    this.lastTurnStatus.value = "idle"
    this.syncTurnTab()

    try {
      const chatFn = platform.experiments?.aiExperiments?.chat
      if (chatFn) {
        // Online: run the agentic loop, surfacing each step live.
        await this.runAgentLoop(chatFn, contextString, generation, selection)
      } else {
        // Offline fallback: a single synchronous reply.
        const id = this.pushPending()
        const startedAt = Date.now()
        const reply = await this.buildReply(content, contextString)
        if (this.isStaleTurn(generation)) return
        this.setThinkingDuration(id, startedAt)
        await this.streamText(id, reply)
        if (this.isStaleTurn(generation)) return
        this.finalizeById(id)
        this.lastTurnStatus.value = "ok"
      }
    } finally {
      // An abandoned turn must not clear the flag for whatever replaced it.
      if (!this.isStaleTurn(generation)) this.isStreaming.value = false
    }
  }

  /** Adds an empty, pending assistant bubble (shows the "thinking" state). */
  private pushPending(): string {
    const id = this.nextId()
    this.messages.value.push({
      id,
      role: "assistant",
      content: "",
      pending: true,
    })
    return id
  }

  /**
   * The step message holding a "▶ Running…" line — its line is swapped for
   * the outcome when the run settles, so a stale "Running…" never outlives
   * the finished request.
   */
  private runStepMessageId: string | null = null

  /**
   * True from the moment a batch containing run_request starts executing until
   * its step line exists — an outcome that settles in that window is parked in
   * `pendingRunOutcome` instead of orphaning a permanent "▶ Running…" line.
   */
  private awaitingRunStep = false

  private pendingRunOutcome: string | null = null

  /** Inserts a step line just before the message with `beforeId` (else appends). */
  private pushStepBefore(beforeId: string, content: string): string {
    const id = this.nextId()
    const message: ChatMessage = {
      id,
      role: "assistant",
      content,
      kind: "tool",
    }
    const i = this.messages.value.findIndex((m) => m.id === beforeId)
    if (i === -1) this.messages.value.push(message)
    else this.messages.value.splice(i, 0, message)
    return id
  }

  /** Adds a compact "tool step" line describing one executed action. */
  private pushStep(content: string): string {
    const id = this.nextId()
    this.messages.value.push({
      id,
      role: "assistant",
      content,
      kind: "tool",
    })
    return id
  }

  /**
   * Settles an armed "▶ Running…" step line with the run outcome, in place.
   * Falls back to a fresh step message when the line is gone (offline path,
   * cleared conversation).
   */
  private resolveRunStep(text: string) {
    if (!this.runStepMessageId && this.awaitingRunStep) {
      this.pendingRunOutcome = text
      return
    }
    const id = this.runStepMessageId
    this.runStepMessageId = null
    if (id) {
      const i = this.messages.value.findIndex((m) => m.id === id)
      if (i !== -1) {
        const msg = this.messages.value[i]
        const updated = msg.content.replace(/^▶ .*$/m, text)
        if (updated !== msg.content) {
          msg.content = updated
          return
        }
      }
    }
    void this.postAssistantMessage(text, "tool")
  }

  /** Clears the pending flag on a message, by id. */
  private finalizeById(id: string) {
    const i = this.messages.value.findIndex((m) => m.id === id)
    if (i !== -1) this.messages.value[i].pending = false
  }

  /** Stamps how long a pending message "thought" before its reply arrived. */
  private setThinkingDuration(id: string, startedAt: number) {
    const i = this.messages.value.findIndex((m) => m.id === id)
    if (i !== -1) this.messages.value[i].thinkingMs = Date.now() - startedAt
  }

  /** Removes a still-empty pending placeholder (a step produced no text). */
  private dropPlaceholder(id: string) {
    const i = this.messages.value.findIndex((m) => m.id === id)
    const m = this.messages.value[i]
    if (m && m.pending && !m.content) this.messages.value.splice(i, 1)
  }

  /**
   * Drives the agentic tool-use loop against the backend chat endpoint, showing
   * each step live: the model's text streams into a bubble, and every tool it
   * runs is appended as a compact step line. Tool calls execute locally against
   * the pinned tab and the surrounding workspace, and their results are fed
   * back, so the model can take further (dependent) steps — until it stops
   * calling tools or hits the step cap.
   */
  private async runAgentLoop(
    chatFn: ChatFn,
    contextString: string,
    generation: number,
    selection?: AIChatSelection
  ) {
    // Working transcript in model format. Each step appends the assistant's
    // tool_use turn and our tool_result turn (real Anthropic round-trips).
    const working: ChatRequestMessage[] = this.sanitizeHistory(
      this.messages.value
    )
    const safeContextString = redactSensitiveChatValues(contextString)

    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const pendingId = this.pushPending()
      const stepStartedAt = Date.now()
      const result = await chatFn(working, safeContextString, selection)
      if (this.isStaleTurn(generation)) return

      if (E.isLeft(result)) {
        const i = this.messages.value.findIndex((m) => m.id === pendingId)
        if (i !== -1) {
          this.messages.value[i].content = this.describeChatError(result.left)
          this.messages.value[i].pending = false
          // An error notice is UI-only — it must not be replayed to the model
          // as something the assistant said.
          this.messages.value[i].kind = "error"
        }
        this.lastTurnStatus.value = "error"
        // The chosen connection or model is gone. Clearing the chat cannot fix
        // that, so refresh the list instead and let the picker settle on
        // something that still exists.
        if (result.left === "MODEL_UNAVAILABLE") void this.loadAvailability()
        return
      }

      const {
        content,
        tool_calls,
        usage,
        model,
        assistant_content,
        loaded_tools,
      } = result.right
      if (usage) {
        // A missing counter is reported as such rather than as zero, so a
        // provider that does not cache is not mistaken for one whose cache
        // never warms.
        const count = (value?: number) => value ?? "n/a"
        console.debug(
          `[AIChat] step ${step + 1}${model ? ` (${model})` : ""}: in=${count(usage.input_tokens)} cache_read=${count(usage.cache_read_input_tokens)} cache_write=${count(usage.cache_creation_input_tokens)} out=${count(usage.output_tokens)}`
        )
      }

      // The model searched for (and loaded) extra tools — show that as a
      // step so the extra wait is visible and explained, in user terms.
      if (loaded_tools?.length) {
        const used = loaded_tools.filter((name) =>
          tool_calls.some((c) => c.name === name)
        )
        const families = describeToolFamilies(used.length ? used : loaded_tools)
        this.pushStepBefore(
          pendingId,
          families.length
            ? `🔎 Loaded tools for ${families.join(", ")}.`
            : "🔎 Loaded additional tools."
        )
      }

      // Stream the model's text for this step into its bubble (or drop the
      // placeholder if this step was tool-only). The thinking duration is
      // stamped first so the indicator settles into a "Thought for …" note
      // the moment tokens start.
      if (content) {
        this.setThinkingDuration(pendingId, stepStartedAt)
        await this.streamText(pendingId, content)
        if (this.isStaleTurn(generation)) return
        this.finalizeById(pendingId)
      } else {
        this.dropPlaceholder(pendingId)
      }

      // No tool calls → the text above is the final reply.
      if (!tool_calls.length) {
        this.lastTurnStatus.value = "ok"
        return
      }

      for (const call of tool_calls) this.recordTool(call.name)

      // Echo the assistant's turn so the next round has full context. Prefer
      // the provider's own blocks: they include the tool-search results that
      // keep discovered tools loaded for the rest of this turn.
      if (assistant_content?.length) {
        working.push({ role: "assistant", content: assistant_content })
      } else {
        const assistantBlocks: ChatContentBlock[] = []
        if (content) assistantBlocks.push({ type: "text", text: content })
        for (const call of tool_calls) {
          assistantBlocks.push({
            type: "tool_use",
            id: call.id,
            name: call.name,
            input: call.input,
          })
        }
        working.push({ role: "assistant", content: assistantBlocks })
      }

      // Execute the calls, show each as a step, and feed the results back.
      const runsRequest = tool_calls.some((c) => c.name === "run_request")
      if (this.isStaleTurn(generation)) return
      if (runsRequest) this.awaitingRunStep = true
      const { replies, toolResults } = await this.executeToolCalls(
        tool_calls,
        generation
      )
      if (this.isStaleTurn(generation)) return
      if (replies.length) {
        // Blank line between replies: each tool's reply owns its own step, so
        // one that carries no status glyph cannot inherit the previous icon.
        const stepId = this.pushStep(replies.join("\n\n"))
        // A run in this batch reports back into its own step line.
        if (runsRequest) this.runStepMessageId = stepId
      }
      if (runsRequest) {
        this.awaitingRunStep = false
        const parked = this.pendingRunOutcome
        this.pendingRunOutcome = null
        if (parked) this.resolveRunStep(parked)
      }
      working.push({ role: "user", content: toolResults })
    }

    // Step cap reached — the turn still did useful work, but the model never
    // got to wrap up; say so instead of ending on a bare step line.
    await this.postAssistantMessage(
      `I stopped after ${MAX_TOOL_STEPS} tool steps. The actions above were applied — ask me to continue if something is still missing.`
    )
    if (this.isStaleTurn(generation)) return
    this.lastTurnStatus.value = "ok"
  }

  /** Maps a platform chat error code to something the user can act on. */
  private describeChatError(code: string): string {
    switch (code) {
      case "UNAUTHORIZED":
        return "⚠️ Your session has expired — sign in again and resend the message."
      case "RATE_LIMITED":
        return "⚠️ Too many requests right now — wait a moment and try again."
      case "INPUT_TOO_LARGE":
        return "⚠️ This conversation is too large for the AI service — clear the chat and try again."
      case "INVALID_INPUT":
        return "⚠️ The AI service rejected this conversation — clear the chat and try again."
      case "MODEL_UNAVAILABLE":
        return "⚠️ That model is no longer available on this server — pick another one and resend."
      case "CHAT_DISABLED":
        return "⚠️ The AI assistant isn't enabled on this server — ask your administrator to configure it."
      case "UNABLE_TO_PARSE_RESPONSE":
        return "⚠️ The AI service returned an unexpected response. Please try again."
      default:
        return "⚠️ Sorry, I couldn't reach the AI service. Please try again."
    }
  }

  /**
   * Executes one model turn's tool calls against the active request and returns
   * the human-readable confirmations plus the matching tool_result blocks to
   * send back. Request-field edits are applied (and committed) before app
   * actions in model-emitted order, refreshing the active tab before each one.
   */
  private async executeToolCalls(
    toolCalls: ChatToolCall[],
    generation: number
  ): Promise<{ replies: string[]; toolResults: ChatContentBlock[] }> {
    // What the user sees per tool vs what the model gets back.
    const replyById = new Map<string, string>()
    const resultById = new Map<string, string>()
    /** Calls whose result must travel back flagged as an error. */
    const failedCalls = new Set<string>()
    for (const call of toolCalls) {
      // Abandoned mid-batch: stop before touching the workspace again.
      if (this.isStaleTurn(generation)) break
      // Environment tools resolve `<<local-ref:…>>` themselves (and insist the
      // target is a secret variable). Every other tool gets the real value —
      // it never leaves the client, and the echo below is masked again.
      const resolved = new Map<string, string>()
      const input = ENV_VARIABLE_TOOLS.has(call.name)
        ? call.input
        : call.name === "set_collection_properties"
          ? {
              // Auth/header values get the real credential; the variables
              // keep their references so toEnvVars can insist on secret:true.
              ...(this.resolveLocalSecrets(
                { ...call.input, variables: undefined },
                resolved
              ) as Record<string, unknown>),
              variables: call.input.variables,
            }
          : (this.resolveLocalSecrets(call.input, resolved) as Record<
              string,
              unknown
            >)

      let reply = ""
      let threw = false
      try {
        if (APP_ACTION_TOOLS.has(call.name)) {
          reply = await this.runAppAction(
            call.name,
            input,
            this.getActiveRequest()
          )
          // A tab tool may have activated another tab — follow it. Other
          // actions leave the pin alone (the user may be browsing tabs).
          if (TAB_CHANGING_TOOLS.has(call.name)) {
            await nextTick()
            // A call that was already in flight when the turn was abandoned
            // must not re-pin the tab for the turn that replaced it.
            if (!this.isStaleTurn(generation)) this.syncTurnTab()
          }
        } else {
          const active = this.getActiveRequest()
          const gqlActive = active ? null : this.getActiveGQLRequest()
          const res = active
            ? applyToolCall(active.request, call.name, input)
            : applyGQLToolCall(gqlActive?.request ?? null, call.name, input)
          if (res.changed) {
            if (active) {
              active.commit()
            } else if (gqlActive) {
              gqlActive.commit()
              if (call.name === "set_query") {
                this.moveGQLCursorToOperation(
                  gqlActive.request.query,
                  undefined,
                  "last"
                )
              }
            }
          }
          reply = res.reply
        }
      } catch (e) {
        // One failing tool must not abort the turn with no trace of it.
        console.error(`[AIChat] tool "${call.name}" failed:`, e)
        threw = true
        reply = `⚠️ ${call.name} failed: ${
          e instanceof Error ? e.message : "unexpected error"
        }`
      }
      const masked = this.maskResolvedSecrets(reply || "Done.", resolved)
      resultById.set(call.id, masked)
      // A tool that failed or refused has to say so in the RESULT, not only in
      // the prose beside it: a weaker model reads a success-shaped result as
      // proof the action happened. The step glyph is the vocabulary for this,
      // so the parser decides. Context tools are the one exception — their
      // unmarked payload IS the success.
      if (
        threw ||
        repliesFailure(masked, !CONTEXT_FETCH_TOOLS.has(call.name))
      ) {
        failedCalls.add(call.id)
      }
      // Context tools show a short line instead of the payload — but a notice
      // or error must stay visible to the user.
      const short = CONTEXT_FETCH_TOOLS.get(call.name)
      replyById.set(
        call.id,
        short && masked.startsWith("### ") ? short : masked
      )
    }

    const replies = toolCalls
      .map((c) => replyById.get(c.id) ?? "")
      .filter(Boolean)
    const toolResults: ChatContentBlock[] = toolCalls.map((c) => {
      const result = resultById.get(c.id) ?? "Done."
      const cap = CONTEXT_FETCH_TOOLS.has(c.name)
        ? MAX_CONTEXT_RESULT_CHARS
        : MAX_TOOL_RESULT_CHARS
      return {
        type: "tool_result",
        tool_use_id: c.id,
        content: result.length > cap ? `${result.slice(0, cap)}…` : result,
        ...(failedCalls.has(c.id) ? { is_error: true } : {}),
      }
    })
    return { replies, toolResults }
  }

  /**
   * Swaps every `<<local-ref:id>>` in a tool input for the credential the user
   * typed, recording each substitution so the tool's reply can be masked.
   * Unknown references are left in place.
   */
  private resolveLocalSecrets(
    value: unknown,
    resolved: Map<string, string>
  ): unknown {
    if (typeof value === "string") {
      return value.replace(LOCAL_SECRET_REFERENCE_GLOBAL, (match, id) => {
        const secret = this.localSecretValues.get(id)
        if (secret === undefined) return match
        resolved.set(match, secret)
        return secret
      })
    }
    if (Array.isArray(value)) {
      return value.map((entry) => this.resolveLocalSecrets(entry, resolved))
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [
          key,
          this.resolveLocalSecrets(entry, resolved),
        ])
      )
    }
    return value
  }

  /** Puts the opaque references back before text is echoed to the model. */
  private maskResolvedSecrets(
    text: string,
    resolved: Map<string, string>
  ): string {
    let out = text
    for (const [reference, secret] of resolved) {
      if (secret) out = out.split(secret).join(reference)
    }
    return out
  }

  /**
   * Builds an Anthropic-valid conversation history from the thread: drops empty
   * and still-streaming messages, keeps the most recent `MAX_HISTORY_MESSAGES`,
   * ensures it starts with a user turn, and merges consecutive same-role turns
   * (e.g. a reply followed by its async run-outcome) — the API requires roles to
   * alternate, so this is what gives the assistant memory of the session.
   */
  private sanitizeHistory(
    messages: ChatMessage[]
  ): { role: ChatRole; content: string }[] {
    const out: { role: ChatRole; content: string }[] = []
    // Count only what the model will see: step lines, error notices, and
    // pending placeholders are UI artifacts and must not eat the window.
    const visible = messages.filter(
      (m) => !m.pending && !m.kind && (m.modelContent ?? m.content).trim()
    )
    const recent = visible.slice(-MAX_HISTORY_MESSAGES)
    const newest = recent[recent.length - 1]
    for (const m of recent) {
      let content = (m.modelContent ?? m.content).trim()
      // Older turns are context, not the task: keep them bounded. The newest
      // (the message being answered) always goes through intact.
      if (m !== newest) {
        content = truncateForHistory(
          content,
          m.role === "user" ? MAX_OLD_USER_CHARS : MAX_OLD_ASSISTANT_CHARS
        )
      }
      // The conversation must start with a user message.
      if (out.length === 0 && m.role !== "user") continue
      const last = out[out.length - 1]
      if (last && last.role === m.role) {
        last.content += `\n\n${content}`
      } else {
        out.push({ role: m.role, content })
      }
    }
    // Drop the oldest exchanges until the whole history fits the budget,
    // always keeping the newest user turn.
    let total = out.reduce((n, m) => n + m.content.length, 0)
    while (out.length > 1 && total > MAX_HISTORY_CHARS) {
      total -= out[0].content.length
      out.shift()
      // Keep the user-first invariant after trimming.
      while (out.length > 1 && out[0].role !== "user") {
        total -= out[0].content.length
        out.shift()
      }
    }
    return out
  }

  /**
   * Offline fallback (no backend): interprets a few request-editing commands
   * locally and otherwise returns a short guidance message.
   */
  private async buildReply(
    userText: string,
    contextString: string
  ): Promise<string> {
    const active = this.getActiveRequest()

    // The regex parsers are not built for essays — bound their input.
    if (userText.length > MAX_OFFLINE_COMMAND_LENGTH) {
      return "That message is too long for the offline command parser. Send a shorter command, e.g. `set url to https://…`."
    }

    // Chained commands, e.g. "open a new tab and run the request". Body edits
    // are freeform, so a message that sets a body is never split.
    const segments = /\bbody\b/i.test(userText)
      ? [userText]
      : splitCommands(userText)

    if (segments.length > 1) {
      const replies: string[] = []
      let changed = false
      let handledAny = false

      for (const segment of segments) {
        const appAction = parseAppActionCommand(segment)
        if (appAction) {
          // Persist pending edits before an app action reads/runs the request.
          if (changed && active) {
            active.commit()
            changed = false
          }
          handledAny = true
          this.recordTool(appAction.name)
          const reply = await this.runAppAction(
            appAction.name,
            appAction.input,
            active
          )
          if (reply) replies.push(reply)
          continue
        }

        const result = runChatCommand(active?.request ?? null, segment)
        if (result.handled) {
          handledAny = true
          if (result.changed) {
            changed = true
            this.recordTool("request_edit")
          }
          if (result.reply) replies.push(result.reply)
        }
      }

      if (changed && active) active.commit()
      if (handledAny) return replies.join("\n\n")
    }

    const appAction = parseAppActionCommand(userText)
    if (appAction) {
      this.recordTool(appAction.name)
      return this.runAppAction(appAction.name, appAction.input, active)
    }

    const result = runChatCommand(active?.request ?? null, userText)
    if (result.handled) {
      if (result.changed) {
        this.recordTool("request_edit")
        if (active) active.commit()
      }
      return result.reply
    }

    return this.mockReply(contextString, !!active)
  }

  /** Returns the active REST request (+ a dirty marker), or null. */
  private getActiveRequest(): ActiveRequestHandle | null {
    const tab = this.resolveTurnTab()
    if (tab && tab.document?.type === "request") {
      const document = tab.document
      return {
        request: document.request,
        /** Reactive getter for the request's latest run response. */
        getResponse: () => document.response,
        // Reassign the request with fresh array references so the request editor
        // re-renders immediately. Mutating the nested arrays in place isn't
        // reflected until the tab is re-selected (matches ImportCurl's pattern).
        commit: () => {
          const r = document.request
          document.request = {
            ...r,
            params: [...r.params],
            headers: [...r.headers],
            requestVariables: [...r.requestVariables],
          }
          document.isDirty = true
        },
        bindToCollection: (saveContext, saved, inheritedProperties) => {
          document.request = saved
          document.saveContext = saveContext
          document.isDirty = false
          if (saveContext?.originLocation === "user-collection") {
            document.inheritedProperties = cascadeParentCollectionForProperties(
              saveContext.folderPath,
              "rest"
            )
          } else if (inheritedProperties) {
            document.inheritedProperties = inheritedProperties
          }
        },
      }
    }
    return null
  }

  /**
   * The tab this turn acts on: the pinned one while it still exists, else the
   * currently active tab (which also re-pins).
   */
  private resolveTurnTab() {
    const active = this.tabService.currentActiveTab.value
    if (!this.turnTabId || active?.id === this.turnTabId) return active
    const pinned = this.tabService
      .getActiveTabs()
      .value.find((tab) => tab.id === this.turnTabId)
    if (!pinned) {
      this.turnTabId = active?.id ?? null
      return active
    }
    return pinned
  }

  /** Pins the turn to whatever tab is active right now. */
  private syncTurnTab() {
    this.turnTabId = this.tabService.currentActiveTab.value?.id ?? null
  }

  /**
   * Brings the pinned tab to the front before an action whose handler acts on
   * the ACTIVE tab (run, save, close, switch protocol…).
   */
  private focusTurnTab() {
    const tab = this.resolveTurnTab()
    if (tab && this.tabService.currentActiveTab.value?.id !== tab.id) {
      this.tabService.setActiveTab(tab.id)
    }
  }

  /** Reply for an app action whose HoppAction handler is not bound on this page. */
  private unavailableReply(action: HoppAction, what: string): string | null {
    return isActionBound(action).value
      ? null
      : `${what} isn't available on this page — open the REST/GraphQL workspace first.`
  }

  /** Named operations in a GraphQL document, or null when it doesn't parse. */
  private listGQLOperations(query: string): string[] | null {
    try {
      return parseGQLDocument(query)
        .definitions.filter(
          (d): d is OperationDefinitionNode => d.kind === "OperationDefinition"
        )
        .map((o) => o.name?.value ?? "")
        .filter(Boolean)
    } catch (_e) {
      return null
    }
  }

  /**
   * Points the visible GQL query editor's cursor at an operation — the named
   * one, else the first/last per `fallback` — so the UI shows which operation
   * the chat is acting on (and cursor-driven affordances line up with it).
   */
  private moveGQLCursorToOperation(
    query: string,
    operationName: string | undefined,
    fallback: "first" | "last"
  ) {
    try {
      const operations = parseGQLDocument(query).definitions.filter(
        (d): d is OperationDefinitionNode => d.kind === "OperationDefinition"
      )
      if (!operations.length) return
      const target =
        (operationName
          ? operations.find((o) => o.name?.value === operationName)
          : undefined) ??
        (fallback === "first"
          ? operations[0]
          : operations[operations.length - 1])
      const offset = target.loc?.start
      if (offset === undefined) return
      const before = query.slice(0, offset)
      const line = (before.match(/\n/g) ?? []).length
      const ch = offset - (before.lastIndexOf("\n") + 1)
      this.gqlQueryBuilder.moveCursorTo(line, ch)
    } catch (_e) {
      // Unparseable query — leave the cursor where it is.
    }
  }

  /** Returns the active GraphQL request (unified workspace tab), or null. */
  private getActiveGQLRequest(): ActiveGQLRequestHandle | null {
    const tab = this.resolveTurnTab()
    if (tab && tab.document?.type === "gql-request") {
      const document = tab.document
      return {
        request: document.request,
        /** Reactive getter for the tab's run/subscription event stream. */
        getEvents: () => document.response,
        commit: () => {
          const r = document.request
          document.request = {
            ...r,
            headers: [...r.headers],
          }
          document.isDirty = true
        },
      }
    }
    return null
  }

  private mockReply(contextString: string, hasRequest: boolean): string {
    return [
      "_(The AI backend isn't connected yet, so for now I can directly edit the open request. Try:)_",
      "- add header `Authorization: Bearer <token>`",
      "- add param `page=1, limit=20`",
      "- set method to `POST`",
      "- set url to `https://api.example.com`",
      '- set body to `{"name":"hopp"}`',
      "- set pre-request / test script",
      "- rename the request",
      "- save the request",
      "- run the request",
      "- new tab · close tab · next tab",
      "- switch interceptor to `<name>`",
      "- create / switch environment `<name>`",
      "- add env variable `baseUrl=https://api.example.com`",
      "- create collection `<name>` · save the request into `<collection>`",
      "- open request `<name>` from `<collection>`",
      "- chain steps: `set method to POST and run the request`",
      hasRequest ? "" : "\n_Open a request tab first so I can edit it._",
      contextString ? "\n**Context I can see:**\n\n" + contextString : "",
    ]
      .filter(Boolean)
      .join("\n")
  }

  /**
   * Executes an "app action" chat tool — running, saving, tab management, or
   * interceptor selection — and returns a short confirmation. Request-field
   * edits are handled separately by `applyToolCall`.
   */
  private async runAppAction(
    name: string,
    input: Record<string, unknown> | null | undefined,
    active: ActiveRequestHandle | null
  ): Promise<string> {
    const args = input ?? {}
    // The unified workspace's GQL tabs bind the same run/save actions the
    // REST pane does, so both request types are runnable/saveable from chat.
    const gqlActive = active ? null : this.getActiveGQLRequest()

    switch (name) {
      case "run_request": {
        if (!active && !gqlActive) {
          return "Open a request tab first so I can run it."
        }
        const unavailable = this.unavailableReply(
          "request.send-cancel",
          "Running requests"
        )
        if (unavailable) return unavailable
        // The send action acts on the ACTIVE tab — make sure that is ours.
        this.focusTurnTab()

        if (active) {
          // `request.send-cancel` is a toggle: invoking it mid-flight would
          // cancel the run while we report "Running…".
          if (active.getResponse()?.type === "loading") {
            return "A request is already running — wait for it to finish before running again."
          }
          if (!active.request.endpoint.trim()) {
            return "The request has no URL yet — set one first."
          }
          invokeAction("request.send-cancel")
          // Post a follow-up message once the response comes back.
          this.reportRunOutcome(active.getResponse)
          return "▶ Running the request…"
        }
        if (gqlActive) {
          if (!gqlActive.request.url.trim()) {
            return "The GraphQL request has no URL yet — set one first."
          }
          // A multi-operation document runs the named operation; without a
          // name the pane falls back to the document's first operation — so a
          // name that doesn't exist must not silently run something else.
          const operation = String(args.operation ?? "").trim()
          if (operation) {
            const names = this.listGQLOperations(gqlActive.request.query)
            if (names && !names.includes(operation)) {
              return `There is no operation named **${operation}** in the query${
                names.length ? ` — available: ${names.join(", ")}` : ""
              }.`
            }
          }
          // Mirror the run target in the editor so the visible cursor sits
          // on the operation being executed.
          this.moveGQLCursorToOperation(
            gqlActive.request.query,
            operation || undefined,
            "first"
          )
          invokeAction(
            "request.send-cancel",
            operation ? { operationName: operation } : undefined
          )
          this.reportGQLRunOutcome(gqlActive.getEvents)
          return operation
            ? `▶ Running the **${operation}** operation…`
            : "▶ Running the GraphQL operation…"
        }
        return "Open a request tab first so I can run it."
      }

      case "save_request": {
        if (!active && !gqlActive)
          return "Open a request tab first so I can save it."
        const unavailable = this.unavailableReply(
          "request-response.save",
          "Saving requests"
        )
        if (unavailable) return unavailable
        this.focusTurnTab()
        const document = this.resolveTurnTab()?.document as
          { saveContext?: unknown } | undefined
        const bound = !!document?.saveContext
        invokeAction("request-response.save")
        // An unbound tab gets the Save-As dialog, not a silent save.
        return bound
          ? "💾 Saved the request."
          : "💾 Opened the save dialog — pick a collection and confirm to finish saving."
      }

      case "open_new_tab": {
        const unavailable = this.unavailableReply(
          "tab.open-new",
          "Opening tabs"
        )
        if (unavailable) return unavailable
        invokeAction("tab.open-new")
        return "🗂️ Opened a new tab."
      }

      case "close_tab": {
        const unavailable = this.unavailableReply(
          "tab.close-current",
          "Closing tabs"
        )
        if (unavailable) return unavailable
        this.focusTurnTab()
        const closingId = this.tabService.currentActiveTab.value?.id
        invokeAction("tab.close-current")
        await nextTick()
        const stillOpen = this.tabService
          .getActiveTabs()
          .value.some((tab) => tab.id === closingId)
        if (stillOpen) {
          return "The tab wasn't closed — if it has unsaved changes, confirm in the dialog that just opened."
        }
        return "🗙 Closed the tab."
      }

      case "duplicate_tab": {
        const unavailable = this.unavailableReply(
          "tab.duplicate-tab",
          "Duplicating tabs"
        )
        if (unavailable) return unavailable
        this.focusTurnTab()
        invokeAction("tab.duplicate-tab", {})
        return "🗂️ Duplicated the current tab."
      }

      case "switch_tab": {
        const dir = String(args.direction ?? "next")
          .trim()
          .toLowerCase()
        const actions: Record<string, HoppActionWithOptionalArgs> = {
          next: "tab.next",
          previous: "tab.prev",
          prev: "tab.prev",
          first: "tab.switch-to-first",
          last: "tab.switch-to-last",
        }
        const action = actions[dir]
        if (!action) {
          return `Which tab? Use "next", "previous", "first", or "last".`
        }
        const unavailable = this.unavailableReply(action, "Switching tabs")
        if (unavailable) return unavailable
        invokeAction(action)
        return `🗂️ Switched to the ${dir} tab.`
      }

      case "switch_protocol":
        this.focusTurnTab()
        return this.switchProtocol(String(args.protocol ?? "").toLowerCase())

      case "set_interceptor":
        return this.setInterceptor(String(args.interceptor ?? "").trim())

      case "create_environment":
        return this.createEnv(String(args.name ?? "").trim(), args.variables)

      case "select_environment":
        return this.selectEnv(String(args.name ?? "").trim())

      case "add_or_update_environment_variables":
        return this.addEnvVars(args.variables)

      case "create_team":
        return this.createTeamWorkspace(String(args.name ?? "").trim())

      case "switch_workspace":
        return this.switchWorkspace(String(args.workspace ?? "").trim())

      case "rename_team":
        return this.renameTeamWorkspace(
          String(args.new_name ?? "").trim(),
          args.team ? String(args.team).trim() : undefined
        )

      case "create_collection":
        return this.createCollection(String(args.name ?? "").trim())

      case "save_request_to_collection":
        return this.saveRequestToCollection(
          String(args.collection ?? "").trim(),
          active
        )

      case "add_or_update_collection_requests":
        return this.upsertCollectionRequests(
          String(args.collection ?? "").trim(),
          args.requests
        )

      case "open_request":
        return this.openCollectionRequest(
          String(args.request ?? "").trim(),
          args.collection ? String(args.collection).trim() : undefined
        )

      case "set_collection_properties":
        return this.setCollectionProperties(
          String(args.collection ?? "").trim(),
          args
        )

      case "set_request_description":
        return this.setRequestDescription(
          String(args.description ?? ""),
          args.request ? String(args.request).trim() : undefined,
          args.collection ? String(args.collection).trim() : undefined,
          active,
          gqlActive
        )

      case "rename_collection":
        return this.renameCollection(
          String(args.collection ?? "").trim(),
          String(args.new_name ?? "").trim()
        )
      case "delete_collection":
        return this.deleteCollection(String(args.collection ?? "").trim())
      case "set_collection_description":
        return this.setCollectionDescription(
          String(args.collection ?? "").trim(),
          String(args.description ?? "")
        )

      case "publish_documentation":
        return this.publishDocumentation(
          String(args.collection ?? "").trim(),
          args.title ? String(args.title).trim() : undefined,
          args.version ? String(args.version).trim() : undefined,
          args.environment ? String(args.environment).trim() : undefined
        )

      case "unpublish_documentation":
        return this.unpublishDocumentation(
          String(args.collection ?? "").trim(),
          args.version ? String(args.version).trim() : undefined
        )

      case "create_mock_server":
        return this.createMockServer(
          String(args.collection ?? "").trim(),
          args.name ? String(args.name).trim() : undefined,
          this.optionalNumber(args.delay_ms),
          typeof args.public === "boolean" ? args.public : undefined
        )

      case "list_mock_servers":
        return this.listMockServers()

      case "update_mock_server":
        return this.updateMockServer(String(args.name ?? "").trim(), {
          active: typeof args.active === "boolean" ? args.active : undefined,
          delayMs: this.optionalNumber(args.delay_ms),
          isPublic: typeof args.public === "boolean" ? args.public : undefined,
          newName: args.new_name ? String(args.new_name).trim() : undefined,
        })

      case "delete_mock_server":
        return this.deleteMockServer(String(args.name ?? "").trim())

      case "get_graphql_schema":
        return this.getGraphQLSchema()

      case "list_collections":
        return this.listCollections()

      case "run_collection":
        return this.runCollection(
          String(args.collection ?? "").trim(),
          args.environment ? String(args.environment).trim() : undefined
        )

      default:
        return ""
    }
  }

  /**
   * Normalizes tool input into v2 environment variables, resolving opaque
   * client-local secret references without exposing their values to the model.
   */
  private toEnvVars(input: unknown): { variables: EnvVar[]; error?: string } {
    if (!Array.isArray(input)) return { variables: [] }

    const variables: EnvVar[] = []
    for (const entry of input) {
      if (!entry || typeof entry !== "object" || !("key" in entry)) continue

      const variable = entry as Record<string, unknown>
      const key = String(variable.key ?? "").trim()
      const secret = variable.secret === true
      const rawValue = String(variable.value ?? "")
      if (!key) continue

      // A reference anywhere in the value ("Bearer <<local-ref:…>>" too)
      // makes the variable a secret and must resolve in full.
      const hasReference = containsLocalSecretReference(rawValue)
      if (hasReference && !secret) {
        return {
          variables: [],
          error: `Environment variable "${key}" uses a local secret reference and must be marked as secret.`,
        }
      }
      let value = rawValue
      if (hasReference) {
        let missing = false
        value = rawValue.replace(LOCAL_SECRET_REFERENCE_GLOBAL, (match, id) => {
          const resolvedValue = this.localSecretValues.get(id)
          if (resolvedValue === undefined) {
            missing = true
            return match
          }
          return resolvedValue
        })
        if (missing) {
          return {
            variables: [],
            error: `The local secret reference for "${key}" is no longer available. Send the value again.`,
          }
        }
      }

      variables.push({
        key,
        currentValue: value,
        initialValue: value,
        secret,
      })
    }

    return { variables }
  }

  /** Returns the active team workspace's id, or null for a personal workspace. */
  private teamWorkspace(): { teamID: string } | null {
    const ws = this.workspaceService.currentWorkspace.value
    return ws.type === "team" ? { teamID: ws.teamID } : null
  }

  /** Merges incoming variables into existing ones by key, preserving secrets. */
  private mergeEnvVars(
    existing: EnvVar[],
    incoming: EnvVar[]
  ): { variables: EnvVar[]; skippedSecretKeys: string[] } {
    const merged = existing.map((v) => ({ ...v }))
    const skippedSecretKeys: string[] = []
    for (const nv of incoming) {
      // Variable names are case-sensitive (<<Token>> and <<token>> differ).
      const match = merged.find((m) => m.key.trim() === nv.key.trim())
      // Updating a secret requires explicitly marking the input as secret.
      if (match && (!match.secret || nv.secret)) {
        match.currentValue = nv.currentValue
        match.initialValue = nv.initialValue
        match.secret = match.secret || nv.secret
      } else if (match) {
        skippedSecretKeys.push(match.key)
      } else if (!match) {
        merged.push(nv)
      }
    }
    return { variables: merged, skippedSecretKeys }
  }

  /** Restores client-local values before a chat mutation rewrites an environment. */
  private hydrateEnvVars(envID: string, variables: EnvVar[]): EnvVar[] {
    return variables.map((variable, index) => {
      if (variable.secret) {
        const value =
          this.secretEnvironmentService.getSecretEnvironmentVariableValue(
            envID,
            index
          )
        return {
          ...variable,
          currentValue: value?.value ?? variable.currentValue,
          initialValue: value?.initialValue ?? variable.initialValue,
        }
      }

      const value = this.currentEnvironmentValueService.getEnvironmentVariable(
        envID,
        index
      )
      return {
        ...variable,
        currentValue: value?.currentValue ?? variable.currentValue,
      }
    })
  }

  /**
   * Creates an environment in the current workspace — a team environment when a
   * team workspace is active, otherwise a personal one — and makes it active.
   */
  private async createEnv(name: string, variables: unknown): Promise<string> {
    if (!name) return "What should the environment be called?"
    const parsedVars = this.toEnvVars(variables)
    if (parsedVars.error) return `⚠️ ${parsedVars.error}`
    const vars = parsedVars.variables
    const varNote = vars.length
      ? ` with ${vars.length} variable${vars.length > 1 ? "s" : ""}`
      : ""

    const storedVars = stripClientLocalValuesForWire(vars)
    const team = this.teamWorkspace()
    if (team) {
      const res = await createTeamEnvironment(
        JSON.stringify(storedVars),
        team.teamID,
        name
      )()
      if (E.isLeft(res)) {
        console.error(res.left)
        return "⚠️ I couldn't create the team environment. Please try again."
      }
      const created = res.right.createTeamEnvironment
      populateLocalStoresFromVariables(created.id, vars)
      setSelectedEnvironmentIndex({
        type: "TEAM_ENV",
        teamID: team.teamID,
        teamEnvID: created.id,
        environment: { v: 2, id: created.id, name, variables: storedVars },
      })
      return `🌐 Created team environment **${name}**${varNote} and made it active.`
    }

    const envID = uniqueID()
    createEnvironment(name, storedVars, envID)
    populateLocalStoresFromVariables(envID, vars)
    // `createEnvironment` dispatches synchronously, so the new env is last.
    const index = environmentsStore.value.environments.length - 1
    if (index >= 0) setSelectedEnvironmentIndex({ type: "MY_ENV", index })
    return `🌐 Created environment **${name}**${varNote} and made it active.`
  }

  /** Switches the active environment by name (or "none" to clear). */
  private async selectEnv(name: string): Promise<string> {
    const n = name.toLowerCase()
    if (!n || n === "none" || n === "no environment" || n === "no") {
      setSelectedEnvironmentIndex({ type: "NO_ENV_SELECTED" })
      return "🌐 Cleared the active environment (No environment)."
    }
    const team = this.teamWorkspace()
    if (team) {
      const envs = await this.fetchTeamEnvironments(team.teamID)
      if (!envs.length) {
        return "This team has no environments yet — want me to create one?"
      }
      const names = envs.map((e) => e.environment.name).join(", ")
      const match =
        envs.find((e) => e.environment.name.toLowerCase() === n) ??
        envs.find((e) => e.environment.name.toLowerCase().includes(n))
      if (!match) {
        return `I couldn't find a team environment matching "${name}". Available: ${names}.`
      }
      setSelectedEnvironmentIndex({
        type: "TEAM_ENV",
        teamID: team.teamID,
        teamEnvID: match.id,
        environment: match.environment,
      })
      return `🌐 Switched the active environment to **${match.environment.name}** (team).`
    }
    const envs = environmentsStore.value.environments
    if (!envs.length) {
      return "There are no environments yet — want me to create one?"
    }
    const names = envs.map((e) => e.name).join(", ")
    let index = envs.findIndex((e) => e.name.toLowerCase() === n)
    if (index === -1) {
      index = envs.findIndex((e) => e.name.toLowerCase().includes(n))
    }
    if (index === -1) {
      return `I couldn't find an environment matching "${name}". Available: ${names}.`
    }
    setSelectedEnvironmentIndex({ type: "MY_ENV", index })
    return `🌐 Switched the active environment to **${envs[index].name}**.`
  }

  /** Adds / updates variables in the currently selected environment. */
  private async addEnvVars(variables: unknown): Promise<string> {
    const parsedVars = this.toEnvVars(variables)
    if (parsedVars.error) return `⚠️ ${parsedVars.error}`
    const incoming = parsedVars.variables
    if (!incoming.length) return "No variables were provided."
    const count = incoming.length

    const selected = getSelectedEnvironmentIndex()

    if (selected.type === "TEAM_ENV") {
      const env = selected.environment
      const { variables: merged, skippedSecretKeys } = this.mergeEnvVars(
        this.hydrateEnvVars(selected.teamEnvID, env.variables as EnvVar[]),
        incoming
      )
      const updatedCount = count - skippedSecretKeys.length
      if (updatedCount === 0) {
        return `⚠️ I didn't update ${skippedSecretKeys.join(
          ", "
        )} because existing secret variables must be marked as secret.`
      }
      const storedVars = stripClientLocalValuesForWire(merged)
      const res = await updateTeamEnvironment(
        JSON.stringify(storedVars),
        selected.teamEnvID,
        env.name
      )()
      if (E.isLeft(res)) {
        console.error(res.left)
        return "⚠️ I couldn't update the team environment. Please try again."
      }
      populateLocalStoresFromVariables(selected.teamEnvID, merged)
      setSelectedEnvironmentIndex({
        ...selected,
        environment: { ...env, variables: storedVars },
      })
      return `🌐 Updated ${updatedCount} variable${
        updatedCount > 1 ? "s" : ""
      } in team environment **${env.name}**.${
        skippedSecretKeys.length
          ? ` Skipped ${skippedSecretKeys.join(
              ", "
            )} because it is a secret variable.`
          : ""
      }`
    }

    if (selected.type !== "MY_ENV") {
      return "Select or create an environment first, then I can add variables to it."
    }
    const env = environmentsStore.value.environments[selected.index]
    if (!env) return "I couldn't find the selected environment."

    const { variables: merged, skippedSecretKeys } = this.mergeEnvVars(
      this.hydrateEnvVars(env.id, env.variables as EnvVar[]),
      incoming
    )
    const updatedCount = count - skippedSecretKeys.length
    if (updatedCount === 0) {
      return `⚠️ I didn't update ${skippedSecretKeys.join(
        ", "
      )} because existing secret variables must be marked as secret.`
    }
    setEnvironmentVariables(
      selected.index,
      stripClientLocalValuesForWire(merged)
    )
    populateLocalStoresFromVariables(env.id, merged)
    return `🌐 Updated ${updatedCount} variable${
      updatedCount > 1 ? "s" : ""
    } in **${env.name}**.${
      skippedSecretKeys.length
        ? ` Skipped ${skippedSecretKeys.join(
            ", "
          )} because it is a secret variable.`
        : ""
    }`
  }

  /** Creates a REST collection in the active workspace (personal or team). */
  private async createCollection(name: string): Promise<string> {
    if (!name) return "What should the collection be called?"
    const team = this.teamWorkspace()
    if (team) return this.createTeamCollection(name, team.teamID)
    const existing = findTopLevelCollection(
      restCollectionStore.value.state,
      name
    )
    if (existing) {
      return `📁 Collection **${existing.collection.name}** already exists.`
    }
    addRESTCollection(
      makeCollection({
        name,
        folders: [],
        requests: [],
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: [],
        description: null,
        preRequestScript: "",
        testScript: "",
      })
    )
    return `📁 Created collection **${name}**.`
  }

  /** Saves the active request into a collection (matched by name) of the active workspace. */
  private async saveRequestToCollection(
    name: string,
    active: ActiveRequestHandle | null
  ): Promise<string> {
    if (!active) return "Open a request tab first so I can save it."
    if (!name) return "Which collection should I save it into?"
    const team = this.teamWorkspace()
    if (team) return this.saveRequestToTeamCollection(name, active, team.teamID)
    const collections = restCollectionStore.value.state
    const found = findCollectionByName(collections, name)
    if (!found) {
      const names = collections
        .map((c) => c.name)
        .filter(Boolean)
        .join(", ")
      return `I couldn't find a collection named "${name}". Available: ${
        names || "none"
      }.`
    }
    // A new collection entry needs its own identity — with the source's
    // `id`/`_ref_id`, sync would edit the original row instead of adding one.
    const saved = this.cloneRequest(active.request)
    saved._ref_id = generateUniqueRefId("req")
    delete (saved as { id?: string }).id
    const insertionIndex = saveRESTRequestAs(found.path, saved)
    // Bind the tab to the saved entry (as the Save dialog does) so a follow-up
    // save updates it instead of creating another copy.
    active.bindToCollection(
      {
        originLocation: "user-collection",
        folderPath: found.path,
        requestIndex: insertionIndex,
        requestRefID: saved._ref_id,
        exampleID: undefined,
      },
      this.cloneRequest(saved)
    )
    return `📁 Saved the request into **${found.collection.name}**.`
  }

  /**
   * Materializes a complete set of REST endpoints without requiring a separate
   * open-tab/save loop for each request.
   */
  private async upsertCollectionRequests(
    name: string,
    requests: unknown
  ): Promise<string> {
    if (!name) return "Which collection should contain these requests?"
    const team = this.teamWorkspace()
    if (team)
      return this.upsertTeamCollectionRequests(name, requests, team.teamID)

    const found = findCollectionByName(restCollectionStore.value.state, name)
    if (!found) return `I couldn't find a collection named "${name}".`

    const parsed = parseCollectionRequestDefinitions(requests)
    if ("error" in parsed) return `⚠️ ${parsed.error}`

    let created = 0
    let updated = 0
    const path = found.path

    for (const definition of parsed.definitions) {
      const requestIndex = found.collection.requests.findIndex(
        (request) =>
          isRESTRequest(request) &&
          request.name.trim().toLowerCase() === definition.name.toLowerCase()
      )
      const candidate =
        requestIndex === -1
          ? undefined
          : found.collection.requests[requestIndex]
      const request = buildCollectionRequest(
        definition,
        candidate && isRESTRequest(candidate) ? candidate : undefined
      )

      if (requestIndex === -1) {
        saveRESTRequestAs(path, request)
        created += 1
      } else {
        editRESTRequest(path, requestIndex, request)
        updated += 1
        // A tab already showing this request would otherwise keep (and later
        // re-save) the stale version.
        const bound = this.tabService.getTabRefWithSaveContext({
          originLocation: "user-collection",
          folderPath: path,
          requestIndex,
          requestRefID: request._ref_id ?? request.id ?? "",
          exampleID: undefined,
        })
        if (bound && bound.value.document.type === "request") {
          bound.value.document.request = this.cloneRequest(request)
          bound.value.document.isDirty = false
        }
      }
    }

    const changes = [
      created ? `${created} created` : "",
      updated ? `${updated} updated` : "",
    ]
      .filter(Boolean)
      .join(", ")
    return `📁 Collection **${found.collection.name}**: ${changes}.`
  }

  /** Opens a saved request from the active workspace's collections into a tab (by name). */
  private async openCollectionRequest(
    reqName: string,
    collName?: string
  ): Promise<string> {
    if (!reqName) return "Which request should I open?"
    const team = this.teamWorkspace()
    if (team)
      return this.openTeamCollectionRequest(reqName, collName, team.teamID)
    const collections = restCollectionStore.value.state
    const found = findRequestInTree(collections, reqName, collName)
    if (!found) {
      const available = listRequestNames(collections)
      return `I couldn't find a request named "${reqName}"${
        collName ? ` in "${collName}"` : ""
      }.${available ? ` Available: ${available}.` : ""}`
    }

    const { request, folderPath, requestIndex } = found
    if (!isRESTRequest(request)) {
      const label = (request as { name?: string }).name || reqName
      return `**${label}** is a GraphQL request — open it from the collection sidebar; chat can currently open REST requests only.`
    }
    const requestRefID = (request as { _ref_id?: string })._ref_id ?? request.id
    const saveContext = {
      originLocation: "user-collection" as const,
      folderPath,
      requestIndex,
      requestRefID,
    }

    const existing = this.tabService.getTabRefWithSaveContext(saveContext)
    if (existing) {
      this.tabService.setActiveTab(existing.value.id)
    } else {
      const created = this.tabService.createNewTab({
        type: "request",
        request: this.cloneRequest(request),
        isDirty: false,
        saveContext,
        inheritedProperties: cascadeParentCollectionForProperties(
          folderPath,
          "rest"
        ),
      })
      // createNewTab focuses it already; set it explicitly to be safe.
      this.tabService.setActiveTab(created.id)
    }
    return `📂 Opened **${request.name || "request"}** in a tab.`
  }

  /** Runs a personal collection and resolves after its test-runner summary is available. */
  private async runCollection(
    name: string,
    environmentName?: string
  ): Promise<string> {
    if (!name) return "Which collection should I run?"
    const team = this.teamWorkspace()
    if (team) return this.runTeamCollection(name, environmentName)

    const found = findCollectionByName(restCollectionStore.value.state, name)
    if (!found) return `I couldn't find a collection named "${name}".`

    const totalRequests = this.countCollectionRequests(found.collection)
    if (totalRequests === 0) {
      return `⚠️ Collection **${found.collection.name}** has no requests to run.`
    }
    const collectionID = found.collection._ref_id
    if (!collectionID) {
      return `⚠️ Collection **${found.collection.name}** has no stable identifier and cannot be run.`
    }

    if (environmentName) {
      const selectionReply = await this.selectEnv(environmentName)
      if (!selectionReply.startsWith("🌐")) return selectionReply
    }

    const tab = this.tabService.createNewTab({
      type: "test-runner",
      collectionType: "my-collections",
      collectionID,
      collection: this.cloneCollection(found.collection),
      isDirty: false,
      config: {
        iterations: 1,
        delay: 500,
        stopOnError: false,
        persistResponses: true,
        keepVariableValues: true,
      },
      selectedRequestRefIds: undefined,
      status: "idle",
      request: null,
      environmentName:
        getSelectedEnvironmentIndex().type === "NO_ENV_SELECTED"
          ? undefined
          : getCurrentEnvironment().name,
      testRunnerMeta: {
        completedRequests: 0,
        totalRequests: 0,
        totalTime: 0,
        failedTests: 0,
        passedTests: 0,
        totalTests: 0,
      },
    })

    const runnerTab = this.getTestRunnerTabRef(tab.id)
    const stopRef = ref(false)
    const result = this.waitForCollectionRun(
      tab.id,
      found.collection.name,
      () => {
        if (!this.testRunnerService.stopRun(tab.id)) {
          stopRef.value = true
        }
      }
    )
    this.testRunnerService.runTests(
      runnerTab,
      runnerTab.value.document.collection,
      {
        ...runnerTab.value.document.config,
        stopRef,
      }
    )
    return result
  }

  /**
   * Retains the reactive runner document after the tab is closed so the runner
   * can observe its stop signal without dereferencing a deleted workspace tab.
   */
  private getTestRunnerTabRef(
    tabID: string
  ): ShallowRef<HoppTab<HoppTestRunnerDocument>> {
    const tab = this.tabService.getTabRef(tabID).value
    if (tab.document.type !== "test-runner") {
      throw new Error(`Tab "${tabID}" is not a collection runner.`)
    }
    return shallowRef({ ...tab, document: tab.document })
  }

  /** Waits for the directly-started runner to settle or be closed by the user. */
  private waitForCollectionRun(
    tabID: string,
    collectionName: string,
    stopRun: () => void,
    // A tab created "idle" relies on the runner UI to start it — give up if
    // that never happens (e.g. the workspace page is not mounted).
    idleTimeoutMs?: number
  ): Promise<string> {
    return new Promise((resolve) => {
      let stop: (() => void) | null = null
      let idleTimer: ReturnType<typeof setTimeout> | null = null
      const tabs = this.tabService.getActiveTabs()

      const finish = (message: string) => {
        if (stop) stop()
        if (idleTimer) clearTimeout(idleTimer)
        resolve(message)
      }

      if (idleTimeoutMs) {
        idleTimer = setTimeout(() => {
          const tab = tabs.value.find((entry) => entry.id === tabID)
          if (
            tab?.document.type === "test-runner" &&
            tab.document.status === "idle"
          ) {
            finish(
              `⚠️ The runner for **${collectionName}** didn't start — open the REST workspace and run it from the collection sidebar.`
            )
          }
        }, idleTimeoutMs)
      }

      stop = watch(
        (): CollectionRunSnapshot | null => {
          const tab = tabs.value.find((entry) => entry.id === tabID)
          if (!tab) return null
          const document = tab.document
          if (document.type !== "test-runner") return null
          return {
            status: document.status,
            meta: { ...document.testRunnerMeta },
            resultCollection: document.resultCollection,
          }
        },
        (snapshot) => {
          if (!snapshot) {
            stopRun()
            finish(
              `⚠️ The runner for **${collectionName}** was closed before verification completed.`
            )
            return
          }
          if (snapshot.status === "error" || snapshot.status === "stopped") {
            finish(this.describeCollectionRun(collectionName, snapshot))
          }
        }
      )
    })
  }

  private countCollectionRequests(collection: HoppCollection): number {
    return (
      collection.requests.length +
      collection.folders.reduce(
        (total, folder) => total + this.countCollectionRequests(folder),
        0
      )
    )
  }

  private describeCollectionRun(
    collectionName: string,
    snapshot: CollectionRunSnapshot
  ): string {
    const { meta } = snapshot
    if (meta.totalRequests === 0) {
      return `⚠️ **${collectionName}** stopped without executing any requests; it was not verified.`
    }

    const summary = `${meta.completedRequests}/${meta.totalRequests} endpoints completed · ${meta.passedTests}/${meta.totalTests} tests passed · ${Math.round(meta.totalTime)} ms`
    const failures = this.getCollectionRunFailures(snapshot.resultCollection)

    if (snapshot.status === "error") {
      return `❌ **${collectionName}** could not complete verification: ${summary}${
        failures.length ? ` · Issues: ${failures.join("; ")}` : ""
      }`
    }
    if (meta.totalTests === 0) {
      return `⚠️ **${collectionName}** ran, but no test assertions executed: ${summary}. The endpoints are not verified by tests.${
        failures.length ? ` Issues: ${failures.join("; ")}` : ""
      }`
    }
    if (
      meta.completedRequests < meta.totalRequests ||
      meta.failedTests > 0 ||
      failures.length
    ) {
      return `⚠️ **${collectionName}** completed with verification issues: ${summary}${
        failures.length ? ` · Issues: ${failures.join("; ")}` : ""
      }`
    }
    return `✅ **${collectionName}** verified: ${summary}.`
  }

  private getCollectionRunFailures(
    collection: HoppCollection | undefined
  ): string[] {
    if (!collection) return []

    const failures: string[] = []
    const walk = (node: HoppCollection) => {
      for (const request of node.requests) {
        if (!request || typeof request !== "object" || !("name" in request)) {
          continue
        }
        const name =
          typeof request.name === "string" && request.name
            ? request.name
            : "Unnamed request"
        const error = "error" in request ? request.error : undefined
        const failedTests =
          "failedTests" in request && typeof request.failedTests === "number"
            ? request.failedTests
            : 0

        if (typeof error === "string" && error) {
          failures.push(`${name}: ${error}`)
        } else if (failedTests > 0) {
          failures.push(
            `${name}: ${failedTests} test${failedTests > 1 ? "s" : ""} failed`
          )
        }
      }
      node.folders.forEach(walk)
    }

    walk(collection)
    return failures.slice(0, 3)
  }

  // ---------------------------------------------------------------------------
  // Teams & workspaces
  // ---------------------------------------------------------------------------

  private _teamListAdapter?: ReturnType<
    WorkspaceService["acquireTeamListAdapter"]
  >

  /** The shared team-list adapter, acquired once (each acquire registers a lock). */
  private teamListAdapter() {
    return (this._teamListAdapter ??=
      this.workspaceService.acquireTeamListAdapter(null))
  }

  /** The user's teams, fetching them once if the shared list is still empty. */
  /**
   * The user's teams, refreshed on every call (a team created or joined a
   * moment ago must be findable) — the cached list is the fallback.
   */
  private async loadTeams(): Promise<TeamListEntry[]> {
    const adapter = this.teamListAdapter()
    try {
      await adapter.fetchList()
    } catch (e) {
      console.error("[AIChat] failed to refresh teams:", e)
    }
    return adapter.teamList$.value
  }

  /**
   * Resolves a team by name: an exact match wins, then a UNIQUE partial
   * match; several partial matches are reported instead of guessed (these
   * lookups precede shared, irreversible actions like renaming).
   */
  private findTeam(
    teams: TeamListEntry[],
    name: string
  ): { team: TeamListEntry } | { ambiguous: TeamListEntry[] } | null {
    const n = name.trim().toLowerCase()
    if (!n) return null
    const exact = teams.find((t) => t.name.toLowerCase() === n)
    if (exact) return { team: exact }
    const partial = teams.filter((t) => t.name.toLowerCase().includes(n))
    if (partial.length === 1) return { team: partial[0] }
    if (partial.length > 1) return { ambiguous: partial }
    return null
  }

  /** Viewers cannot write to a team — say so instead of surfacing a 403. */
  private teamWriteError(): string | null {
    const ws = this.workspaceService.currentWorkspace.value
    if (ws.type === "team" && ws.role === TeamAccessRole.Viewer) {
      return `⚠️ You have view-only access to team **${ws.teamName}** — an owner or editor has to make that change.`
    }
    return null
  }

  private describeGQLError(err: GQLError<string>): string {
    if (err.type === "network_error") return "network error"
    switch (err.error) {
      case "team/not_required_role":
      case "team_req/not_required_role":
      case "Forbidden resource":
      case "ea/not_invite_or_admin":
        return "you don't have permission to do that"
      case "team/name_invalid":
        return "the team name is invalid"
      case "team_coll/short_title":
        return "the collection name is too short"
      case "team/invalid_coll_id":
        return "the collection no longer exists"
      case "team_req/not_found":
        return "the request no longer exists"
      case "published_docs/invalid_collection":
        return "that collection isn't published/publishable on the server"
      case "published_docs/not_found":
        return "that published version no longer exists"
      case "published_docs/creation_failed":
        return "the server couldn't create it (a version with that name may already exist — try again)"
      case "user_environment/not_found":
      case "team_environment/not_found":
        return "that environment hasn't synced to the server yet or no longer exists"
      case "published_docs/forbidden_environment_access":
        return "you can't attach that environment"
      default:
        return err.error || "unexpected error"
    }
  }

  /** Switches to a team and waits for its collection tree to load. */
  private async switchToTeam(team: {
    id: string
    name: string
    myRole?: TeamAccessRole | null
  }) {
    applyLocalState("REMEMBERED_TEAM_ID", team.id)
    this.workspaceService.changeWorkspace({
      type: "team",
      teamID: team.id,
      teamName: team.name,
      role: team.myRole,
    })
    await this.teamListAdapter()
      .fetchList()
      .catch(() => {})
    await this.awaitTeamCollectionsLoaded()
  }

  private async createTeamWorkspace(name: string): Promise<string> {
    if (!name) return "What should the team be called?"
    const decoded = TeamNameCodec.decode(name)
    if (E.isLeft(decoded)) return `⚠️ "${name}" isn't a valid team name.`
    const res = await createTeam(decoded.right)()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't create the team: ${this.describeGQLError(res.left)}.`
    }
    const team = res.right
    await this.switchToTeam({
      id: team.id,
      name: team.name,
      myRole: team.myRole,
    })
    return `👥 Created team **${team.name}** and switched to it.`
  }

  private async switchWorkspace(target: string): Promise<string> {
    const t = target.toLowerCase()
    if (!t) return 'Which workspace — "personal" or a team name?'
    const current = this.workspaceService.currentWorkspace.value
    if (
      t === "personal" ||
      t === "my workspace" ||
      t === "me" ||
      t === "mine"
    ) {
      if (current.type === "personal") {
        return "You're already in your personal workspace."
      }
      applyLocalState("REMEMBERED_TEAM_ID", undefined)
      this.workspaceService.changeWorkspace({ type: "personal" })
      return "🏠 Switched to your personal workspace."
    }
    const teams = await this.loadTeams()
    const match = this.findTeam(teams, target)
    if (!match) {
      const names = teams.map((x) => x.name).join(", ")
      return `I couldn't find a team named "${target}". Your teams: ${names || "none"}.`
    }
    if ("ambiguous" in match) {
      return `Several teams match "${target}": ${match.ambiguous
        .map((x) => x.name)
        .join(", ")} — which one?`
    }
    const team = match.team
    if (current.type === "team" && current.teamID === team.id) {
      return `You're already in team **${team.name}**.`
    }
    await this.switchToTeam(team)
    return `👥 Switched to team **${team.name}**.`
  }

  private async renameTeamWorkspace(
    newName: string,
    teamName?: string
  ): Promise<string> {
    if (!newName) return "What should the team's new name be?"
    const current = this.workspaceService.currentWorkspace.value
    let target: { id: string; name: string; myRole?: TeamAccessRole | null }
    if (teamName) {
      const match = this.findTeam(await this.loadTeams(), teamName)
      if (!match) return `I couldn't find a team named "${teamName}".`
      if ("ambiguous" in match) {
        return `Several teams match "${teamName}": ${match.ambiguous
          .map((x) => x.name)
          .join(", ")} — which one should I rename?`
      }
      target = match.team
    } else if (current.type === "team") {
      target = {
        id: current.teamID,
        name: current.teamName,
        myRole: current.role,
      }
    } else {
      return "Which team should I rename? You're in the personal workspace."
    }
    if (target.myRole !== TeamAccessRole.Owner) {
      return `⚠️ Only a team owner can rename **${target.name}**.`
    }
    const decoded = TeamNameCodec.decode(newName)
    if (E.isLeft(decoded)) return `⚠️ "${newName}" isn't a valid team name.`
    const res = await renameTeam(target.id, decoded.right)()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't rename the team: ${this.describeGQLError(res.left)}.`
    }
    if (current.type === "team" && current.teamID === target.id) {
      this.workspaceService.updateWorkspaceTeamName(newName)
    }
    void this.teamListAdapter()
      .fetchList()
      .catch(() => {})
    return `✏️ Renamed team **${target.name}** to **${newName}**.`
  }

  // ---------------------------------------------------------------------------
  // Team collections
  // ---------------------------------------------------------------------------

  /**
   * The team tree loads asynchronously after a workspace switch (root query,
   * then subscriptions) — wait for the roots before searching it by name.
   */
  private async awaitTeamCollectionsLoaded() {
    const started = Date.now()
    await nextTick()
    const isLoadingRoots = () =>
      this.teamCollectionService.loadingCollections.value.includes("root")
    const hasRoots = () =>
      this.teamCollectionService.collections.value.length > 0
    // Phase 1: the root load starts a tick (and a login check) after the
    // switch — wait briefly for it to begin, unless roots are already there.
    while (!isLoadingRoots() && !hasRoots() && Date.now() - started < 1500) {
      await delay(50)
    }
    // Phase 2: wait for the load to finish (a team with zero collections
    // finishes with an empty tree — no fixed grace period needed).
    while (isLoadingRoots() && Date.now() - started < TEAM_TREE_TIMEOUT_MS) {
      await delay(50)
    }
  }

  /** Expands a team collection (loads its folders + requests) and waits for it. */
  private async expandTeamCollection(collectionID: string) {
    await this.teamCollectionService.expandCollection(collectionID)
    const started = Date.now()
    // expandCollection returns at once when another expansion is in flight.
    while (
      this.teamCollectionService.loadingCollections.value.includes(
        collectionID
      ) &&
      Date.now() - started < TEAM_TREE_TIMEOUT_MS
    ) {
      await delay(50)
    }
  }

  /**
   * Inherited auth/headers/variables/scripts for a team path. The cascade's
   * inferred return type is looser than the tab document's field (its
   * not-found fallback widens `authType`), but the runtime shape is the one
   * the sidebar assigns — cast once here.
   */
  private async teamInheritedProperties(
    path: string
  ): Promise<HoppInheritedProperty> {
    return (await this.teamCollectionService.cascadeParentCollectionForPropertiesAsync(
      path
    )) as HoppInheritedProperty
  }

  /** Waits for a freshly created collection to be echoed into the tree. */
  private async awaitTeamCollectionInTree(
    collectionID: string
  ): Promise<boolean> {
    const started = Date.now()
    while (Date.now() - started < 3000) {
      if (this.teamCollectionService.findCollectionByID(collectionID)) {
        return true
      }
      await delay(50)
    }
    return false
  }

  /** Waits for a freshly created request to be echoed into its collection. */
  private async awaitTeamRequestInTree(
    node: TeamCollection,
    requestID: string
  ): Promise<boolean> {
    const started = Date.now()
    while (Date.now() - started < 3000) {
      if ((node.requests ?? []).some((r) => r.id === requestID)) return true
      await delay(50)
    }
    return false
  }

  /**
   * Finds a team collection or folder by name in the loaded tree — roots
   * first, then one level of folders (expanding roots on demand, bounded).
   * Returns the node and its slash-joined id path (what save contexts need).
   */
  private async findTeamCollectionByName(
    name: string
  ): Promise<{ node: TeamCollection; path: string } | null> {
    await this.awaitTeamCollectionsLoaded()
    const n = name.trim().toLowerCase()
    if (!n) return null
    const walk = (
      nodes: TeamCollection[],
      parentPath: string
    ): { node: TeamCollection; path: string } | null => {
      for (const node of nodes) {
        const path = parentPath ? `${parentPath}/${node.id}` : node.id
        if ((node.title ?? "").trim().toLowerCase() === n) return { node, path }
      }
      for (const node of nodes) {
        const path = parentPath ? `${parentPath}/${node.id}` : node.id
        const inner = node.children ? walk(node.children, path) : null
        if (inner) return inner
      }
      return null
    }
    const roots = this.teamCollectionService.collections.value
    const direct = walk(roots, "")
    if (direct) return direct
    for (const root of roots.slice(0, MAX_TEAM_ROOTS_TO_EXPAND)) {
      if (root.children === null) await this.expandTeamCollection(root.id)
    }
    return walk(this.teamCollectionService.collections.value, "")
  }

  /**
   * Finds a request by name in the team's collections (optionally scoped to a
   * collection/folder), ranked like the personal lookup. Only loaded
   * (expanded) folders are searched; roots are expanded on demand.
   */
  private async findTeamRequestByName(
    reqName: string,
    collName?: string
  ): Promise<{ request: TeamRequest; path: string } | null> {
    await this.awaitTeamCollectionsLoaded()
    let scope: Array<{ node: TeamCollection; path: string }>
    if (collName) {
      const found = await this.findTeamCollectionByName(collName)
      if (!found) return null
      await this.expandTeamCollection(found.node.id)
      scope = [found]
    } else {
      const roots = this.teamCollectionService.collections.value
      for (const root of roots.slice(0, MAX_TEAM_ROOTS_TO_EXPAND)) {
        if (root.requests === null) await this.expandTeamCollection(root.id)
      }
      scope = this.teamCollectionService.collections.value.map((node) => ({
        node,
        path: node.id,
      }))
    }
    const candidates: Array<{ request: TeamRequest; path: string }> = []
    const collect = (node: TeamCollection, path: string) => {
      for (const request of node.requests ?? [])
        candidates.push({ request, path })
      for (const child of node.children ?? [])
        collect(child, `${path}/${child.id}`)
    }
    for (const { node, path } of scope) collect(node, path)

    const target = reqName.trim().toLowerCase()
    const title = (c: { request: TeamRequest }) =>
      (c.request.title || c.request.request.name || "").toLowerCase()
    const endpoint = (c: { request: TeamRequest }) => {
      const r = c.request.request
      return (
        isRESTRequest(r) ? r.endpoint : ((r as { url?: string }).url ?? "")
      ).toLowerCase()
    }
    return (
      candidates.find((c) => title(c) === target) ??
      candidates.find((c) => title(c) && title(c).includes(target)) ??
      candidates.find((c) => title(c) && target.includes(title(c))) ??
      candidates.find((c) => endpoint(c).includes(target)) ??
      null
    )
  }

  private async createTeamCollection(
    name: string,
    teamID: string
  ): Promise<string> {
    const writeError = this.teamWriteError()
    if (writeError) return writeError
    // Root-only duplicate check — expanding every root just to look for a
    // same-named folder would cost dozens of queries.
    await this.awaitTeamCollectionsLoaded()
    const n = name.trim().toLowerCase()
    const existing = this.teamCollectionService.collections.value.find(
      (c) => (c.title ?? "").trim().toLowerCase() === n
    )
    if (existing) {
      return `📁 Team collection **${existing.title}** already exists.`
    }
    const res = await createNewRootCollection(name, teamID)()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't create the collection: ${this.describeGQLError(res.left)}.`
    }
    const echoed = await this.awaitTeamCollectionInTree(
      res.right.createRootCollection.id
    )
    return echoed
      ? `📁 Created team collection **${name}**.`
      : `📁 Created team collection **${name}** on the server, but the workspace hasn't refreshed it yet — switch workspaces or reload before adding requests to it.`
  }

  private async saveRequestToTeamCollection(
    name: string,
    active: ActiveRequestHandle,
    teamID: string
  ): Promise<string> {
    const writeError = this.teamWriteError()
    if (writeError) return writeError
    const found = await this.findTeamCollectionByName(name)
    if (!found) {
      const names = this.teamCollectionService.collections.value
        .map((c) => c.title)
        .filter(Boolean)
        .join(", ")
      return `I couldn't find a team collection named "${name}". Available: ${names || "none"}.`
    }
    // A new entry needs its own identity — the backend row id is carried in
    // the save context, and a stale `id` would make sync edit the original.
    const saved = this.cloneRequest(active.request)
    saved._ref_id = generateUniqueRefId("req")
    delete (saved as { id?: string }).id
    const res = await createRequestInCollection(found.node.id, {
      request: JSON.stringify(saved),
      teamID,
      title: saved.name,
    })()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't save the request: ${this.describeGQLError(res.left)}.`
    }
    const created = res.right.createRequestInCollection
    const inheritedProperties = await this.teamInheritedProperties(found.path)
    active.bindToCollection(
      {
        originLocation: "team-collection",
        requestID: created.id,
        collectionID: found.path,
        teamID,
        exampleID: undefined,
        requestRefID: saved._ref_id,
      },
      this.cloneRequest(saved),
      inheritedProperties
    )
    return `📁 Saved the request into team collection **${found.node.title}**.`
  }

  private async upsertTeamCollectionRequests(
    name: string,
    requests: unknown,
    teamID: string
  ): Promise<string> {
    const writeError = this.teamWriteError()
    if (writeError) return writeError
    const found = await this.findTeamCollectionByName(name)
    if (!found) return `I couldn't find a team collection named "${name}".`
    const parsed = parseCollectionRequestDefinitions(requests)
    if ("error" in parsed) return `⚠️ ${parsed.error}`
    // Existing requests are matched by title, so the folder must be loaded.
    await this.expandTeamCollection(found.node.id)

    let created = 0
    let updated = 0
    const failures: string[] = []
    // Requests created earlier in this call, in case the server echo that
    // adds them to the tree has not landed yet.
    const createdByTitle = new Map<string, TeamRequest>()
    for (const definition of parsed.definitions) {
      const target = definition.name.toLowerCase()
      // REST rows only — a team collection also holds GraphQL requests, and
      // a same-named one must never be overwritten with a REST body.
      const existing =
        createdByTitle.get(target) ??
        (found.node.requests ?? []).find(
          (r) =>
            isRESTRequest(r.request) &&
            (r.title || r.request.name || "").trim().toLowerCase() === target
        )
      const base =
        existing && isRESTRequest(existing.request)
          ? existing.request
          : undefined
      const request = buildCollectionRequest(definition, base)

      if (existing) {
        const res = await updateTeamRequest(existing.id, {
          request: JSON.stringify(request),
          title: request.name,
        })()
        if (E.isLeft(res)) {
          failures.push(
            `${definition.name}: ${this.describeGQLError(res.left)}`
          )
          continue
        }
        updated += 1
        // Keep the sidebar copy and any open tab in step with the server.
        existing.request = request
        existing.title = request.name
        const bound = this.tabService.getTabRefWithSaveContext({
          originLocation: "team-collection",
          requestID: existing.id,
          exampleID: undefined,
        })
        if (bound && bound.value.document.type === "request") {
          bound.value.document.request = this.cloneRequest(request)
          bound.value.document.isDirty = false
        }
      } else {
        request._ref_id = generateUniqueRefId("req")
        delete (request as { id?: string }).id
        const res = await createRequestInCollection(found.node.id, {
          request: JSON.stringify(request),
          teamID,
          title: request.name,
        })()
        if (E.isLeft(res)) {
          failures.push(
            `${definition.name}: ${this.describeGQLError(res.left)}`
          )
          continue
        }
        created += 1
        const createdID = res.right.createRequestInCollection.id
        createdByTitle.set(target, {
          id: createdID,
          collectionID: found.node.id,
          title: request.name,
          request,
        })
        if (!(await this.awaitTeamRequestInTree(found.node, createdID))) {
          console.warn(
            `[AIChat] team request ${createdID} was not echoed into the tree`
          )
        }
      }
    }

    const changes = [
      created ? `${created} created` : "",
      updated ? `${updated} updated` : "",
      failures.length ? `${failures.length} failed` : "",
    ]
      .filter(Boolean)
      .join(", ")
    return `📁 Team collection **${found.node.title}**: ${changes || "no changes"}.${
      failures.length ? ` Issues: ${failures.join("; ")}` : ""
    }`
  }

  private async openTeamCollectionRequest(
    reqName: string,
    collName: string | undefined,
    teamID: string
  ): Promise<string> {
    const found = await this.findTeamRequestByName(reqName, collName)
    if (!found) {
      return `I couldn't find a request named "${reqName}" in this team's collections${
        collName ? ` under "${collName}"` : ""
      }. Expand the collection in the sidebar if it hasn't been loaded yet.`
    }
    const { request: teamRequest, path } = found
    const label = teamRequest.title || teamRequest.request.name || reqName
    if (!isRESTRequest(teamRequest.request)) {
      return `**${label}** is a GraphQL request — open it from the collection sidebar; chat can currently open REST requests only.`
    }
    const existing = this.tabService.getTabRefWithSaveContext({
      originLocation: "team-collection",
      requestID: teamRequest.id,
      exampleID: undefined,
    })
    if (existing) {
      this.tabService.setActiveTab(existing.value.id)
    } else {
      const inheritedProperties = await this.teamInheritedProperties(path)
      const created = this.tabService.createNewTab({
        type: "request",
        request: this.cloneRequest(teamRequest.request),
        isDirty: false,
        saveContext: {
          originLocation: "team-collection",
          requestID: teamRequest.id,
          collectionID: path,
          teamID,
          exampleID: undefined,
          requestRefID: teamRequest.request.id,
        },
        inheritedProperties,
      })
      this.tabService.setActiveTab(created.id)
    }
    return `📂 Opened **${label}** in a tab.`
  }

  private async runTeamCollection(
    name: string,
    environmentName: string | undefined
  ): Promise<string> {
    const found = await this.findTeamCollectionByName(name)
    if (!found) return `I couldn't find a team collection named "${name}".`

    // The runner needs the complete subtree with requests — the sidebar tree
    // is lazily loaded, so fetch it like the runner dialog does.
    const tree = await pipe(
      getCompleteCollectionTree(found.node.id),
      TE.match(
        (err: GQLError<string>) => {
          console.error("[AIChat] failed to load team collection:", err)
          return null as HoppCollection | null
        },
        (coll) => teamCollToHoppRESTColl(coll)
      )
    )()
    if (!tree) {
      return `⚠️ Couldn't load team collection **${found.node.title}** from the server.`
    }
    if (this.countCollectionRequests(tree) === 0) {
      return `⚠️ Collection **${tree.name}** has no requests to run.`
    }
    if (environmentName) {
      const selectionReply = await this.selectEnv(environmentName)
      if (!selectionReply.startsWith("🌐")) return selectionReply
    }
    const inheritedProperties = await this.teamInheritedProperties(found.path)

    const tab = this.tabService.createNewTab({
      type: "test-runner",
      collectionType: "team-collections",
      collectionID: found.node.id,
      collection: tree,
      isDirty: false,
      config: {
        iterations: 1,
        delay: 500,
        stopOnError: false,
        persistResponses: true,
        keepVariableValues: true,
      },
      selectedRequestRefIds: undefined,
      status: "idle",
      request: null,
      environmentName:
        getSelectedEnvironmentIndex().type === "NO_ENV_SELECTED"
          ? undefined
          : getCurrentEnvironment().name,
      testRunnerMeta: {
        completedRequests: 0,
        totalRequests: 0,
        totalTime: 0,
        failedTests: 0,
        passedTests: 0,
        totalTests: 0,
      },
      inheritedProperties,
    })

    // Start the run here (the personal path does the same) instead of relying
    // on the runner UI's mount-time auto-run, which only happens while the
    // REST page is open. The ancestor resolution below mirrors Runner.vue's
    // team branch: auth/headers come from the cascade, ancestor variables and
    // scripts exclude the run root's own level (the runner walks that itself).
    const runnerTab = this.getTestRunnerTabRef(tab.id)
    const rootID = found.node.id
    const requestAuth = inheritedProperties.auth?.inheritedAuth ?? {
      authActive: true,
      authType: "none",
    }
    const requestHeaders = (inheritedProperties.headers ?? [])
      .map((header) => header.inheritedHeader)
      .filter(Boolean) as HoppRESTHeader[]
    const ancestorVariables: HoppCollectionVariable[] = (
      inheritedProperties.variables ?? []
    )
      .filter((group) => group.parentID !== rootID)
      .flatMap((group) =>
        // Execution-only output (secrets resolved) — never persisted.
        populateValuesInInheritedCollectionVars(
          group.inheritedVariables,
          group.parentID,
          undefined,
          true
        )
      )
    const inheritedScripts = (inheritedProperties.scripts ?? []).filter(
      (script) => script.parentID !== rootID
    )
    const ancestorPreRequestScripts = inheritedScripts
      .map((script) => script.preRequestScript)
      .filter((script) => script && script.trim().length > 0)
    const ancestorTestScripts = inheritedScripts
      .map((script) => script.testScript)
      .filter((script) => script && script.trim().length > 0)
    const resolvedCollection: HoppCollection = {
      ...runnerTab.value.document.collection,
      auth: requestAuth as HoppCollection["auth"],
      headers: requestHeaders,
      variables: runnerTab.value.document.collection.variables ?? [],
    }

    const stopRef = ref(false)
    const result = this.waitForCollectionRun(tab.id, tree.name, () => {
      if (!this.testRunnerService.stopRun(tab.id)) {
        stopRef.value = true
      }
    })
    this.testRunnerService.runTests(
      runnerTab,
      resolvedCollection,
      { ...runnerTab.value.document.config, stopRef },
      ancestorPreRequestScripts,
      ancestorTestScripts,
      ancestorVariables
    )
    return result
  }

  /** Fetches a team's environments (same mapping the sidebar adapter uses). */
  private async fetchTeamEnvironments(
    teamID: string
  ): Promise<TeamEnvironment[]> {
    const result = await runGQLQuery({
      query: GetTeamEnvironmentsDocument,
      variables: { teamID },
    })
    if (E.isLeft(result) || !result.right.team) return []
    return result.right.team.teamEnvironments.map((x) => {
      const environment: Environment = {
        v: EnvironmentSchemaVersion,
        id: x.id,
        name: x.name,
        variables: JSON.parse(x.variables).map(
          (variable: Environment["variables"][number]) =>
            translateToNewEnvironmentVariables(variable)
        ),
      }
      const parsed = Environment.safeParse(environment)
      return {
        id: x.id,
        teamID: x.teamID,
        environment: parsed.type === "ok" ? parsed.value : environment,
      }
    })
  }

  // ---------------------------------------------------------------------------
  // On-demand context (kept out of the per-call context to save tokens)
  // ---------------------------------------------------------------------------

  private getGraphQLSchema(): string {
    const tab = this.resolveTurnTab()
    if (tab?.document?.type !== "gql-request") {
      return "The current tab is not a GraphQL request tab — switch to one and ask again."
    }
    const schema = this.gqlTabConnection.getTabConnectionState(tab.id).schema
    if (!schema) {
      return "No introspected schema — connect the GraphQL tab first (the Connect button next to the URL), then ask again."
    }
    return serializeGQLSchema(schema)
  }

  private async listCollections(): Promise<string> {
    const team = this.teamWorkspace()
    if (!team) {
      const tree = restCollectionStore.value.state
      return tree.length
        ? serializeCollections(tree, 80, MAX_CONTEXT_RESULT_CHARS - 20)
        : "There are no collections in the personal workspace yet."
    }
    await this.awaitTeamCollectionsLoaded()
    const tree = this.teamCollectionService.collections.value.flatMap((c) => {
      try {
        return [teamCollToHoppRESTColl(c)]
      } catch (_e) {
        return []
      }
    })
    if (!tree.length) return "This team has no collections yet."
    const note =
      "(Team folders load lazily — only expanded folders list their requests; open_request expands on demand.)"
    return `${serializeCollections(
      tree,
      80,
      MAX_CONTEXT_RESULT_CHARS - note.length - 20
    )}\n${note}`
  }

  // ---------------------------------------------------------------------------
  // Collection properties (auth / headers / variables / scripts)
  // ---------------------------------------------------------------------------

  /** Builds a collection auth object from the tool's `auth` argument. */
  private buildCollectionAuth(
    input: unknown
  ): { auth: HoppRESTAuth } | { error: string } {
    if (!input || typeof input !== "object") {
      return { error: "The auth section must be an object with a type." }
    }
    const a = input as Record<string, unknown>
    const type = String(a.type ?? "")
      .trim()
      .toLowerCase()
    const str = (v: unknown) => String(v ?? "").trim()
    switch (type) {
      case "none":
        return { auth: { authType: "none", authActive: true } }
      case "inherit":
        return { auth: { authType: "inherit", authActive: true } }
      case "bearer": {
        const token = str(a.token)
        if (!token) return { error: "Bearer auth needs a token." }
        return { auth: { authType: "bearer", authActive: true, token } }
      }
      case "basic": {
        const username = str(a.username)
        if (!username) return { error: "Basic auth needs a username." }
        return {
          auth: {
            authType: "basic",
            authActive: true,
            username,
            password: str(a.password),
          },
        }
      }
      case "api-key":
      case "apikey":
      case "api_key": {
        const key = str(a.key)
        const value = str(a.value)
        if (!key || !value)
          return { error: "API-key auth needs a key and a value." }
        return {
          auth: {
            authType: "api-key",
            authActive: true,
            key,
            value,
            addTo:
              str(a.add_to).toLowerCase() === "query"
                ? "QUERY_PARAMS"
                : "HEADERS",
          },
        }
      }
      default:
        return {
          error: `Unsupported auth type "${type}" — use none, inherit, bearer, basic, or api-key.`,
        }
    }
  }

  /**
   * Applies inherited properties to a collection or folder of the active
   * workspace, mirroring the Properties modal: variables' per-user values go
   * to the local stores under the collection's key and only stripped values
   * travel to the store/backend; open tabs get their inherited properties
   * refreshed afterwards.
   */
  private async setCollectionProperties(
    collName: string,
    args: Record<string, unknown>
  ): Promise<string> {
    if (!collName) return "Which collection should I update?"
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
    }

    // ---- parse the requested changes first (no partial writes) ----
    let auth: HoppRESTAuth | undefined
    if (args.auth !== undefined) {
      const built = this.buildCollectionAuth(args.auth)
      if ("error" in built) return `⚠️ ${built.error}`
      auth = built.auth
    }
    const headerPairs = Array.isArray(args.headers)
      ? (args.headers as unknown[]).flatMap((h) => {
          if (!h || typeof h !== "object" || !("key" in h)) return []
          const key = String((h as { key?: unknown }).key ?? "").trim()
          const value = String((h as { value?: unknown }).value ?? "")
          return key ? [{ key, value }] : []
        })
      : []
    const removeHeaders = Array.isArray(args.remove_headers)
      ? (args.remove_headers as unknown[]).map((k) =>
          String(k).trim().toLowerCase()
        )
      : []
    const parsedVars = this.toEnvVars(args.variables)
    if (parsedVars.error) return `⚠️ ${parsedVars.error}`
    const removeVariables = Array.isArray(args.remove_variables)
      ? (args.remove_variables as unknown[]).map((k) => String(k).trim())
      : []
    const preRequestScript =
      typeof args.pre_request_script === "string"
        ? args.pre_request_script
        : undefined
    const testScript =
      typeof args.test_script === "string" ? args.test_script : undefined
    if (
      !auth &&
      !headerPairs.length &&
      !removeHeaders.length &&
      !parsedVars.variables.length &&
      !removeVariables.length &&
      preRequestScript === undefined &&
      testScript === undefined
    ) {
      return "What should change — auth, headers, variables, or scripts?"
    }

    // ---- resolve the target and its current (hydrated) state ----
    let current: HoppCollection
    let storeKey: string
    let personal: { path: string } | null = null
    let teamNode: { node: TeamCollection; path: string } | null = null
    if (team) {
      const found = await this.findTeamCollectionByName(collName)
      if (!found)
        return `I couldn't find a team collection named "${collName}".`
      teamNode = found
      current = teamCollToHoppRESTColl(found.node)
      storeKey = found.node.id
    } else {
      const found = findCollectionByName(
        restCollectionStore.value.state,
        collName
      )
      if (!found) return `I couldn't find a collection named "${collName}".`
      personal = { path: found.path }
      current = found.collection
      storeKey =
        found.collection._ref_id ??
        found.collection.id ??
        found.path.split("/").pop()!
    }

    // ---- merge ----
    const existingVars = this.hydrateEnvVars(
      storeKey,
      (current.variables ?? []).map((v) => ({
        key: v.key,
        currentValue: v.currentValue ?? "",
        initialValue: v.initialValue ?? "",
        secret: !!v.secret,
      }))
    )
    const { variables: mergedVars, skippedSecretKeys } = this.mergeEnvVars(
      existingVars,
      parsedVars.variables
    )
    const finalVars = mergedVars.filter(
      (v) => !removeVariables.includes(v.key.trim())
    )
    const headers: HoppRESTHeader[] = (current.headers ?? []).map((h) => ({
      ...h,
    }))
    for (const { key, value } of headerPairs) {
      const existing = headers.find(
        (h) => h.key.toLowerCase() === key.toLowerCase()
      )
      if (existing) {
        existing.value = value
        existing.active = true
      } else {
        headers.push({ key, value, active: true, description: "" })
      }
    }
    const finalHeaders = headers.filter(
      (h) => !removeHeaders.includes(h.key.toLowerCase())
    )

    // Only report (and write) what actually changes.
    const updatedVarCount =
      parsedVars.variables.length - skippedSecretKeys.length
    const removedVarCount = mergedVars.length - finalVars.length
    const removedHeaderCount = headers.length - finalHeaders.length
    if (
      !auth &&
      !headerPairs.length &&
      !removedHeaderCount &&
      !updatedVarCount &&
      !removedVarCount &&
      preRequestScript === undefined &&
      testScript === undefined
    ) {
      return `Nothing to change on **${current.name}**${
        skippedSecretKeys.length
          ? ` — ${skippedSecretKeys.join(", ")} ${skippedSecretKeys.length > 1 ? "are secrets" : "is a secret"}; pass secret: true to overwrite`
          : removeHeaders.length || removeVariables.length
            ? " — nothing matched the names to remove"
            : ""
      }.`
    }

    // The store/backend copy is stripped; per-user values (secrets, current
    // values) go to the local stores under the collection's key — only once
    // the write is known to succeed, so a failed write can't re-index them.
    const wireVars = stripClientLocalValuesForWire(
      finalVars
    ) as HoppCollectionVariable[]
    const nextAuth = auth ?? current.auth
    const nextPre = preRequestScript ?? current.preRequestScript ?? ""
    const nextTest = testScript ?? current.testScript ?? ""

    // ---- write ----
    if (personal) {
      populateLocalStoresFromVariables(storeKey, finalVars)
      const updated = {
        ...current,
        auth: nextAuth,
        headers: finalHeaders,
        variables: wireVars,
        preRequestScript: nextPre,
        testScript: nextTest,
      }
      if (personal.path.includes("/")) {
        editRESTFolder(personal.path, updated)
      } else {
        editRESTCollection(parseInt(personal.path), updated)
      }
      const path = personal.path
      void nextTick(() =>
        updateInheritedPropertiesForAffectedRequests(path, "rest")
      )
    } else if (teamNode) {
      const data: CollectionDataProps = {
        auth: nextAuth,
        headers: finalHeaders,
        variables: wireVars,
        description: current.description ?? null,
        preRequestScript: nextPre,
        testScript: nextTest,
      }
      const res = await updateTeamCollection(teamNode.node.id, data)()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't update the collection: ${this.describeGQLError(res.left)}.`
      }
      populateLocalStoresFromVariables(storeKey, finalVars)
      teamNode.node.data = JSON.stringify(data)
      // Refresh open tabs' inherited properties now — the tree node already
      // carries the new data, so the cascade reads the updated values.
      const teamPath = teamNode.path
      void nextTick(() =>
        updateInheritedPropertiesForAffectedRequests(teamPath, "rest")
      )
    }

    const parts = [
      auth ? `auth: ${auth.authType}` : "",
      headerPairs.length
        ? `${headerPairs.length} header${headerPairs.length > 1 ? "s" : ""}`
        : "",
      removedHeaderCount
        ? `removed ${removedHeaderCount} header${removedHeaderCount > 1 ? "s" : ""}`
        : "",
      updatedVarCount
        ? `${updatedVarCount} variable${updatedVarCount > 1 ? "s" : ""}${
            parsedVars.variables.some((v) => v.secret)
              ? " (secrets kept local)"
              : ""
          }`
        : "",
      removedVarCount
        ? `removed ${removedVarCount} variable${removedVarCount > 1 ? "s" : ""}`
        : "",
      preRequestScript !== undefined ? "pre-request script" : "",
      testScript !== undefined ? "test script" : "",
    ].filter(Boolean)
    return `🗂️ Updated **${current.name}**: ${parts.join(", ")}.${
      skippedSecretKeys.length
        ? ` Skipped secret variable${skippedSecretKeys.length > 1 ? "s" : ""} ${skippedSecretKeys.join(", ")} — pass secret: true to overwrite.`
        : ""
    }`
  }

  // ---------------------------------------------------------------------------
  // Documentation (descriptions) and published docs
  // ---------------------------------------------------------------------------

  /**
   * Mirrors a saved request's new description onto any open tab bound to it
   * (as the Documentation modal does), without changing the tab's dirty state.
   */
  private syncOpenTabDescription(
    saveContext: HoppTabSaveContext,
    description: string
  ) {
    for (const tab of this.tabService.getTabsRefWithSaveContext(saveContext)) {
      const document = tab.value.document
      if (document.type !== "request" && document.type !== "gql-request") {
        continue
      }
      const wasDirty = document.isDirty
      document.request.description = description
      void nextTick(() => {
        document.isDirty = wasDirty
      })
    }
  }

  /** Coerces a tool argument that should be a number ("90000" counts). */
  private optionalNumber(value: unknown): number | undefined {
    if (value === undefined || value === null || value === "") return undefined
    const n = Number(value)
    return Number.isFinite(n) ? n : undefined
  }

  /** Finds a loaded team request by its backend id in the sidebar tree. */
  private findTeamRequestByID(requestID: string): TeamRequest | null {
    const walk = (nodes: TeamCollection[]): TeamRequest | null => {
      for (const node of nodes) {
        const hit = (node.requests ?? []).find((r) => r.id === requestID)
        if (hit) return hit
        const inner = node.children ? walk(node.children) : null
        if (inner) return inner
      }
      return null
    }
    return walk(this.teamCollectionService.collections.value)
  }

  private async setRequestDescription(
    description: string,
    reqName: string | undefined,
    collName: string | undefined,
    active: ActiveRequestHandle | null,
    gqlActive: ActiveGQLRequestHandle | null
  ): Promise<string> {
    const verb = description ? "Set" : "Cleared"
    // No target named: document the request in the pinned tab. When that tab
    // is bound to a saved request, persist to the saved copy too (as the
    // Documentation modal does) so a later save/publish reflects it.
    if (!reqName) {
      const document = this.resolveTurnTab()?.document
      const handle = active ?? gqlActive
      if (!handle || !document) {
        return "Open a request tab first, or name a saved request to document."
      }
      const ctx = "saveContext" in document ? document.saveContext : null
      if (
        ctx?.originLocation === "user-collection" &&
        ctx.requestIndex !== undefined
      ) {
        const folder = ctx.folderPath
          .split("/")
          .map((x) => parseInt(x))
          .reduce<HoppCollection | undefined>(
            (node, index, i) =>
              i === 0
                ? restCollectionStore.value.state[index]
                : node?.folders[index],
            undefined
          )
        const stored = folder?.requests[ctx.requestIndex]
        if (stored) {
          editRESTRequest(ctx.folderPath, ctx.requestIndex, {
            ...stored,
            description,
          })
          this.syncOpenTabDescription(ctx, description)
          return `📝 ${verb} the request's documentation (saved).`
        }
      } else if (ctx?.originLocation === "team-collection") {
        const writeError = this.teamWriteError()
        if (writeError) return writeError
        const stored = this.findTeamRequestByID(ctx.requestID)
        if (stored) {
          const updated = { ...stored.request, description }
          const res = await updateTeamRequest(ctx.requestID, {
            request: JSON.stringify(updated),
            title: updated.name,
          })()
          if (E.isLeft(res)) {
            return `⚠️ Couldn't save the documentation: ${this.describeGQLError(res.left)}.`
          }
          stored.request = updated
          this.syncOpenTabDescription(
            {
              originLocation: "team-collection",
              requestID: ctx.requestID,
              exampleID: undefined,
            },
            description
          )
          return `📝 ${verb} the request's documentation (saved).`
        }
      }
      handle.request.description = description
      handle.commit()
      return `📝 ${verb} the request's documentation — save the request to keep it.`
    }

    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
      const found = await this.findTeamRequestByName(reqName, collName)
      if (!found) {
        return `I couldn't find a request named "${reqName}" in this team's collections.`
      }
      const updated = { ...found.request.request, description }
      const res = await updateTeamRequest(found.request.id, {
        request: JSON.stringify(updated),
        title: updated.name,
      })()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't save the documentation: ${this.describeGQLError(res.left)}.`
      }
      found.request.request = updated
      this.syncOpenTabDescription(
        {
          originLocation: "team-collection",
          requestID: found.request.id,
          exampleID: undefined,
        },
        description
      )
      return `📝 Documented **${updated.name || reqName}**.`
    }

    const collections = restCollectionStore.value.state
    const found = findRequestInTree(collections, reqName, collName)
    if (!found) {
      return `I couldn't find a request named "${reqName}"${
        collName ? ` in "${collName}"` : ""
      }.`
    }
    const { request, folderPath, requestIndex } = found
    // Replaced wholesale by the store — always send the full request.
    editRESTRequest(folderPath, requestIndex, { ...request, description })
    this.syncOpenTabDescription(
      {
        originLocation: "user-collection",
        folderPath,
        requestIndex,
        requestRefID: (request as { _ref_id?: string })._ref_id ?? request.id,
        exampleID: undefined,
      },
      description
    )
    return `📝 Documented **${request.name || reqName}**.`
  }

  /** Renames a collection or folder of the active workspace, matched by name. */
  private async renameCollection(
    collName: string,
    newName: string
  ): Promise<string> {
    if (!collName) return "Which collection should I rename?"
    if (!newName) return "What should I rename it to?"

    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
      const found = await this.findTeamCollectionByName(collName)
      if (!found)
        return `I couldn't find a team collection named "${collName}".`
      const res = await renameTeamCollectionByID(found.node.id, newName)()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't rename it: ${this.describeGQLError(res.left)}.`
      }
      const was = found.node.title
      found.node.title = newName
      return `✏️ Renamed team collection **${was}** to **${newName}**.`
    }

    const found = findCollectionByName(
      restCollectionStore.value.state,
      collName
    )
    if (!found) return `I couldn't find a collection named "${collName}".`
    // The sync layer rebuilds the server payload from what we dispatch, so the
    // partial has to carry the whole collection rather than just the name.
    const updated = { ...found.collection, name: newName }
    if (found.path.includes("/")) {
      editRESTFolder(found.path, updated)
    } else {
      editRESTCollection(parseInt(found.path), updated)
    }
    return `✏️ Renamed **${found.collection.name}** to **${newName}**.`
  }

  /**
   * Deletes a collection or folder of the active workspace, matched by name.
   *
   * Everything inside goes with it and there is no undo, so the match is exact
   * and a near miss deletes nothing.
   */
  private async deleteCollection(collName: string): Promise<string> {
    if (!collName) return "Which collection should I delete?"

    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
      const found = await this.findTeamCollectionByName(collName)
      if (!found)
        return `I couldn't find a team collection named "${collName}".`
      const title = found.node.title
      const res = await deleteTeamCollectionByID(found.node.id)()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't delete it: ${this.describeGQLError(res.left)}.`
      }
      return `🗑️ Deleted team collection **${title}** and everything in it.`
    }

    const found = findCollectionByName(
      restCollectionStore.value.state,
      collName
    )
    if (!found) return `I couldn't find a collection named "${collName}".`
    const name = found.collection.name
    if (found.path.includes("/")) {
      removeRESTFolder(found.path)
    } else {
      removeRESTCollection(parseInt(found.path), found.collection._ref_id)
    }
    return `🗑️ Deleted **${name}** and everything in it.`
  }

  private async setCollectionDescription(
    collName: string,
    description: string
  ): Promise<string> {
    if (!collName) return "Which collection should I document?"
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
      const found = await this.findTeamCollectionByName(collName)
      if (!found)
        return `I couldn't find a team collection named "${collName}".`
      // The backend replaces the whole `data` column — merge every property
      // from the current node, and never send client-local variable values.
      const current = teamCollToHoppRESTColl(found.node)
      const data: CollectionDataProps = {
        auth: current.auth ?? { authType: "inherit", authActive: true },
        headers: current.headers ?? [],
        variables: stripClientLocalValuesForWire(current.variables ?? []),
        description,
        preRequestScript: current.preRequestScript ?? "",
        testScript: current.testScript ?? "",
      }
      const res = await updateTeamCollection(found.node.id, data)()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't save the documentation: ${this.describeGQLError(res.left)}.`
      }
      found.node.data = JSON.stringify(data)
      return `📝 Documented team collection **${found.node.title}**.`
    }

    const found = findCollectionByName(
      restCollectionStore.value.state,
      collName
    )
    if (!found) return `I couldn't find a collection named "${collName}".`
    // The sync layer builds the server payload from the partial we dispatch,
    // so it must carry the FULL collection, not just the description.
    const updated = { ...found.collection, description }
    if (found.path.includes("/")) {
      editRESTFolder(found.path, updated)
    } else {
      editRESTCollection(parseInt(found.path), updated)
    }
    return `📝 Documented collection **${found.collection.name}**.`
  }

  /**
   * Resolves the backend id of a collection for publishing / mocking.
   * `root` picks the top-level ancestor (mock servers are per root collection).
   */
  private async resolveBackendCollection(
    collName: string,
    root = false
  ): Promise<{ id: string; name: string } | { error: string }> {
    const team = this.teamWorkspace()
    if (team) {
      const found = await this.findTeamCollectionByName(collName)
      if (!found)
        return {
          error: `I couldn't find a team collection named "${collName}".`,
        }
      if (root) {
        const rootID = found.path.split("/")[0]
        const rootNode = this.teamCollectionService.findCollectionByID(rootID)
        return { id: rootID, name: rootNode?.title ?? found.node.title }
      }
      return { id: found.node.id, name: found.node.title }
    }
    const collections = restCollectionStore.value.state
    const found = findCollectionByName(collections, collName)
    if (!found)
      return { error: `I couldn't find a collection named "${collName}".` }
    const target = root
      ? collections[parseInt(found.path.split("/")[0])]
      : found.collection
    if (!target?.id) {
      return {
        error: `**${target?.name ?? collName}** hasn't been synced to the server yet (sign in and wait a moment), so it can't be used here.`,
      }
    }
    return { id: target.id, name: target.name }
  }

  /** Backend id of an environment by name, in the active workspace. */
  private async resolveEnvironmentID(
    envName: string
  ): Promise<{ id: string; name: string } | { error: string }> {
    const n = envName.toLowerCase()
    const team = this.teamWorkspace()
    if (team) {
      const envs = await this.fetchTeamEnvironments(team.teamID)
      const match =
        envs.find((e) => e.environment.name.toLowerCase() === n) ??
        envs.find((e) => e.environment.name.toLowerCase().includes(n))
      return match
        ? { id: match.id, name: match.environment.name }
        : { error: `I couldn't find a team environment named "${envName}".` }
    }
    const envs = environmentsStore.value.environments
    const match =
      envs.find((e) => e.name.toLowerCase() === n) ??
      envs.find((e) => e.name.toLowerCase().includes(n))
    if (!match)
      return { error: `I couldn't find an environment named "${envName}".` }
    if (!match.id) {
      return {
        error: `Environment **${match.name}** hasn't been synced to the server yet, so it can't be attached.`,
      }
    }
    return { id: match.id, name: match.name }
  }

  /** The published docs of a collection, refreshed from the server first. */
  private async loadPublishedDocs(
    collectionID: string
  ): Promise<PublishedDocInfo[]> {
    const team = this.teamWorkspace()
    try {
      if (team) {
        await this.documentationService.fetchTeamPublishedDocs(team.teamID)
      } else {
        await this.documentationService.fetchUserPublishedDocs()
      }
    } catch (e) {
      console.error("[AIChat] failed to refresh published docs:", e)
    }
    return this.documentationService.getPublishedDocStatus(collectionID) ?? []
  }

  private findPublishedVersion(
    docs: PublishedDocInfo[],
    version: string
  ): PublishedDocInfo | undefined {
    return (
      docs.find((d) => d.version === version) ??
      docs.find((d) => d.version.toLowerCase() === version.toLowerCase())
    )
  }

  private async publishDocumentation(
    collName: string,
    title: string | undefined,
    version: string | undefined,
    envName: string | undefined
  ): Promise<string> {
    if (!collName) return "Which collection should I publish?"
    if (!settingsStore.value.ENABLE_EXPERIMENTAL_DOCUMENTATION) {
      return 'Documentation publishing is turned off — enable "Documentation" under Settings > Experiments first.'
    }
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
    }
    const target = await this.resolveBackendCollection(collName)
    if ("error" in target) return target.error
    const docVersion = (version || "CURRENT").trim()
    if (!/^[a-zA-Z0-9]+([.-][a-zA-Z0-9]+)*$/.test(docVersion)) {
      return `⚠️ "${docVersion}" isn't a valid version — use letters, digits, dots, or dashes (e.g. CURRENT, v1, 2.0).`
    }
    let environment: { id: string; name: string } | undefined
    if (envName) {
      const resolved = await this.resolveEnvironmentID(envName)
      if ("error" in resolved) return resolved.error
      environment = resolved
    }

    const docs = await this.loadPublishedDocs(target.id)
    const existing = this.findPublishedVersion(docs, docVersion)
    let info: PublishedDocInfo
    if (existing) {
      // Update only what was asked for. The sync mode is deliberately not
      // sent: forcing autoSync on would wipe a frozen snapshot version.
      if (!title && !environment) {
        return `**${target.name}** already has a published ${
          existing.autoSync ? "live" : "snapshot"
        } version ${existing.version}: ${existing.url}. Pass a title or environment to change it.`
      }
      const args: UpdatePublishedDocsArgs = {
        ...(title ? { title } : {}),
        ...(environment ? { environmentID: environment.id } : {}),
      }
      const res = await platform.backend.updatePublishedDoc(existing.id, args)()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't update the published docs: ${this.describeGQLError(res.left)}.`
      }
      const doc = res.right.updatePublishedDoc
      info = {
        ...existing,
        title: doc.title,
        version: doc.version,
        autoSync: doc.autoSync,
        url: doc.url,
        environmentName:
          doc.environmentName ?? existing.environmentName ?? null,
        environmentID: environment?.id ?? existing.environmentID ?? null,
        updatedOn: doc.updatedOn,
      }
      this.documentationService.setPublishedDocStatus(
        target.id,
        null,
        existing.id
      )
      this.documentationService.setPublishedDocStatus(target.id, info)
    } else {
      const args: CreatePublishedDocsArgs = {
        title: title || target.name,
        version: docVersion,
        autoSync: true,
        workspaceType: team ? WorkspaceType.Team : WorkspaceType.User,
        workspaceID: team ? team.teamID : "",
        collectionID: target.id,
        metadata: "{}",
        environmentID: environment?.id,
      }
      const res = await platform.backend.createPublishedDoc(args)()
      if (E.isLeft(res)) {
        return `⚠️ Couldn't publish the docs: ${this.describeGQLError(res.left)}.`
      }
      const doc = res.right.createPublishedDoc
      info = {
        id: doc.id,
        title: doc.title,
        version: doc.version,
        autoSync: doc.autoSync,
        url: doc.url,
        environmentName: doc.environmentName ?? null,
        environmentID: environment?.id ?? null,
        collection: { id: target.id },
        createdOn: doc.createdOn,
        updatedOn: doc.updatedOn,
      }
      this.documentationService.setPublishedDocStatus(target.id, info)
    }
    return `📖 ${existing ? "Updated" : "Published"} the documentation for **${target.name}** (version ${info.version}, ${
      info.autoSync ? "live, auto-synced" : "snapshot"
    }): ${info.url}${
      environment
        ? `\n⚠️ Environment **${environment.name}** is attached — its variable values are now publicly visible on that page.`
        : ""
    }`
  }

  private async unpublishDocumentation(
    collName: string,
    version: string | undefined
  ): Promise<string> {
    if (!collName) return "Which collection's documentation should I unpublish?"
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
    }
    const target = await this.resolveBackendCollection(collName)
    if ("error" in target) return target.error
    const docs = await this.loadPublishedDocs(target.id)
    if (!docs.length) {
      return `**${target.name}** has no published documentation.`
    }
    let doc: PublishedDocInfo | undefined
    if (version) {
      doc = this.findPublishedVersion(docs, version)
      if (!doc) {
        return `No published version "${version}" for **${target.name}**. Published: ${docs
          .map((d) => d.version)
          .join(", ")}.`
      }
    } else if (docs.length === 1) {
      doc = docs[0]
    } else {
      return `**${target.name}** has several published versions (${docs
        .map((d) => d.version)
        .join(", ")}) — which one should I unpublish?`
    }
    const res = await platform.backend.deletePublishedDoc(doc.id)()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't unpublish: ${this.describeGQLError(res.left)}.`
    }
    this.documentationService.setPublishedDocStatus(target.id, null, doc.id)
    return `📖 Unpublished version ${doc.version} of **${target.name}**'s documentation.`
  }

  // ---------------------------------------------------------------------------
  // Mock servers
  // ---------------------------------------------------------------------------

  private mockServerURL(server: MockServer): string {
    return server.serverUrlDomainBased || server.serverUrlPathBased || ""
  }

  /** Mock-server calls fail with either a bare string or a GQLError object. */
  private describeMockServerError(err: unknown): string {
    const code =
      typeof err === "string"
        ? err.replace(/^\[GraphQL\]\s*/, "")
        : err && typeof err === "object" && "type" in err
          ? (err as GQLError<string>).type === "network_error"
            ? "network error"
            : String((err as { error?: unknown }).error ?? "")
          : ""
    switch (code) {
      case "mock_server/invalid_collection":
      case "mock_server/invalid_collection_id":
        return "that collection no longer exists on the server"
      case "mock_server/not_found":
      case "mock_server/access_denied":
      case "team/invalid_id":
        return "you don't have permission to do that, or the mock server no longer exists"
      case "mock_server/limit_exceeded":
        return "the mock server limit for this workspace was reached"
      case "mock_server/already_exists":
        return "a mock server with that name already exists"
      case "Bad Request Exception":
        return "the server rejected the input (check the name and delay)"
      default:
        return code || "unexpected error"
    }
  }

  private mockServersEnabledError(): string | null {
    return settingsStore.value.ENABLE_EXPERIMENTAL_MOCK_SERVERS
      ? null
      : 'Mock servers are turned off — enable "Mock Servers" under Settings > Experiments first.'
  }

  /** The backend accepts letters, digits, spaces and . _ - ( ) [ ] { } < >. */
  private normalizeMockServerName(raw: string): string {
    return raw
      .replace(/[^a-zA-Z0-9 .()[\]{}<>_-]/g, "")
      .trim()
      .slice(0, 255)
  }

  private async loadMockServersForWorkspace(): Promise<
    { servers: MockServer[] } | { error: string }
  > {
    const team = this.teamWorkspace()
    const res = team
      ? await platform.backend.getTeamMockServers(team.teamID)()
      : await platform.backend.getMyMockServers()()
    if (E.isLeft(res)) {
      return {
        error: `⚠️ Couldn't load the mock servers: ${this.describeMockServerError(res.left)}.`,
      }
    }
    return { servers: res.right }
  }

  private findMockServer(
    servers: MockServer[],
    name: string
  ): { server: MockServer } | { ambiguous: MockServer[] } | null {
    const n = name.trim().toLowerCase()
    if (!n) return null
    const exact = servers.find((s) => s.name.toLowerCase() === n)
    if (exact) return { server: exact }
    const partial = servers.filter((s) => s.name.toLowerCase().includes(n))
    if (partial.length === 1) return { server: partial[0] }
    if (partial.length > 1) return { ambiguous: partial }
    return null
  }

  private async createMockServer(
    collName: string,
    name: string | undefined,
    delayMs: number | undefined,
    isPublic: boolean | undefined
  ): Promise<string> {
    if (!collName) return "Which collection should the mock server serve?"
    const disabled = this.mockServersEnabledError()
    if (disabled) return disabled
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
    }
    const target = await this.resolveBackendCollection(collName, true)
    if ("error" in target) return target.error
    // One mock server per collection, as in the UI.
    const loaded = await this.loadMockServersForWorkspace()
    if ("error" in loaded) return loaded.error
    const bound = loaded.servers.find(
      (s) => s.collection?.id === target.id || s.collectionID === target.id
    )
    if (bound) {
      return `🧪 **${target.name}** already has mock server **${bound.name}**: ${this.mockServerURL(bound)}. Use update_mock_server to change it.`
    }
    const serverName = this.normalizeMockServerName(
      name || `${target.name} Mock`
    )
    if (!serverName) return "What should the mock server be called?"
    const delay = Math.min(60_000, Math.max(0, Math.round(delayMs ?? 0)))

    const res = await platform.backend.createMockServer(
      serverName,
      team ? WorkspaceType.Team : WorkspaceType.User,
      team ? team.teamID : undefined,
      delay,
      isPublic ?? true,
      target.id
    )()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't create the mock server: ${this.describeMockServerError(res.left)}.`
    }
    addMockServer(res.right)
    const url = this.mockServerURL(res.right)
    const delayNote =
      delayMs !== undefined
        ? ` Delay: ${delay} ms${
            delay !== Math.round(delayMs)
              ? " (clamped to the 0–60000 ms range)"
              : ""
          }.`
        : ""
    return `🧪 Created mock server **${serverName}** for **${target.name}**: ${url}\nIt answers with each request's saved example responses (requests without examples return 404).${delayNote}${
      isPublic === false
        ? " It's private — send requests with an x-api-key header set to a Hoppscotch Personal Access Token."
        : ""
    }`
  }

  private async listMockServers(): Promise<string> {
    const disabled = this.mockServersEnabledError()
    if (disabled) return disabled
    const loaded = await this.loadMockServersForWorkspace()
    if ("error" in loaded) return loaded.error
    if (!loaded.servers.length) {
      return "There are no mock servers in this workspace yet."
    }
    const lines = loaded.servers.map(
      (s) =>
        `- **${s.name}** (${s.isActive ? "active" : "inactive"}${
          s.isPublic ? "" : ", private"
        })${s.collection?.title ? ` for ${s.collection.title}` : ""}: ${this.mockServerURL(s)}`
    )
    return `🧪 Mock servers:\n${lines.join("\n")}`
  }

  private async updateMockServer(
    name: string,
    changes: {
      active?: boolean
      delayMs?: number
      isPublic?: boolean
      newName?: string
    }
  ): Promise<string> {
    if (!name) return "Which mock server should I update?"
    const disabled = this.mockServersEnabledError()
    if (disabled) return disabled
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
    }
    const loaded = await this.loadMockServersForWorkspace()
    if ("error" in loaded) return loaded.error
    const match = this.findMockServer(loaded.servers, name)
    if (!match) return `I couldn't find a mock server named "${name}".`
    if ("ambiguous" in match) {
      return `Several mock servers match "${name}": ${match.ambiguous
        .map((s) => s.name)
        .join(", ")} — which one should I update?`
    }
    const server = match.server
    const input: {
      name?: string
      isActive?: boolean
      delayInMs?: number
      isPublic?: boolean
    } = {}
    if (changes.active !== undefined) input.isActive = changes.active
    let clamped = false
    if (changes.delayMs !== undefined) {
      input.delayInMs = Math.min(
        60_000,
        Math.max(0, Math.round(changes.delayMs))
      )
      clamped = input.delayInMs !== Math.round(changes.delayMs)
    }
    if (changes.isPublic !== undefined) input.isPublic = changes.isPublic
    if (changes.newName !== undefined) {
      const newName = this.normalizeMockServerName(changes.newName)
      if (!newName) {
        return "That name has no allowed characters — use letters, digits, spaces, or . _ - ( ) [ ] { } < >."
      }
      input.name = newName
    }
    if (!Object.keys(input).length) {
      return "What should change on the mock server?"
    }
    const res = await platform.backend.updateMockServer(server.id, input)()
    if (E.isLeft(res)) {
      return `⚠️ Couldn't update the mock server: ${this.describeMockServerError(res.left)}.`
    }
    updateMockServerInStore(server.id, input)
    const parts = [
      input.isActive !== undefined
        ? input.isActive
          ? "enabled"
          : "disabled"
        : "",
      input.delayInMs !== undefined
        ? `delay ${input.delayInMs} ms${clamped ? " (clamped to 0–60000)" : ""}`
        : "",
      input.isPublic !== undefined
        ? input.isPublic
          ? "public"
          : "private"
        : "",
      input.name ? `renamed to ${input.name}` : "",
    ].filter(Boolean)
    return `🧪 Updated mock server **${server.name}**: ${parts.join(", ")}.`
  }

  private async deleteMockServer(name: string): Promise<string> {
    if (!name) return "Which mock server should I delete?"
    const disabled = this.mockServersEnabledError()
    if (disabled) return disabled
    const team = this.teamWorkspace()
    if (team) {
      const writeError = this.teamWriteError()
      if (writeError) return writeError
    }
    const loaded = await this.loadMockServersForWorkspace()
    if ("error" in loaded) return loaded.error
    const match = this.findMockServer(loaded.servers, name)
    if (!match) return `I couldn't find a mock server named "${name}".`
    if ("ambiguous" in match) {
      return `Several mock servers match "${name}": ${match.ambiguous
        .map((s) => s.name)
        .join(", ")} — which one should I delete?`
    }
    const server = match.server
    const res = await platform.backend.deleteMockServer(server.id)()
    if (E.isLeft(res) || !res.right) {
      return `⚠️ Couldn't delete the mock server${
        E.isLeft(res) ? `: ${this.describeMockServerError(res.left)}` : ""
      }.`
    }
    deleteMockServerInStore(server.id)
    return `🧪 Deleted mock server **${server.name}**.`
  }

  /** Deep-clones a request so store/tab copies stay independent of the source. */
  private cloneRequest(request: HoppRESTRequest): HoppRESTRequest {
    return JSON.parse(JSON.stringify(request)) as HoppRESTRequest
  }

  private cloneCollection(collection: HoppCollection): HoppCollection {
    return JSON.parse(JSON.stringify(collection)) as HoppCollection
  }

  /**
   * Switches the active tab between REST and GraphQL via the shared
   * protocol-switch flow (drafts preserve the other protocol's edits).
   */
  private switchProtocol(target: string): string {
    const doc = this.tabService.currentActiveTab.value?.document
    if (doc?.type !== "request" && doc?.type !== "gql-request") {
      return "Open a request tab first so I can switch its protocol."
    }
    // The UI switcher is hidden when the setting is off — a tab converted
    // from chat would have no way back.
    if (!settingsStore.value.ENABLE_GQL_IN_REST_WORKSPACE) {
      return 'Protocol switching is turned off — enable "GraphQL in REST workspace" in Settings first.'
    }

    const services = {
      tabs: this.tabService,
      gqlTabConn: this.gqlTabConnection,
      scrollService: this.scrollService,
    }

    if (target === "graphql" || target === "gql") {
      if (doc.type === "gql-request") {
        return "This tab is already a GraphQL request tab."
      }
      return switchActiveTabToGQL(services)
        ? "🔀 Switched the tab to **GraphQL** (the REST edits are kept as a draft)."
        : "I couldn't switch this tab to GraphQL."
    }

    if (target === "rest" || target === "http") {
      if (doc.type === "request") {
        return "This tab is already a REST request tab."
      }
      return switchActiveTabToREST(services)
        ? "🔀 Switched the tab to **REST** (the GraphQL edits are kept as a draft)."
        : "I couldn't switch this tab to REST."
    }

    return 'Which protocol — "rest" or "graphql"?'
  }

  /** Switches the active interceptor by a name/id hint from the user. */
  private setInterceptor(hint: string): string {
    const available = this.interceptorService.available.value.filter(
      (i) => i.selectable.type === "selectable"
    )
    if (!available.length) {
      return "No interceptors are available to switch to."
    }
    const names = available.map((i) => i.name(this.t)).join(", ")
    if (!hint) {
      return `Which interceptor? Available: ${names}.`
    }
    const h = hint.toLowerCase()
    const match =
      available.find((i) => i.id.toLowerCase() === h) ??
      available.find((i) => i.name(this.t).toLowerCase() === h) ??
      available.find(
        (i) =>
          i.name(this.t).toLowerCase().includes(h) ||
          i.id.toLowerCase().includes(h)
      )
    if (!match) {
      return `I couldn't find an interceptor matching "${hint}". Available: ${names}.`
    }
    this.interceptorService.setActive(match.id)
    return `🔌 Switched the interceptor to **${match.name(this.t)}**.`
  }

  /**
   * Watches the active tab's response after a run is triggered and posts a
   * follow-up assistant message summarizing the outcome (status, time, size).
   */
  private reportRunOutcome(
    getResponse: () => HoppRESTResponse | null | undefined
  ) {
    let settled = false
    let stop: (() => void) | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const finish = (text: string) => {
      if (settled) return
      settled = true
      if (stop) stop()
      if (timer) clearTimeout(timer)
      this.resolveRunStep(text)
    }

    // `newSendRequest` sets the response to "loading" synchronously, so the next
    // change we observe is the settled (terminal) response.
    stop = watch(getResponse, (res) => {
      if (!res || res.type === "loading") return
      finish(this.describeRunResponse(res))
    })

    // Stop watching if the request never comes back.
    timer = setTimeout(() => {
      finish("⏱️ Still running — check the response panel for the result.")
    }, 120_000)
  }

  /**
   * Watches the active GQL tab's event stream after a run is triggered and
   * posts a follow-up message when the next event lands. (For subscriptions
   * the first streamed event reports; the panel carries the rest.)
   */
  private reportGQLRunOutcome(
    getEvents: () => GQLResponseEvent[] | null | undefined
  ) {
    // A discrete run REPLACES the doc's event array with a fresh one (only
    // subscription streams append — see gql/RequestOptions.vue's message-event
    // watcher), so the array length may not change between runs. Track the
    // last event by object identity instead: a replace swaps in new event
    // objects and an append grows the tail, so either way the settled event
    // compares unequal to the baseline.
    const initial = getEvents()
    const baselineLast = initial?.length ? initial[initial.length - 1] : null
    let settled = false
    let stop: (() => void) | null = null
    let timer: ReturnType<typeof setTimeout> | null = null

    const finish = (text: string) => {
      if (settled) return
      settled = true
      if (stop) stop()
      if (timer) clearTimeout(timer)
      this.resolveRunStep(text)
    }

    stop = watch(
      () => {
        const events = getEvents()
        return events?.length ? events[events.length - 1] : null
      },
      (last) => {
        if (!last || last === baselineLast) return
        finish(this.describeGQLRunEvent(last))
      }
    )

    timer = setTimeout(() => {
      finish("⏱️ Still running — check the response panel for the result.")
    }, 120_000)
  }

  /** Turns a GQL run/subscription event into a short status line. */
  private describeGQLRunEvent(event: GQLResponseEvent): string {
    if (event.type === "error") {
      const message =
        typeof event.error?.message === "string"
          ? event.error.message
          : "the operation failed"
      return `❌ GraphQL error: ${message}`
    }
    if (event.type === "response") {
      if (event.document) {
        const ok =
          event.document.statusCode >= 200 && event.document.statusCode < 300
        const status = [event.document.statusCode, event.document.statusText]
          .filter(Boolean)
          .join(" ")
        const time = `${Math.round(event.document.meta.responseDuration)} ms`
        const size = this.formatBytes(event.document.meta.responseSize)
        return `${ok ? "✅" : "⚠️"} Response: **${status}** · ${time} · ${size}`
      }
      return `✅ ${event.operationType ?? "Operation"} completed — check the response panel.`
    }
    return "The operation finished — check the response panel."
  }

  /** Turns a settled response into a short, human-readable status line. */
  private describeRunResponse(res: HoppRESTResponse): string {
    switch (res.type) {
      case "success":
      case "failure": {
        const ok = res.statusCode >= 200 && res.statusCode < 300
        const status = [res.statusCode, res.statusText]
          .filter(Boolean)
          .join(" ")
        const time = `${Math.round(res.meta.responseDuration)} ms`
        const size = this.formatBytes(res.meta.responseSize)
        return `${ok ? "✅" : "⚠️"} Response: **${status}** · ${time} · ${size}`
      }
      case "network_fail":
        return "❌ Network error — couldn't reach the server."
      case "script_fail":
        return `❌ Script error: ${res.error?.message ?? "failed to run script"}`
      case "interceptor_error":
        if (res.error === "cancellation") return "■ Request cancelled."
        return `❌ ${
          res.error?.humanMessage?.description?.(this.t) ??
          "The request failed."
        }`
      case "extension_error":
        return `❌ ${
          res.error ?? "The browser extension failed to run the request."
        }`
      default:
        return "The request finished."
    }
  }

  /** Formats a byte count as B / KB / MB. */
  private formatBytes(n: number): string {
    if (!n || n < 0) return "0 B"
    if (n < 1024) return `${n} B`
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
    return `${(n / (1024 * 1024)).toFixed(1)} MB`
  }

  /** Appends a fresh assistant message and streams `text` into it. */
  private async postAssistantMessage(text: string, kind?: "tool") {
    const id = this.nextId()
    const msg: ChatMessage = {
      id,
      role: "assistant",
      content: "",
      pending: true,
    }
    if (kind) msg.kind = kind
    this.messages.value.push(msg)
    try {
      await this.streamText(id, text)
    } finally {
      this.finalizeById(id)
    }
  }

  /** Simulates token streaming into the assistant message with the given id. */
  private async streamText(id: string, text: string) {
    const tokens = text.match(/\s+|\S+/g) ?? [text]
    for (const token of tokens) {
      await new Promise((resolve) => setTimeout(resolve, 8))
      const i = this.messages.value.findIndex((m) => m.id === id)
      // The message may have been cleared/removed mid-stream.
      if (i === -1) break
      this.messages.value[i].content += token
    }
  }
}
