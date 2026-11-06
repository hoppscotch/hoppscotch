type RequestIdentity = { id?: string; _ref_id?: string }

/** Match server echoes to their optimistic entry without merging distinct saves. */
export function findRequestByIdentity<T extends RequestIdentity>(
  requests: T[],
  request: RequestIdentity
): T | undefined {
  return requests.find(
    (candidate) =>
      candidate === request ||
      (!!request.id && candidate.id === request.id) ||
      (!!request._ref_id && candidate._ref_id === request._ref_id)
  )
}
