import { generateUniqueRefId } from "@hoppscotch/data"

type Request = { id?: string; _ref_id?: string; name: string }
type Payload = { name: string; wire: string }

export function createRequestSynchronizer(
  create: (
    name: string,
    wire: string,
    collectionID: string
  ) => Promise<string | undefined>,
  update: (id: string, name: string, wire: string) => Promise<unknown>,
  reconcile: (
    collectionID: string,
    request: Request,
    id?: string
  ) => string | undefined
) {
  const pending = new Map<
    string,
    { latest: Payload; operation: Promise<void> }
  >()

  return async (collectionID: string, request: Request) => {
    request._ref_id ||= generateUniqueRefId("req")
    const key = JSON.stringify([collectionID, request._ref_id])
    const payload = { name: request.name, wire: JSON.stringify(request) }
    const existing = pending.get(key)

    if (existing) {
      existing.latest = payload
      return existing.operation
    }

    if (request.id) {
      await update(request.id, payload.name, payload.wire)
      return
    }

    const entry = { latest: payload, operation: Promise.resolve() }
    pending.set(key, entry)
    entry.operation = (async () => {
      try {
        const createdID = await create(payload.name, payload.wire, collectionID)
        const id = reconcile(collectionID, request, createdID)
        if (!id) return

        let sent = payload
        // Save only dispatched edits, not unsaved changes to the tab object.
        while (entry.latest.wire !== sent.wire) {
          sent = entry.latest
          const wire = JSON.stringify({ ...JSON.parse(sent.wire), id })
          await update(id, sent.name, wire)
        }
      } finally {
        pending.delete(key)
      }
    })()
    return entry.operation
  }
}
