/** Small, locally synthesised effects: no downloads or microphone permission. */
export function createSlotAudio(context: AudioContext) {
  const sources = new Set<AudioScheduledSourceNode>()
  const master = context.createGain()
  master.gain.value = 0.22
  master.connect(context.destination)
  function track(source: AudioScheduledSourceNode, gain: GainNode, at: number, duration: number) {
    sources.add(source)
    source.connect(gain)
    gain.connect(master)
    source.onended = () => {
      sources.delete(source)
      source.disconnect()
      gain.disconnect()
    }
    source.start(at)
    source.stop(at + duration)
  }
  function note(frequency: number, at: number, duration: number, volume = 0.3, end = frequency) {
    const oscillator = context.createOscillator(),
      gain = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, at)
    oscillator.frequency.exponentialRampToValueAtTime(end, at + duration)
    gain.gain.setValueAtTime(0, at)
    gain.gain.linearRampToValueAtTime(volume, at + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
    track(oscillator, gain, at, duration)
  }
  function click(at: number, strength = 0.3) {
    note(190, at, 0.035, strength, 65)
  }
  function stop() {
    for (const source of sources) {
      try {
        source.stop()
      } catch {
        /* Already ended. */
      }
    }
    sources.clear()
  }
  return {
    pull() {
      stop()
      note(360, context.currentTime, 0.12, 0.4, 110)
      click(context.currentTime + 0.1)
    },
    play(multiplier: number, stops: number[], reduced: boolean) {
      stop()
      const start = context.currentTime + 0.02
      if (!reduced) {
        // The ratchet slows down and gets quieter as each reel locks into place.
        const last = stops[stops.length - 1]! / 1000
        for (let t = 0; t < last; t += 0.055 + 0.12 * (t / last) ** 2) {
          const remaining = stops.filter((ms) => ms / 1000 > t).length
          click(start + t, 0.08 * remaining)
        }
        stops.forEach((ms, i) => {
          click(start + ms / 1000, 0.7)
          note(440 + i * 110, start + ms / 1000, 0.1, 0.12)
        })
      }
      const resultAt = start + (reduced ? 0 : (stops[stops.length - 1]! + 100) / 1000)
      const melody =
        multiplier === 100
          ? [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5, 1568]
          : multiplier > 1
            ? [523.25, 659.25, 783.99, 1046.5]
            : multiplier === 1
              ? [440, 554.37]
              : [293.66, 220]
      melody.forEach((frequency, i) => note(frequency, resultAt + i * 0.12, 0.24, 0.28))
    },
    stop,
    dispose() {
      stop()
      master.disconnect()
      void context.close().catch(() => {})
    },
  }
}
