type RequestIdentity = { id?: string; _ref_id?: string }

/** Prefer exact identities before falling back to the client reference. */
export function findRequestByIdentity<T extends RequestIdentity>(
  requests: T[],
  request: RequestIdentity
): T | undefined {
  return (
    requests.find((candidate) => candidate === request) ??
    (request.id
      ? requests.find((candidate) => candidate.id === request.id)
      : undefined) ??
    (request._ref_id
      ? requests.find(
          (candidate) =>
            candidate._ref_id === request._ref_id &&
            (!candidate.id || !request.id || candidate.id === request.id)
        )
      : undefined)
  )
}
