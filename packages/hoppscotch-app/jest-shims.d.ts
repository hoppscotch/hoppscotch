declare namespace jest {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  interface Matchers<R> {
    toMatchInlineSnapshotLeft(snapshot?: string): CustomMatcherResult
    toMatchInlineSnapshotRight(snapshot?: string): CustomMatcherResult
  }
}
