/** Only for persisted values that never change under the same key (daily draws).
 * Holds one key per instance, shares concurrent loads and retries failures.
 * Mutable balances, profiles, permissions and live game state must not use this. */
export function createImmutableRead<T>() {
  let current: { key: string; promise: Promise<T> } | undefined
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    if (!current || current.key !== key) {
      const promise: Promise<T> = Promise.resolve()
        .then(load)
        .catch((error) => {
          if (current?.promise === promise) current = undefined
          throw error
        })
      current = { key, promise }
    }
    return structuredClone(await current.promise)
  }
}
