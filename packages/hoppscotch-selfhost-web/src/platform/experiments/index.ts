import {
  AIChatSelection,
  ExperimentsPlatformDef,
} from "@hoppscotch/common/platform/experiments"
import { platform } from "@hoppscotch/common/platform"
import { runGQLQuery } from "@hoppscotch/common/helpers/backend/GQLClient"
import * as E from "fp-ts/Either"
import { z } from "zod"
import {
  AiChatAvailabilityDocument,
  AiChatAvailabilityQuery,
  AiChatAvailabilityQueryVariables,
} from "../../api/generated/graphql"

/**
 * AI experiments platform def for self-host.
 *
 * One implementation serves both kernel modes: requests always send
 * `credentials: "include"` (how the web app authenticates — http-only cookies;
 * a no-op on desktop, where no backend cookies exist) and spread
 * `platform.auth.getBackendHeaders()` (how the desktop app authenticates — a
 * Bearer token; `{}` on web). The headers are read per call, not at module
 * init, so refreshed desktop tokens are picked up.
 *
 * Only the capabilities implemented by the self-host backend are declared —
 * the shared UI gates each AI feature on its capability being present.
 */

const ChatResponseSchema = z.object({
  content: z.string(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        input: z.record(z.any()),
      })
    )
    .default([]),
  trace_id: z.string(),
  // Every counter is individually optional: the cache figures are an Anthropic
  // concept, and a provider that reports only prompt and completion tokens must
  // not have its whole response rejected as unparseable.
  usage: z
    .object({
      input_tokens: z.number().optional(),
      cache_read_input_tokens: z.number().optional(),
      cache_creation_input_tokens: z.number().optional(),
      output_tokens: z.number().optional(),
    })
    .optional(),
  model: z.string().optional(),
  assistant_content: z.array(z.any()).optional(),
  loaded_tools: z.array(z.string()).optional(),
})

/**
 * Error codes the shared chat UI understands (see
 * `AIChatService.describeChatError`). Backend `ai_experiments/*` mnemonics and
 * HTTP statuses are mapped onto these so the user gets an actionable message
 * instead of a generic "couldn't reach the AI service".
 */
const BACKEND_ERROR_CODES: Record<string, string> = {
  "ai_experiments/chat_disabled": "CHAT_DISABLED",
  "ai_experiments/chat_input_too_large": "INPUT_TOO_LARGE",
  "ai_experiments/invalid_chat_input": "INVALID_INPUT",
  "ai_experiments/cannot_run_chat": "CANNOT_RUN_CHAT",
  "ai_experiments/model_unavailable": "MODEL_UNAVAILABLE",
}

const errorCodeFor = (status: number, body: unknown): string => {
  const message =
    body && typeof body === "object" && "message" in body
      ? (body as { message?: unknown }).message
      : undefined
  const messages = Array.isArray(message) ? message : [message]
  for (const m of messages) {
    if (typeof m === "string" && BACKEND_ERROR_CODES[m]) {
      return BACKEND_ERROR_CODES[m]
    }
  }
  if (status === 401 || status === 403) return "UNAUTHORIZED"
  if (status === 413) return "INPUT_TOO_LARGE"
  if (status === 429) return "RATE_LIMITED"
  if (status === 400) return "INVALID_INPUT"
  if (status === 503) return "CHAT_DISABLED"
  return "CANNOT_RUN_CHAT"
}

/**
 * Whether the assistant is switched on here, and which models it offers.
 *
 * Both come from the admin dashboard rather than the environment, and both are
 * guarded by the ordinary auth guard rather than the admin one — the payload
 * carries labels and model ids, never an endpoint or a credential.
 */
const getChatAvailability = async () => {
  const result = await runGQLQuery<
    AiChatAvailabilityQuery,
    AiChatAvailabilityQueryVariables,
    ""
  >({ query: AiChatAvailabilityDocument, variables: {} })

  if (E.isLeft(result)) {
    return E.left(
      result.left.type === "network_error" ? "NETWORK" : "CANNOT_READ_AI_CONFIG"
    )
  }

  return E.right({
    enabled: result.right.aiChatEnabled,
    models: result.right.aiChatModelOptions,
    skills: result.right.aiChatSkills,
  })
}

const chat = async (
  messages: { role: "user" | "assistant"; content: string | unknown[] }[],
  context: string,
  selection?: AIChatSelection
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_API_URL}/ai-experiments/chat`,
      {
        method: "POST",
        // Both fields or neither: a model without its connection is resolved
        // against the instance default, which refuses any model that default
        // does not itself offer.
        body: JSON.stringify({
          messages,
          context,
          ...(selection
            ? {
                connectionID: selection.connectionID,
                model: selection.model,
              }
            : {}),
        }),
        credentials: "include",
        headers: {
          ...platform.auth.getBackendHeaders(),
          "Content-Type": "application/json",
        },
      }
    )

    // Error bodies are JSON from Nest (`{ statusCode, message }`), but a proxy
    // in front of the backend may answer with HTML — never let that throw.
    const data: unknown = await res.json().catch(() => null)

    if (!res.ok) {
      return E.left(errorCodeFor(res.status, data))
    }

    const result = ChatResponseSchema.safeParse(data)

    if (!result.success) {
      return E.left("UNABLE_TO_PARSE_RESPONSE")
    }

    return E.right({
      content: result.data.content,
      tool_calls: result.data.tool_calls,
      trace_id: result.data.trace_id,
      model: result.data.model,
      usage: result.data.usage,
      assistant_content: result.data.assistant_content,
      loaded_tools: result.data.loaded_tools,
    })
  } catch (_e) {
    return E.left("CANNOT_RUN_CHAT")
  }
}

export const def: ExperimentsPlatformDef = {
  aiExperiments: {
    // The platform implements AI features; whether this particular instance
    // offers them is the server's call, not a build-time flag.
    enableAIExperiments: true,
    chat,
    getChatAvailability,
  },
}
