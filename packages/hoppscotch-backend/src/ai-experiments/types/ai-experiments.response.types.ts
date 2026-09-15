export type ChatResponse = {
  // The model's text reply (may be empty when the turn is tool-calls only)
  content: string;
  // Tool calls the frontend must execute client-side, in order
  tool_calls: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  }[];
  // The provider message id, echoed back so the client can correlate steps
  trace_id: string;
  // The model that actually served this turn
  model: string;
  // The assistant's full content blocks for this turn. The client echoes them
  // back UNCHANGED on the next loop step (they carry the tool-search results
  // that keep discovered tools loaded, and any thinking blocks).
  assistant_content?: unknown[];
  // Names of deferred tools the model discovered via tool search this turn
  loaded_tools?: string[];
  usage?: {
    input_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
    output_tokens?: number;
  };
};
