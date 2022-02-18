export type ExpectResult = {
  status: "pass" | "fail" | "error";
  message: string;
}; // The expectation failed (fail) or errored (error)
