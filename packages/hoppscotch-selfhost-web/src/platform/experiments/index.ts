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
})

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

    const data = await res.json()

    const result = ChatResponseSchema.safeParse(data)

    if (!result.success) {
      return E.left("UNABLE_TO_PARSE_RESPONSE")
    }

    return E.right({
      content: result.data.content,
      tool_calls: result.data.tool_calls,
      trace_id: result.data.trace_id,
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
