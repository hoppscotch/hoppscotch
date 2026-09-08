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
};
