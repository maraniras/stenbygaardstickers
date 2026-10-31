interface RefreshJob {
  run: () => Promise<unknown>
  interval: number
  lastRun: number
}
const jobs = new Map<string, RefreshJob>()

export function registerRefresh(key: string, run: RefreshJob['run'], interval = 60_000) {
  const job = { run, interval, lastRun: Date.now() }
  jobs.set(key, job)
  return () => {
    if (jobs.get(key) === job) jobs.delete(key)
  }
}

export function refreshVisibleData(foreground = false) {
  if (document.visibilityState !== 'visible') return
  const now = Date.now()
  for (const job of jobs.values()) {
    if (now - job.lastRun < (foreground ? Math.min(5000, job.interval) : job.interval)) continue
    job.lastRun = now
    void job.run().catch(() => {})
  }
}
