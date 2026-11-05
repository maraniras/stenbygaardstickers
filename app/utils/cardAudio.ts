/** A short paper swish, synthesised locally and reused for each dealt card. */
export function createCardAudio(context: AudioContext) {
  const duration = 0.12
  const buffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * duration),
    context.sampleRate,
  )
  const samples = buffer.getChannelData(0)
  for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1
  const sources = new Set<AudioBufferSourceNode>()
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
    card() {
      const at = context.currentTime
      const source = context.createBufferSource(),
        filter = context.createBiquadFilter(),
        gain = context.createGain()
      source.buffer = buffer
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(2300, at)
      filter.frequency.exponentialRampToValueAtTime(1000, at + duration)
      filter.Q.value = 0.6
      gain.gain.setValueAtTime(0, at)
      gain.gain.linearRampToValueAtTime(0.28, at + 0.008)
      gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
      source.connect(filter)
      filter.connect(gain)
      gain.connect(context.destination)
      sources.add(source)
      source.onended = () => {
        sources.delete(source)
        source.disconnect()
        filter.disconnect()
        gain.disconnect()
      }
      source.start(at)
      source.stop(at + duration)
    },
    stop,
    dispose() {
      stop()
      void context.close().catch(() => {})
    },
  }
}
