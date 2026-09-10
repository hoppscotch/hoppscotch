import { ExperimentsPlatformDef } from "@hoppscotch/common/platform/experiments"
import { platform } from "@hoppscotch/common/platform"
import * as E from "fp-ts/Either"
import { z } from "zod"

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
  usage: z
    .object({
      input_tokens: z.number(),
      cache_read_input_tokens: z.number(),
      cache_creation_input_tokens: z.number(),
      output_tokens: z.number(),
    })
    .optional(),
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

const chat = async (
  messages: { role: "user" | "assistant"; content: string | unknown[] }[],
  context: string
) => {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_BACKEND_API_URL}/ai-experiments/chat`,
      {
        method: "POST",
        body: JSON.stringify({ messages, context }),
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
    enableAIExperiments: import.meta.env.VITE_AI_CHAT_ENABLED === "true",
    chat,
  },
}
