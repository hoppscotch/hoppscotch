import { generateUniqueRefId } from "@hoppscotch/data"

type Request = { id?: string; _ref_id?: string; name: string }
type Payload = { name: string; wire: string }
type PendingRequest = {
  latest: Payload
  sent: Payload
  operation?: Promise<void>
}

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
  const pending = new Map<string, PendingRequest>()

  const run = (
    collectionID: string,
    request: Request,
    key: string,
    entry: PendingRequest
  ) => {
    entry.operation = (async () => {
      let id = request.id
      try {
        if (!id) {
          const payload = entry.latest
          const createdID = await create(
            payload.name,
            payload.wire,
            collectionID
          )
          id = reconcile(collectionID, request, createdID)
          if (!id) return
          if (createdID) entry.sent = payload
        }

        // Save only dispatched edits, not unsaved changes to the tab object.
        while (entry.latest.wire !== entry.sent.wire) {
          const payload = entry.latest
          const wire = JSON.stringify({ ...JSON.parse(payload.wire), id })
          await update(id, payload.name, wire)
          entry.sent = payload
        }
      } finally {
        entry.operation = undefined
        // A late creation event can still supply the missing server ID.
        if (id || entry.latest.wire === entry.sent.wire) pending.delete(key)
      }
    })()
    return entry.operation
  }

  const sync = async (collectionID: string, request: Request) => {
    request._ref_id ||= generateUniqueRefId("req")
    const key = JSON.stringify([collectionID, request._ref_id])
    const payload = { name: request.name, wire: JSON.stringify(request) }
    const existing = pending.get(key)

    if (existing) {
      existing.latest = payload
      return existing.operation ?? run(collectionID, request, key, existing)
    }

    if (request.id) {
      await update(request.id, payload.name, payload.wire)
      return
    }

    const entry: PendingRequest = { latest: payload, sent: payload }
    pending.set(key, entry)
    return run(collectionID, request, key, entry)
  }

  const onCreated = (collectionID: string, request: Request) => {
    const key = JSON.stringify([collectionID, request._ref_id])
    const entry = pending.get(key)
    if (request.id && entry && !entry.operation) {
      return run(collectionID, request, key, entry)
    }
  }

  return Object.assign(sync, { onCreated })
}
