const requests = new Map<string, Promise<unknown>>()

/** Share an in-flight read, without caching its result or retrying writes. */
export function singleFlight<T>(key: string, run: () => Promise<T>): Promise<T> {
  const previous = requests.get(key)
  if (previous) return previous as Promise<T>
  const request = Promise.resolve()
    .then(run)
    .finally(() => {
      if (requests.get(key) === request) requests.delete(key)
    })
  requests.set(key, request)
  return request
}

export function requestMessage(error: unknown, fallback: string) {
  const message = (error as { data?: { statusMessage?: unknown } })?.data?.statusMessage
  return typeof message === 'string' ? message : fallback
}
