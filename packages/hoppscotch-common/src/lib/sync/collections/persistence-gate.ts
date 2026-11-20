let paused = false
let tail: Promise<void> = Promise.resolve()

export function areCollectionPersistenceWritesPaused() {
  return paused
}

// Chain a persistence write that has already been started so logout can wait
// for it before writing the shared lists itself.
export function trackCollectionPersistenceWrite(write: Promise<unknown>) {
  tail = tail.then(
    () =>
      write.then(
        () => undefined,
        () => undefined
      )
  )
}

export async function pauseCollectionPersistenceWrites() {
  paused = true
  await tail
}

export function resumeCollectionPersistenceWrites() {
  paused = false
}
