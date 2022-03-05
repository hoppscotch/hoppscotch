export type ExpectResult = {
  status: "pass" | "fail" | "error";
  message: string;
}; // The expectation failed (fail) or errored (error)

export type TestMetrics = {
  failing: number; // Total number of failed test-cases.
  testsReportSize: number; // Total test-cases.
};
