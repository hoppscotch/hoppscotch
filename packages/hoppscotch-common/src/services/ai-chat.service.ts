import { Service } from "dioc"
import { ref, shallowRef, watch, type ShallowRef } from "vue"
import * as E from "fp-ts/Either"
import type {
  HoppCollection,
  HoppGQLRequest,
  HoppRESTRequest,
} from "@hoppscotch/data"
import { isRESTRequest, makeCollection } from "@hoppscotch/data"
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
import { invokeAction } from "~/helpers/actions"
import { getI18n } from "~/modules/i18n"
import {
  createEnvironment,
  environmentsStore,
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
  editRESTRequest,
  restCollectionStore,
  saveRESTRequestAs,
} from "~/newstore/collections"
import {
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
  getLocalSecretReferenceID,
  redactSensitiveChatValues,
  replaceSensitiveChatValues,
} from "~/helpers/aichat/secret-references"
import {
  APP_ACTION_TOOLS,
  parseAppActionCommand,
  splitCommands,
} from "~/helpers/aichat/app-actions"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import type {
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
  kind?: "tool"
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
}

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
  | { type: "tool_result"; tool_use_id: string; content: string }

/** A chat message in model format — plain text, or content blocks mid tool loop. */
interface ChatRequestMessage {
  role: ChatRole
  content: string | ChatContentBlock[]
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
  context: string
) => Promise<
  E.Either<
    string,
    { content: string; tool_calls: ChatToolCall[]; trace_id: string }
  >
>

/** Most recent messages sent as conversation history to the model. */
const MAX_HISTORY_MESSAGES = 50

/** Max model round-trips per user message (bounds the agentic tool loop). */
const MAX_TOOL_STEPS = 6

/**
 * Holds the state for the single, global AI chat thread.
 *
 * It is a `dioc` service (singleton) so the conversation + open state persist as
 * the user navigates around the app — there is one assistant that "follows" the
 * user and reads whatever context is currently in scope.
 *
 * NOTE: the backend chat endpoint is not wired yet. For now `sendMessage`
 * interprets request-editing commands locally (see `~/helpers/aichat/commands`)
 * and applies them to the active request. When the backend lands, the LLM will
 * drive those same edits via tool use.
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

  private readonly t = getI18n()

  private idCounter = 0

  private secretReferenceCounter = 0

  private readonly localSecretValues = new Map<string, string>()

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
  }

  public close() {
    this.isOpen.value = false
  }

  public toggle() {
    this.isOpen.value = !this.isOpen.value
  }

  public clear() {
    if (this.isStreaming.value) return
    this.messages.value = []
    this.lastTurnTools.value = []
    this.lastTurnStatus.value = "idle"
    this.localSecretValues.clear()
    this.secretReferenceCounter = 0
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

    this.messages.value.push({
      id: this.nextId(),
      role: "user",
      content,
      modelContent: this.contentForModel(content),
    })
    this.isStreaming.value = true
    this.lastTurnTools.value = []
    this.lastTurnStatus.value = "idle"

    try {
      const chatFn = platform.experiments?.aiExperiments?.chat
      if (chatFn) {
        // Online: run the agentic loop, surfacing each step live.
        await this.runAgentLoop(chatFn, contextString)
      } else {
        // Offline fallback: a single synchronous reply.
        const id = this.pushPending()
        const startedAt = Date.now()
        const reply = await this.buildReply(content, contextString)
        this.setThinkingDuration(id, startedAt)
        await this.streamText(id, reply)
        this.finalizeById(id)
        this.lastTurnStatus.value = "ok"
      }
    } finally {
      this.isStreaming.value = false
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
   * runs is appended as a compact step line. Tool calls execute against the
   * active request and the results are fed back, so the model can take further
   * (dependent) steps — until it stops calling tools or hits the step cap.
   */
  private async runAgentLoop(chatFn: ChatFn, contextString: string) {
    // Working transcript in model format. Each step appends the assistant's
    // tool_use turn and our tool_result turn (real Anthropic round-trips).
    const working: ChatRequestMessage[] = this.sanitizeHistory(
      this.messages.value
    )
    const safeContextString = redactSensitiveChatValues(contextString)

    for (let step = 0; step < MAX_TOOL_STEPS; step++) {
      const pendingId = this.pushPending()
      const stepStartedAt = Date.now()
      const result = await chatFn(working, safeContextString)

      if (E.isLeft(result)) {
        const i = this.messages.value.findIndex((m) => m.id === pendingId)
        if (i !== -1) {
          this.messages.value[i].content =
            "⚠️ Sorry, I couldn't reach the AI service. Please try again."
          this.messages.value[i].pending = false
        }
        this.lastTurnStatus.value = "error"
        return
      }

      const { content, tool_calls } = result.right

      // Stream the model's text for this step into its bubble (or drop the
      // placeholder if this step was tool-only). The thinking duration is
      // stamped first so the indicator settles into a "Thought for …" note
      // the moment tokens start.
      if (content) {
        this.setThinkingDuration(pendingId, stepStartedAt)
        await this.streamText(pendingId, content)
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

      // Echo the assistant's tool_use turn so the next round has full context.
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

      // Execute the calls, show each as a step, and feed the results back.
      const { replies, toolResults } = await this.executeToolCalls(tool_calls)
      if (replies.length) {
        const stepId = this.pushStep(replies.join("\n"))
        // A run in this batch reports back into its own step line.
        if (tool_calls.some((c) => c.name === "run_request")) {
          this.runStepMessageId = stepId
        }
      }
      working.push({ role: "user", content: toolResults })
    }

    // Step cap reached — the turn still did useful work.
    this.lastTurnStatus.value = "ok"
  }

  /**
   * Executes one model turn's tool calls against the active request and returns
   * the human-readable confirmations plus the matching tool_result blocks to
   * send back. Request-field edits are applied (and committed) before app
   * actions in model-emitted order, refreshing the active tab before each one.
   */
  private async executeToolCalls(
    toolCalls: ChatToolCall[]
  ): Promise<{ replies: string[]; toolResults: ChatContentBlock[] }> {
    const replyById = new Map<string, string>()
    for (const call of toolCalls) {
      if (APP_ACTION_TOOLS.has(call.name)) {
        const reply = await this.runAppAction(
          call.name,
          call.input,
          this.getActiveRequest()
        )
        replyById.set(call.id, reply || "Done.")
        continue
      }

      const active = this.getActiveRequest()
      const gqlActive = active ? null : this.getActiveGQLRequest()
      const res = active
        ? applyToolCall(active.request, call.name, call.input)
        : applyGQLToolCall(gqlActive?.request ?? null, call.name, call.input)
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
      replyById.set(call.id, res.reply || "Done.")
    }

    const replies = toolCalls
      .map((c) => replyById.get(c.id) ?? "")
      .filter(Boolean)
    const toolResults: ChatContentBlock[] = toolCalls.map((c) => ({
      type: "tool_result",
      tool_use_id: c.id,
      content: replyById.get(c.id) ?? "Done.",
    }))
    return { replies, toolResults }
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
    for (const m of messages.slice(-MAX_HISTORY_MESSAGES)) {
      if (m.pending) continue
      // Tool-step lines are UI artifacts — the model's prose covers them.
      if (m.kind === "tool") continue
      const content = (m.modelContent ?? m.content).trim()
      if (!content) continue
      // The conversation must start with a user message.
      if (out.length === 0 && m.role !== "user") continue
      const last = out[out.length - 1]
      if (last && last.role === m.role) {
        last.content += `\n\n${content}`
      } else {
        out.push({ role: m.role, content })
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
    const tab = this.tabService.currentActiveTab.value
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
      }
    }
    return null
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
    const tab = this.tabService.currentActiveTab.value
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
      case "run_request":
        if (active) {
          invokeAction("request.send-cancel")
          // Post a follow-up message once the response comes back.
          this.reportRunOutcome(active.getResponse)
          return "▶ Running the request…"
        }
        if (gqlActive) {
          // A multi-operation document runs the named operation; without a
          // name the pane falls back to the document's first operation.
          const operation = String(args.operation ?? "").trim()
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

      case "save_request":
        if (!active && !gqlActive)
          return "Open a request tab first so I can save it."
        invokeAction("request-response.save")
        return "💾 Saving the request…"

      case "open_new_tab":
        invokeAction("tab.open-new")
        return "🗂️ Opened a new tab."

      case "close_tab":
        invokeAction("tab.close-current")
        return "🗙 Closed the current tab."

      case "duplicate_tab":
        invokeAction("tab.duplicate-tab", {})
        return "🗂️ Duplicated the current tab."

      case "switch_tab": {
        const dir = String(args.direction ?? "next").toLowerCase()
        if (dir === "previous" || dir === "prev") invokeAction("tab.prev")
        else if (dir === "first") invokeAction("tab.switch-to-first")
        else if (dir === "last") invokeAction("tab.switch-to-last")
        else invokeAction("tab.next")
        return `🗂️ Switched to the ${dir} tab.`
      }

      case "switch_protocol":
        return this.switchProtocol(String(args.protocol ?? "").toLowerCase())

      case "set_interceptor":
        return this.setInterceptor(String(args.interceptor ?? "").trim())

      case "create_environment":
        return this.createEnv(String(args.name ?? "").trim(), args.variables)

      case "select_environment":
        return this.selectEnv(String(args.name ?? "").trim())

      case "add_or_update_environment_variables":
        return this.addEnvVars(args.variables)

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

      const referenceID = getLocalSecretReferenceID(rawValue)
      if (referenceID && !secret) {
        return {
          variables: [],
          error: `Environment variable "${key}" uses a local secret reference and must be marked as secret.`,
        }
      }
      let value = rawValue
      if (referenceID) {
        const resolvedValue = this.localSecretValues.get(referenceID)
        if (resolvedValue === undefined) {
          return {
            variables: [],
            error: `The local secret reference for "${key}" is no longer available. Send the value again.`,
          }
        }
        value = resolvedValue
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
      const match = merged.find(
        (m) => m.key.toLowerCase() === nv.key.toLowerCase()
      )
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
  private selectEnv(name: string): string {
    const n = name.toLowerCase()
    if (!n || n === "none" || n === "no environment" || n === "no") {
      setSelectedEnvironmentIndex({ type: "NO_ENV_SELECTED" })
      return "🌐 Cleared the active environment (No environment)."
    }
    if (this.teamWorkspace()) {
      // Team environments live behind a polled adapter; switching them safely
      // from here isn't wired up yet.
      return "You're in a team workspace — switch team environments from the Environments sidebar. I can still create team environments and edit the selected one."
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

  private personalCollectionWorkspaceError(): string | null {
    return this.teamWorkspace()
      ? "Collection workflow tools currently support personal REST collections. Switch to the Personal workspace first."
      : null
  }

  /** Creates a personal REST collection. */
  private createCollection(name: string): string {
    if (!name) return "What should the collection be called?"
    const workspaceError = this.personalCollectionWorkspaceError()
    if (workspaceError) return workspaceError
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

  /** Saves the active request into a personal collection (matched by name). */
  private saveRequestToCollection(
    name: string,
    active: ActiveRequestHandle | null
  ): string {
    if (!active) return "Open a request tab first so I can save it."
    if (!name) return "Which collection should I save it into?"
    const workspaceError = this.personalCollectionWorkspaceError()
    if (workspaceError) return workspaceError
    const collections = restCollectionStore.value.state
    const found = findTopLevelCollection(collections, name)
    if (!found) {
      const names = collections
        .map((c) => c.name)
        .filter(Boolean)
        .join(", ")
      return `I couldn't find a collection named "${name}". Available: ${
        names || "none"
      }.`
    }
    saveRESTRequestAs(String(found.index), this.cloneRequest(active.request))
    return `📁 Saved the request into **${found.collection.name}**.`
  }

  /**
   * Materializes a complete set of REST endpoints without requiring a separate
   * open-tab/save loop for each request.
   */
  private upsertCollectionRequests(name: string, requests: unknown): string {
    if (!name) return "Which collection should contain these requests?"
    const workspaceError = this.personalCollectionWorkspaceError()
    if (workspaceError) return workspaceError

    const found = findTopLevelCollection(restCollectionStore.value.state, name)
    if (!found) return `I couldn't find a collection named "${name}".`

    const parsed = parseCollectionRequestDefinitions(requests)
    if ("error" in parsed) return `⚠️ ${parsed.error}`

    let created = 0
    let updated = 0
    const path = String(found.index)

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

  /** Opens a saved request from a personal collection into a tab (by name). */
  private openCollectionRequest(reqName: string, collName?: string): string {
    if (!reqName) return "Which request should I open?"
    const workspaceError = this.personalCollectionWorkspaceError()
    if (workspaceError) return workspaceError
    const collections = restCollectionStore.value.state
    const found = findRequestInTree(collections, reqName, collName)
    if (!found) {
      const available = listRequestNames(collections)
      return `I couldn't find a request named "${reqName}"${
        collName ? ` in "${collName}"` : ""
      }.${available ? ` Available: ${available}.` : ""}`
    }

    const { request, folderPath, requestIndex } = found
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
    const workspaceError = this.personalCollectionWorkspaceError()
    if (workspaceError) return workspaceError

    const found = findTopLevelCollection(restCollectionStore.value.state, name)
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
      const selectionReply = this.selectEnv(environmentName)
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
    stopRun: () => void
  ): Promise<string> {
    return new Promise((resolve) => {
      let stop: (() => void) | null = null
      const tabs = this.tabService.getActiveTabs()

      const finish = (message: string) => {
        if (stop) stop()
        resolve(message)
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
      return `⚠️ **${collectionName}** ran, but no test assertions executed: ${summary}. The endpoints are not verified by tests.`
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
