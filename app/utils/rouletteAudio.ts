/** Quiet, local wheel/ball synthesis. Timing of pocket ticks belongs to the wheel. */
export function createRouletteAudio(context: AudioContext) {
  const master = context.createGain()
  master.gain.value = 0.18
  master.connect(context.destination)
  const voices = new Map<
    AudioScheduledSourceNode,
    { kind: string; gain: GainNode; clean: () => void }
  >()
  let rolling: AudioBufferSourceNode | undefined
  let disposed = false
  let seed = 0x51e7
  const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
  const samples = noise.getChannelData(0)
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    // Periodic modulation adds a soft wheel rattle without scheduling extra voices.
    samples[i] =
      (seed / 0x80000000 - 1) *
      (0.65 + 0.35 * Math.sin((2 * Math.PI * 23 * i) / context.sampleRate))
  }

  function track(
    source: AudioScheduledSourceNode,
    gain: GainNode,
    kind: string,
    filter?: BiquadFilterNode,
  ) {
    const clean = () => {
      voices.delete(source)
      if (rolling === source) rolling = undefined
      source.onended = null
      source.disconnect()
      filter?.disconnect()
      gain.gain.cancelScheduledValues(context.currentTime)
      gain.disconnect()
    }
    source.connect(filter ?? gain)
    if (filter) filter.connect(gain)
    gain.connect(master)
    voices.set(source, { kind, gain, clean })
    source.onended = clean
  }
  function cancel(source: AudioScheduledSourceNode) {
    try {
      source.stop()
    } catch {
      /* An already-ended source still needs its graph disconnected. */
    }
    voices.get(source)?.clean()
  }
  function stopRolling(immediate = false) {
    if (!rolling) return
    const source = rolling
    rolling = undefined
    if (immediate) cancel(source)
    else {
      const gain = voices.get(source)!.gain.gain
      gain.cancelScheduledValues(context.currentTime)
      gain.setValueAtTime(gain.value, context.currentTime)
      gain.linearRampToValueAtTime(0, context.currentTime + 0.035)
      source.stop(context.currentTime + 0.035)
    }
  }
  function stop() {
    for (const source of voices.keys()) cancel(source)
  }
  const available = () => !disposed && context.state === 'running'
  return {
    startRolling() {
      if (!available() || rolling) return
      const at = context.currentTime
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain()
      source.buffer = noise
      source.loop = true
      filter.type = 'lowpass'
      filter.frequency.value = 420
      filter.Q.value = 0.55
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.22, at + 0.12)
      track(source, gain, 'rolling', filter)
      rolling = source
      source.start(at)
    },
    stopRolling,
    tick() {
      if (!available()) return
      // Bound overlap even if several segment crossings arrive in the same frame.
      const ticks = [...voices].filter(([, voice]) => voice.kind === 'tick')
      if (ticks.length >= 8) cancel(ticks[0]![0])
      const at = context.currentTime
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain()
      source.buffer = noise
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(2700, at)
      filter.frequency.exponentialRampToValueAtTime(1500, at + 0.028)
      filter.Q.value = 1.8
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.32, at + 0.0015)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.028)
      track(source, gain, 'tick', filter)
      source.start(at)
      source.stop(at + 0.03)
    },
    land() {
      stopRolling(true)
      if (!available()) return
      const at = context.currentTime
      const source = context.createOscillator(),
        gain = context.createGain()
      source.type = 'triangle'
      source.frequency.setValueAtTime(210, at)
      source.frequency.exponentialRampToValueAtTime(85, at + 0.13)
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.24, at + 0.003)
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.14)
      track(source, gain, 'landing')
      source.start(at)
      source.stop(at + 0.15)
    },
    stop,
    dispose() {
      if (disposed) return
      disposed = true
      stop()
      master.disconnect()
      try {
        void context.close().catch(() => {})
      } catch {
        /* Closing an unavailable context must not affect the game. */
      }
    },
  }
}
