// Konfetti (canvas-confetti, hentes først når den skal bruges)
export async function shootConfetti(size: 'normal' | 'small' = 'normal', waitForParticles = false) {
  const confetti = (await import('canvas-confetti')).default
  const colors = ['#ffc928', '#ff5a36', '#3f8cff', '#2bb673', '#b48cff']
  const base = { colors, zIndex: 1300, disableForReducedMotion: true }
  const first = confetti({
    ...base,
    particleCount: size === 'small' ? 40 : 90,
    spread: 75,
    startVelocity: size === 'small' ? 28 : 45,
    origin: { y: 0.65 },
  })
  if (size === 'small') {
    if (waitForParticles) await first
    return
  }
  // To salver fra siderne bagefter
  const sides = new Promise<void>((resolve) => {
    setTimeout(() => {
      try {
        const left = confetti({
          ...base,
          particleCount: 50,
          angle: 60,
          spread: 60,
          origin: { x: 0, y: 0.7 },
        })
        const right = confetti({
          ...base,
          particleCount: 50,
          angle: 120,
          spread: 60,
          origin: { x: 1, y: 0.7 },
        })
        void Promise.all([left, right]).then(
          () => resolve(),
          () => resolve(),
        )
      } catch {
        resolve()
      }
    }, 250)
  })
  if (waitForParticles) await Promise.all([first, sides])
}
